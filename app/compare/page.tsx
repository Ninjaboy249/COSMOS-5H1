"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Cosmic Compare — Main Page
// Route: /compare
// Full-featured side-by-side celestial object comparison with 3D viewer,
// stats, charts, and IBM Granite AI insights.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import ObjectSelector from "@/features/cosmic-compare/ObjectSelector";
import CompareCard from "@/features/cosmic-compare/CompareCard";
import VisualCharts from "@/features/cosmic-compare/VisualCharts";
import AIInsightsPanel from "@/features/cosmic-compare/AIInsightsPanel";
import { CELESTIAL_OBJECTS, type CelestialCompareData } from "@/lib/cosmic-compare-data";

// Lazy load 3D viewer — avoids SSR issues
const CompareViewer3D = dynamic(() => import("@/features/cosmic-compare/CompareViewer3D"), {
  ssr: false,
  loading: () => (
    <div className="rounded-2xl flex items-center justify-center" style={{ height: 480, background: "rgba(0,0,10,0.8)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
        <p className="text-blue-300/50 text-sm">Loading 3D Engine…</p>
      </div>
    </div>
  ),
});

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview",    label: "Overview",     icon: "🌌" },
  { id: "physical",   label: "Physical",      icon: "⚖️" },
  { id: "orbital",    label: "Orbit",         icon: "🔄" },
  { id: "atmosphere", label: "Atmosphere",    icon: "💨" },
  { id: "habitability", label: "Habitability", icon: "🏡" },
  { id: "charts",     label: "Visual Charts", icon: "📊" },
  { id: "ai",         label: "AI Summary",    icon: "🧠" },
  { id: "3d",         label: "3D View",       icon: "🪐" },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Default comparison ─────────────────────────────────────────────────────────
const DEFAULT_A = CELESTIAL_OBJECTS.find((o) => o.id === "earth")!;
const DEFAULT_B = CELESTIAL_OBJECTS.find((o) => o.id === "mars")!;

// ── Star particles (static to avoid hydration mismatch) ───────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: `${(i * 1.27) % 100}%`,
  top: `${(i * 2.31) % 100}%`,
  delay: `${(i * 0.11) % 8}s`,
  duration: `${4 + (i * 0.07) % 6}s`,
  size: `${1 + (i % 2)}px`,
  opacity: 0.2 + (i % 5) * 0.08,
}));

export default function CosmicComparePage() {
  const [objA, setObjA] = useState<CelestialCompareData>(DEFAULT_A);
  const [objB, setObjB] = useState<CelestialCompareData>(DEFAULT_B);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const swapObjects = () => {
    setObjA(objB);
    setObjB(objA);
  };

  return (
    <div className="cc-shell">
      {/* Particle field */}
      <div className="cc-particles" aria-hidden="true">
        {STARS.map((s) => (
          <span key={s.id} className="cc-particle" style={{ left: s.left, top: s.top, animationDelay: s.delay, animationDuration: s.duration, width: s.size, height: s.size, opacity: s.opacity }} />
        ))}
      </div>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="cc-header">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Link href="/" className="cc-back-link">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7 7-7-7" />
            </svg>
            COSMOS-5H1
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
          <p className="cc-eyebrow">
            <span className="cc-eyebrow-dot" />
            COSMOS-5H1 · Cosmic Compare
          </p>
          <h1 className="cc-title">
            Cosmic<span className="cc-title-accent"> Compare</span>
          </h1>
          <p className="cc-subtitle">
            Place any two celestial objects side-by-side. Explore their physical properties, orbital mechanics,
            3D models, and get AI-powered insights — all in one view.
          </p>
        </motion.div>
      </div>

      <div className="cc-content">
        {/* ── Object selectors ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="cc-selectors"
        >
          {/* Left selector */}
          <div className="cc-selector-wrap">
            <div className="cc-selector-label" style={{ color: objA.color }}>
              <div className="w-2 h-2 rounded-full" style={{ background: objA.color, boxShadow: `0 0 8px ${objA.glowColor}` }} />
              Object A
            </div>
            <ObjectSelector value={objA} onChange={setObjA} label="Select Object A" accentColor={objA.color} exclude={objB.id} />
          </div>

          {/* Swap button */}
          <button onClick={swapObjects} className="cc-swap-btn" title="Swap objects">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>

          {/* Right selector */}
          <div className="cc-selector-wrap">
            <div className="cc-selector-label" style={{ color: objB.color }}>
              Object B
              <div className="w-2 h-2 rounded-full" style={{ background: objB.color, boxShadow: `0 0 8px ${objB.glowColor}` }} />
            </div>
            <ObjectSelector value={objB} onChange={setObjB} label="Select Object B" accentColor={objB.color} exclude={objA.id} />
          </div>
        </motion.div>

        {/* ── Quick stats banner ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="cc-quick-stats"
        >
          {[
            { label: "Diameter ratio", value: objA.diameterKm > 0 && objB.diameterKm > 0 ? `${(Math.max(objA.diameterKm, objB.diameterKm) / Math.min(objA.diameterKm, objB.diameterKm)).toFixed(1)}×` : "N/A" },
            { label: `${objA.name} gravity`, value: objA.gravity },
            { label: `${objB.name} gravity`, value: objB.gravity },
            { label: `${objA.name} moons`, value: String(objA.moons) },
            { label: `${objB.name} moons`, value: String(objB.moons) },
          ].map(({ label, value }) => (
            <div key={label} className="cc-quick-stat">
              <span className="cc-quick-stat-value">{value}</span>
              <span className="cc-quick-stat-label">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }}>
          <div className="cc-tabs no-scrollbar">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="cc-tab"
                style={{
                  color: activeTab === tab.id ? "#fff" : "rgba(147,197,253,0.5)",
                  background: activeTab === tab.id ? "rgba(99,102,241,0.2)" : "transparent",
                  border: activeTab === tab.id ? "1px solid rgba(99,102,241,0.4)" : "1px solid transparent",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div className="cc-tab-indicator" layoutId="cc-tab-indicator" />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Tab content ─────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="cc-tab-content"
          >
            {/* Overview / Physical / Orbital / Atmosphere / Habitability tabs → CompareCard */}
            {(activeTab === "overview" || activeTab === "physical" || activeTab === "orbital" || activeTab === "atmosphere" || activeTab === "habitability") && (
              <CompareCard objA={objA} objB={objB} section={activeTab} />
            )}

            {/* Visual Charts */}
            {activeTab === "charts" && (
              <VisualCharts objA={objA} objB={objB} />
            )}

            {/* AI Summary */}
            {activeTab === "ai" && (
              <AIInsightsPanel objA={objA} objB={objB} />
            )}

            {/* 3D View */}
            {activeTab === "3d" && (
              <CompareViewer3D objA={objA} objB={objB} />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Footer suggestion row ───────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 flex flex-wrap gap-2 justify-center"
        >
          <span className="text-blue-300/30 text-xs self-center">Try comparing:</span>
          {[
            ["earth", "mars"], ["sun", "jupiter"], ["earth", "moon"], ["blackHole", "sun"], ["mercury", "pluto"],
          ].map(([a, b]) => {
            const oa = CELESTIAL_OBJECTS.find((o) => o.id === a)!;
            const ob = CELESTIAL_OBJECTS.find((o) => o.id === b)!;
            return (
              <button
                key={`${a}-${b}`}
                onClick={() => { setObjA(oa); setObjB(ob); setActiveTab("overview"); }}
                className="px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:bg-white/10"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(191,219,254,0.5)" }}
              >
                {oa.emoji} {oa.name} vs {ob.emoji} {ob.name}
              </button>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
