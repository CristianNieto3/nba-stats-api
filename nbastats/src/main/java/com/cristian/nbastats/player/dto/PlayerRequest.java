package com.cristian.nbastats.player.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record PlayerRequest(
        Long id,
        @NotBlank(message = "name is required")
        @Size(max = 100, message = "name must be at most 100 characters")
        String name,
        @NotBlank(message = "team is required")
        @Size(max = 10, message = "team must be at most 10 characters")
        String team,
        @NotBlank(message = "position is required")
        @Pattern(
                regexp = "^(PG|SG|SF|PF|C)([-/](PG|SG|SF|PF|C))?$",
                flags = Pattern.Flag.CASE_INSENSITIVE,
                message = "position must be PG, SG, SF, PF, C, or a two-position combination"
        )
        String position,
        @DecimalMin(value = "0.0", message = "ppg must not be negative")
        double ppg,
        @DecimalMin(value = "0.0", message = "rpg must not be negative")
        double rpg,
        @DecimalMin(value = "0.0", message = "apg must not be negative")
        double apg,
        @JsonProperty("fg_percent")
        @JsonAlias("fgPercent")
        @DecimalMin(value = "0.0", message = "fg_percent must be at least 0")
        @DecimalMax(value = "100.0", message = "fg_percent must be at most 100")
        double fgPercent,
        @JsonProperty("three_pt_percent")
        @JsonAlias("threePtPercent")
        @DecimalMin(value = "0.0", message = "three_pt_percent must be at least 0")
        @DecimalMax(value = "100.0", message = "three_pt_percent must be at most 100")
        double threePtPercent,
        @Min(value = 1946, message = "season must be 1946 or later")
        @Max(value = 2100, message = "season must be 2100 or earlier")
        int season
) {
}
