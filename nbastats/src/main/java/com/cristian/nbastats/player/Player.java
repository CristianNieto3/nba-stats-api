package com.cristian.nbastats.player;


import jakarta.persistence.*;

@Entity
@Table(name = "player")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String team;
    private String position;
    private double ppg;
    private double rpg;
    private double apg;
    private double fg_percent;
    private double three_pt_percent;
    private int season;

    public Player() { //no-arg

    }


    public Player(Long id, String name, String team, String position,
                  double ppg, double rpg, double apg, double fg_percent, double three_pt_percent, int season) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.position = position;
        this.ppg = ppg;
        this.rpg = rpg;
        this.apg = apg;
        this.fg_percent = fg_percent;
        this.three_pt_percent = three_pt_percent;
        this.season = season;
    }

    public int getSeason() {
        return season;
    }

    public void setSeason(int season) {
        this.season = season;
    }

    public double getThree_pt_percent() {
        return three_pt_percent;
    }

    public void setThree_pt_percent(double three_pt_percent) {
        this.three_pt_percent = three_pt_percent;
    }

    public double getFg_percent() {
        return fg_percent;
    }

    public void setFg_percent(double fg_percent) {
        this.fg_percent = fg_percent;
    }

    public double getApg() {
        return apg;
    }

    public void setApg(double apg) {
        this.apg = apg;
    }

    public double getRpg() {
        return rpg;
    }

    public void setRpg(double rpg) {
        this.rpg = rpg;
    }

    public double getPpg() {
        return ppg;
    }

    public void setPpg(double ppg) {
        this.ppg = ppg;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getTeam() {
        return team;
    }

    public void setTeam(String team) {
        this.team = team;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    @Override
    public String toString() {
        return "Player{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", team='" + team + '\'' +
                ", position='" + position + '\'' +
                ", ppg=" + ppg +
                ", rpg=" + rpg +
                ", apg=" + apg +
                ", fg_percent=" + fg_percent +
                ", three_pt_percent=" + three_pt_percent +
                ", season=" + season +
                '}';
    }
}
