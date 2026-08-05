import Link from "next/link";

/**
 * A single number is a stat tile, never a one-bar chart. The hero value uses
 * proportional figures (tabular digits look gappy at display sizes).
 */
export function StatTile({
  label,
  value,
  playerName,
  playerId,
  sub,
}: {
  label: string;
  value: string;
  playerName?: string;
  playerId?: number;
  sub?: string;
}) {
  return (
    <div className="border border-hairline rounded-md bg-surface px-5 py-4">
      <p className="section-label">{label}</p>
      <p className="pnum font-display font-bold text-4xl text-ink mt-1.5 leading-none">{value}</p>
      {playerName && playerId !== undefined ? (
        <Link
          href={`/players/${playerId}`}
          className="mt-2 inline-block text-[15px] text-ink-2 hover:text-accent transition-colors"
        >
          {playerName}
        </Link>
      ) : (
        sub && <p className="mt-2 text-[15px] text-ink-2">{sub}</p>
      )}
    </div>
  );
}
