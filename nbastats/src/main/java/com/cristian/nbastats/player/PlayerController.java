package com.cristian.nbastats.player;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping(path = "/api/v1/players")
public class PlayerController {

    private final PlayerService playerService; //creates an instance of PlayerService

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    //Gets all players
    @GetMapping
    public List<Player> getAllPlayers() {
        return playerService.getAllPlayers();
   }

   @GetMapping ("/name/{name}")
   public List<Player> getPlayerByName(@PathVariable String name) {
        return playerService.getPlayerByName(name);
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

 // @GetMapping ("/minppg")
 // public List<Player> getMinPPG(@RequestParam(required = false, defaultValue = "0") double ppg ) {
 //     return playerService.getMinPPG(ppg);
 // }




}
