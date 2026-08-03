package com.cristian.nbastats.player;

import com.cristian.nbastats.player.dto.PlayerRequest;
import com.cristian.nbastats.player.dto.PlayerResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/v1/players")
public class PlayerController {

    private final PlayerService playerService;
    private final boolean writeEnabled;

    public PlayerController(
            PlayerService playerService,
            @Value("${app.write-enabled:true}") boolean writeEnabled
    ) {
        this.playerService = playerService;
        this.writeEnabled = writeEnabled;
    }

    @GetMapping
    public List<PlayerResponse> getAllPlayers() {
        return playerService.getAllPlayers();
    }

    @GetMapping("/{id}")
    public PlayerResponse getPlayerById(@PathVariable @Positive long id) {
        return playerService.getPlayerById(id);
    }

    @GetMapping("/page")
    public Page<PlayerResponse> queryPlayers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String position,
            @RequestParam(required = false) @PositiveOrZero Double minPpg,
            @RequestParam(required = false) @PositiveOrZero Double minRpg,
            @RequestParam(required = false) @PositiveOrZero Double minApg,
            @RequestParam(required = false) @PositiveOrZero @DecimalMax("100") Double minFg,
            @RequestParam(required = false) @PositiveOrZero @DecimalMax("100") Double minThreePt,
            @RequestParam(defaultValue = "0") @PositiveOrZero int page,
            @RequestParam(defaultValue = "20") @Positive int size,
            @RequestParam(defaultValue = "name") String sortBy,
            @RequestParam(defaultValue = "asc") String direction
    ) {
        if (size > 100) {
            throw new IllegalArgumentException("size must be at most 100");
        }
        return playerService.queryPlayers(
                name, team, position, minPpg, minRpg, minApg, minFg, minThreePt,
                page, size, sortBy, direction
        );
    }

    @GetMapping("/filter")
    public List<PlayerResponse> filterPlayers(
            @RequestParam(required = false) String team,
            @RequestParam(required = false) String position,
            @RequestParam(required = false) @PositiveOrZero Double minPpg,
            @RequestParam(required = false) @PositiveOrZero Double minRpg,
            @RequestParam(required = false) @PositiveOrZero Double minApg,
            @RequestParam(required = false) @PositiveOrZero @DecimalMax("100") Double minFg,
            @RequestParam(required = false) @PositiveOrZero @DecimalMax("100") Double minThreePt
    ) {
        return playerService.filterPlayers(team, position, minPpg, minRpg, minApg, minFg, minThreePt);
    }

    @GetMapping("/name/{name}")
    public List<PlayerResponse> getPlayerByName(@PathVariable String name) {
        return playerService.getPlayerByName(name);
    }

    @GetMapping("/search")
    public List<String> searchPlayers(@RequestParam String query) {
        return playerService.searchPlayersByName(query);
    }

    @GetMapping("/team/{team}")
    public List<PlayerResponse> getPlayersByTeam(@PathVariable String team) {
        return playerService.getPlayersByTeam(team);
    }

    @GetMapping("/position/{position}")
    public List<PlayerResponse> getPlayersByPosition(@PathVariable String position) {
        return playerService.getPlayersByPosition(position);
    }

    @GetMapping("/minPpg")
    public List<PlayerResponse> getPlayersByMinPpg(
            @RequestParam(defaultValue = "0") @PositiveOrZero double minPpg
    ) {
        return playerService.getPlayersByMinPpg(minPpg);
    }

    @GetMapping("/top-scorers")
    public List<PlayerResponse> getTopScorers(
            @RequestParam(defaultValue = "10") @Positive int limit
    ) {
        validateLimit(limit);
        return playerService.getTopScorers(limit);
    }

    @GetMapping("/compare")
    public List<PlayerResponse> comparePlayers(
            @RequestParam String name1,
            @RequestParam String name2
    ) {
        return playerService.comparePlayers(name1, name2);
    }

    @GetMapping("/leaders/{stat}")
    public List<PlayerResponse> statLeaders(
            @PathVariable String stat,
            @RequestParam(defaultValue = "5") @Positive int limit
    ) {
        validateLimit(limit);
        return playerService.leaders(limit, stat);
    }

    @PostMapping
    public ResponseEntity<PlayerResponse> addPlayer(@Valid @RequestBody PlayerRequest request) {
        requireWritesEnabled();
        return ResponseEntity.status(HttpStatus.CREATED).body(playerService.addPlayer(request));
    }

    @PutMapping("/{id}")
    public PlayerResponse updatePlayer(
            @PathVariable @Positive long id,
            @Valid @RequestBody PlayerRequest request
    ) {
        requireWritesEnabled();
        return playerService.updatePlayer(id, request);
    }

    @PutMapping
    public PlayerResponse updatePlayerLegacy(@Valid @RequestBody PlayerRequest request) {
        requireWritesEnabled();
        if (request.id() == null || request.id() <= 0) {
            throw new IllegalArgumentException("id is required for PUT /api/v1/players");
        }
        return playerService.updatePlayer(request.id(), request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePlayer(@PathVariable @Positive long id) {
        requireWritesEnabled();
        playerService.deletePlayer(id);
        return ResponseEntity.noContent().build();
    }

    private void requireWritesEnabled() {
        if (!writeEnabled) {
            throw new WriteOperationsDisabledException();
        }
    }

    private void validateLimit(int limit) {
        if (limit > 100) {
            throw new IllegalArgumentException("limit must be at most 100");
        }
    }
}
