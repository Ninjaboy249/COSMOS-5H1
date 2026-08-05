"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Cosmic Compare — Main Page
// Route: /compare
// Full-featured side-by-side celestial object comparison with stats,
// charts, size comparison, single 3D viewer, and IBM Granite AI insights.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import ObjectSelector from "@/features/cosmic-compare/ObjectSelector";
import CompareCard from "@/features/cosmic-compare/CompareCard";
import VisualCharts from "@/features/cosmic-compare/VisualCharts";
import AIInsightsPanel from "@/features/cosmic-compare/AIInsightsPanel";
import { CELESTIAL_OBJECTS, CELESTIAL_MODELS, type CelestialCompareData } from "@/lib/cosmic-compare-data";

// Lazy-load single-object 3D viewer (avoids SSR / Three.js issues)
const SingleViewer3D = dynamic(() => import("@/features/cosmic-compare/SingleViewer3D"), {
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
  { id: "size",       label: "Size View",     icon: "📐" },
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

// ── Size Compare View ──────────────────────────────────────────────────────────
// Scales both planet images relative to each other (largest = MAX_PX).
// A secondary "vs Sun" label shows true solar-system scale context.

const SUN_DIAMETER_KM = 1_392_700;

function SizeCompareView({ objA, objB }: { objA: CelestialCompareData; objB: CelestialCompareData }) {
  const MAX_PX = 280;   // largest object fills this many px
  const MIN_PX = 32;    // floor so tiny objects are still visible

  const maxDiam = Math.max(objA.diameterKm, objB.diameterKm, 1);

  const pxFor = (km: number) =>
    km > 0 ? Math.max(MIN_PX, Math.round((km / maxDiam) * MAX_PX)) : MIN_PX;

  const sizeA = pxFor(objA.diameterKm);
  const sizeB = pxFor(objB.diameterKm);

  const ratio =
    objA.diameterKm > 0 && objB.diameterKm > 0
      ? (Math.max(objA.diameterKm, objB.diameterKm) / Math.min(objA.diameterKm, objB.diameterKm)).toFixed(1)
      : null;

  // Show true percentage of Sun for context
  const pctOfSun = (km: number) =>
    km > 0 ? `${((km / SUN_DIAMETER_KM) * 100).toFixed(3)}% of Sun` : "—";

  // Arena height: biggest sphere + label space
  const arenaH = MAX_PX + 120;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <span className="text-white/60 text-xs uppercase tracking-widest">Real-Scale Size Comparison</span>
        {ratio && (
          <span className="text-blue-300/60 text-xs px-3 py-1 rounded-full" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)" }}>
            {ratio}× size difference
          </span>
        )}
      </div>

      {/* Visual arena — objects aligned to bottom baseline */}
      <div
        className="flex items-end justify-center gap-16 px-8"
        style={{ height: arenaH, paddingBottom: 32 }}
      >
        {/* Object A */}
        <div className="flex flex-col items-center" style={{ gap: 12 }}>
          <div className="relative flex items-center justify-center" style={{ width: sizeA, height: sizeA }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${objA.glowColor} 0%, transparent 70%)`, opacity: 0.55, transform: "scale(1.3)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objA.image}
              alt={objA.name}
              style={{ width: sizeA, height: sizeA, objectFit: "contain" }}
              className="relative z-10"
            />
          </div>
          <div className="text-center" style={{ minWidth: 90 }}>
            <div className="text-white font-semibold text-sm">{objA.emoji} {objA.name}</div>
            <div className="text-blue-300/55 text-xs mt-0.5">{objA.diameter}</div>
            <div className="text-white/30 text-[10px] mt-0.5">{pctOfSun(objA.diameterKm)}</div>
          </div>
        </div>

        {/* VS divider */}
        <div className="self-center">
          <span className="text-blue-300/30 text-xs uppercase tracking-widest">vs</span>
        </div>

        {/* Object B */}
        <div className="flex flex-col items-center" style={{ gap: 12 }}>
          <div className="relative flex items-center justify-center" style={{ width: sizeB, height: sizeB }}>
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: `radial-gradient(circle, ${objB.glowColor} 0%, transparent 70%)`, opacity: 0.55, transform: "scale(1.3)" }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={objB.image}
              alt={objB.name}
              style={{ width: sizeB, height: sizeB, objectFit: "contain" }}
              className="relative z-10"
            />
          </div>
          <div className="text-center" style={{ minWidth: 90 }}>
            <div className="text-white font-semibold text-sm">{objB.emoji} {objB.name}</div>
            <div className="text-blue-300/55 text-xs mt-0.5">{objB.diameter}</div>
            <div className="text-white/30 text-[10px] mt-0.5">{pctOfSun(objB.diameterKm)}</div>
          </div>
        </div>
      </div>

      {/* Scale note */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center gap-2">
        <span className="text-white/20 text-[10px]">📐</span>
        <p className="text-white/30 text-[10px]">
          Images scaled relative to each other. Percentages show true size vs the Sun (⌀ 1,392,700 km).
        </p>
      </div>
    </motion.div>
  );
}

// ── Single 3D View ─────────────────────────────────────────────────────────────
// Dropdown selects any object that has a GLB; SingleViewer3D renders it.

// Objects that have a GLB model available
const GLB_OBJECTS = CELESTIAL_OBJECTS.filter((o) => !!CELESTIAL_MODELS[o.id]);

function Single3DViewPanel() {
  const [selectedId, setSelectedId] = useState<string>(GLB_OBJECTS[0]?.id ?? "earth");
  const selectedObj = GLB_OBJECTS.find((o) => o.id === selectedId) ?? GLB_OBJECTS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(0,0,10,0.7)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Header with dropdown */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <span className="text-white/60 text-xs uppercase tracking-widest">3D Object Viewer</span>

        {/* Dropdown */}
        <div className="relative">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium cursor-pointer focus:outline-none"
            style={{
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.35)",
              color: selectedObj.color,
            }}
          >
            {GLB_OBJECTS.map((o) => (
              <option key={o.id} value={o.id} style={{ background: "#0d0d1a", color: "#fff" }}>
                {o.emoji} {o.name}
              </option>
            ))}
          </select>
          {/* Chevron icon */}
          <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 3D viewer */}
      <SingleViewer3D obj={selectedObj} />
    </motion.div>
  );
}

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
            real-scale size comparison, and get AI-powered insights — all in one view.
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

            {/* Size View — proportional images based on real solar system diameters */}
            {activeTab === "size" && (
              <SizeCompareView objA={objA} objB={objB} />
            )}

            {/* Single 3D View */}
            {activeTab === "3d" && (
              <Single3DViewPanel />
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
