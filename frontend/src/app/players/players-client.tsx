"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchPlayersPage } from "@/lib/api";
import { fetchFilterOptions } from "@/lib/options";
import { perGame, percent, teamCode } from "@/lib/format";
import type { PageQuery, Player } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/states";

/** Columns in display order; sort keys are the API's allowlisted fields. */
const COLUMNS = [
  { key: "name", label: "Player", numeric: false },
  { key: "team", label: "Team", numeric: false },
  { key: "position", label: "Position", numeric: false },
  { key: "ppg", label: "PPG", numeric: true },
  { key: "rpg", label: "RPG", numeric: true },
  { key: "apg", label: "APG", numeric: true },
  { key: "fgPercent", label: "FG%", numeric: true },
  { key: "threePtPercent", label: "3P%", numeric: true },
  { key: "season", label: "Season", numeric: true },
] as const;

const MIN_FILTERS = [
  { key: "minPpg", label: "Min PPG" },
  { key: "minRpg", label: "Min RPG" },
  { key: "minApg", label: "Min APG" },
  { key: "minFg", label: "Min FG%" },
  { key: "minThreePt", label: "Min 3P%" },
] as const;

type FilterKey = (typeof MIN_FILTERS)[number]["key"] | "name" | "team" | "position";

function readQuery(params: URLSearchParams): PageQuery {
  const query: PageQuery = {};
  for (const key of [
    "name",
    "team",
    "position",
    "minPpg",
    "minRpg",
    "minApg",
    "minFg",
    "minThreePt",
    "page",
    "size",
    "sortBy",
    "direction",
  ] as const) {
    const value = params.get(key);
    if (value !== null && value !== "") query[key] = value;
  }
  return query;
}

export function PlayersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = useMemo(() => readQuery(new URLSearchParams(searchParams)), [searchParams]);

  const sortBy = query.sortBy ?? "name";
  const direction = query.direction ?? "asc";
  const size = query.size ?? "20";

  // Draft state for typed inputs; synced to the URL on a debounce so every
  // keystroke doesn't push a history entry or fire a request.
  const [draft, setDraft] = useState<Record<string, string>>({});
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateUrl(patch: Partial<PageQuery>, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    router.replace(`/players?${next.toString()}`, { scroll: false });
  }

  function setTypedFilter(key: FilterKey, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => updateUrl({ [key]: value }), 400);
  }

  useEffect(() => () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
  }, []);

  const queryKey = JSON.stringify(query);
  const result = useQuery(queryKey, () => fetchPlayersPage(query));
  const options = useQuery("filter-options", fetchFilterOptions);

  const activeFilters: Array<[FilterKey, string]> = (
    [
      ["name", query.name ? `Name contains “${query.name}”` : ""],
      ["team", query.team ? `Team ${query.team}` : ""],
      ["position", query.position ? `Position ${query.position}` : ""],
      ...MIN_FILTERS.map((f): [FilterKey, string] => [f.key, query[f.key] ? `${f.label} ${query[f.key]}` : ""]),
    ] as Array<[FilterKey, string]>
  ).filter((entry) => entry[1] !== "");

  function clearAll() {
    setDraft({});
    updateUrl(
      Object.fromEntries(
        ["name", "team", "position", ...MIN_FILTERS.map((f) => f.key)].map((k) => [k, ""]),
      ),
    );
  }

  function toggleSort(key: string) {
    if (sortBy === key) {
      updateUrl({ sortBy: key, direction: direction === "asc" ? "desc" : "asc" }, false);
    } else {
      updateUrl({ sortBy: key, direction: COLUMNS.find((c) => c.key === key)?.numeric ? "desc" : "asc" });
    }
  }

  const data = result.data;
  const inputClass =
    "bg-surface border border-hairline rounded-sm px-2.5 py-1.5 text-[14px] text-ink placeholder:text-ink-3";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-display font-bold uppercase tracking-wide text-3xl text-ink">Players</h1>
        <p aria-live="polite" className="text-[14px] text-ink-2 tnum">
          {data ? `${data.totalElements} players` : " "}
        </p>
      </div>

      {/* One filter row scoping everything below — never per-column popovers. */}
      <div className="mt-5 border border-hairline rounded-md bg-surface px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="section-label">Name contains</span>
            <input
              type="text"
              value={draft.name ?? query.name ?? ""}
              onChange={(e) => setTypedFilter("name", e.target.value)}
              placeholder="e.g. Jokic"
              className={`${inputClass} w-44`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-label">Team</span>
            <select
              value={query.team ?? ""}
              onChange={(e) => updateUrl({ team: e.target.value })}
              className={`${inputClass} w-28 cursor-pointer`}
            >
              <option value="">All teams</option>
              {options.data?.teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="section-label">Position</span>
            {/* Options are the values actually stored in the data. */}
            <select
              value={query.position ?? ""}
              onChange={(e) => updateUrl({ position: e.target.value })}
              className={`${inputClass} w-40 cursor-pointer`}
            >
              <option value="">All positions</option>
              {options.data?.positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </label>
          {MIN_FILTERS.map((filter) => (
            <label key={filter.key} className="flex flex-col gap-1.5">
              <span className="section-label">{filter.label}</span>
              <input
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={draft[filter.key] ?? query[filter.key] ?? ""}
                onChange={(e) => setTypedFilter(filter.key, e.target.value)}
                className={`${inputClass} w-24 tnum`}
              />
            </label>
          ))}
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-3 pt-3 border-t border-hairline flex flex-wrap items-center gap-2">
            {activeFilters.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setDraft((prev) => ({ ...prev, [key]: "" }));
                  updateUrl({ [key]: "" });
                }}
                className="group flex items-center gap-1.5 border border-hairline rounded-sm px-2 py-1 text-[13px] text-ink-2 hover:bg-row-hover hover:text-ink transition-colors cursor-pointer"
              >
                <span>{label}</span>
                <span aria-hidden="true" className="text-ink-3 group-hover:text-accent">
                  ✕
                </span>
                <span className="sr-only">— remove filter</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-[13px] text-accent hover:underline underline-offset-2 px-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      <div className="mt-5">
        {result.loading && <TableSkeleton rows={Number(size) > 20 ? 20 : Number(size)} />}
        {result.error && <ErrorState error={result.error} retry={result.retry} />}
        {data && data.content.length === 0 && (
          <EmptyState
            title="No players match these filters"
            body="Every active filter narrows the roster. Loosen a threshold or clear them all."
            action={{ label: "Clear all filters", onClick: clearAll }}
          />
        )}
        {data && data.content.length > 0 && (
          <div className={result.refetching ? "refetching" : ""} aria-busy={result.refetching}>
            {/* Desktop table */}
            <div className="hidden md:block border border-hairline rounded-md bg-surface overflow-x-auto">
              <table className="w-full text-[15px]">
                <caption className="sr-only">
                  Player roster, sorted by {COLUMNS.find((c) => c.key === sortBy)?.label ?? sortBy},{" "}
                  {direction === "asc" ? "ascending" : "descending"}
                </caption>
                <thead>
                  <tr className="border-b border-hairline">
                    {COLUMNS.map((column) => {
                      const active = sortBy === column.key;
                      return (
                        <th
                          key={column.key}
                          scope="col"
                          aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
                          className={column.numeric ? "text-right" : "text-left"}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSort(column.key)}
                            className={`section-label w-full px-3 py-2.5 cursor-pointer hover:text-ink transition-colors ${
                              column.numeric ? "text-right" : "text-left"
                            } ${active ? "text-accent" : ""}`}
                          >
                            {column.label}
                            <span aria-hidden="true">{active ? (direction === "asc" ? " ▲" : " ▼") : ""}</span>
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((player) => (
                    <PlayerRow key={player.id} player={player} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Stacked cards under md; sorting stays available via the header controls above. */}
            <div className="md:hidden flex flex-col gap-2">
              <label className="flex items-center gap-2 text-[13px] text-ink-2">
                <span className="section-label">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (next !== sortBy) {
                      const numeric = COLUMNS.find((c) => c.key === next)?.numeric;
                      updateUrl({ sortBy: next, direction: numeric ? "desc" : "asc" });
                    }
                  }}
                  className={`${inputClass} cursor-pointer`}
                >
                  {COLUMNS.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => updateUrl({ direction: direction === "asc" ? "desc" : "asc" }, false)}
                  className="border border-hairline rounded-sm px-2 py-1.5 text-[13px] cursor-pointer hover:bg-row-hover"
                >
                  {direction === "asc" ? "Ascending ▲" : "Descending ▼"}
                </button>
              </label>
              {data.content.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </div>

            <Pagination
              page={data.number}
              totalPages={data.totalPages}
              size={size}
              onPage={(p) => updateUrl({ page: String(p) }, false)}
              onSize={(s) => updateUrl({ size: s })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const router = useRouter();
  return (
    <tr
      className="row-interactive border-b border-hairline last:border-b-0 cursor-pointer"
      onClick={() => router.push(`/players/${player.id}`)}
    >
      <td className="px-3 py-2.5">
        <Link
          href={`/players/${player.id}`}
          className="font-medium text-ink hover:text-accent transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {player.name}
        </Link>
      </td>
      <td className="px-3 py-2.5 text-ink-2">{teamCode(player.team)}</td>
      <td className="px-3 py-2.5 text-ink-2">{player.position}</td>
      <td className="px-3 py-2.5 text-right tnum">{perGame(player.ppg)}</td>
      <td className="px-3 py-2.5 text-right tnum">{perGame(player.rpg)}</td>
      <td className="px-3 py-2.5 text-right tnum">{perGame(player.apg)}</td>
      <td className="px-3 py-2.5 text-right tnum">{percent(player.fg_percent)}</td>
      <td className="px-3 py-2.5 text-right tnum">{percent(player.three_pt_percent)}</td>
      <td className="px-3 py-2.5 text-right tnum text-ink-2">{player.season}</td>
    </tr>
  );
}

function PlayerCard({ player }: { player: Player }) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="row-interactive block border border-hairline rounded-md bg-surface px-4 py-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display font-semibold text-lg text-ink">{player.name}</span>
        <span className="text-[13px] text-ink-2">
          {teamCode(player.team)} · {player.position}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-5 gap-2 text-center">
        {(
          [
            ["PPG", perGame(player.ppg)],
            ["RPG", perGame(player.rpg)],
            ["APG", perGame(player.apg)],
            ["FG%", percent(player.fg_percent)],
            ["3P%", percent(player.three_pt_percent)],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt className="section-label text-[10px]">{label}</dt>
            <dd className="tnum text-[15px] text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  size,
  onPage,
  onSize,
}: {
  page: number;
  totalPages: number;
  size: string;
  onPage: (page: number) => void;
  onSize: (size: string) => void;
}) {
  const buttonClass =
    "font-display uppercase tracking-wider text-[13px] font-semibold border border-hairline rounded-sm px-3 py-1.5 hover:bg-row-hover transition-colors disabled:opacity-45 disabled:cursor-not-allowed disabled:line-through cursor-pointer";
  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" className={buttonClass} disabled={page <= 0} onClick={() => onPage(page - 1)}>
        Previous
      </button>
      <span className="text-[14px] text-ink-2 tnum">
        Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
      </span>
      <button
        type="button"
        className={buttonClass}
        disabled={page >= totalPages - 1}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
      <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
        <span className="section-label">Per page</span>
        <select
          value={size}
          onChange={(e) => onSize(e.target.value)}
          className="bg-surface border border-hairline rounded-sm px-2 py-1.5 text-[14px] cursor-pointer"
        >
          {["10", "20", "50", "100"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
