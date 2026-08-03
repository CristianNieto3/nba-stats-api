package com.cristian.nbastats.player;

import com.cristian.nbastats.player.dto.PlayerResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
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
                player("Anthony Davis", "LAL", "PF", 24.1, 12.5, 2.8)
        ));
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
