"use client";

import { useEffect } from "react";
import Link from "next/link";
import { fetchPlayer } from "@/lib/api";
import { fetchLeagueMaxima } from "@/lib/options";
import { perGame, percent, teamCode } from "@/lib/format";
import { STATS, statValue } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { ErrorState, SkeletonBlock } from "@/components/states";
import { MagnitudeBar } from "@/components/magnitude-bar";

export function PlayerDetailClient({ id }: { id: string }) {
  const player = useQuery(`player-${id}`, () => fetchPlayer(id));
  const maxima = useQuery("league-maxima", fetchLeagueMaxima);

  useEffect(() => {
    if (player.data) document.title = `${player.data.name} · NBA Stats Hub`;
  }, [player.data]);

  if (player.error) {
    return (
      <div className="max-w-2xl">
        <ErrorState error={player.error} retry={player.error.status === 404 ? undefined : player.retry} />
        {player.error.status === 404 && (
          <p className="mt-4 text-[15px] text-ink-2">
            No player exists with id {id}.{" "}
            <Link href="/players" className="text-accent hover:underline underline-offset-2">
              Browse the roster
            </Link>{" "}
            instead.
          </p>
        )}
      </div>
    );
  }

  if (player.loading || !player.data) {
    return (
      <div aria-hidden="true" className="max-w-3xl">
        <SkeletonBlock className="h-10 w-72" />
        <SkeletonBlock className="h-5 w-48 mt-3" />
        <div className="mt-8 flex flex-col gap-5">
          {STATS.map((stat) => (
            <div key={stat.key} className="flex items-center gap-4">
              <SkeletonBlock className="h-4 w-12" />
              <SkeletonBlock className="h-8 w-20" />
              <SkeletonBlock className="h-2 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const p = player.data;

  return (
    <div className="max-w-3xl">
      {/* Identity is typographic — the data has no photos, and pretending otherwise would mean placeholders. */}
      <div className="flex items-baseline gap-4 flex-wrap">
        <h1 className="font-display font-bold uppercase tracking-wide text-4xl text-ink">{p.name}</h1>
        <p className="font-display text-xl text-ink-2 uppercase tracking-wider">
          {teamCode(p.team)} <span className="text-ink-3">·</span> {p.position}{" "}
          <span className="text-ink-3">·</span> <span className="tnum">{p.season}</span>
        </p>
      </div>

      <section className="mt-8 border border-hairline rounded-md bg-surface px-5 py-5" aria-label="Season statistics">
        <h2 className="section-label">Season statistics — against the league best</h2>
        <div className="mt-4 flex flex-col gap-5">
          {STATS.map((stat) => {
            const value = statValue(p, stat.key);
            const max = maxima.data?.[stat.key];
            const isMax = max !== undefined && value >= max;
            return (
              // Each stat gets its own row and its own scale — PPG and FG%
              // never share an axis.
              <div key={stat.key} className="grid grid-cols-[3.5rem_5.5rem_1fr] items-center gap-4">
                <span className="section-label" title={stat.long}>
                  {stat.label}
                </span>
                <span className="pnum font-display font-bold text-3xl text-ink leading-none">
                  {stat.percent ? percent(value) : perGame(value)}
                </span>
                <div>
                  {max !== undefined ? (
                    <>
                      <MagnitudeBar value={value} max={max} emphasized={isMax} />
                      <p className="mt-1 text-[12px] text-ink-3 tnum">
                        {isMax
                          ? "League best"
                          : `League best ${stat.percent ? percent(max) : perGame(max)}`}
                      </p>
                    </>
                  ) : (
                    <SkeletonBlock className="h-2 w-full" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex items-center gap-3">
        <Link
          href={`/compare?p1=${encodeURIComponent(p.name)}`}
          className="font-display uppercase tracking-wider text-[14px] font-semibold bg-accent text-accent-contrast rounded-sm px-4 py-2 hover:opacity-90 transition-opacity"
        >
          Compare this player
        </Link>
        <Link
          href="/players"
          className="font-display uppercase tracking-wider text-[14px] font-semibold border border-hairline rounded-sm px-4 py-2 text-ink hover:bg-row-hover transition-colors"
        >
          Back to roster
        </Link>
      </div>
    </div>
  );
}
