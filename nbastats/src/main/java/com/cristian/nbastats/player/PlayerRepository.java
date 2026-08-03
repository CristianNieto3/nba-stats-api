package com.cristian.nbastats.player;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, Long>, JpaSpecificationExecutor<Player> {

    Optional<Player> findFirstByNameIgnoreCase(String name);

    List<Player> findByNameContainingIgnoreCaseOrderByNameAsc(String name);
}

