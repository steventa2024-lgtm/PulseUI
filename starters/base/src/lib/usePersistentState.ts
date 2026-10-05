import { useEffect, useState } from "react";

/**
 * useState that survives reloads by mirroring the value to localStorage.
 * Falls back to plain state when storage is unavailable.
 */
export function usePersistentState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // Ignore malformed or unavailable storage.
    }
    return typeof initial === "function" ? (initial as () => T)() : initial;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full or unavailable; keep in-memory state.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
