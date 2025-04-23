package com.cristian.nbastats.player;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.*;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;

    @Autowired
    public PlayerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    //Returns ALL players
    public List<Player> getAllPlayers() {
        return playerRepository.findAll();
    }

    public List<Player> filterPlayers(String team, String position, Double minPpg, Double minRpg, Double minApg, Double minFg, Double minThreePt) {
        return playerRepository.findAll().stream()
                .filter(p -> team == null || p.getTeam().equalsIgnoreCase(team))
                .filter(p -> position == null || p.getPosition().equalsIgnoreCase(position))
                .filter(p -> minPpg == null || p.getPpg() >= minPpg)
                .filter(p -> minRpg == null || p.getRpg() >= minRpg)
                .filter(p -> minApg == null || p.getApg() >= minApg)
                .filter(p -> minFg == null || p.getFg_percent() >= minFg)
                .filter(p -> minThreePt == null || p.getThree_pt_percent() >= minThreePt)
                .toList();
    }

    //Search players by their name
    public List<Player> getPlayerByName(String name) {
        return playerRepository.findAll().stream()
                .filter(player -> player.getName().toLowerCase().contains(name.toLowerCase())).toList();
    }


    public List<String> searchPlayersByName(String query) { //returns partial matches also - used for UI drop bar -
        return playerRepository.findAll().stream()
                .filter(player -> player.getName().toLowerCase().contains(query.toLowerCase()))
                .map(Player::getName)
                .distinct()
                .limit(10) // optional: limit dropdown size
                .toList();
    }


    //Returns all the players that play for a specific team.
    public List<Player> getPlayersByTeam(String team) {
        return playerRepository.findAll().stream()
                .filter(player -> player.getTeam().equalsIgnoreCase(team)).toList();
    }

    //Returns all the players that are a certain position
    public List<Player> getPlayersPosition(String position) {
        return playerRepository.findAll().stream()
                .filter(player -> player.getPosition().equalsIgnoreCase(position)).toList();
    }

    //Returns players with PPG >= users entered number
    public List<Player> getPlayersByMinPpg(double minPpg) {
        return playerRepository.findAll().stream()
                .filter(player -> player.getPpg() >= minPpg)
                .toList();
    }

    public List<Player> getTopScorers(int limit) {
        if (limit <= 0) {
            return new ArrayList<>(); // Return an empty list if limit is 0 or less
        }
        return playerRepository.findAll().stream()
                .sorted((p1, p2) -> Double.compare(p2.getPpg(), p1.getPpg())) // Sort by PPG in descending order
                .limit(limit) // Take only the top 'limit' players
                .toList(); // Collect the results into a list
    }

    public List<Player> comparePlayers(String name1, String name2) {
            if (name1 == null || name1.isEmpty()) {
                throw new IllegalArgumentException("Player #1 is not found. Provide a valid player name. ");
            } else if (name2 == null || name2.isEmpty()) {
                    throw new IllegalArgumentException("Player #2 is not found. Provide a valid player name.");
            }
            Optional<Player> validPlayer1 = playerRepository.getPlayerByName(name1);
            if(validPlayer1.isEmpty()){
                throw new IllegalArgumentException("Player 1 not found");
            }
                Optional<Player> validPlayer2 = playerRepository.getPlayerByName(name2);
                if (validPlayer2.isEmpty()) {
                    throw new IllegalArgumentException("Player 2 is not found");
                }
                Player player1 = validPlayer1.get();
                Player player2 = validPlayer2.get();
                List<Player> comparedPlayers = new ArrayList<>();

                comparedPlayers.add(player1);
                comparedPlayers.add(player2);

                return comparedPlayers;

    }

    public List<Player> statLeaders(int limit, String stat) {
        List<String> validStats = new ArrayList<>();
        validStats.add("ppg");
        validStats.add("apg");
        validStats.add("rpg");
        validStats.add("fg_percent");
        validStats.add("three_pt_percent");
        if(!validStats.contains(stat)){
            throw new IllegalArgumentException("Unsupported stat: " + stat + ". Try one of: ppg, apg, rpg, fg_percent, three_pt_percent.");
        }
        List<Player> allPlayers = playerRepository.findAll();
        switch(stat.toLowerCase()) {
            case "ppg":
                allPlayers.stream().filter().g
        }
    }






    //Add player
    public Player addPlayer(Player player) {
        playerRepository.save(player);
        return player;
    }

    //Updates player info (must match by ID)
    public Player updatePlayer(Player updatedPlayer) {
        Optional<Player> existingPlayer = playerRepository.findById(updatedPlayer.getId());
        if (existingPlayer.isPresent()) {
            Player playerToUpdate = existingPlayer.get();
            playerToUpdate.setName(updatedPlayer.getName());
            playerToUpdate.setTeam(updatedPlayer.getTeam());
            playerToUpdate.setPosition(updatedPlayer.getPosition());
            playerToUpdate.setPpg(updatedPlayer.getPpg());
            playerToUpdate.setRpg(updatedPlayer.getRpg());
            playerToUpdate.setApg(updatedPlayer.getApg());
            playerToUpdate.setFg_percent(updatedPlayer.getFg_percent());
            playerToUpdate.setThree_pt_percent(updatedPlayer.getThree_pt_percent());
            playerToUpdate.setSeason(updatedPlayer.getSeason());
            return playerRepository.save(playerToUpdate);
        } else {
            throw new IllegalArgumentException("Player with id " + updatedPlayer.getId() + " not found.");
        }
    }

    //Deletes a player by id
    public void deletePlayer(Long id) {
        playerRepository.deleteById(id);
    }

    //Loads all players from the csv and saves them into the database
    private void loadPlayersFromCsv() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(getClass().getResourceAsStream("/nba_players.csv")))) {

            String line;
            boolean skipHeader = true;
            List<Player> playersToSave = new ArrayList<>();

            while ((line = reader.readLine()) != null) {
                if (skipHeader) {
                    skipHeader = false;
                    continue;
                }
                String[] fields = line.split(",");
                Player player = new Player(Long.parseLong(fields[0]),
                        fields[1],
                        fields[2],
                        fields[3],
                        Double.parseDouble(fields[4]),
                        Double.parseDouble(fields[5]),
                        Double.parseDouble(fields[6]),
                        Double.parseDouble(fields[7]),
                        Double.parseDouble(fields[8]),
                        Integer.parseInt(fields[9]));

                playersToSave.add(player);
            }

            playerRepository.saveAll(playersToSave); // saves all to the DB

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}

