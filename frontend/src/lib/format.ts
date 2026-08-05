/** Per-game stats always show one decimal: 27 renders as 27.0, never 27. */
export function perGame(value: number): string {
  return value.toFixed(1);
}

/** Percentages always show one decimal plus the sign. */
export function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/** Empty team codes exist in the data (free agents); render an honest dash. */
export function teamCode(team: string): string {
  return team.trim() === "" ? "—" : team;
}
