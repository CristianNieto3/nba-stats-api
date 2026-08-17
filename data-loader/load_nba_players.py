"""
This script fetches NBA player statistics using the nba_api and inserts them
into a PostgreSQL database.
"""

import os
import random
import sys
import time
from datetime import datetime
from pathlib import Path
from time import sleep

import psycopg2
import requests
from nba_api.stats.endpoints import commonplayerinfo
from nba_api.stats.endpoints import commonteamroster
from nba_api.stats.endpoints import leaguedashplayerstats
from nba_api.stats.static import players
from nba_api.stats.static import teams

# Player names contain accents (Doncic, Jokic, Porzingis). Without this the
# progress prints below raise UnicodeEncodeError on a cp1252 Windows console,
# which aborts the entire run partway through the alphabet.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

print("RUNNING FILE:", Path(__file__).resolve())
print("RUN TIME:", datetime.now())

# Database connection details
DB_NAME = os.getenv("NBA_DB_NAME", "nba")
DB_USER = os.getenv("NBA_DB_USER", "postgres")
DB_PASSWORD = os.getenv("NBA_DB_PASSWORD", "")
DB_HOST = os.getenv("NBA_DB_HOST", "localhost")
DB_PORT = os.getenv("NBA_DB_PORT", "5432")

REQUEST_TIMEOUT_SECONDS = 60
MAX_RETRIES = 5
INITIAL_RETRY_DELAY_SECONDS = 4
PLAYER_REQUEST_DELAY_SECONDS = 1.0
INTRA_PLAYER_DELAY_SECONDS = 0.8
TEAM_REQUEST_DELAY_SECONDS = 1.0
REQUEST_JITTER_SECONDS = 0.35
# Rosters cover ~all rostered players; a couple of failures are survivable,
# but a wave of them means stats.nba.com is rate limiting and the import
# would quietly produce a half-empty table.
MAX_FAILED_TEAMS = 2
# A refresh that lands well below the previous table size means something went
# wrong upstream, so roll back instead of publishing a gutted table.
MIN_ROWS_RATIO_VS_PREVIOUS = 0.9
NBA_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Host": "stats.nba.com",
    "Origin": "https://www.nba.com",
    "Referer": "https://www.nba.com/",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
    "Sec-Ch-Ua": '"Chromium";v="134", "Google Chrome";v="134", "Not:A-Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    ),
}


def random_delay(base_delay, jitter=REQUEST_JITTER_SECONDS):
    sleep(base_delay + random.uniform(0, jitter))


def fetch_with_retry(fetch_fn, max_retries=MAX_RETRIES, delay=INITIAL_RETRY_DELAY_SECONDS, label="request"):
    for attempt in range(1, max_retries + 1):
        try:
            return fetch_fn()
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError) as e:
            print(f"  Timeout during {label} (attempt {attempt}/{max_retries}): {e}")
            if attempt < max_retries:
                retry_delay = delay * (2 ** (attempt - 1))
                print(f"  Retrying in {retry_delay:.1f} seconds...")
                time.sleep(retry_delay + random.uniform(0, REQUEST_JITTER_SECONDS))
            else:
                raise
        except Exception:
            raise

def connect_db():
    if not DB_PASSWORD:
        raise ValueError("NBA_DB_PASSWORD is not set. Set it in your environment before running this script.")

    return psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

def get_current_nba_season_start_year(today=None):
    """
    Returns the start year of the current NBA season.
    Example:
      Oct 2025 -> 2025
      Mar 2026 -> 2025
    """
    if today is None:
        today = datetime.today()

    # NBA season usually starts in October
    if today.month >= 10:
        return today.year
    return today.year - 1


def build_season_id(start_year):
    """
    Converts 2025 -> '2025-26'
    """
    end_year_short = str((start_year + 1) % 100).zfill(2)
    return f"{start_year}-{end_year_short}"


def safe_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


POSITION_WORDS = {"G": "Guard", "F": "Forward", "C": "Center"}


def normalize_position(raw):
    """
    Team rosters report positions as codes ("G", "F-C"). The player table stores
    words ("Guard", "Forward-Center"), which is what the API and frontend show.
    """
    text = str(raw or "").strip()
    if not text:
        return "N/A"

    parts = [POSITION_WORDS.get(part.strip().upper(), part.strip()) for part in text.split("-")]
    return "-".join(part for part in parts if part) or "N/A"


def build_position_map(season_id):
    """
    Positions for every rostered player in 30 requests, one per team.

    The previous approach called CommonPlayerInfo once per player, ~600 requests
    per run. That reliably tripped the stats.nba.com rate limiter partway through,
    and every player whose request failed was dropped from the import.
    """
    all_teams = teams.get_teams()
    print(f"Fetching rosters for {len(all_teams)} teams...")

    position_by_player_id = {}
    failed_teams = []

    for team in all_teams:
        try:
            roster = fetch_with_retry(
                lambda: commonteamroster.CommonTeamRoster(
                    team_id=team["id"],
                    season=season_id,
                    headers=NBA_HEADERS,
                    timeout=REQUEST_TIMEOUT_SECONDS,
                ),
                label=f"roster for {team['abbreviation']}",
            ).get_data_frames()[0]
        except Exception as e:
            print(f"  Roster failed for {team['abbreviation']}: {type(e).__name__}: {e}")
            failed_teams.append(team["abbreviation"])
            random_delay(TEAM_REQUEST_DELAY_SECONDS)
            continue

        for _, row in roster.iterrows():
            player_id = row.get("PLAYER_ID")
            if player_id is not None:
                position_by_player_id[int(player_id)] = normalize_position(row.get("POSITION"))

        random_delay(TEAM_REQUEST_DELAY_SECONDS)

    if len(failed_teams) > MAX_FAILED_TEAMS:
        raise RuntimeError(
            f"{len(failed_teams)} team rosters failed ({', '.join(failed_teams)}). "
            "stats.nba.com is most likely rate limiting; aborting instead of "
            "importing players without positions."
        )

    print(f"Positions resolved for {len(position_by_player_id)} rostered players.")
    return position_by_player_id


def lookup_position_fallback(player_id, full_name):
    """
    Players with season stats who are not on a current roster (waived, converted
    two-ways) have no roster entry. There are only a handful, so a per-player
    lookup is affordable here. A failure costs the position, never the player.
    """
    try:
        info_df = fetch_with_retry(
            lambda: commonplayerinfo.CommonPlayerInfo(
                player_id=player_id,
                headers=NBA_HEADERS,
                timeout=REQUEST_TIMEOUT_SECONDS,
            ),
            label=f"player info for {full_name}",
        ).get_data_frames()[0]
    except Exception as e:
        print(f"  Position lookup failed for {full_name}: {type(e).__name__}: {e}")
        return "N/A"
    finally:
        random_delay(PLAYER_REQUEST_DELAY_SECONDS)

    if info_df.empty or "POSITION" not in info_df.columns:
        return "N/A"
    return normalize_position(info_df.at[0, "POSITION"])


def insert_player(cursor, player_data):
    """
    Inserts a player's data into the PostgreSQL player table.
    """
    cursor.execute(
        """
        INSERT INTO player
        (name, team, position, ppg, rpg, apg, fg_percent, three_pt_percent, season)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        player_data,
    )


def fetch_and_insert_players():
    """
    Pulls active NBA players and inserts stats for the current NBA season.
    Rebuilds the player table each run.
    """
    target_start_year = get_current_nba_season_start_year()
    target_season_id = build_season_id(target_start_year)

    print(f"Connecting to DB and starting player import...")
    print(f"Target NBA season: {target_season_id}")

    conn = connect_db()
    cursor = conn.cursor()

    inserted_count = 0
    skipped_no_season = 0
    missing_position_count = 0

    try:
        cursor.execute("SELECT count(*) FROM player;")
        previous_count = cursor.fetchone()[0]
        print(f"Player table currently holds {previous_count} rows.")

        # Clear existing data so table always reflects the latest refresh.
        # This stays inside one transaction so a failed run can be rolled back.
        cursor.execute("DELETE FROM player;")
        print("Cleared existing player table.")

        nba_players = players.get_active_players()
        print(f"Found {len(nba_players)} active players.")

        season_stats = fetch_with_retry(
            lambda: leaguedashplayerstats.LeagueDashPlayerStats(
                season=target_season_id,
                per_mode_detailed="PerGame",
                season_type_all_star="Regular Season",
                headers=NBA_HEADERS,
                timeout=REQUEST_TIMEOUT_SECONDS,
            ),
            label=f"league player stats for {target_season_id}",
        )
        stats_df = season_stats.get_data_frames()[0]

        if stats_df.empty:
            raise RuntimeError(f"No league stats returned for season {target_season_id}.")

        if "PLAYER_ID" not in stats_df.columns:
            raise RuntimeError("League stats response is missing PLAYER_ID.")

        stats_by_player_id = {
            int(row["PLAYER_ID"]): row
            for _, row in stats_df.iterrows()
            if row.get("PLAYER_ID") is not None
        }
        print(f"Fetched current-season stats for {len(stats_by_player_id)} players.")

        position_by_player_id = build_position_map(target_season_id)

        # Every remaining field comes from data already in memory, so from here
        # on a player can only be skipped for genuinely having no season stats.
        for p in nba_players:
            full_name = p.get("full_name", "Unknown")
            player_id = p.get("id")

            season_row = stats_by_player_id.get(player_id)
            if season_row is None:
                skipped_no_season += 1
                continue

            gp = safe_float(season_row.get("GP"), 0.0)
            if gp <= 0:
                skipped_no_season += 1
                continue

            team = str(season_row.get("TEAM_ABBREVIATION") or "").strip() or "N/A"

            position = position_by_player_id.get(player_id)
            if position is None:
                position = lookup_position_fallback(player_id, full_name)
            if position == "N/A":
                missing_position_count += 1

            # LeagueDashPlayerStats is already requested in PerGame mode.
            ppg = safe_float(season_row.get("PTS"))
            rpg = safe_float(season_row.get("REB"))
            apg = safe_float(season_row.get("AST"))
            fg_percent = safe_float(season_row.get("FG_PCT")) * 100
            three_pt_percent = safe_float(season_row.get("FG3_PCT")) * 100

            insert_player(
                cursor,
                (
                    full_name,
                    team,
                    position,
                    round(ppg, 1),
                    round(rpg, 1),
                    round(apg, 1),
                    round(fg_percent, 1),
                    round(three_pt_percent, 1),
                    target_start_year,
                ),
            )

            inserted_count += 1
            print(f"  Inserted: {full_name} | {team} | {position} | PPG: {ppg:.1f}")

        if inserted_count < previous_count * MIN_ROWS_RATIO_VS_PREVIOUS:
            raise RuntimeError(
                f"Only {inserted_count} players would be imported, down from "
                f"{previous_count}. Refusing to commit a table this much smaller; "
                "rolling back and leaving the existing data in place."
            )

        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

    print("\nImport complete.")
    print(f"Inserted: {inserted_count}")
    print(f"Skipped (no current season row / no GP): {skipped_no_season}")
    print(f"Inserted without a position: {missing_position_count}")


if __name__ == "__main__":
    fetch_and_insert_players()
