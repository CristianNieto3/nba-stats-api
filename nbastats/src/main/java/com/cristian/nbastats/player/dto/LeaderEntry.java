package com.cristian.nbastats.player.dto;

/**
 * One row of a leaderboard, carrying the volume the ranking rests on so the
 * caller can render "201-for-480" next to a percentage, and say why a player
 * who is not ranked was left out.
 *
 * @param rank      position among qualified players, null when not qualified
 * @param value     the statistic being ranked
 * @param made      makes toward the minimum, null for per-game categories
 * @param attempted attempts, null for per-game categories
 * @param reason    why this player fails the rule, null when they pass it
 */
public record LeaderEntry(
        Integer rank,
        PlayerResponse player,
        double value,
        int gamesPlayed,
        Integer made,
        Integer attempted,
        boolean qualified,
        String reason
) {
}
