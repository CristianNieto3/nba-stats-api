package com.cristian.nbastats.player;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "player")
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String team;

    @Column(nullable = false)
    private String position;

    private double ppg;
    private double rpg;
    private double apg;

    @Column(name = "fg_percent")
    private double fgPercent;

    @Column(name = "three_pt_percent")
    private double threePtPercent;

    private int season;

    public Player() {
    }

    public Player(Long id, String name, String team, String position,
                  double ppg, double rpg, double apg, double fgPercent, double threePtPercent, int season) {
        this.id = id;
        this.name = name;
        this.team = team;
        this.position = position;
        this.ppg = ppg;
        this.rpg = rpg;
        this.apg = apg;
        this.fgPercent = fgPercent;
        this.threePtPercent = threePtPercent;
        this.season = season;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTeam() {
        return team;
    }

    public void setTeam(String team) {
        this.team = team;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public double getPpg() {
        return ppg;
    }

    public void setPpg(double ppg) {
        this.ppg = ppg;
    }

    public double getRpg() {
        return rpg;
    }

    public void setRpg(double rpg) {
        this.rpg = rpg;
    }

    public double getApg() {
        return apg;
    }

    public void setApg(double apg) {
        this.apg = apg;
    }

    public double getFgPercent() {
        return fgPercent;
    }

    public void setFgPercent(double fgPercent) {
        this.fgPercent = fgPercent;
    }

    public double getThreePtPercent() {
        return threePtPercent;
    }

    public void setThreePtPercent(double threePtPercent) {
        this.threePtPercent = threePtPercent;
    }

    public int getSeason() {
        return season;
    }

    public void setSeason(int season) {
        this.season = season;
    }
}
