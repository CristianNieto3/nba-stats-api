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
  season: number;
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
