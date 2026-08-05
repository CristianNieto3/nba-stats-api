"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Theme model: before hydration, CSS prefers-color-scheme decides. On mount,
 * a persisted choice is applied as data-theme on <html>, which overrides the
 * OS preference in both directions. This component reads the effective theme
 * as an external store (DOM attribute + media query), so no state lives here.
 */
function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", callback);
  };
}

function getSnapshot(): "light" | "dark" {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "dark" || explicit === "light") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as const);

  // Apply the persisted override once — a DOM sync, not component state.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light" || stored === "dark") {
        document.documentElement.dataset.theme = stored;
      }
    } catch {
      // No storage access; the OS preference keeps deciding.
    }
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Persistence is best-effort; the toggle still works for the session.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="section-label cursor-pointer border border-hairline rounded-sm px-2.5 py-1.5 hover:bg-row-hover hover:text-ink transition-colors min-w-14 text-center"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
