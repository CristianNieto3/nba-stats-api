"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePlayerByName } from "@/lib/api";
import { useNameSuggestions } from "./use-name-suggestions";

/**
 * Global search (Ctrl/Cmd+K) over the name-suggestion endpoint. Selecting a
 * name resolves it to a player id and navigates to the detail page.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [resolving, setResolving] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const { suggestions, pending } = useNameSuggestions(open ? text : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setOpen(false);
    setText("");
    setActive(0);
    setFailed(null);
    setResolving(false);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      } else if (event.key === "Escape") {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Reset the highlighted row whenever a new suggestion list arrives —
  // render-time adjustment, not an effect.
  const [prevSuggestions, setPrevSuggestions] = useState(suggestions);
  if (suggestions !== prevSuggestions) {
    setPrevSuggestions(suggestions);
    setActive(0);
  }

  async function select(name: string) {
    setResolving(true);
    setFailed(null);
    try {
      const player = await resolvePlayerByName(name);
      if (player) {
        close();
        router.push(`/players/${player.id}`);
      } else {
        setFailed(name);
        setResolving(false);
      }
    } catch {
      setFailed(name);
      setResolving(false);
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter" && suggestions[active]) {
      event.preventDefault();
      void select(suggestions[active]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-hairline rounded-sm px-2.5 py-1.5 text-[13px] text-ink-3 hover:bg-row-hover hover:text-ink-2 transition-colors cursor-pointer"
        aria-label="Search players"
      >
        <span>Search</span>
        <kbd className="section-label text-[11px] border border-hairline rounded-sm px-1 py-px">
          Ctrl K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-[15vh] px-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search players"
            className="w-full max-w-lg bg-surface border border-hairline rounded-md"
          >
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="palette-list"
              aria-activedescendant={suggestions[active] ? `palette-${active}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              placeholder="Search players by name"
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setFailed(null);
              }}
              onKeyDown={onKeyDown}
              disabled={resolving}
              className="w-full bg-transparent px-4 py-3 text-base text-ink placeholder:text-ink-3 border-b border-hairline outline-none focus-visible:outline-none"
            />
            <ul id="palette-list" role="listbox" aria-label="Player results" className="max-h-80 overflow-auto">
              {suggestions.map((name, index) => (
                <li
                  key={name}
                  id={`palette-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={`px-4 py-2.5 text-[15px] cursor-pointer border-b border-hairline last:border-b-0 ${
                    index === active ? "bg-row-hover text-ink" : "text-ink-2"
                  }`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    void select(name);
                  }}
                  onPointerMove={() => setActive(index)}
                >
                  {name}
                </li>
              ))}
              {text.trim() !== "" && suggestions.length === 0 && !pending && (
                <li className="px-4 py-3 text-[15px] text-ink-3">No players match “{text.trim()}”.</li>
              )}
              {text.trim() === "" && (
                <li className="px-4 py-3 text-[15px] text-ink-3">
                  Start typing a name — up to 10 matches appear here.
                </li>
              )}
            </ul>
            {resolving && (
              <p className="px-4 py-2 text-[13px] text-ink-3 border-t border-hairline">Opening player…</p>
            )}
            {failed && (
              <p className="px-4 py-2 text-[13px] text-danger border-t border-hairline">
                Couldn’t open “{failed}”. Try again.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
