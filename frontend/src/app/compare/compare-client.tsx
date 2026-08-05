"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { comparePlayers } from "@/lib/api";
import { fetchLeagueMaxima } from "@/lib/options";
import { perGame, percent, teamCode } from "@/lib/format";
import { STATS, statValue, type Player } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { MagnitudeBar } from "@/components/magnitude-bar";
import { PlayerTypeahead } from "@/components/player-typeahead";

export function CompareClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const p1 = searchParams.get("p1") ?? "";
  const p2 = searchParams.get("p2") ?? "";

  function updateUrl(next1: string, next2: string) {
    const params = new URLSearchParams();
    if (next1) params.set("p1", next1);
    if (next2) params.set("p2", next2);
    const qs = params.toString();
    router.replace(qs ? `/compare?${qs}` : "/compare", { scroll: false });
  }

  const bothChosen = p1 !== "" && p2 !== "";
  const result = useQuery(`compare-${p1}-${p2}`, () => comparePlayers(p1, p2), bothChosen);
  const maxima = useQuery("league-maxima", fetchLeagueMaxima);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display font-bold uppercase tracking-wide text-3xl text-ink">Compare</h1>
      <p className="mt-1.5 text-[15px] text-ink-2 max-w-prose">
        Pick two players from the suggestions — the comparison endpoint matches exact names, so
        free-typed text isn’t submitted.
      </p>

      {/* Exactly two selectors; the endpoint accepts two names and no more. */}
      <div className="mt-5 grid sm:grid-cols-2 gap-4 max-w-2xl">
        <PlayerTypeahead
          label="Player one"
          value={p1}
          onSelect={(name) => updateUrl(name, p2)}
          onClear={() => updateUrl("", p2)}
        />
        <PlayerTypeahead
          label="Player two"
          value={p2}
          onSelect={(name) => updateUrl(p1, name)}
          onClear={() => updateUrl(p1, "")}
        />
      </div>

      <div className="mt-6">
        {!bothChosen && (
          <EmptyState
            title="Choose two players"
            body={
              p1 || p2
                ? "One picked — select the second player to run the comparison."
                : "Nothing to compare yet. Select both players above; the result is shareable by URL."
            }
          />
        )}
        {bothChosen && result.error && (
          <ErrorState error={result.error} retry={result.error.status === 404 ? undefined : result.retry} />
        )}
        {bothChosen && result.loading && (
          <div aria-hidden="true" className="flex flex-col gap-4">
            {STATS.map((s) => (
              <SkeletonBlock key={s.key} className="h-16 w-full" />
            ))}
          </div>
        )}
        {bothChosen && result.data && result.data.length === 2 && (
          <ComparisonPanel
            a={result.data[0]}
            b={result.data[1]}
            maxima={maxima.data}
            refetching={result.refetching}
          />
        )}
      </div>
    </div>
  );
}

function ComparisonPanel({
  a,
  b,
  maxima,
  refetching,
}: {
  a: Player;
  b: Player;
  maxima: Record<string, number> | null;
  refetching: boolean;
}) {
  return (
    <div
      className={`border border-hairline rounded-md bg-surface ${refetching ? "refetching" : ""}`}
      aria-busy={refetching}
    >
      <div className="grid grid-cols-2 border-b border-hairline">
        {[a, b].map((player) => (
          <div key={player.id} className="px-5 py-4 first:border-r first:border-hairline">
            <Link
              href={`/players/${player.id}`}
              className="font-display font-bold uppercase tracking-wide text-2xl text-ink hover:text-accent transition-colors"
            >
              {player.name}
            </Link>
            <p className="mt-0.5 text-[14px] text-ink-2">
              {teamCode(player.team)} · {player.position} · <span className="tnum">{player.season}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="px-5 py-4 flex flex-col gap-5">
        {STATS.map((stat) => {
          const va = statValue(a, stat.key);
          const vb = statValue(b, stat.key);
          const max = maxima?.[stat.key] ?? Math.max(va, vb);
          const fmt = stat.percent ? percent : perGame;
          const aLeads = va > vb;
          const bLeads = vb > va;
          return (
            // One stat per row, both bars on that stat's own league-max scale.
            // The better value is marked by accent *and* the "leads" text —
            // never color alone.
            <div key={stat.key}>
              <p className="section-label" title={stat.long}>
                {stat.label}
              </p>
              <div className="mt-1.5 grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 items-center">
                <span className={`tnum text-lg leading-none ${aLeads ? "font-semibold text-accent" : "text-ink"}`}>
                  {fmt(va)}
                  {aLeads && <span className="ml-2 section-label text-accent">leads</span>}
                </span>
                <MagnitudeBar value={va} max={max} emphasized={aLeads} />
                <span className={`tnum text-lg leading-none ${bLeads ? "font-semibold text-accent" : "text-ink"}`}>
                  {fmt(vb)}
                  {bLeads && <span className="ml-2 section-label text-accent">leads</span>}
                </span>
                <MagnitudeBar value={vb} max={max} emphasized={bLeads} />
              </div>
            </div>
          );
        })}
        <p className="text-[12px] text-ink-3">Bars are scaled to the league maximum for each stat.</p>
      </div>
    </div>
  );
}
