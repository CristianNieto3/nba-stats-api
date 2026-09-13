import { fetchAllPlayers, fetchLeaders } from "./api";
import { STATS, type StatKey } from "./types";

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

/**
 * League maximum per stat — the scale anchor for every contextual bar.
 *
 * Anchored on the qualified leader, which is the whole point: anchoring on the
 * raw maximum scaled every three-point bar on the site against a player who
 * went 1-for-1, so a genuine 41% season rendered as a 41%-full bar.
 */
export function fetchLeagueMaxima(): Promise<LeagueMaxima> {
  maximaPromise ??= Promise.all(
    STATS.map(async (stat) => {
      const board = await fetchLeaders(stat.key, 1);
      return [stat.key, board.leaders[0]?.value ?? 0] as const;
    }),
  )
    .then((entries) => Object.fromEntries(entries) as LeagueMaxima)
    .catch((error) => {
      maximaPromise = null;
      throw error;
    });
  return maximaPromise;
}
