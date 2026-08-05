"use client";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-xl">
      <p className="section-label">Error</p>
      <h1 className="font-display font-bold uppercase tracking-wide text-3xl text-ink mt-1">
        Something broke on our side
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">
        An unexpected error stopped this page from rendering. Your data is fine — try loading it
        again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 font-display uppercase tracking-wider text-[14px] font-semibold bg-accent text-accent-contrast rounded-sm px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
      >
        Try again
      </button>
    </div>
  );
}
