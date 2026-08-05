import { fetchAllPlayers, fetchLeaders } from "./api";
import { STATS, statValue, type StatKey } from "./types";

/**
 * Filter options are derived from the data actually stored — the position
 * filter matches exact stored values like "Center-Forward", never a
 * hand-written PG/SG list. Cached for the session; the roster is a snapshot.
 */
let optionsPromise: Promise<{ teams: string[]; positions: string[] }> | null = null;

export function fetchFilterOptions() {
  optionsPromise ??= fetchAllPlayers()
    .then((players) => ({
      teams: [...new Set(players.map((p) => p.team).filter((t) => t.trim() !== ""))].sort(),
      positions: [...new Set(players.map((p) => p.position))].sort(),
    }))
    .catch((error) => {
      optionsPromise = null;
      throw error;
    });
  return optionsPromise;
}

export type LeagueMaxima = Record<StatKey, number>;

let maximaPromise: Promise<LeagueMaxima> | null = null;

/** League maximum per stat (leaders/{stat}?limit=1) — the scale anchor for every contextual bar. */
export function fetchLeagueMaxima(): Promise<LeagueMaxima> {
  maximaPromise ??= Promise.all(
    STATS.map(async (stat) => {
      const [leader] = await fetchLeaders(stat.key, 1);
      return [stat.key, leader ? statValue(leader, stat.key) : 0] as const;
    }),
  )
    .then((entries) => Object.fromEntries(entries) as LeagueMaxima)
    .catch((error) => {
      maximaPromise = null;
      throw error;
    });
  return maximaPromise;
}
