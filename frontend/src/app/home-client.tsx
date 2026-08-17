"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchPlayerCount, fetchTopScorers, resolvePlayerByName } from "@/lib/api";
import { fetchLeagueMaxima } from "@/lib/options";
import { perGame, teamCode } from "@/lib/format";
import { useQuery } from "@/lib/use-query";
import { ErrorState, SkeletonBlock } from "@/components/states";
import { StatTile } from "@/components/stat-tile";
import { PlayerTypeahead } from "@/components/player-typeahead";
import { fetchLeaders } from "@/lib/api";
import { statValue } from "@/lib/types";
import { useState } from "react";

const KPI_STATS = [
  { key: "ppg", label: "Points per game — league leader" },
  { key: "rpg", label: "Rebounds per game — league leader" },
  { key: "apg", label: "Assists per game — league leader" },
] as const;

export function HomeClient() {
  const router = useRouter();
  const [openFailed, setOpenFailed] = useState<string | null>(null);

  const kpis = useQuery("home-kpis", async () => {
    const [ppg, rpg, apg] = await Promise.all(
      KPI_STATS.map(async (s) => (await fetchLeaders(s.key, 1))[0]),
    );
    return { ppg, rpg, apg };
  });
  const topScorers = useQuery("home-top-scorers", () => fetchTopScorers(5));
  // Read live rather than hardcoded: the roster is refreshed on a schedule now,
  // so any number written into this copy is a number that goes stale by itself.
  const playerCount = useQuery("home-player-count", fetchPlayerCount);
  // Warm the league-maxima cache so detail pages render their scales instantly.
  useQuery("league-maxima", fetchLeagueMaxima);

  async function openPlayer(name: string) {
    setOpenFailed(null);
    try {
      const player = await resolvePlayerByName(name);
      if (player) router.push(`/players/${player.id}`);
      else setOpenFailed(name);
    } catch {
      setOpenFailed(name);
    }
  }

  return (
    <div>
      <section className="max-w-2xl">
        <h1 className="font-display font-bold uppercase tracking-wide text-4xl text-ink">
          The 2025 season, in numbers
        </h1>
        <p className="mt-2 text-[16px] text-ink-2">
          {playerCount.data === null ? "" : `${playerCount.data} players. `}
          Five stats each. Filter the roster, rank the leaders, or put two players
          side by side.
        </p>
        <div className="mt-5 max-w-md">
          <PlayerTypeahead label="Find a player" placeholder="Start typing a name" value="" onSelect={openPlayer} />
          {openFailed && (
            <p role="alert" className="mt-2 text-[13px] text-danger">
              Couldn’t open “{openFailed}”. Try again.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10" aria-label="League leaders">
        <h2 className="section-label">League leaders</h2>
        {kpis.error ? (
          <div className="mt-3 max-w-2xl">
            <ErrorState error={kpis.error} retry={kpis.retry} />
          </div>
        ) : (
          <div className="mt-3 grid sm:grid-cols-3 gap-4">
            {KPI_STATS.map((s) => {
              const leader = kpis.data?.[s.key];
              if (!leader) return <SkeletonBlock key={s.key} className="h-[7.5rem] w-full" />;
              return (
                <StatTile
                  key={s.key}
                  label={s.label}
                  value={perGame(statValue(leader, s.key))}
                  playerName={leader.name}
                  playerId={leader.id}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-10 max-w-2xl" aria-label="Top scorers">
        <div className="flex items-baseline justify-between">
          <h2 className="section-label">Top scorers</h2>
          <Link
            href="/leaders"
            className="text-[14px] text-accent hover:underline underline-offset-2"
          >
            Full leaderboards
          </Link>
        </div>
        <div className="mt-3 border border-hairline rounded-md bg-surface">
          {topScorers.error && (
            <div className="p-4">
              <ErrorState error={topScorers.error} retry={topScorers.retry} />
            </div>
          )}
          {topScorers.loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-hairline last:border-b-0">
                <SkeletonBlock className="h-4 w-6" />
                <SkeletonBlock className="h-4 w-44" />
                <SkeletonBlock className="h-4 w-12 ml-auto" />
              </div>
            ))}
          {topScorers.data?.map((player, index) => (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="row-interactive flex items-baseline gap-4 px-4 py-3 border-b border-hairline last:border-b-0"
            >
              <span className="tnum text-[14px] text-ink-3 w-5 text-right">{index + 1}</span>
              <span className={`font-medium ${index === 0 ? "text-accent" : "text-ink"}`}>{player.name}</span>
              <span className="text-[13px] text-ink-2">{teamCode(player.team)}</span>
              <span className="tnum ml-auto font-medium">{perGame(player.ppg)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid sm:grid-cols-3 gap-4 max-w-3xl" aria-label="Explore">
        {(
          [
            ["/players", "Players", "Filter and sort the full roster."],
            ["/leaders", "Leaders", "Ranked leaderboards for all five stats."],
            ["/compare", "Compare", "Two players, stat by stat, honestly scaled."],
          ] as const
        ).map(([href, title, body]) => (
          <Link
            key={href}
            href={href}
            className="row-interactive block border border-hairline rounded-md bg-surface px-5 py-4"
          >
            <span className="font-display font-semibold uppercase tracking-wider text-lg text-ink">{title}</span>
            <p className="mt-1 text-[14px] text-ink-2">{body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
