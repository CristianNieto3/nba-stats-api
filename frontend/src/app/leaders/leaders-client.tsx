"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchLeaders } from "@/lib/api";
import { perGame, percent, teamCode } from "@/lib/format";
import { STATS, type StatKey } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { ErrorState, TableSkeleton } from "@/components/states";
import { MagnitudeBar } from "@/components/magnitude-bar";

const LIMITS = ["10", "25", "50", "100"] as const;

export function LeadersClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const statParam = searchParams.get("stat");
  const stat: StatKey = STATS.some((s) => s.key === statParam) ? (statParam as StatKey) : "ppg";
  const limitParam = searchParams.get("limit");
  const limit = LIMITS.includes(limitParam as (typeof LIMITS)[number]) ? (limitParam as string) : "10";

  function updateUrl(nextStat: string, nextLimit: string) {
    const params = new URLSearchParams();
    if (nextStat !== "ppg") params.set("stat", nextStat);
    if (nextLimit !== "10") params.set("limit", nextLimit);
    const qs = params.toString();
    router.replace(qs ? `/leaders?${qs}` : "/leaders", { scroll: false });
  }

  const meta = STATS.find((s) => s.key === stat)!;
  const result = useQuery(`leaders-${stat}-${limit}`, () => fetchLeaders(stat, Number(limit)));
  const board = result.data;
  // Anchored on the qualified leader, so a 1-for-1 season cannot set the scale.
  const max = board?.leaders[0]?.value ?? 0;

  return (
    <div className="max-w-4xl">
      <h1 className="font-display font-bold uppercase tracking-wide text-3xl text-ink">Leaders</h1>

      <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
        {/* Stat selector — the five stats the API can rank, nothing more. */}
        <div role="group" aria-label="Statistic" className="flex border border-hairline rounded-sm overflow-hidden">
          {STATS.map((s) => {
            const active = s.key === stat;
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={active}
                title={s.long}
                onClick={() => updateUrl(s.key, limit)}
                className={`font-display uppercase tracking-wider text-[14px] font-semibold px-3.5 py-2 border-r border-hairline last:border-r-0 transition-colors cursor-pointer ${
                  active ? "bg-accent text-accent-contrast" : "bg-surface text-ink-2 hover:bg-row-hover hover:text-ink"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <span className="section-label">Show</span>
          <select
            value={limit}
            onChange={(e) => updateUrl(stat, e.target.value)}
            className="bg-surface border border-hairline rounded-sm px-2 py-1.5 text-[14px] cursor-pointer"
          >
            {LIMITS.map((l) => (
              <option key={l} value={l}>
                Top {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {board && (
        <p className="mt-3 text-[13px] text-ink-2">
          Ranked over players meeting the NBA minimum: {board.qualification.summary}.{" "}
          <a
            href="https://www.nba.com/stats/help/statminimums"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-hairline underline-offset-2 hover:text-accent transition-colors"
          >
            Rules
          </a>
        </p>
      )}

      <div className="mt-5">
        {result.loading && <TableSkeleton rows={Number(limit) > 25 ? 25 : Number(limit)} />}
        {result.error && <ErrorState error={result.error} retry={result.retry} />}
        {board && (
          <div
            className={`border border-hairline rounded-md bg-surface overflow-x-auto ${
              result.refetching ? "refetching" : ""
            }`}
            aria-busy={result.refetching}
          >
            {/* One table serves as both chart and table view: the value is
                always text, the bar only re-encodes it. Rank 1 wears the
                accent; everyone else the de-emphasis gray. */}
            <table className="w-full text-[15px]">
              <caption className="sr-only">
                Top {limit} qualified players by {meta.long}
              </caption>
              <thead>
                <tr className="border-b border-hairline">
                  <th scope="col" className="section-label text-right px-3 py-2.5 w-12">
                    Rank
                  </th>
                  <th scope="col" className="section-label text-left px-3 py-2.5">
                    Player
                  </th>
                  <th scope="col" className="section-label text-left px-3 py-2.5 w-16">
                    Team
                  </th>
                  <th scope="col" className="section-label text-left px-3 py-2.5 w-36 max-md:hidden">
                    Position
                  </th>
                  {meta.percent && (
                    <th scope="col" className="section-label text-right px-3 py-2.5 w-28 max-md:hidden">
                      Made
                    </th>
                  )}
                  <th scope="col" className="section-label text-right px-3 py-2.5 w-20">
                    {meta.label}
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-[30%] max-sm:hidden">
                    <span className="sr-only">Relative magnitude</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.leaders.map((entry, index) => (
                  <tr key={entry.player.id} className="row-interactive border-b border-hairline last:border-b-0">
                    <td className="px-3 py-2.5 text-right tnum text-ink-2">{entry.rank}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/players/${entry.player.id}`}
                        className={`font-medium hover:text-accent transition-colors ${
                          index === 0 ? "text-accent" : "text-ink"
                        }`}
                      >
                        {entry.player.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{teamCode(entry.player.team)}</td>
                    <td className="px-3 py-2.5 text-ink-2 max-md:hidden">{entry.player.position}</td>
                    {meta.percent && (
                      <td className="px-3 py-2.5 text-right tnum text-ink-2 max-md:hidden">
                        {entry.made}-for-{entry.attempted}
                      </td>
                    )}
                    <td className="px-3 py-2.5 text-right tnum font-medium">
                      {meta.percent ? percent(entry.value) : perGame(entry.value)}
                    </td>
                    <td className="px-3 py-2.5 max-sm:hidden">
                      <MagnitudeBar value={entry.value} max={max} emphasized={index === 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* The excluded players, kept visible rather than dropped. A board that
          silently loses the name someone saw yesterday reads as a bug; one that
          says why it lost them reads as a rule. */}
      {board && board.unqualified.length > 0 && (
        <section className="mt-9">
          <h2 className="section-label">Did not qualify</h2>
          <p className="mt-1.5 text-[13px] text-ink-2">
            A higher {meta.label} than the players above, on too little volume to rank.
          </p>
          <div className="mt-3 border border-hairline rounded-md bg-surface overflow-x-auto">
            <table className="w-full text-[15px]">
              <caption className="sr-only">
                Players excluded from the {meta.long} leaderboard, with the reason
              </caption>
              <thead>
                <tr className="border-b border-hairline">
                  <th scope="col" className="section-label text-left px-3 py-2.5">
                    Player
                  </th>
                  <th scope="col" className="section-label text-left px-3 py-2.5 w-16">
                    Team
                  </th>
                  <th scope="col" className="section-label text-right px-3 py-2.5 w-20">
                    {meta.label}
                  </th>
                  <th scope="col" className="section-label text-left px-3 py-2.5 w-[45%] max-sm:hidden">
                    Short of
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.unqualified.map((entry) => (
                  <tr key={entry.player.id} className="row-interactive border-b border-hairline last:border-b-0">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/players/${entry.player.id}`}
                        className="font-medium text-ink-2 hover:text-accent transition-colors"
                      >
                        {entry.player.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{teamCode(entry.player.team)}</td>
                    <td className="px-3 py-2.5 text-right tnum text-ink-2">
                      {meta.percent ? percent(entry.value) : perGame(entry.value)}
                    </td>
                    <td className="px-3 py-2.5 text-ink-2 text-[13px] max-sm:hidden">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
