package com.cristian.nbastats.player;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;
import java.util.function.ToDoubleFunction;
import java.util.function.ToIntFunction;
import java.util.stream.Collectors;

/**
 * A statistic a leaderboard can be ranked by, together with the volume columns
 * its qualification rule is written in terms of.
 *
 * <p>Per-game stats carry no made/attempted pair and no make minimum; they
 * qualify on games played alone. Percentage stats carry both.
 *
 * <p>Each column appears twice: once as a field name for the Criteria API to
 * build SQL from, and once as an accessor for reading a loaded entity. The
 * alternative is reflecting on the field name at read time, which trades a
 * compile-time error for a runtime one.
 */
public enum LeaderboardStat {

    PPG("ppg", "ppg", "points per game", Player::getPpg),
    RPG("rpg", "rpg", "rebounds per game", Player::getRpg),
    APG("apg", "apg", "assists per game", Player::getApg),
    FG_PERCENT(
            "fgPercent", "fg_percent", "field goal percentage", Player::getFgPercent,
            "fgm", "fga", "made FG", QualificationRules.MIN_FIELD_GOALS_MADE,
            Player::getFgm, Player::getFga
    ),
    THREE_PT_PERCENT(
            "threePtPercent", "three_pt_percent", "three-point percentage", Player::getThreePtPercent,
            "fg3m", "fg3a", "made 3PT", QualificationRules.MIN_THREE_POINTERS_MADE,
            Player::getFg3m, Player::getFg3a
    ),
    FT_PERCENT(
            "ftPercent", "ft_percent", "free throw percentage", Player::getFtPercent,
            "ftm", "fta", "made FT", QualificationRules.MIN_FREE_THROWS_MADE,
            Player::getFtm, Player::getFta
    );

    private final String entityField;
    private final String apiName;
    private final String label;
    private final ToDoubleFunction<Player> value;
    private final String madeField;
    private final String attemptField;
    private final String madeLabel;
    private final int fullSeasonMinimumMade;
    private final ToIntFunction<Player> made;
    private final ToIntFunction<Player> attempted;

    LeaderboardStat(String entityField, String apiName, String label, ToDoubleFunction<Player> value) {
        this(entityField, apiName, label, value, null, null, null, 0, null, null);
    }

    LeaderboardStat(
            String entityField,
            String apiName,
            String label,
            ToDoubleFunction<Player> value,
            String madeField,
            String attemptField,
            String madeLabel,
            int fullSeasonMinimumMade,
            ToIntFunction<Player> made,
            ToIntFunction<Player> attempted
    ) {
        this.entityField = entityField;
        this.apiName = apiName;
        this.label = label;
        this.value = value;
        this.madeField = madeField;
        this.attemptField = attemptField;
        this.madeLabel = madeLabel;
        this.fullSeasonMinimumMade = fullSeasonMinimumMade;
        this.made = made;
        this.attempted = attempted;
    }

    /**
     * Accepts either spelling the rest of the API accepts -- {@code fgPercent}
     * and {@code fg_percent} both resolve -- so a leaderboard path stays
     * consistent with the sortBy parameter on /page.
     */
    public static LeaderboardStat from(String stat) {
        String requested = stat == null ? "" : stat.trim().toLowerCase(Locale.ROOT);
        return Arrays.stream(values())
                .filter(candidate -> candidate.entityField.toLowerCase(Locale.ROOT).equals(requested)
                        || candidate.apiName.equals(requested))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unsupported stat: " + stat + ". Try one of: " + supported() + "."
                ));
    }

    public static String supported() {
        return Arrays.stream(values())
                .map(LeaderboardStat::apiName)
                .collect(Collectors.joining(", "));
    }

    public String entityField() {
        return entityField;
    }

    public String apiName() {
        return apiName;
    }

    public String label() {
        return label;
    }

    public String madeLabel() {
        return madeLabel;
    }

    public Optional<String> madeField() {
        return Optional.ofNullable(madeField);
    }

    public Optional<String> attemptField() {
        return Optional.ofNullable(attemptField);
    }

    /** Percentage categories add a made-shot minimum on top of the games rule. */
    public boolean isPercentage() {
        return madeField != null;
    }

    public int fullSeasonMinimumMade() {
        return fullSeasonMinimumMade;
    }

    public double valueOf(Player player) {
        return value.applyAsDouble(player);
    }

    /** Empty for per-game categories, which count no makes. */
    public Optional<Integer> madeBy(Player player) {
        return made == null ? Optional.empty() : Optional.of(made.applyAsInt(player));
    }

    public Optional<Integer> attemptedBy(Player player) {
        return attempted == null ? Optional.empty() : Optional.of(attempted.applyAsInt(player));
    }
}
