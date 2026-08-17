"""
Independent post-load check on the player table.

The loader has its own guard (it rolls back if the new table would be under 90%
of the previous one), but that guard runs inside the loader's own transaction
and trusts the loader's own bookkeeping. This script reconnects from scratch and
looks at what actually landed, so a run that reported success while committing
nothing -- or committing to the wrong database -- fails loudly instead of
passing quietly.

Usage:
    python verify_player_table.py --print-count
    python verify_player_table.py --min-rows 461 --expect-season 2025
"""

import argparse
import os
import sys

import psycopg2

REQUIRED_ENV = ("NBA_DB_HOST", "NBA_DB_PORT", "NBA_DB_NAME", "NBA_DB_USER", "NBA_DB_PASSWORD")

# Matches the loader's own MIN_ROWS_RATIO_VS_PREVIOUS.
MIN_ROWS_RATIO = 0.9
# A table this small is never a real refresh, whatever the ratio says. It also
# closes the hole where a previously-empty table makes the ratio check vacuous.
ABSOLUTE_FLOOR = 300


def connect():
    missing = [name for name in REQUIRED_ENV if not os.getenv(name)]
    if missing:
        sys.exit(f"FAIL: missing required environment variables: {', '.join(missing)}")

    return psycopg2.connect(
        dbname=os.environ["NBA_DB_NAME"],
        user=os.environ["NBA_DB_USER"],
        password=os.environ["NBA_DB_PASSWORD"],
        host=os.environ["NBA_DB_HOST"],
        port=os.environ["NBA_DB_PORT"],
        connect_timeout=30,
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--print-count", action="store_true",
                        help="Print the current row count and exit 0. Used to snapshot before a load.")
    parser.add_argument("--min-rows", type=int,
                        help="Row count from before the load; the table must not shrink below 90%% of it.")
    parser.add_argument("--expect-season", type=int,
                        help="Every row must carry this season value. Defaults to whatever season "
                             "the loader itself would target, so the two can never disagree.")
    args = parser.parse_args()

    if args.expect_season is None and not args.print_count:
        # Imported rather than reimplemented: a second copy of the "season starts
        # in October" rule would drift from the loader's copy at the rollover,
        # which is the one moment it has to be right. The import prints the
        # loader's two banner lines as a side effect; that noise is harmless.
        from load_nba_players import get_current_nba_season_start_year
        args.expect_season = get_current_nba_season_start_year()

    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM player;")
            rows = cur.fetchone()[0]

            if args.print_count:
                print(rows)
                return

            cur.execute("SELECT season, count(*) FROM player GROUP BY season ORDER BY season;")
            by_season = cur.fetchall()

            cur.execute("SELECT count(*) FROM player WHERE name IS NULL OR name = '';")
            nameless = cur.fetchone()[0]
    finally:
        conn.close()

    print(f"Rows now: {rows}")
    print(f"Rows by season: {by_season}")

    failures = []

    if rows < ABSOLUTE_FLOOR:
        failures.append(f"only {rows} rows, below the absolute floor of {ABSOLUTE_FLOOR}")

    if args.min_rows is not None:
        threshold = args.min_rows * MIN_ROWS_RATIO
        print(f"Rows before: {args.min_rows} (must stay at or above {threshold:.0f})")
        if rows < threshold:
            failures.append(f"table shrank from {args.min_rows} to {rows} rows")

    if args.expect_season is not None:
        wrong = [(season, count) for season, count in by_season if season != args.expect_season]
        if wrong:
            failures.append(f"rows not from season {args.expect_season}: {wrong}")

    if nameless:
        failures.append(f"{nameless} rows have a null or empty name")

    if failures:
        print("\nVERIFICATION FAILED:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)

    print("\nVerification passed.")


if __name__ == "__main__":
    main()
