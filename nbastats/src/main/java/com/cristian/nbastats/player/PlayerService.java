package com.cristian.nbastats.player;

import com.cristian.nbastats.player.dto.LeaderEntry;
import com.cristian.nbastats.player.dto.LeaderboardResponse;
import com.cristian.nbastats.player.dto.PlayerRequest;
import com.cristian.nbastats.player.dto.PlayerResponse;
import com.cristian.nbastats.player.dto.QualificationInfo;
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

    /**
     * A leaderboard for one statistic, ranked over the players the NBA's
     * minimums qualify, with the excluded players returned alongside rather
     * than dropped -- a centre shooting 100% on his only attempt of the season
     * is the case a reader most wants explained, and hiding him explains
     * nothing.
     */
    public LeaderboardResponse leaderboard(String stat, int limit) {
        LeaderboardStat ranked = LeaderboardStat.from(stat);
        int leagueGames = playerRepository.findMaxGamesPlayed();
        int minGames = QualificationRules.prorate(QualificationRules.MIN_GAMES_PLAYED, leagueGames);
        Integer minMade = ranked.isPercentage()
                ? QualificationRules.prorate(ranked.fullSeasonMinimumMade(), leagueGames)
                : null;

        PageRequest topOfBoard = PageRequest.of(0, limit, Sort.by(ranked.entityField()).descending());
        List<Player> qualified = playerRepository
                .findAll(meetsMinimums(ranked, minGames, minMade, true), topOfBoard)
                .getContent();
        List<Player> excluded = playerRepository
                .findAll(meetsMinimums(ranked, minGames, minMade, false), topOfBoard)
                .getContent();

        List<LeaderEntry> leaders = new ArrayList<>();
        for (int index = 0; index < qualified.size(); index++) {
            leaders.add(entry(qualified.get(index), ranked, index + 1, minGames, minMade));
        }

        return new LeaderboardResponse(
                ranked.apiName(),
                new QualificationInfo(
                        leagueGames,
                        minGames,
                        minMade,
                        ranked.madeField().orElse(null),
                        summarise(ranked, minGames, minMade)
                ),
                leaders,
                excluded.stream()
                        .map(player -> entry(player, ranked, null, minGames, minMade))
                        .toList()
        );
    }

    /** The ranked players alone, for callers that only want the top of the board. */
    public List<PlayerResponse> leaders(int limit, String stat) {
        return leaderboard(stat, limit).leaders().stream()
                .map(LeaderEntry::player)
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

    /**
     * The qualification rule as a predicate, or its negation. Both halves come
     * from one place so the excluded list is exactly the complement of the
     * ranked one and no player can fall through the gap between them.
     */
    private Specification<Player> meetsMinimums(
            LeaderboardStat stat,
            int minGames,
            Integer minMade,
            boolean qualifying
    ) {
        return (root, query, criteriaBuilder) -> {
            Predicate rule = criteriaBuilder.greaterThanOrEqualTo(
                    root.<Integer>get("gamesPlayed"), minGames
            );
            if (minMade != null) {
                rule = criteriaBuilder.and(rule, criteriaBuilder.greaterThanOrEqualTo(
                        root.<Integer>get(stat.madeField().orElseThrow()), minMade
                ));
            }
            return qualifying ? rule : criteriaBuilder.not(rule);
        };
    }

    private LeaderEntry entry(
            Player player,
            LeaderboardStat stat,
            Integer rank,
            int minGames,
            Integer minMade
    ) {
        boolean qualified = rank != null;
        return new LeaderEntry(
                rank,
                PlayerResponse.from(player),
                stat.valueOf(player),
                player.getGamesPlayed(),
                stat.madeBy(player).orElse(null),
                stat.attemptedBy(player).orElse(null),
                qualified,
                qualified ? null : shortfall(player, stat, minGames, minMade)
        );
    }

    /** Why this player is not ranked, in the terms the rule is written in. */
    private String shortfall(Player player, LeaderboardStat stat, int minGames, Integer minMade) {
        List<String> shortfalls = new ArrayList<>();
        if (player.getGamesPlayed() < minGames) {
            shortfalls.add(player.getGamesPlayed() + " of " + minGames + " games played");
        }
        if (minMade != null) {
            int made = stat.madeBy(player).orElse(0);
            if (made < minMade) {
                shortfalls.add(made + " of " + minMade + " " + stat.madeLabel());
            }
        }
        return shortfalls.isEmpty() ? null : String.join("; ", shortfalls);
    }

    private String summarise(LeaderboardStat stat, int minGames, Integer minMade) {
        String games = "minimum " + minGames + " games played";
        return minMade == null ? games : games + " and " + minMade + " " + stat.madeLabel();
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
