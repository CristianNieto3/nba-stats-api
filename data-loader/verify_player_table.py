"""
Independent post-load check on the player table.

The loader has its own guard (it rolls back if the new table would be under 90%
of the previous one), but that guard runs inside the loader's own transaction
and trusts the loader's own bookkeeping. This script reconnects from scratch and
looks at what actually landed, so a run that reported success while committing
nothing -- or committing to the wrong database -- fails loudly instead of
passing quietly.

It also checks the values, not just the row count. Every count-based guard in
this project is blind to the loader's most likely failure: a renamed column
upstream makes safe_float() return its 0.0 default for every player, so a full
table of zeros has exactly the right number of rows and passes everything else.

Usage:
    python verify_player_table.py --print-count
    python verify_player_table.py --min-rows 516 --expect-season 2025
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

# Everything above counts rows. None of it looks at what is IN them, and the
# loader's most likely failure does not change the row count at all: it reads
# stats as safe_float(row.get("PTS")), which returns 0.0 when a column is
# missing. Rename PTS upstream and every player gets 0.0 points, the row count
# is untouched, the ratio check passes, and a table of zeros is committed and
# verified clean. These checks exist to make that loud.
#
# Minimum share of rows that must be non-zero for each stat. Real values, taken
# from a live season: assists are non-zero for ~98% of players and three-point
# percentage for ~89%, so these floors sit well below anything legitimate.
# three_pt_percent gets the loosest floor because plenty of centres never
# attempt one.
# The volume columns get deliberately loose floors. They exist to catch a
# column that came back entirely zero, not to police a plausible distribution:
# plenty of centres never make a three, and a floor tight enough to be
# interesting is a floor that fails a legitimate refresh.
MIN_NONZERO_RATIO = {
    "ppg": 0.50,
    "rpg": 0.50,
    "apg": 0.50,
    "fg_percent": 0.50,
    "three_pt_percent": 0.25,
    "ft_percent": 0.50,
    "games_played": 0.95,
    "fgm": 0.80,
    "fga": 0.80,
    "fg3m": 0.25,
    "fg3a": 0.25,
    "ftm": 0.50,
    "fta": 0.50,
}

# The other direction. The loader multiplies FG_PCT and FG3_PCT by 100 because
# the endpoint returns them as fractions; if that ever changes upstream, the
# multiply turns 0.476 into 4760.0 rather than failing. Percentages are also
# CHECK-free at the database level, so nothing else would catch it.
MAX_PLAUSIBLE = {
    "ppg": 60.0,
    "rpg": 30.0,
    "apg": 25.0,
    "fg_percent": 100.0,
    "three_pt_percent": 100.0,
    "ft_percent": 100.0,
    # 82 games, and season records with room over them: 402 threes (Curry),
    # 1597 field goals (Chamberlain), 840 free throws (Harden).
    "games_played": 82,
    "fgm": 1600.0,
    "fga": 3200.0,
    "fg3m": 500.0,
    "fg3a": 1300.0,
    "ftm": 900.0,
    "fta": 1200.0,
}

# Relationships that hold in every real box score. These catch the failure the
# ratio checks cannot see: the loader writes its columns positionally, and a
# 17-placeholder INSERT with two values transposed produces a table where every
# column is populated, every ratio passes, and the numbers are quietly wrong.
CONSISTENCY_CHECKS = (
    ("fgm > fga", "made more field goals than they attempted"),
    ("fg3m > fg3a", "made more threes than they attempted"),
    ("ftm > fta", "made more free throws than they attempted"),
    ("fg3m > fgm", "made more threes than field goals -- a three is a field goal"),
    ("games_played > 82", "played more than 82 games"),
)

# Somebody always leads the league by a distance. If the best scorer in the
# table is under this, the stats did not load, whatever the per-column ratios
# say.
MIN_LEAGUE_MAX_PPG = 15.0

STAT_COLUMNS = tuple(MIN_NONZERO_RATIO)


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

            # One pass for every stat column: how many rows are non-zero, and
            # what the largest value is.
            selects = ", ".join(
                f"count(*) FILTER (WHERE {c} <> 0), max({c})" for c in STAT_COLUMNS
            )
            cur.execute(f"SELECT {selects} FROM player;")
            stat_row = cur.fetchone()
            stats = {
                c: {"nonzero": stat_row[i * 2], "max": stat_row[i * 2 + 1]}
                for i, c in enumerate(STAT_COLUMNS)
            }

            inconsistent = []
            for predicate, description in CONSISTENCY_CHECKS:
                cur.execute(f"SELECT count(*) FROM player WHERE {predicate};")
                offenders = cur.fetchone()[0]
                if offenders:
                    inconsistent.append((offenders, description))
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

    if rows:
        for column in STAT_COLUMNS:
            nonzero = stats[column]["nonzero"]
            largest = stats[column]["max"] or 0.0
            ratio = nonzero / rows
            print(f"  {column}: {nonzero}/{rows} non-zero ({ratio:.0%}), max {largest:g}")

            floor = MIN_NONZERO_RATIO[column]
            if ratio < floor:
                failures.append(
                    f"{column} is non-zero in only {nonzero} of {rows} rows "
                    f"({ratio:.0%}, expected at least {floor:.0%}) -- the column "
                    "this maps to has probably been renamed upstream"
                )

            ceiling = MAX_PLAUSIBLE[column]
            if largest > ceiling:
                failures.append(
                    f"{column} reaches {largest:g}, above the plausible maximum of "
                    f"{ceiling:g} -- check whether the source changed scale"
                )

        for offenders, description in inconsistent:
            failures.append(
                f"{offenders} rows {description} -- the volume columns are most "
                "likely misaligned with the INSERT that wrote them"
            )

        best_ppg = stats["ppg"]["max"] or 0.0
        if best_ppg < MIN_LEAGUE_MAX_PPG:
            failures.append(
                f"the highest ppg in the table is {best_ppg:g}, under "
                f"{MIN_LEAGUE_MAX_PPG:g} -- no real season looks like this"
            )

    if failures:
        print("\nVERIFICATION FAILED:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)

    print("\nVerification passed.")


if __name__ == "__main__":
    main()
