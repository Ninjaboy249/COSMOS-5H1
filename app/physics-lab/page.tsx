"use client";

import { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// Lazy-load each heavy simulator to keep initial bundle light
const RocketLaunchSim       = lazy(() => import("@/features/physics-lab/RocketLaunchSim"));
const ProjectileMotionSim   = lazy(() => import("@/features/physics-lab/ProjectileMotionSim"));
const GravityComparisonSim  = lazy(() => import("@/features/physics-lab/GravityComparisonSim"));
const OrbitalMechanicsSim   = lazy(() => import("@/features/physics-lab/OrbitalMechanicsSim"));
const NewtonGravitySim      = lazy(() => import("@/features/physics-lab/NewtonGravitySim"));
const EscapeVelocitySim     = lazy(() => import("@/features/physics-lab/EscapeVelocitySim"));
const BlackHoleSim          = lazy(() => import("@/features/physics-lab/BlackHoleSim"));
const AsteroidImpactSim     = lazy(() => import("@/features/physics-lab/AsteroidImpactSim"));

// ── Module catalogue ──────────────────────────────────────────────────────────
const MODULES = [
  { id: "rocket",     icon: "🚀", label: "Rocket Launch",       sub: "Real orbital mechanics",   color: "#f97316", glow: "rgba(249,115,22,0.35)"   },
  { id: "projectile", icon: "🎯", label: "Projectile Motion",   sub: "Parabolic trajectories",   color: "#22d3ee", glow: "rgba(34,211,238,0.35)"   },
  { id: "gravity",    icon: "🪐", label: "Gravity Comparison",  sub: "Drop test across worlds",  color: "#a78bfa", glow: "rgba(167,139,250,0.35)"  },
  { id: "orbit",      icon: "🌍", label: "Orbital Mechanics",   sub: "Kepler + Hohmann transfer",color: "#34d399", glow: "rgba(52,211,153,0.35)"   },
  { id: "newton",     icon: "⚛️", label: "Newton Gravitation",  sub: "F = Gm₁m₂/r²",            color: "#60a5fa", glow: "rgba(96,165,250,0.35)"   },
  { id: "escape",     icon: "🛸", label: "Escape Velocity",     sub: "Break free from gravity",  color: "#fb923c", glow: "rgba(251,146,60,0.35)"   },
  { id: "blackhole",  icon: "🕳️", label: "Black Hole Physics",  sub: "Spacetime curvature",      color: "#c084fc", glow: "rgba(192,132,252,0.35)"  },
  { id: "asteroid",   icon: "☄️", label: "Asteroid Impact",     sub: "Impact energy calculator", color: "#f87171", glow: "rgba(248,113,113,0.35)"  },
] as const;

type ModuleId = typeof MODULES[number]["id"];

// ── Static star seed (avoids hydration mismatch) ──────────────────────────────
const STARS = Array.from({ length: 120 }, (_, i) => ({
  id: i,
  left:  `${(i * 0.83 + 7) % 100}%`,
  top:   `${(i * 1.47 + 3) % 100}%`,
  size:  `${1 + (i % 3) * 0.5}px`,
  dur:   `${3 + (i % 5)}s`,
  delay: `${(i * 0.17) % 6}s`,
  op:    0.15 + (i % 7) * 0.07,
}));

// ── Simulator loader fallback ─────────────────────────────────────────────────
function SimLoader() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 animate-spin"
          style={{ borderColor: "rgba(34,211,238,0.15)", borderTopColor: "#22d3ee" }} />
      </div>
      <span className="text-cyan-300/60 text-xs uppercase tracking-widest">Loading simulator…</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function PhysicsLabPage() {
  const [active, setActive] = useState<ModuleId | null>(null);
  const activeMod = active ? MODULES.find((m) => m.id === active) : null;

  return (
    <div className="pl-shell">
      {/* ── Star field ── */}
      <div className="pl-stars" aria-hidden="true">
        {STARS.map((s) => (
          <span key={s.id} className="pl-star" style={{
            left: s.left, top: s.top, width: s.size, height: s.size,
            animationDuration: s.dur, animationDelay: s.delay, opacity: s.op,
          }} />
        ))}
      </div>

      {/* ── Nebula blobs ── */}
      <div className="pl-nebula pl-nebula-1" aria-hidden="true" />
      <div className="pl-nebula pl-nebula-2" aria-hidden="true" />
      <div className="pl-nebula pl-nebula-3" aria-hidden="true" />

      {/* ── Content ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24">

        {/* Back link */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-6">
          <Link href="/" className="pl-back-link">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            COSMOS-5H1
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mb-12"
        >
          <p className="pl-eyebrow">
            <span className="pl-eyebrow-dot" />
            COSMOS-5H1 · Interactive Physics Lab
          </p>
          <h1 className="pl-title">
            Physics &amp; Mission<span className="pl-title-accent"> Lab</span>
          </h1>
          <p className="pl-subtitle">
            Real orbital mechanics, Newton&apos;s laws, and space physics — explored through live 2D simulations.
            Every value is computed from real equations, not animation presets.
          </p>
        </motion.div>

        {/* ── Module grid ── */}
        <AnimatePresence mode="wait">
          {!active && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {MODULES.map((mod, i) => (
                <motion.button
                  key={mod.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: i * 0.055 }}
                  onClick={() => setActive(mod.id)}
                  className="pl-module-card"
                  style={{ "--glow": mod.glow, "--color": mod.color } as React.CSSProperties}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="pl-module-icon">{mod.icon}</span>
                  <span className="pl-module-label">{mod.label}</span>
                  <span className="pl-module-sub">{mod.sub}</span>
                  <span className="pl-module-arrow">→</span>
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ── Active simulator ── */}
          {active && activeMod && (
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
            >
              {/* Breadcrumb / back */}
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setActive(null)}
                  className="pl-back-btn"
                >
                  ← All Modules
                </button>
                <span className="text-white/20">/</span>
                <span className="text-sm font-semibold" style={{ color: activeMod.color }}>
                  {activeMod.icon} {activeMod.label}
                </span>
              </div>

              {/* Simulator panel */}
              <div className="pl-sim-panel" style={{ "--glow": activeMod.glow } as React.CSSProperties}>
                <Suspense fallback={<SimLoader />}>
                  {active === "rocket"     && <RocketLaunchSim />}
                  {active === "projectile" && <ProjectileMotionSim />}
                  {active === "gravity"    && <GravityComparisonSim />}
                  {active === "orbit"      && <OrbitalMechanicsSim />}
                  {active === "newton"     && <NewtonGravitySim />}
                  {active === "escape"     && <EscapeVelocitySim />}
                  {active === "blackhole"  && <BlackHoleSim />}
                  {active === "asteroid"   && <AsteroidImpactSim />}
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Footer ── */}
        <footer className="mt-20 text-center">
          <p className="text-blue-400/25 text-xs">
            COSMOS-5H1 Physics Lab · Real equations, zero fake animations · Open Source
          </p>
        </footer>
      </div>
    </div>
  );
}
