"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useNameSuggestions } from "./use-name-suggestions";

type Props = {
  label: string;
  placeholder?: string;
  /** The committed selection. Only names picked from suggestions are submitted. */
  value: string;
  onSelect: (name: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
};

/**
 * Accessible combobox over the /search suggestion endpoint. Free text is never
 * committed — the compare endpoint requires an exact name, so only a picked
 * suggestion calls onSelect.
 */
export function PlayerTypeahead({ label, placeholder, value, onSelect, onClear, autoFocus }: Props) {
  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { suggestions, pending } = useNameSuggestions(open ? text : "");
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const inputId = useId();

  // Adjust local text when the committed value changes from outside
  // (e.g. URL navigation) — the render-time reset pattern, not an effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function commit(name: string) {
    setText(name);
    setOpen(false);
    setActive(-1);
    onSelect(name);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      if (open && active >= 0 && suggestions[active]) {
        event.preventDefault();
        commit(suggestions[active]);
      } else if (open && suggestions.length === 1) {
        event.preventDefault();
        commit(suggestions[0]);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  const showList = open && text.trim() !== "";

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={inputId} className="section-label block mb-1.5">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Type a player name"}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
          if (event.target.value === "" && onClear) onClear();
        }}
        onKeyDown={onKeyDown}
        className="w-full bg-surface border border-hairline rounded-sm px-3 py-2 text-[15px] text-ink placeholder:text-ink-3"
      />
      {showList && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute z-20 mt-1 w-full bg-surface border border-hairline rounded-sm max-h-72 overflow-auto"
        >
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={`px-3 py-2 text-[15px] cursor-pointer border-b border-hairline last:border-b-0 ${
                index === active ? "bg-row-hover text-ink" : "text-ink-2"
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                commit(name);
              }}
              onPointerMove={() => setActive(index)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
      {showList && suggestions.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-surface border border-hairline rounded-sm px-3 py-2 text-[15px] text-ink-3">
          {pending ? "Searching…" : `No players match “${text.trim()}”.`}
        </div>
      )}
    </div>
  );
}
