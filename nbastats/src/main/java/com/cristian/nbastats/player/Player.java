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

    // Volume behind the percentages. The percentage columns alone cannot
    // distinguish 1-for-1 from 200-for-500, which is what the NBA's leaderboard
    // minimums are written in terms of; see QualificationRules.
    @Column(name = "games_played")
    private int gamesPlayed;

    private int fgm;
    private int fga;
    private int fg3m;
    private int fg3a;
    private int ftm;
    private int fta;

    @Column(name = "ft_percent")
    private double ftPercent;

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

    public Player(Long id, String name, String team, String position,
                  double ppg, double rpg, double apg, double fgPercent, double threePtPercent, int season,
                  int gamesPlayed, int fgm, int fga, int fg3m, int fg3a, int ftm, int fta, double ftPercent) {
        this(id, name, team, position, ppg, rpg, apg, fgPercent, threePtPercent, season);
        this.gamesPlayed = gamesPlayed;
        this.fgm = fgm;
        this.fga = fga;
        this.fg3m = fg3m;
        this.fg3a = fg3a;
        this.ftm = ftm;
        this.fta = fta;
        this.ftPercent = ftPercent;
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

    public int getGamesPlayed() {
        return gamesPlayed;
    }

    public void setGamesPlayed(int gamesPlayed) {
        this.gamesPlayed = gamesPlayed;
    }

    public int getFgm() {
        return fgm;
    }

    public void setFgm(int fgm) {
        this.fgm = fgm;
    }

    public int getFga() {
        return fga;
    }

    public void setFga(int fga) {
        this.fga = fga;
    }

    public int getFg3m() {
        return fg3m;
    }

    public void setFg3m(int fg3m) {
        this.fg3m = fg3m;
    }

    public int getFg3a() {
        return fg3a;
    }

    public void setFg3a(int fg3a) {
        this.fg3a = fg3a;
    }

    public int getFtm() {
        return ftm;
    }

    public void setFtm(int ftm) {
        this.ftm = ftm;
    }

    public int getFta() {
        return fta;
    }

    public void setFta(int fta) {
        this.fta = fta;
    }

    public double getFtPercent() {
        return ftPercent;
    }

    public void setFtPercent(double ftPercent) {
        this.ftPercent = ftPercent;
    }
}
