package com.cristian.nbastats.player;


import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

@Service
public class PlayerService {

    private List<Player> mockPlayers = new ArrayList<>();

    public PlayerService() {
        loadPlayersFromCsv();
    }

    //Returns ALL players
    public List<Player> getAllPlayers() {
        return mockPlayers;
    }
    //Search players by their name
    public List<Player> getPlayerByName(String name) {
        return mockPlayers.stream()
                .filter(player -> player.getName().toLowerCase().contains(name.toLowerCase())).toList();
    }
   //Returns players with PPG >= users entered number
   //public List<Player> getMinPpg(double ppg) {
   //    return mockPlayers.stream()
   //            .filter(player -> player.)
   //}
    //Returns all the players that play for a specific team.
    public List<Player> getPlayersByTeam(String team) {
        return mockPlayers.stream()
                .filter(player -> player.getTeam().equalsIgnoreCase(team)).toList();
    }
    //Returns all the players that ara a certain position
    public List<Player> getPlayersPosition(String position) {
        return mockPlayers.stream()
                .filter(player -> player.getPosition().equalsIgnoreCase(position)).toList();
    }






    private void loadPlayersFromCsv() {
        try(BufferedReader reader = new BufferedReader(new InputStreamReader(getClass().getResourceAsStream("/nba_players.csv")))) {

            String line;
            boolean skipHeader = true;

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

                mockPlayers.add(player);
            }
        }catch (IOException e) {
            e.printStackTrace();
        }
    }



}
