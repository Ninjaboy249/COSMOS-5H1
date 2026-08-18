"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import SpaceCard from "@/features/space-explorer/SpaceCard";
import SpaceSearch from "@/features/space-explorer/SpaceSearch";
import VoiceCommander from "@/features/voice/VoiceCommander";
import { SPACE_CATEGORIES } from "@/lib/space-explorer-data";

const FILTER_TAGS = ["All", "Planets", "Stars", "Missions", "NEO", "Live", "NASA", "3D"];

export default function SpaceExplorerPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const gridRef = useRef<HTMLDivElement>(null);

  const filtered = activeFilter === "All"
    ? SPACE_CATEGORIES
    : SPACE_CATEGORIES.filter((c) =>
        c.tags.some((t) => t.toLowerCase().includes(activeFilter.toLowerCase())) ||
        c.title.toLowerCase().includes(activeFilter.toLowerCase()) ||
        c.status.toLowerCase().includes(activeFilter.toLowerCase())
      );

  return (
    <div className="space-explorer-shell">
      {/* Particle field */}
      <div className="space-explorer-particles" aria-hidden="true">
        {Array.from({ length: 60 }).map((_, i) => (
          <span
            key={i}
            className="se-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              opacity: 0.2 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="space-explorer-header">
        {/* Back to home */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link href="/" className="se-back-link">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            COSMOS-5H1
          </Link>
        </motion.div>

        <motion.div
          className="se-hero-text"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <p className="se-eyebrow">
            <span className="se-eyebrow-dot" />
            COSMOS-5H1 · Space Explorer
          </p>
          <h1 className="se-title">
            Explore the<span className="se-title-accent"> Universe</span>
          </h1>
          <p className="se-subtitle">
            20 interactive modules — from our solar system to the edge of the observable universe.
            Powered by NASA APIs, local retrieval, optional cloud AI, and 3D visualization.
          </p>
        </motion.div>

        {/* Search + stats bar */}
        <motion.div
          className="se-toolbar"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <SpaceSearch />
          <div className="se-stats-row">
            {[
              { label: "Modules", val: "20" },
              { label: "NASA APIs", val: "6" },
              { label: "AI-Powered", val: "100%" },
            ].map(({ label, val }) => (
              <div key={label} className="se-stat-pill">
                <span className="se-stat-val">{val}</span>
                <span className="se-stat-lbl">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filter pills */}
        <motion.div
          className="se-filters"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {FILTER_TAGS.map((tag) => (
            <button
              key={tag}
              className={`se-filter-pill ${activeFilter === tag ? "active" : ""}`}
              onClick={() => setActiveFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── Grid ────────────────────────────────────────────────── */}
      <div ref={gridRef} className="space-explorer-grid">
        {filtered.map((cat, i) => (
          <SpaceCard key={cat.slug} cat={cat} index={i} />
        ))}
        {filtered.length === 0 && (
          <div className="se-empty">
            <span className="text-4xl">🔭</span>
            <p>No modules match that filter. Try &ldquo;All&rdquo;.</p>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="se-footer">
        <p>
          COSMOS-5H1 Space Explorer · NASA APIs · Hybrid AI · Open Source
        </p>
      </footer>

      {/* ── COSMOS Voice Commander ── */}
      <VoiceCommander />
    </div>
  );
}
