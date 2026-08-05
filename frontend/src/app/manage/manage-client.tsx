"use client";

import { useMemo, useRef, useState } from "react";
import { ApiRequestError, createPlayer, deletePlayer, fetchPlayersPage, updatePlayer, type PlayerWrite } from "@/lib/api";
import { signIn, signOut, useSignedInAs } from "@/lib/auth";
import { perGame, percent, teamCode } from "@/lib/format";
import type { Player } from "@/lib/types";
import { useQuery } from "@/lib/use-query";
import { EmptyState, ErrorState, errorCopy, TableSkeleton } from "@/components/states";

/** Client-side mirror of the server's PlayerRequest validation rules. */
const POSITION_PATTERN = /^(PG|SG|SF|PF|C)([-/](PG|SG|SF|PF|C))?$/i;

type FormValues = {
  name: string;
  team: string;
  position: string;
  ppg: string;
  rpg: string;
  apg: string;
  fg_percent: string;
  three_pt_percent: string;
  season: string;
};

const EMPTY_FORM: FormValues = {
  name: "",
  team: "",
  position: "",
  ppg: "",
  rpg: "",
  apg: "",
  fg_percent: "",
  three_pt_percent: "",
  season: "2025",
};

function validate(values: FormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.name.trim() === "") errors.name = "Name is required.";
  else if (values.name.trim().length > 100) errors.name = "Name must be at most 100 characters.";
  if (values.team.trim() === "") errors.team = "Team is required.";
  else if (values.team.trim().length > 10) errors.team = "Team must be at most 10 characters.";
  if (values.position.trim() === "") errors.position = "Position is required.";
  else if (!POSITION_PATTERN.test(values.position.trim()))
    errors.position = "Use PG, SG, SF, PF, C, or a combination like PG-SG.";
  for (const key of ["ppg", "rpg", "apg"] as const) {
    const n = Number(values[key]);
    if (values[key].trim() === "" || Number.isNaN(n)) errors[key] = "Enter a number.";
    else if (n < 0) errors[key] = "Must not be negative.";
  }
  for (const key of ["fg_percent", "three_pt_percent"] as const) {
    const n = Number(values[key]);
    if (values[key].trim() === "" || Number.isNaN(n)) errors[key] = "Enter a number.";
    else if (n < 0 || n > 100) errors[key] = "Must be between 0 and 100.";
  }
  const season = Number(values.season);
  if (values.season.trim() === "" || !Number.isInteger(season)) errors.season = "Enter a year.";
  else if (season < 1946 || season > 2100) errors.season = "Season must be between 1946 and 2100.";
  return errors;
}

/** The server reports field errors under its own field names; fold aliases onto our inputs. */
function normalizeServerErrors(fieldErrors: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, message] of Object.entries(fieldErrors)) {
    if (key === "fgPercent") map.fg_percent = message;
    else if (key === "threePtPercent") map.three_pt_percent = message;
    else map[key] = message;
  }
  return map;
}

export function ManageClient() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Player | "new" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [writesDisabled, setWritesDisabled] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const signedInAs = useSignedInAs();

  const queryKey = `manage-${appliedSearch}-${page}-${refreshKey}`;
  const result = useQuery(queryKey, () =>
    fetchPlayersPage({ name: appliedSearch || undefined, page: String(page), size: "10", sortBy: "name" }),
  );

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(0);
      setAppliedSearch(value);
    }, 400);
  }

  function handleWriteError(error: ApiRequestError) {
    // 401: the credentials are missing, wrong, or no longer accepted. Drop them
    // so the UI stops pretending to be signed in and asks again.
    if (error.status === 401) {
      signOut();
      setEditing(null);
      setAuthError("Those credentials were rejected. Check them and sign in again.");
    }
    // The server only ever issues an admin account, so a 403 on a signed-in
    // write is the write flag being off rather than a missing role.
    if (error.status === 403) setWritesDisabled(true);
  }

  const data = result.data;

  return (
    <div className="max-w-5xl">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h1 className="font-display font-bold uppercase tracking-wide text-3xl text-ink">Data management</h1>
        {signedInAs && (
          <p className="text-[14px] text-ink-2">
            Signed in as <span className="font-semibold text-ink">{signedInAs}</span>
            <button
              type="button"
              onClick={() => {
                signOut();
                setEditing(null);
                setStatusMessage(null);
              }}
              className="ml-3 font-display uppercase tracking-wider text-[12px] font-semibold border border-hairline rounded-sm px-2.5 py-1 hover:bg-row-hover transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </p>
        )}
      </div>

      {/* Two independent gates: the server's write flag, then the admin credential. */}
      <div className="mt-4 border-l-2 border-hardwood bg-surface border border-hairline rounded-sm px-4 py-3 max-w-3xl">
        <p className="text-[14px] text-ink-2">
          <span className="font-semibold text-ink">Reads are public, writes are not.</span> Create,
          update, and delete need an admin sign-in. Credentials are kept in memory for this tab
          only, so reloading the page signs you out. A separate server flag can switch writes off
          entirely, in which case they return 403 whoever you are.
        </p>
      </div>

      {writesDisabled && (
        <div role="alert" className="mt-4 max-w-3xl border border-hairline rounded-md bg-surface px-5 py-4">
          <p className="font-display font-semibold uppercase tracking-wider text-ink">Writes are disabled</p>
          <p className="mt-1 text-[14px] text-ink-2">
            The server rejected the write with 403 — the deployment flag has writes switched off.
            Reads keep working. To enable writes locally, start the backend with{" "}
            <code className="tnum text-[13px] border border-hairline rounded-sm px-1">APP_WRITE_ENABLED=true</code>.
          </p>
        </div>
      )}

      {statusMessage && (
        <p role="status" className="mt-4 text-[14px] text-ink-2 border-l-2 border-accent pl-3">
          {statusMessage}
        </p>
      )}

      <div className="mt-6 grid lg:grid-cols-[1fr_22rem] gap-6 items-start">
        <div>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <label className="flex flex-col gap-1.5">
              <span className="section-label">Find by name</span>
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="e.g. Curry"
                className="bg-surface border border-hairline rounded-sm px-2.5 py-1.5 text-[14px] w-56 text-ink placeholder:text-ink-3"
              />
            </label>
            <button
              type="button"
              disabled={!signedInAs}
              title={signedInAs ? undefined : "Sign in to add a player"}
              onClick={() => {
                setEditing("new");
                setStatusMessage(null);
              }}
              className="font-display uppercase tracking-wider text-[14px] font-semibold bg-accent text-accent-contrast rounded-sm px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              Add player
            </button>
          </div>

          <div className="mt-4">
            {result.loading && <TableSkeleton rows={8} />}
            {result.error && <ErrorState error={result.error} retry={result.retry} />}
            {data && data.content.length === 0 && (
              <EmptyState
                title="No players match"
                body="No roster entries match this name."
                action={
                  appliedSearch
                    ? {
                        label: "Clear search",
                        onClick: () => {
                          setSearch("");
                          setAppliedSearch("");
                          setPage(0);
                        },
                      }
                    : undefined
                }
              />
            )}
            {data && data.content.length > 0 && (
              <div
                className={`border border-hairline rounded-md bg-surface overflow-x-auto ${
                  result.refetching ? "refetching" : ""
                }`}
                aria-busy={result.refetching}
              >
                <table className="w-full text-[14px]">
                  <caption className="sr-only">Editable player roster</caption>
                  <thead>
                    <tr className="border-b border-hairline">
                      <th scope="col" className="section-label text-left px-3 py-2.5">Player</th>
                      <th scope="col" className="section-label text-left px-3 py-2.5">Team</th>
                      <th scope="col" className="section-label text-right px-3 py-2.5">PPG</th>
                      <th scope="col" className="section-label text-right px-3 py-2.5 max-sm:hidden">FG%</th>
                      <th scope="col" className="section-label text-right px-3 py-2.5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.content.map((player) => (
                      <ManageRow
                        key={player.id}
                        player={player}
                        canWrite={Boolean(signedInAs)}
                        onEdit={() => {
                          setEditing(player);
                          setStatusMessage(null);
                        }}
                        onDeleted={(name) => {
                          setStatusMessage(`Deleted ${name}.`);
                          setWritesDisabled(false);
                          refresh();
                        }}
                        onError={handleWriteError}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {data && data.totalPages > 1 && (
              <nav aria-label="Pagination" className="mt-3 flex items-center gap-3 text-[14px]">
                <button
                  type="button"
                  disabled={page <= 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="border border-hairline rounded-sm px-3 py-1.5 hover:bg-row-hover disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  Previous
                </button>
                <span className="tnum text-ink-2">
                  Page {page + 1} of {data.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= data.totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="border border-hairline rounded-sm px-3 py-1.5 hover:bg-row-hover disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>

        {signedInAs === null ? (
          <AdminSignIn error={authError} onSignedIn={() => setAuthError(null)} />
        ) : (
          editing !== null && (
            <PlayerForm
              key={editing === "new" ? "new" : editing.id}
              player={editing === "new" ? null : editing}
              onCancel={() => setEditing(null)}
              onSaved={(name, created) => {
                setEditing(null);
                setStatusMessage(created ? `Created ${name}.` : `Saved ${name}.`);
                setWritesDisabled(false);
                refresh();
              }}
              onError={handleWriteError}
            />
          )
        )}
      </div>
    </div>
  );
}

/**
 * There is no login endpoint to check against — reads are public, so a probe
 * request would succeed regardless. Credentials are therefore accepted
 * optimistically and proven by the first write, which surfaces a 401 here.
 */
function AdminSignIn({ error, onSignedIn }: { error: string | null; onSignedIn: () => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (username.trim() === "" || password === "") {
      setMissing(true);
      return;
    }
    setMissing(false);
    signIn(username.trim(), password);
    setPassword("");
    onSignedIn();
  }

  const inputClass =
    "bg-surface border border-hairline rounded-sm px-2.5 py-1.5 text-[14px] w-full text-ink placeholder:text-ink-3";

  return (
    <form
      onSubmit={submit}
      className="border border-hairline rounded-md bg-surface px-5 py-4 sticky top-4"
      aria-label="Admin sign in"
    >
      <h2 className="font-display font-semibold uppercase tracking-wider text-lg text-ink">Admin sign in</h2>
      <p className="mt-1 text-[13px] text-ink-3">
        Required for create, update and delete. Held in memory only.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="section-label">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="section-label">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={inputClass}
          />
        </label>
      </div>

      {missing && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          Enter a username and password.
        </p>
      )}
      {error && !missing && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-4 font-display uppercase tracking-wider text-[14px] font-semibold bg-accent text-accent-contrast rounded-sm px-4 py-2 hover:opacity-90 transition-opacity cursor-pointer"
      >
        Sign in
      </button>
    </form>
  );
}

function ManageRow({
  player,
  canWrite,
  onEdit,
  onDeleted,
  onError,
}: {
  player: Player;
  canWrite: boolean;
  onEdit: () => void;
  onDeleted: (name: string) => void;
  onError: (error: ApiRequestError) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePlayer(player.id);
      onDeleted(player.name);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        onError(error);
        setDeleteError(errorCopy(error).title);
      } else {
        setDeleteError("Delete failed.");
      }
      setDeleting(false);
      setConfirming(false);
    }
  }

  const actionClass =
    "font-display uppercase tracking-wider text-[12px] font-semibold border border-hairline rounded-sm px-2.5 py-1 hover:bg-row-hover transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed";

  return (
    <tr className="border-b border-hairline last:border-b-0">
      <td className="px-3 py-2.5 font-medium text-ink">{player.name}</td>
      <td className="px-3 py-2.5 text-ink-2">
        {teamCode(player.team)} · {player.position}
      </td>
      <td className="px-3 py-2.5 text-right tnum">{perGame(player.ppg)}</td>
      <td className="px-3 py-2.5 text-right tnum max-sm:hidden">{percent(player.fg_percent)}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-2">
          {confirming ? (
            <>
              <span className="text-[13px] text-ink-2">Delete {player.name}?</span>
              <button type="button" onClick={confirmDelete} disabled={deleting} className={`${actionClass} text-danger`}>
                {deleting ? "Deleting…" : "Confirm"}
              </button>
              <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className={actionClass}>
                Cancel
              </button>
            </>
          ) : (
            <>
              {deleteError && <span className="text-[12px] text-danger">{deleteError}</span>}
              <button
                type="button"
                onClick={onEdit}
                disabled={!canWrite}
                title={canWrite ? undefined : "Sign in to edit"}
                className={actionClass}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={!canWrite}
                title={canWrite ? undefined : "Sign in to delete"}
                className={`${actionClass} text-danger`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function PlayerForm({
  player,
  onCancel,
  onSaved,
  onError,
}: {
  player: Player | null;
  onCancel: () => void;
  onSaved: (name: string, created: boolean) => void;
  onError: (error: ApiRequestError) => void;
}) {
  const initial = useMemo<FormValues>(
    () =>
      player
        ? {
            name: player.name,
            team: player.team,
            position: "",
            ppg: String(player.ppg),
            rpg: String(player.rpg),
            apg: String(player.apg),
            fg_percent: String(player.fg_percent),
            three_pt_percent: String(player.three_pt_percent),
            season: String(player.season),
          }
        : EMPTY_FORM,
    [player],
  );
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<ApiRequestError | null>(null);
  const [saving, setSaving] = useState(false);

  function set(key: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const clientErrors = validate(values);
    setErrors(clientErrors);
    setSubmitError(null);
    if (Object.keys(clientErrors).length > 0) return;

    const body: PlayerWrite = {
      name: values.name.trim(),
      team: values.team.trim(),
      position: values.position.trim(),
      ppg: Number(values.ppg),
      rpg: Number(values.rpg),
      apg: Number(values.apg),
      fg_percent: Number(values.fg_percent),
      three_pt_percent: Number(values.three_pt_percent),
      season: Number(values.season),
    };

    setSaving(true);
    try {
      if (player) await updatePlayer(player.id, body);
      else await createPlayer(body);
      onSaved(body.name, player === null);
    } catch (error) {
      setSaving(false);
      if (error instanceof ApiRequestError) {
        onError(error);
        setSubmitError(error);
        // A 400 body carries per-field messages; put them on the inputs.
        if (error.status === 400) setErrors(normalizeServerErrors(error.fieldErrors));
      } else {
        setSubmitError(new ApiRequestError(0, "The stats API is unreachable."));
      }
    }
  }

  const inputClass = (key: string) =>
    `bg-surface border rounded-sm px-2.5 py-1.5 text-[14px] w-full text-ink placeholder:text-ink-3 ${
      errors[key] ? "border-danger" : "border-hairline"
    }`;

  function field(key: keyof FormValues, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) {
    return (
      <div>
        <label className="flex flex-col gap-1">
          <span className="section-label">{label}</span>
          <input
            value={values[key]}
            onChange={(e) => set(key, e.target.value)}
            aria-invalid={errors[key] ? true : undefined}
            aria-describedby={errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined}
            className={inputClass(key)}
            {...props}
          />
        </label>
        {hint && !errors[key] && (
          <p id={`${key}-hint`} className="mt-1 text-[12px] text-ink-3">
            {hint}
          </p>
        )}
        {errors[key] && (
          <p id={`${key}-error`} role="alert" className="mt-1 text-[12px] text-danger">
            {errors[key]}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="border border-hairline rounded-md bg-surface px-5 py-4 sticky top-4"
      aria-label={player ? `Edit ${player.name}` : "Add player"}
    >
      <h2 className="font-display font-semibold uppercase tracking-wider text-lg text-ink">
        {player ? `Edit ${player.name}` : "Add player"}
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        {field("name", "Name", { type: "text", maxLength: 100, placeholder: "Full name" })}
        <div className="grid grid-cols-2 gap-3">
          {field("team", "Team", { type: "text", maxLength: 10, placeholder: "e.g. OKC" })}
          {field(
            "position",
            "Position code",
            { type: "text", placeholder: player ? `stored: ${player.position}` : "e.g. PG" },
            // The write API validates codes, unlike the roster filter's stored words.
            "PG, SG, SF, PF, C, or a combo like PG-SG.",
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {field("ppg", "PPG", { type: "number", min: 0, step: 0.1, inputMode: "decimal" })}
          {field("rpg", "RPG", { type: "number", min: 0, step: 0.1, inputMode: "decimal" })}
          {field("apg", "APG", { type: "number", min: 0, step: 0.1, inputMode: "decimal" })}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("fg_percent", "FG%", { type: "number", min: 0, max: 100, step: 0.1, inputMode: "decimal" })}
          {field("three_pt_percent", "3P%", { type: "number", min: 0, max: 100, step: 0.1, inputMode: "decimal" })}
        </div>
        {field("season", "Season", { type: "number", min: 1946, max: 2100, step: 1, inputMode: "numeric" }, "1946–2100.")}
      </div>

      {submitError && submitError.status !== 400 && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {errorCopy(submitError).title} — {errorCopy(submitError).body}
        </p>
      )}
      {submitError && submitError.status === 400 && Object.keys(submitError.fieldErrors).length === 0 && (
        <p role="alert" className="mt-3 text-[13px] text-danger">
          {submitError.message}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="font-display uppercase tracking-wider text-[14px] font-semibold bg-accent text-accent-contrast rounded-sm px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
        >
          {saving ? "Saving…" : player ? "Save changes" : "Create player"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="font-display uppercase tracking-wider text-[14px] font-semibold border border-hairline rounded-sm px-4 py-2 text-ink hover:bg-row-hover transition-colors disabled:opacity-45 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
