package com.cristian.nbastats.player;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QualificationRulesTest {

    @Test
    void oneGameMinimumsIncludeTheSingleMadeThreeEdge() {
        assertThat(QualificationRules.prorate(QualificationRules.MIN_GAMES_PLAYED, 1)).isEqualTo(1);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_THREE_POINTERS_MADE, 1)).isEqualTo(1);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FIELD_GOALS_MADE, 1)).isEqualTo(4);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FREE_THROWS_MADE, 1)).isEqualTo(2);
    }

    @Test
    void fourGamesMinimumsRoundUp() {
        assertThat(QualificationRules.prorate(QualificationRules.MIN_GAMES_PLAYED, 4)).isEqualTo(3);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_THREE_POINTERS_MADE, 4)).isEqualTo(4);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FIELD_GOALS_MADE, 4)).isEqualTo(15);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FREE_THROWS_MADE, 4)).isEqualTo(7);
    }

    @Test
    void aCompletedSeasonReproducesThePublishedMinimums() {
        // The point of storing 82-game totals and prorating them: at a full
        // season the arithmetic has to land exactly on the NBA's numbers, not
        // a rounding away from them.
        assertThat(QualificationRules.prorate(QualificationRules.MIN_GAMES_PLAYED, 82)).isEqualTo(58);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FIELD_GOALS_MADE, 82)).isEqualTo(300);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_THREE_POINTERS_MADE, 82)).isEqualTo(82);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FREE_THROWS_MADE, 82)).isEqualTo(125);
    }

    @Test
    void aSeasonInProgressScalesTheMinimumsDown() {
        // Twenty games in: one made three per team game, 300/82 field goals per
        // team game, and 70% of games played.
        assertThat(QualificationRules.prorate(QualificationRules.MIN_THREE_POINTERS_MADE, 20)).isEqualTo(20);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FIELD_GOALS_MADE, 20)).isEqualTo(74);
        assertThat(QualificationRules.prorate(QualificationRules.MIN_GAMES_PLAYED, 20)).isEqualTo(15);
    }

    @Test
    void anUnrefreshedTableQualifiesEverybody() {
        // Between running the migration and the next loader run, every
        // games_played still holds the column default. Thresholds of zero leave
        // the API behaving as it did before rather than serving empty
        // leaderboards to a dashboard that has no idea why.
        assertThat(QualificationRules.prorate(QualificationRules.MIN_THREE_POINTERS_MADE, 0)).isZero();
        assertThat(QualificationRules.prorate(QualificationRules.MIN_GAMES_PLAYED, 0)).isZero();
    }

    @Test
    void gamesBeyondAFullSeasonDoNotInflateTheMinimums() {
        assertThat(QualificationRules.prorate(QualificationRules.MIN_FIELD_GOALS_MADE, 200)).isEqualTo(300);
    }
}
