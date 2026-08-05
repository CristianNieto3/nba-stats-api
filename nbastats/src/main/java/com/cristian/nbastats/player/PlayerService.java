package com.cristian.nbastats.player;

import com.cristian.nbastats.player.dto.PlayerRequest;
import com.cristian.nbastats.player.dto.PlayerResponse;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class PlayerService {

    private static final Map<String, String> SORT_FIELDS = Map.ofEntries(
            Map.entry("id", "id"),
            Map.entry("name", "name"),
            Map.entry("team", "team"),
            Map.entry("position", "position"),
            Map.entry("ppg", "ppg"),
            Map.entry("rpg", "rpg"),
            Map.entry("apg", "apg"),
            Map.entry("fgPercent", "fgPercent"),
            Map.entry("fg_percent", "fgPercent"),
            Map.entry("threePtPercent", "threePtPercent"),
            Map.entry("three_pt_percent", "threePtPercent"),
            Map.entry("season", "season")
    );

    private final PlayerRepository playerRepository;

    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    public List<PlayerResponse> getAllPlayers() {
        return playerRepository.findAll(Sort.by("id")).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    public PlayerResponse getPlayerById(long id) {
        return PlayerResponse.from(findPlayer(id));
    }

    public Page<PlayerResponse> queryPlayers(
            String name,
            String team,
            String position,
            Double minPpg,
            Double minRpg,
            Double minApg,
            Double minFg,
            Double minThreePt,
            int page,
            int size,
            String sortBy,
            String direction
    ) {
        String entitySortField = resolveSortField(sortBy);
        Sort.Direction sortDirection;
        try {
            sortDirection = Sort.Direction.fromString(direction);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("direction must be 'asc' or 'desc'");
        }

        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(sortDirection, entitySortField));
        return playerRepository.findAll(
                        filters(name, team, position, minPpg, minRpg, minApg, minFg, minThreePt),
                        pageRequest
                )
                .map(PlayerResponse::from);
    }

    public List<PlayerResponse> filterPlayers(
            String team,
            String position,
            Double minPpg,
            Double minRpg,
            Double minApg,
            Double minFg,
            Double minThreePt
    ) {
        return playerRepository.findAll(
                        filters(null, team, position, minPpg, minRpg, minApg, minFg, minThreePt),
                        Sort.by("id")
                ).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    public List<PlayerResponse> getPlayerByName(String name) {
        return playerRepository.findByNameContainingNormalized(normalizeRequired(name, "name")).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    public List<String> searchPlayersByName(String query) {
        String normalizedQuery = normalizeRequired(query, "query");
        return playerRepository.findAll(
                        filters(normalizedQuery, null, null, null, null, null, null, null),
                        PageRequest.of(0, 10, Sort.by("name").ascending())
                ).stream()
                .map(Player::getName)
                .distinct()
                .toList();
    }

    public List<PlayerResponse> getPlayersByTeam(String team) {
        return queryWithoutPagination(null, normalizeRequired(team, "team"), null, null);
    }

    public List<PlayerResponse> getPlayersByPosition(String position) {
        return queryWithoutPagination(null, null, normalizeRequired(position, "position"), null);
    }

    public List<PlayerResponse> getPlayersByMinPpg(double minPpg) {
        return queryWithoutPagination(null, null, null, minPpg);
    }

    public List<PlayerResponse> getTopScorers(int limit) {
        return leaders(limit, "ppg");
    }

    public List<PlayerResponse> comparePlayers(String name1, String name2) {
        Player first = playerRepository.findFirstByNameNormalized(normalizeRequired(name1, "name1"))
                .orElseThrow(() -> new PlayerNotFoundException("Player not found: " + name1));
        Player second = playerRepository.findFirstByNameNormalized(normalizeRequired(name2, "name2"))
                .orElseThrow(() -> new PlayerNotFoundException("Player not found: " + name2));
        return List.of(PlayerResponse.from(first), PlayerResponse.from(second));
    }

    public List<PlayerResponse> leaders(int limit, String stat) {
        String sortField = resolveLeaderboardField(stat);
        return playerRepository.findAll(PageRequest.of(0, limit, Sort.by(sortField).descending())).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    @Transactional
    public PlayerResponse addPlayer(PlayerRequest request) {
        Player player = new Player();
        apply(request, player);
        return PlayerResponse.from(playerRepository.save(player));
    }

    @Transactional
    public PlayerResponse updatePlayer(long id, PlayerRequest request) {
        Player player = findPlayer(id);
        apply(request, player);
        return PlayerResponse.from(playerRepository.save(player));
    }

    @Transactional
    public void deletePlayer(long id) {
        Player player = findPlayer(id);
        playerRepository.delete(player);
    }

    private List<PlayerResponse> queryWithoutPagination(String name, String team, String position, Double minPpg) {
        return playerRepository.findAll(
                        filters(name, team, position, minPpg, null, null, null, null),
                        Sort.by("name").ascending()
                ).stream()
                .map(PlayerResponse::from)
                .toList();
    }

    private Player findPlayer(long id) {
        return playerRepository.findById(id)
                .orElseThrow(() -> new PlayerNotFoundException("Player with id " + id + " was not found."));
    }

    private void apply(PlayerRequest request, Player player) {
        player.setName(request.name().trim());
        player.setTeam(request.team().trim().toUpperCase(Locale.ROOT));
        player.setPosition(request.position().trim().toUpperCase(Locale.ROOT));
        player.setPpg(request.ppg());
        player.setRpg(request.rpg());
        player.setApg(request.apg());
        player.setFgPercent(request.fgPercent());
        player.setThreePtPercent(request.threePtPercent());
        player.setSeason(request.season());
    }

    private String resolveSortField(String sortBy) {
        String field = SORT_FIELDS.get(sortBy);
        if (field == null) {
            throw new IllegalArgumentException(
                    "Unsupported sort field: " + sortBy
                            + ". Try one of: name, team, position, ppg, rpg, apg, fgPercent, threePtPercent, season."
            );
        }
        return field;
    }

    private String resolveLeaderboardField(String stat) {
        String field = SORT_FIELDS.get(stat);
        if (!List.of("ppg", "rpg", "apg", "fgPercent", "threePtPercent").contains(field)) {
            throw new IllegalArgumentException(
                    "Unsupported stat: " + stat
                            + ". Try one of: ppg, rpg, apg, fgPercent, threePtPercent."
            );
        }
        return field;
    }

    private String normalizeRequired(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return value.trim();
    }

    private Expression<String> unaccentLower(CriteriaBuilder criteriaBuilder, Expression<String> value) {
        return criteriaBuilder.function("unaccent", String.class, criteriaBuilder.lower(value));
    }

    private Specification<Player> filters(
            String name,
            String team,
            String position,
            Double minPpg,
            Double minRpg,
            Double minApg,
            Double minFg,
            Double minThreePt
    ) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (name != null && !name.isBlank()) {
                // unaccent() is applied to both sides so "Doncic" matches "Dončić".
                // It runs in SQL rather than Java because Java's normalizer leaves
                // non-decomposable letters such as Đ and ø untouched.
                predicates.add(criteriaBuilder.like(
                        unaccentLower(criteriaBuilder, root.get("name")),
                        unaccentLower(criteriaBuilder, criteriaBuilder.literal(
                                "%" + name.trim() + "%"
                        ))
                ));
            }
            if (team != null && !team.isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("team")),
                        team.trim().toLowerCase(Locale.ROOT)
                ));
            }
            if (position != null && !position.isBlank()) {
                predicates.add(criteriaBuilder.equal(
                        criteriaBuilder.lower(root.get("position")),
                        position.trim().toLowerCase(Locale.ROOT)
                ));
            }
            addMinimum(criteriaBuilder, root.get("ppg"), minPpg, predicates);
            addMinimum(criteriaBuilder, root.get("rpg"), minRpg, predicates);
            addMinimum(criteriaBuilder, root.get("apg"), minApg, predicates);
            addMinimum(criteriaBuilder, root.get("fgPercent"), minFg, predicates);
            addMinimum(criteriaBuilder, root.get("threePtPercent"), minThreePt, predicates);
            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };
    }

    private void addMinimum(
            jakarta.persistence.criteria.CriteriaBuilder criteriaBuilder,
            jakarta.persistence.criteria.Path<Double> path,
            Double minimum,
            List<Predicate> predicates
    ) {
        if (minimum != null) {
            predicates.add(criteriaBuilder.greaterThanOrEqualTo(path, minimum));
        }
    }
}
