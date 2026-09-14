package com.cristian.nbastats.player;

import com.cristian.nbastats.player.dto.LeaderboardResponse;
import com.cristian.nbastats.player.dto.PlayerResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
@Import(PlayerService.class)
class PlayerServiceTest {

    @Autowired
    private PlayerRepository playerRepository;

    @Autowired
    private PlayerService playerService;

    @BeforeEach
    void setUp() {
        playerRepository.deleteAll();
        playerRepository.saveAll(List.of(
                player("LeBron James", "LAL", "SF", 27.5, 8.2, 7.3),
                player("Stephen Curry", "GSW", "PG", 29.7, 5.4, 6.1),
                player("Anthony Davis", "LAL", "PF", 24.1, 12.5, 2.8),
                player("Luka Dončić", "DAL", "PG", 33.5, 5.0, 7.8),
                player("Nikola Đurišić", "ATL", "SF", 4.2, 1.6, 0.9)
        ));
    }

    @Test
    void searchPlayersByNameIgnoresAccents() {
        assertThat(playerService.searchPlayersByName("Doncic")).containsExactly("Luka Dončić");
        assertThat(playerService.searchPlayersByName("Dončić")).containsExactly("Luka Dončić");
    }

    @Test
    void searchPlayersByNameIgnoresLettersThatDoNotDecompose() {
        // Đ carries no combining mark, so stripping accents alone would miss it.
        assertThat(playerService.searchPlayersByName("Durisic")).containsExactly("Nikola Đurišić");
    }

    @Test
    void getPlayerByNameIgnoresAccents() {
        assertThat(playerService.getPlayerByName("doncic"))
                .extracting(PlayerResponse::name)
                .containsExactly("Luka Dončić");
    }

    @Test
    void comparePlayersResolvesAccentedNamesFromPlainAscii() {
        assertThat(playerService.comparePlayers("Luka Doncic", "LeBron James"))
                .extracting(PlayerResponse::name)
                .containsExactly("Luka Dončić", "LeBron James");
    }

    @Test
    void queryPlayersFiltersCaseInsensitivelyAndSorts() {
        Page<PlayerResponse> result = playerService.queryPlayers(
                null, "lal", null, 20.0, null, null, null, null,
                0, 10, "ppg", "desc"
        );

        assertThat(result.getContent())
                .extracting(PlayerResponse::name)
                .containsExactly("LeBron James", "Anthony Davis");
    }

    @Test
    void queryPlayersRejectsUnknownSortFields() {
        assertThatThrownBy(() -> playerService.queryPlayers(
                null, null, null, null, null, null, null, null,
                0, 10, "drop table player", "asc"
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported sort field");
    }

    @Test
    void comparePlayersReturnsNotFoundForUnknownName() {
        assertThatThrownBy(() -> playerService.comparePlayers("LeBron James", "Unknown"))
                .isInstanceOf(PlayerNotFoundException.class)
                .hasMessageContaining("Unknown");
    }

    @Test
    void leadersSortByRequestedStat() {
        List<PlayerResponse> leaders = playerService.leaders(2, "rpg");

        assertThat(leaders)
                .extracting(PlayerResponse::name)
                .containsExactly("Anthony Davis", "LeBron James");
    }

    @Test
    void leaderboardRanksOnlyPlayersMeetingTheNbaMinimums() {
        playerRepository.saveAll(List.of(
                // 40% on real volume, and a centre who took one three all year.
                shooter("Volume Shooter", 82, 120, 300),
                shooter("One And Done", 60, 1, 1)
        ));

        LeaderboardResponse board = playerService.leaderboard("three_pt_percent", 5);

        assertThat(board.qualification().minGamesPlayed()).isEqualTo(58);
        assertThat(board.qualification().minMade()).isEqualTo(82);
        assertThat(board.leaders())
                .extracting(entry -> entry.player().name())
                .containsExactly("Volume Shooter");
    }

    @Test
    void leaderboardReturnsExcludedPlayersWithTheReasonTheyMissed() {
        playerRepository.saveAll(List.of(
                shooter("Volume Shooter", 82, 120, 300),
                shooter("One And Done", 60, 1, 1)
        ));

        LeaderboardResponse board = playerService.leaderboard("three_pt_percent", 5);

        // The 100% shooter is the top of the unqualified list, not missing.
        assertThat(board.unqualified()).first().satisfies(entry -> {
            assertThat(entry.player().name()).isEqualTo("One And Done");
            assertThat(entry.value()).isEqualTo(100.0);
            assertThat(entry.rank()).isNull();
            assertThat(entry.qualified()).isFalse();
            assertThat(entry.made()).isEqualTo(1);
            assertThat(entry.attempted()).isEqualTo(1);
            assertThat(entry.reason()).contains("1 of 82 made 3PT");
        });
    }

    @Test
    void leaderboardRejectsUnknownStats() {
        assertThatThrownBy(() -> playerService.leaderboard("steals", 5))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported stat");
    }

    private Player shooter(String name, int gamesPlayed, int fg3m, int fg3a) {
        double threePtPercent = fg3a == 0 ? 0.0 : fg3m * 100.0 / fg3a;
        return new Player(
                null, name, "BOS", "SG", 10.0, 3.0, 2.0, 45.0, threePtPercent, 2023,
                gamesPlayed, 200, 450, fg3m, fg3a, 80, 100, 80.0
        );
    }

    private Player player(
            String name,
            String team,
            String position,
            double ppg,
            double rpg,
            double apg
    ) {
        return new Player(null, name, team, position, ppg, rpg, apg, 50.0, 35.0, 2023);
    }
}
