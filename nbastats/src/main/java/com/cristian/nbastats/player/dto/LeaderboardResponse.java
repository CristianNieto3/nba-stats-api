package com.cristian.nbastats.player.dto;

import java.util.List;

/**
 * A ranked leaderboard plus the players the qualification rule excluded from
 * it.
 *
 * <p>The unqualified are returned rather than dropped on purpose. They are the
 * interesting cases -- the centre shooting 100% on one attempt is exactly what
 * a reader wants to see explained -- and hiding them would leave the dashboard
 * unable to say anything about a player who was on the board yesterday.
 */
public record LeaderboardResponse(
        String stat,
        QualificationInfo qualification,
        List<LeaderEntry> leaders,
        List<LeaderEntry> unqualified
) {
}
