package com.cristian.nbastats.player.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.cristian.nbastats.player.Player;

/**
 * The volume fields carry every surface, not just the leaderboards. A player
 * page showing "36.6%" and a player page showing "36.6% (1-for-1)" are
 * different pages, and only the second one is honest.
 */
public record PlayerResponse(
        Long id,
        String name,
        String team,
        String position,
        double ppg,
        double rpg,
        double apg,
        @JsonProperty("fg_percent") double fgPercent,
        @JsonProperty("three_pt_percent") double threePtPercent,
        @JsonProperty("ft_percent") double ftPercent,
        int season,
        @JsonProperty("games_played") int gamesPlayed,
        int fgm,
        int fga,
        int fg3m,
        int fg3a,
        int ftm,
        int fta
) {
    public static PlayerResponse from(Player player) {
        return new PlayerResponse(
                player.getId(), player.getName(), player.getTeam(), player.getPosition(),
                player.getPpg(), player.getRpg(), player.getApg(),
                player.getFgPercent(), player.getThreePtPercent(), player.getFtPercent(),
                player.getSeason(),
                player.getGamesPlayed(),
                player.getFgm(), player.getFga(),
                player.getFg3m(), player.getFg3a(),
                player.getFtm(), player.getFta()
        );
    }
}
