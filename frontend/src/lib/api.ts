import type { ApiErrorBody, PageQuery, PageResponse, Player, StatKey } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const ROOT = `${API_BASE}/api/v1/players`;

/**
 * Every failure the backend produces uses one error envelope; a fetch that
 * never reached the server surfaces as status 0 so the UI can say
 * "API unreachable" instead of pretending it got a 500.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${ROOT}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiRequestError(0, "The stats API is unreachable.");
  }

  if (!response.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = await response.json();
    } catch {
      // Non-JSON error body; fall through to the generic message.
    }
    throw new ApiRequestError(
      body.status ?? response.status,
      body.message ?? `Request failed with status ${response.status}.`,
      body.fieldErrors ?? {},
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export function fetchPlayersPage(query: PageQuery): Promise<PageResponse<Player>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  return request(`/page?${params}`);
}

export function fetchPlayer(id: number | string): Promise<Player> {
  return request(`/${id}`);
}

export function fetchAllPlayers(): Promise<Player[]> {
  return request("");
}

export function searchNames(query: string): Promise<string[]> {
  return request(`/search?query=${encodeURIComponent(query)}`);
}

export function fetchByName(name: string): Promise<Player[]> {
  return request(`/name/${encodeURIComponent(name)}`);
}

export function comparePlayers(name1: string, name2: string): Promise<Player[]> {
  return request(`/compare?name1=${encodeURIComponent(name1)}&name2=${encodeURIComponent(name2)}`);
}

export function fetchLeaders(stat: StatKey, limit: number): Promise<Player[]> {
  return request(`/leaders/${stat}?limit=${limit}`);
}

export function fetchTopScorers(limit: number): Promise<Player[]> {
  return request(`/top-scorers?limit=${limit}`);
}

export type PlayerWrite = {
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

export function createPlayer(body: PlayerWrite): Promise<Player> {
  return request("", { method: "POST", body: JSON.stringify(body) });
}

export function updatePlayer(id: number, body: PlayerWrite): Promise<Player> {
  return request(`/${id}`, { method: "PUT", body: JSON.stringify(body) });
}

export function deletePlayer(id: number): Promise<void> {
  return request(`/${id}`, { method: "DELETE" });
}

/**
 * The suggestion endpoint returns names only. Resolve one to a full record via
 * the partial-name search, preferring the exact (case-insensitive) match.
 */
export async function resolvePlayerByName(name: string): Promise<Player | null> {
  const matches = await fetchByName(name);
  const exact = matches.find((p) => p.name.toLowerCase() === name.toLowerCase());
  return exact ?? matches[0] ?? null;
}
