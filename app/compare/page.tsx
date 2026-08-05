"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Cosmic Compare — Main Page
// Route: /compare
// Full-featured side-by-side celestial object comparison with stats,
// charts, size comparison, single 3D viewer, and IBM Granite AI insights.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import ObjectSelector from "@/features/cosmic-compare/ObjectSelector";
import CompareCard from "@/features/cosmic-compare/CompareCard";
import VisualCharts from "@/features/cosmic-compare/VisualCharts";
import AIInsightsPanel from "@/features/cosmic-compare/AIInsightsPanel";
import { CELESTIAL_OBJECTS, type CelestialCompareData } from "@/lib/cosmic-compare-data";

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
// Scales both planet images based on their REAL solar-system diameters.
// The Sun (⌀ 1,392,700 km) is the scale anchor for true proportions.
// When neither object is the Sun, the larger of the two fills MAX_PX so
// the comparison is still meaningful within the available space.

const SUN_DIAMETER_KM = 1_392_700;

function SizeCompareView({ objA, objB }: { objA: CelestialCompareData; objB: CelestialCompareData }) {
  const MAX_PX = 320; // px the reference diameter fills
  const MIN_PX = 20;  // floor so tiny moons/asteroids are still visible

  // If either object is the Sun, scale against the Sun's diameter so its
  // full disc fills MAX_PX and the other shrinks proportionally.
  // Otherwise scale against the larger of the two objects.
  const refDiam = (objA.id === "sun" || objB.id === "sun")
    ? SUN_DIAMETER_KM
    : Math.max(objA.diameterKm, objB.diameterKm, 1);

  const pxFor = (km: number) =>
    km > 0 ? Math.max(MIN_PX, Math.round((km / refDiam) * MAX_PX)) : MIN_PX;

  const sizeA = pxFor(objA.diameterKm);
  const sizeB = pxFor(objB.diameterKm);

  const ratio =
    objA.diameterKm > 0 && objB.diameterKm > 0
      ? (Math.max(objA.diameterKm, objB.diameterKm) / Math.min(objA.diameterKm, objB.diameterKm)).toFixed(1)
      : null;

  const pctOfSun = (km: number) =>
    km > 0 ? `${((km / SUN_DIAMETER_KM) * 100).toFixed(3)}% of ☀️` : "—";

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
        <span className="text-white/60 text-xs uppercase tracking-widest">Solar-System Scale Comparison</span>
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
          Images are scaled to true solar-system proportions — the Sun (⌀ 1,392,700 km) is the scale anchor.
          Percentages show each object&apos;s real fraction of the Sun&apos;s diameter.
        </p>
      </div>
    </motion.div>
  );
}

// ── Spotlight Tabs ────────────────────────────────────────────────────────────
// Same animation as the Navbar spotlight — glowing pill + top-edge beam streak
// that spring-slides to follow the active (and hovered) tab.

function SpotlightTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}) {
  const [hovered, setHovered] = useState<TabId | null>(null);
  const [spotStyle, setSpotStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const updateSpot = (id: string | null) => {
    if (!id || !containerRef.current) {
      setSpotStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const btn = itemRefs.current.get(id);
    if (!btn) return;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setSpotStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    });
  };

  // Re-sync spotlight whenever activeTab changes (e.g. "Try comparing" buttons)
  useEffect(() => {
    requestAnimationFrame(() => updateSpot(activeTab));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const target = hovered ?? activeTab;

  return (
    <div
      ref={containerRef}
      className="cc-tabs no-scrollbar"
      style={{ position: "relative", overflow: "visible" }}
      onMouseLeave={() => {
        setHovered(null);
        updateSpot(activeTab);
      }}
    >
      {/* ── Sliding spotlight pill (follows hovered, snaps back to active) */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 rounded-xl"
        animate={{
          left: spotStyle.left,
          width: spotStyle.width,
          opacity: spotStyle.opacity,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(147,197,253,0.16) 0%, rgba(99,102,241,0.10) 60%, transparent 100%)",
          boxShadow:
            "0 0 0 1px rgba(147,197,253,0.12), 0 -2px 14px rgba(147,197,253,0.2) inset",
          zIndex: 0,
        }}
      />

      {/* ── Top-edge beam streak */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute top-1 h-px rounded-full"
        animate={{
          left: spotStyle.left + spotStyle.width * 0.15,
          width: spotStyle.width * 0.7,
          opacity: spotStyle.opacity,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 32 }}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(147,197,253,0.75), transparent)",
          boxShadow: "0 0 8px 1px rgba(147,197,253,0.45)",
          zIndex: 1,
        }}
      />

      {/* ── Tab buttons */}
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const isLit = target === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) itemRefs.current.set(tab.id, el);
            }}
            onClick={() => {
              onTabChange(tab.id);
              updateSpot(tab.id);
            }}
            onMouseEnter={() => {
              setHovered(tab.id);
              updateSpot(tab.id);
            }}
            className="cc-tab"
            style={{
              position: "relative",
              zIndex: 2,
              color: isLit ? "#fff" : "rgba(147,197,253,0.5)",
              background: "transparent",
              border: isActive
                ? "1px solid rgba(147,197,253,0.18)"
                : "1px solid transparent",
              textShadow: isLit
                ? "0 0 14px rgba(147,197,253,0.55)"
                : "none",
              transition: "color 0.15s, text-shadow 0.15s",
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
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

        {/* ── Tabs — Spotlight animation ──────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.35 }}>
          <SpotlightTabs activeTab={activeTab} onTabChange={setActiveTab} />
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

            {/* Size View — solar-system scale images */}
            {activeTab === "size" && (
              <SizeCompareView objA={objA} objB={objB} />
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
