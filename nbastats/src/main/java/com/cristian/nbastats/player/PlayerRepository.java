package com.cristian.nbastats.player;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, Long> {


    void deleteByName(String playerName);

    @Query("SELECT p FROM Player p WHERE LOWER(p.name) = LOWER(?1)")
    Optional<Player> getPlayerByName(String name);
}
