// ─────────────────────────────────────────────────────────────────────────────
// COSMOS-5H1 — Custom React Hooks
// All reusable hooks in one file. Import individually as needed.
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// ── useLocalStorage ───────────────────────────────────────────────────────────
// Persists state to localStorage. SSR-safe (returns initialValue on server).

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (err) {
        console.warn(`[useLocalStorage] Failed to write "${key}":`, err);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

// ── useMediaQuery ─────────────────────────────────────────────────────────────
// Returns true if the CSS media query matches.

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

// ── useDebounce ───────────────────────────────────────────────────────────────
// Returns a debounced version of the value (updated after `delay` ms of no changes).

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ── useScrollPosition ─────────────────────────────────────────────────────────
// Returns current scroll Y position. Throttled to animation frames.

export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let rafId: number;
    const handle = () => {
      rafId = requestAnimationFrame(() => setScrollY(window.scrollY));
    };
    window.addEventListener("scroll", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return scrollY;
}

// ── usePrevious ───────────────────────────────────────────────────────────────
// Returns the previous value of a variable.

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}

// ── useWindowSize ─────────────────────────────────────────────────────────────
// Returns current window dimensions. SSR-safe.

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

// ── useIsMobile ───────────────────────────────────────────────────────────────
// Convenience shorthand for mobile breakpoint.

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
