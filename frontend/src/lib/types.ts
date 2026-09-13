export type Player = {
  id: number;
  name: string;
  team: string;
  position: string;
  ppg: number;
  rpg: number;
  apg: number;
  fg_percent: number;
  three_pt_percent: number;
  ft_percent: number;
  season: number;
  /** Volume behind the percentages, so "36.6%" can be shown as "1-for-1". */
  games_played: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  ftm: number;
  fta: number;
};

/**
 * The thresholds a leaderboard was built with. The API returns them so the page
 * can print the rule rather than silently dropping players from the table.
 */
export type Qualification = {
  leagueGamesPlayed: number;
  minGamesPlayed: number;
  /** Null for per-game stats, which carry no made-shot requirement. */
  minMade: number | null;
  madeStat: string | null;
  summary: string;
};

export type LeaderEntry = {
  /** Null when the player did not qualify. */
  rank: number | null;
  player: Player;
  value: number;
  gamesPlayed: number;
  made: number | null;
  attempted: number | null;
  qualified: boolean;
  /** Why they missed, null when they qualified. */
  reason: string | null;
};

export type Leaderboard = {
  stat: string;
  qualification: Qualification;
  leaders: LeaderEntry[];
  unqualified: LeaderEntry[];
};

export type ApiErrorBody = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: Record<string, string>;
};

/** Spring Data page envelope, as serialized by the backend. */
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

/** The five stats the API can rank and the labels the UI uses for them. */
export const STATS = [
  { key: "ppg", label: "PPG", long: "Points per game", percent: false },
  { key: "rpg", label: "RPG", long: "Rebounds per game", percent: false },
  { key: "apg", label: "APG", long: "Assists per game", percent: false },
  { key: "fgPercent", label: "FG%", long: "Field-goal percentage", percent: true },
  { key: "threePtPercent", label: "3P%", long: "Three-point percentage", percent: true },
] as const;

export type StatKey = (typeof STATS)[number]["key"];

/** Read a stat off the snake_case wire format by its API key. */
export function statValue(player: Player, stat: StatKey): number {
  switch (stat) {
    case "ppg":
      return player.ppg;
    case "rpg":
      return player.rpg;
    case "apg":
      return player.apg;
    case "fgPercent":
      return player.fg_percent;
    case "threePtPercent":
      return player.three_pt_percent;
  }
}

export type PageQuery = {
  name?: string;
  team?: string;
  position?: string;
  minPpg?: string;
  minRpg?: string;
  minApg?: string;
  minFg?: string;
  minThreePt?: string;
  page?: string;
  size?: string;
  sortBy?: string;
  direction?: string;
};
