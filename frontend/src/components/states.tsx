"use client";

import type { ApiRequestError } from "@/lib/api";

/**
 * One treatment per real failure mode. 403 (writes disabled) and 503
 * (database down) are states this API actually produces and get their own
 * wording; raw JSON never reaches the user.
 */
export function errorCopy(error: ApiRequestError): { title: string; body: string } {
  switch (error.status) {
    case 0:
      return {
        title: "API unreachable",
        body: "The stats API didn’t respond. If you’re running locally, make sure the Spring Boot backend is up on port 8080.",
      };
    case 400:
      return {
        title: "Invalid request",
        body: error.message || "The request didn’t pass validation. Adjust the inputs and try again.",
      };
    case 403:
      return {
        title: "Writes are disabled",
        body: "This deployment has write operations switched off. Reads still work; create, edit, and delete are unavailable.",
      };
    case 404:
      return {
        title: "Not found",
        body: error.message || "Nothing exists at this address.",
      };
    case 503:
      return {
        title: "Database unavailable",
        body: "The API is up but its database isn’t answering. This usually resolves on its own — try again shortly.",
      };
    default:
      return {
        title: "Something went wrong",
        body: "An unexpected error occurred on the server. Try again.",
      };
  }
}

export function ErrorState({ error, retry }: { error: ApiRequestError; retry?: () => void }) {
  const copy = errorCopy(error);
  return (
    <div role="alert" className="border border-hairline rounded-md bg-surface px-5 py-6">
      <p className="font-display font-semibold uppercase tracking-wider text-ink">{copy.title}</p>
      <p className="mt-1.5 text-[15px] text-ink-2 max-w-prose">{copy.body}</p>
      {retry && (
        <button
          type="button"
          onClick={retry}
          className="mt-4 font-display uppercase tracking-wider text-[14px] font-semibold border border-hairline rounded-sm px-3 py-1.5 text-ink hover:bg-row-hover transition-colors cursor-pointer"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="border border-hairline rounded-md bg-surface px-5 py-6">
      <p className="font-display font-semibold uppercase tracking-wider text-ink">{title}</p>
      <p className="mt-1.5 text-[15px] text-ink-2 max-w-prose">{body}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 font-display uppercase tracking-wider text-[14px] font-semibold border border-hairline rounded-sm px-3 py-1.5 text-ink hover:bg-row-hover transition-colors cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/** Content-shaped skeleton lines; dimensions are set by the caller. */
export function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-hidden="true" className="border border-hairline rounded-md bg-surface overflow-hidden">
      <div className="border-b border-hairline px-4 py-3">
        <SkeletonBlock className="h-4 w-48" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 px-4 py-3 border-b border-hairline last:border-b-0">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-4 w-10" />
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 flex-1 max-w-32" />
        </div>
      ))}
    </div>
  );
}
