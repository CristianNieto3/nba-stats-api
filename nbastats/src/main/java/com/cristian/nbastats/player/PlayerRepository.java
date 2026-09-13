package com.cristian.nbastats.player;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Name lookups run through PostgreSQL's unaccent() on both sides of the
 * comparison. Names are stored exactly as the NBA reports them ("Luka Dončić"),
 * but people search with plain ASCII, so an accent-sensitive match finds
 * nothing. Requires the unaccent extension: CREATE EXTENSION IF NOT EXISTS unaccent;
 */
public interface PlayerRepository extends JpaRepository<Player, Long>, JpaSpecificationExecutor<Player> {

    @Query(
            value = """
                    SELECT * FROM player
                    WHERE unaccent(lower(name)) = unaccent(lower(:name))
                    LIMIT 1
                    """,
            nativeQuery = true
    )
    Optional<Player> findFirstByNameNormalized(@Param("name") String name);

    @Query(
            value = """
                    SELECT * FROM player
                    WHERE unaccent(lower(name)) LIKE '%' || unaccent(lower(:name)) || '%'
                    ORDER BY name ASC
                    """,
            nativeQuery = true
    )
    List<Player> findByNameContainingNormalized(@Param("name") String name);

    /**
     * Stands in for "games the furthest-along team has played", which is what
     * the NBA prorates its in-season minimums against. The player table carries
     * no schedule, so the largest games-played value is the closest proxy
     * available; see QualificationRules.prorate.
     */
    @Query("SELECT COALESCE(MAX(p.gamesPlayed), 0) FROM Player p")
    int findMaxGamesPlayed();
}
