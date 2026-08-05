"use client";

import { useSyncExternalStore } from "react";

/**
 * Admin credentials for the write endpoints, held in memory for the tab's
 * lifetime and nowhere else.
 *
 * Deliberately not localStorage or sessionStorage: a stored credential outlives
 * the page and is readable by any script running on this origin. A module
 * variable means a refresh signs you out, which is the right trade for a
 * credential that can delete rows.
 */

let authorization: string | null = null;
let signedInAs: string | null = null;
const listeners = new Set<() => void>();

/** btoa() throws on anything outside Latin-1, so encode as UTF-8 bytes first. */
function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function signIn(username: string, password: string): void {
  authorization = `Basic ${toBase64(`${username}:${password}`)}`;
  signedInAs = username;
  listeners.forEach((listener) => listener());
}

export function signOut(): void {
  authorization = null;
  signedInAs = null;
  listeners.forEach((listener) => listener());
}

/** Spread into a fetch header bag; empty when signed out. */
export function authHeader(): Record<string, string> {
  return authorization ? { Authorization: authorization } : {};
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): string | null {
  return signedInAs;
}

/** Always signed out on the server so the markup matches the first client render. */
function getServerSnapshot(): string | null {
  return null;
}

/** The signed-in username, or null. */
export function useSignedInAs(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
