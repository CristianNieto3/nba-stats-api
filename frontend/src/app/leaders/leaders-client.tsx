"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchLeaders } from "@/lib/api";
import { perGame, percent, teamCode } from "@/lib/format";
import { STATS, statValue, type StatKey } from "@/lib/types";
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
  const leaders = result.data;
  const max = leaders?.[0] ? statValue(leaders[0], stat) : 0;

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

      <div className="mt-5">
        {result.loading && <TableSkeleton rows={Number(limit) > 25 ? 25 : Number(limit)} />}
        {result.error && <ErrorState error={result.error} retry={result.retry} />}
        {leaders && (
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
                Top {limit} players by {meta.long}
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
                  <th scope="col" className="section-label text-right px-3 py-2.5 w-20">
                    {meta.label}
                  </th>
                  <th scope="col" className="px-3 py-2.5 w-[30%] max-sm:hidden">
                    <span className="sr-only">Relative magnitude</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((player, index) => (
                  <tr key={player.id} className="row-interactive border-b border-hairline last:border-b-0">
                    <td className="px-3 py-2.5 text-right tnum text-ink-2">{index + 1}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/players/${player.id}`}
                        className={`font-medium hover:text-accent transition-colors ${
                          index === 0 ? "text-accent" : "text-ink"
                        }`}
                      >
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-ink-2">{teamCode(player.team)}</td>
                    <td className="px-3 py-2.5 text-ink-2 max-md:hidden">{player.position}</td>
                    <td className="px-3 py-2.5 text-right tnum font-medium">
                      {meta.percent ? percent(statValue(player, stat)) : perGame(statValue(player, stat))}
                    </td>
                    <td className="px-3 py-2.5 max-sm:hidden">
                      <MagnitudeBar value={statValue(player, stat)} max={max} emphasized={index === 0} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
