package com.cristian.nbastats.player.dto;

/**
 * The thresholds a leaderboard was built with, returned alongside it so the
 * rule is visible rather than implicit. A leaderboard that silently drops
 * players reads as a bug; one that says "minimum 82 made 3PT" reads as a rule.
 *
 * @param leagueGamesPlayed games played by the furthest-along team, the basis
 *                          for prorating a season still in progress
 * @param minGamesPlayed    games a player needs to qualify in any category
 * @param minMade           made shots needed on top of that, null for per-game
 *                          categories which have no make requirement
 * @param madeStat          which make that minimum counts (fgm, fg3m, ftm)
 * @param summary           the rule in words, ready to print under a table
 */
public record QualificationInfo(
        int leagueGamesPlayed,
        int minGamesPlayed,
        Integer minMade,
        String madeStat,
        String summary
) {
}
