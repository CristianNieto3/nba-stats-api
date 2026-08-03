package com.cristian.nbastats.player.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.cristian.nbastats.player.Player;

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
        int season
) {
    public static PlayerResponse from(Player player) {
        return new PlayerResponse(
                player.getId(), player.getName(), player.getTeam(), player.getPosition(),
                player.getPpg(), player.getRpg(), player.getApg(),
                player.getFgPercent(), player.getThreePtPercent(), player.getSeason()
        );
    }
}
