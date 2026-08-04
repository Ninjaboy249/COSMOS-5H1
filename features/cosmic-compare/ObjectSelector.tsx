"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ObjectSelector — Glassmorphism dropdown to pick a celestial object
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CELESTIAL_OBJECTS, type CelestialCompareData } from "@/lib/cosmic-compare-data";

interface ObjectSelectorProps {
  value: CelestialCompareData | null;
  onChange: (obj: CelestialCompareData) => void;
  label: string;
  accentColor: string;
  exclude?: string; // id to exclude from list
}

export default function ObjectSelector({ value, onChange, label, accentColor, exclude }: ObjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = CELESTIAL_OBJECTS.filter((o) =>
    o.id !== exclude &&
    (o.name.toLowerCase().includes(search.toLowerCase()) ||
     o.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all duration-200"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${open ? accentColor + "60" : "rgba(255,255,255,0.10)"}`,
          boxShadow: open ? `0 0 20px ${accentColor}20` : "none",
        }}
      >
        {value ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value.image} alt={value.name} className="w-10 h-10 object-contain rounded-full flex-shrink-0" style={{ filter: `drop-shadow(0 0 8px ${value.glowColor})` }} />
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm truncate">{value.emoji} {value.name}</div>
              <div className="text-blue-300/50 text-xs truncate">{value.type}</div>
            </div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xl"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(255,255,255,0.15)" }}>
              +
            </div>
            <div className="flex-1">
              <div className="text-blue-300/60 text-sm font-medium">{label}</div>
              <div className="text-blue-300/30 text-xs">Choose any celestial object</div>
            </div>
          </>
        )}
        <svg className={`w-4 h-4 text-blue-300/40 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl overflow-hidden"
            style={{
              background: "rgba(4,10,28,0.97)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
          >
            {/* Search */}
            <div className="p-3 border-b border-white/5">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search objects..."
                className="w-full bg-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder-blue-300/30 outline-none border border-white/0 focus:border-blue-400/30 transition-colors"
              />
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto no-scrollbar py-2">
              {filtered.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => { onChange(obj); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors duration-150"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={obj.image} alt={obj.name} className="w-8 h-8 object-contain rounded-full flex-shrink-0" style={{ filter: `drop-shadow(0 0 5px ${obj.glowColor})` }} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{obj.emoji} {obj.name}</div>
                    <div className="text-blue-300/40 text-xs truncate">{obj.type}</div>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: obj.color }} />
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-blue-300/30 text-sm">No objects found</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
