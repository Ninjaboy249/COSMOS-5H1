"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SPACE_CATEGORIES } from "@/lib/space-explorer-data";

export default function SpaceSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const results = query.trim().length > 0
    ? SPACE_CATEGORIES.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 6)
    : [];

  const openSearch = useCallback(() => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // Keyboard shortcut: Ctrl+K or /
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); openSearch(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openSearch]);

  const go = (slug: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/space/${slug}`);
  };

  return (
    <>
      <button
        onClick={openSearch}
        className="space-search-trigger"
        title="Search space (Ctrl+K)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="space-search-kbd">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="space-search-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="space-search-modal"
              initial={{ opacity: 0, y: -24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-search-bar">
                <svg className="w-5 h-5 flex-shrink-0 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  ref={inputRef}
                  className="space-search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search planets, missions, galaxies…"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (e.key === "Enter" && results[0]) go(results[0].slug);
                  }}
                />
                <button className="space-search-esc" onClick={() => setOpen(false)}>Esc</button>
              </div>

              {results.length > 0 ? (
                <ul className="space-search-results">
                  {results.map((r) => (
                    <li key={r.slug}>
                      <button className="space-search-result-item" onClick={() => go(r.slug)}>
                        <span className="space-search-result-icon">{r.icon}</span>
                        <div className="space-search-result-text">
                          <span className="space-search-result-title">{r.title}</span>
                          <span className="space-search-result-sub">{r.subtitle}</span>
                        </div>
                        <span className="space-search-result-arrow">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim() ? (
                <div className="space-search-empty">No results for &ldquo;{query}&rdquo;</div>
              ) : (
                <div className="space-search-hint">
                  <p>Popular searches</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Solar System", "Black Holes", "Mars Rover", "APOD", "ISS Tracker"].map((s) => {
                      const c = SPACE_CATEGORIES.find((x) => x.title.toLowerCase().includes(s.toLowerCase()));
                      return c ? <button key={s} className="space-search-chip" onClick={() => go(c.slug)}>{s}</button> : null;
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
