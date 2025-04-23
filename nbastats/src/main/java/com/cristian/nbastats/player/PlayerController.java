package com.cristian.nbastats.player;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Repository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(path = "/api/v1/players")
public class PlayerController {

    private final PlayerService playerService; //creates an instance of PlayerService

    @Autowired
    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    //Gets all players
    @GetMapping
    public List<Player> getAllPlayers() {
        return playerService.getAllPlayers();
   }

   @GetMapping("/filter")
   public List<Player> filterPlayer(
           @RequestParam(required = false) String team,
           @RequestParam(required = false) String position,
           @RequestParam(required = false) Double minPpg,
           @RequestParam(required = false) Double minRpg,
           @RequestParam(required = false) Double minApg,
           @RequestParam(required = false) Double minFg,
           @RequestParam(required = false) Double minThreePt

   ) {
       return playerService.filterPlayers(team, position, minPpg, minRpg, minApg, minFg, minThreePt);
   }

    //Gets partial/full matches and returns all players with that match (Le -> LeBron , Kawhi Le"onard etc...)
   @GetMapping ("/name/{name}")
   public List<Player> getPlayerByName(@PathVariable String name) {
        return playerService.getPlayerByName(name);
   }
    //For the UI - dropbar , google searchbar type function
   @GetMapping("/search")
   public List<String> searchPlayers(@RequestParam String query) {
        return playerService.searchPlayersByName(query);
    }


    //How the HTTP on top will look - how you must use it
   @GetMapping ("/team/{team}")
    public List<Player> getPlayersByTeam(@PathVariable String team) {
        return playerService.getPlayersByTeam(team);
   }

   //Gets each player by the position
   @GetMapping ("/position/{position}")
    public List<Player> getPlayersPosition(@PathVariable String position) {
        return playerService.getPlayersPosition(position);
   }

   @GetMapping ("/minPpg")
    public List<Player> getPlayersByMinPpg(@RequestParam(required = false, defaultValue = "0") double minPpg ) {
        return playerService.getPlayersByMinPpg(minPpg);
  }

   @GetMapping("/top-scorers")
    public List<Player> getTopScorers(@RequestParam(required = false, defaultValue = "0") int limit) {
        return playerService.getTopScorers(limit);
   }

   @GetMapping("/compare")
   public List<Player> comparePlayers(@RequestParam String name1 , @RequestParam String name2) {
        return playerService.comparePlayers(name1, name2);
   }

   @GetMapping("/leaders/{stat}")
   public List<Player> statLeaders(@RequestParam ( required = false , defaultValue = "5") int limit , String stat ) {
        return statLeaders(limit, stat);
   }

   @PostMapping
    public ResponseEntity<Player> addPlayer(@RequestBody Player player) {
        Player createdPlayer = playerService.addPlayer(player);
        return new ResponseEntity<Player>(createdPlayer, HttpStatus.CREATED);
   }

   @PutMapping
    public ResponseEntity<Player> updatePlayer(@RequestBody Player player) {
        Player resultPlayer = playerService.updatePlayer((player));
        if(resultPlayer != null) {
            return new ResponseEntity<>(resultPlayer, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
   }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deletePlayer(@PathVariable Long Id) {
        playerService.deletePlayer(Id);
        return new ResponseEntity<>("Player deleted successfully", HttpStatus.OK);
    }



}
