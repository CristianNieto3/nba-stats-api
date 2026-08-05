import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <p className="section-label">404</p>
      <h1 className="font-display font-bold uppercase tracking-wide text-3xl text-ink mt-1">
        Nothing at this address
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">
        The page you asked for doesn’t exist. The roster, leaderboards, and comparison tool are all
        still where they should be.
      </p>
      <div className="mt-5 flex gap-3">
        <Link
          href="/"
          className="font-display uppercase tracking-wider text-[14px] font-semibold bg-accent text-accent-contrast rounded-sm px-4 py-2 hover:opacity-90 transition-opacity"
        >
          Home
        </Link>
        <Link
          href="/players"
          className="font-display uppercase tracking-wider text-[14px] font-semibold border border-hairline rounded-sm px-4 py-2 text-ink hover:bg-row-hover transition-colors"
        >
          Players
        </Link>
      </div>
    </div>
  );
}
