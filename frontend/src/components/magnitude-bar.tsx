/**
 * A thin horizontal bar scaled against a per-stat maximum. 4px rounded data
 * end anchored to a square baseline; accent for the emphasized mark,
 * de-emphasis gray for the rest. The numeric value is always rendered as text
 * by the caller — the bar is never the only way to read it.
 */
export function MagnitudeBar({
  value,
  max,
  emphasized = false,
  className = "",
}: {
  value: number;
  max: number;
  emphasized?: boolean;
  className?: string;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0;
  return (
    <div aria-hidden="true" className={`h-2 w-full rounded-r-[4px] bg-track ${className}`}>
      <div
        className={`h-full rounded-r-[4px] ${emphasized ? "bg-accent" : "bg-deemph"}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
