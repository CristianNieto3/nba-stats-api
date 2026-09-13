package com.cristian.nbastats.player;

/**
 * The NBA's minimums for appearing on a statistical leaderboard, published at
 * https://www.nba.com/stats/help/statminimums.
 *
 * <p>Per-game categories require games played. Percentage categories require
 * games played <em>and</em> a made-shot minimum, and it is the second condition
 * that does the real work here: a games-only rule still lets a centre who made
 * his single three-point attempt of the season lead the league at 100%.
 *
 * <p>The published figures are 82-game totals, but the NBA's own note on the
 * three-point minimum gives them away as rates -- 82 makes is "an average of 1
 * per team game". They are kept below as the published totals and prorated with
 * integer arithmetic, so a completed season reproduces the official numbers
 * exactly while a season in progress scales down. Storing them as pre-divided
 * rates instead would reproduce 300 as 299 or 301 depending on which way the
 * double rounded.
 */
public final class QualificationRules {

    public static final int FULL_SEASON_GAMES = 82;

    /** Points, rebounds, assists: 58 of 82 games. */
    public static final int MIN_GAMES_PLAYED = 58;

    public static final int MIN_FIELD_GOALS_MADE = 300;
    public static final int MIN_THREE_POINTERS_MADE = 82;
    public static final int MIN_FREE_THROWS_MADE = 125;

    private QualificationRules() {
    }

    /**
     * Scales a full-season minimum to the point the season has reached.
     *
     * <p>{@code leagueGamesPlayed} is the largest games-played value in the
     * table, which stands in for "games the furthest-along team has played".
     * The player table carries no schedule, so this is the closest available
     * proxy; it errs high by a game or two for teams with a game in hand, which
     * is well inside the noise of a threshold this size.
     *
     * <p>A freshly migrated table, where every row still holds the DEFAULT 0,
     * prorates every minimum to 0 and therefore qualifies everybody. That is
     * deliberate: between running the migration and the next loader run the API
     * behaves exactly as it did before, rather than serving empty leaderboards.
     */
    public static int prorate(int fullSeasonMinimum, int leagueGamesPlayed) {
        int games = Math.clamp(leagueGamesPlayed, 0, FULL_SEASON_GAMES);
        return Math.ceilDiv(fullSeasonMinimum * games, FULL_SEASON_GAMES);
    }
}
