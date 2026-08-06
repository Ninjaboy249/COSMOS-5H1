"use client";
// ─────────────────────────────────────────────────────────────────────────────
// COSMOS-5H1 — AI Mission Planner
// Route: /mission-planner
// Lets the user configure a space mission; calls /api/mission-planner;
// renders the full MissionPlan with typewriter animation.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { MissionInput, MissionPlan } from "@/lib/mission-planner-types";

// ── Star field (static to avoid hydration mismatch) ───────────────────────────
const STARS = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  left: `${(i * 1.43) % 100}%`,
  top: `${(i * 2.17) % 100}%`,
  delay: `${(i * 0.13) % 8}s`,
  duration: `${4 + (i * 0.09) % 6}s`,
  size: `${1 + (i % 2)}px`,
  opacity: 0.15 + (i % 5) * 0.07,
}));

// ── Destination presets ───────────────────────────────────────────────────────
const DESTINATIONS = [
  { id: "Moon",    emoji: "🌕", label: "Moon",    color: "#d1d5db" },
  { id: "Mars",    emoji: "🔴", label: "Mars",    color: "#f87171" },
  { id: "Venus",   emoji: "🟡", label: "Venus",   color: "#fcd34d" },
  { id: "Mercury", emoji: "☿",  label: "Mercury", color: "#9ca3af" },
  { id: "Jupiter", emoji: "🪐", label: "Jupiter", color: "#fb923c" },
  { id: "Saturn",  emoji: "💫", label: "Saturn",  color: "#a78bfa" },
  { id: "Europa",  emoji: "🧊", label: "Europa",  color: "#67e8f9" },
];

// ── Objectives chips ──────────────────────────────────────────────────────────
const ALL_OBJECTIVES = [
  "Sample collection", "Surface mapping", "Atmospheric study",
  "Search for life", "Resource survey", "Technology demonstration",
  "Astronomy observations", "Crew endurance research",
];

// ── Quick example configs ─────────────────────────────────────────────────────
const EXAMPLES: { label: string; input: MissionInput }[] = [
  {
    label: "🔴 Mars Crewed",
    input: { destination: "Mars", crew: 4, duration: 550, missionType: "crewed", objectives: ["Sample collection", "Search for life"] },
  },
  {
    label: "🌕 Lunar Base",
    input: { destination: "Moon", crew: 6, duration: 180, missionType: "crewed", objectives: ["Resource survey", "Technology demonstration"] },
  },
  {
    label: "🧊 Europa Probe",
    input: { destination: "Europa", crew: 0, duration: 365, missionType: "robotic", objectives: ["Search for life", "Atmospheric study"] },
  },
];

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    if (!active) { setDisplayed(text); return; }
    setDisplayed("");
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);
  return displayed;
}

// ── Risk gauge bar ────────────────────────────────────────────────────────────
function RiskGauge({ score, level }: { score: number; level: string }) {
  const color =
    score <= 3 ? "#34d399" :
    score <= 5 ? "#fbbf24" :
    score <= 7 ? "#fb923c" : "#f87171";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-white/90 text-xs font-semibold">Risk Score</span>
        <span className="text-sm font-bold" style={{ color, textShadow: `0 0 14px ${color}cc` }}>{score}/10 — {level}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}88` }}
        />
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function PlanCard({
  icon, title, children, delay = 0,
}: {
  icon: string; title: string; children: React.ReactNode; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ scale: 1.012, transition: { duration: 0.2 } }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(145deg, rgba(10,22,51,0.75), rgba(2,7,20,0.65))",
        border: "1px solid rgba(147,197,253,0.22)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(147,197,253,0.10)",
      }}
    >
      {/* Animated header bar */}
      <div
        className="flex items-center gap-2.5 px-5 py-3.5 border-b relative overflow-hidden"
        style={{
          borderColor: "rgba(147,197,253,0.15)",
          background: "linear-gradient(90deg, rgba(147,197,253,0.08), rgba(167,139,250,0.05))",
        }}
      >
        {/* Shimmer highlight on the header */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={{ x: "200%" }}
          transition={{ duration: 2.2, delay: delay + 0.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 6 }}
          style={{ background: "linear-gradient(90deg, transparent, rgba(147,197,253,0.12), transparent)", width: "50%" }}
        />
        <span className="text-base relative z-10">{icon}</span>
        <span
          className="text-xs font-bold uppercase tracking-widest relative z-10"
          style={{
            color: "#bfdbfe",
            textShadow: "0 0 16px rgba(147,197,253,0.7)",
            letterSpacing: "0.12em",
          }}
        >
          {title}
        </span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </motion.div>
  );
}

// ── Row helper ────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b" style={{ borderColor: "rgba(147,197,253,0.10)" }}>
      <span className="text-xs shrink-0 font-semibold" style={{ color: "#93c5fd", opacity: 0.85 }}>{label}</span>
      <span className="text-white text-xs text-right font-semibold leading-snug" style={{ textShadow: "0 0 10px rgba(147,197,253,0.3)" }}>{value}</span>
    </div>
  );
}

// ── Mission Plan display ──────────────────────────────────────────────────────
function MissionPlanView({ plan, isNew }: { plan: MissionPlan; isNew: boolean }) {
  const summary = useTypewriter(plan.summary, isNew, 20);

  return (
    <div className="flex flex-col gap-4">
      {/* Title + summary */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl px-6 py-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.22), rgba(147,197,253,0.12))",
          border: "1px solid rgba(147,197,253,0.30)",
          boxShadow: "0 0 50px rgba(99,102,241,0.22), inset 0 1px 0 rgba(147,197,253,0.14)",
        }}
      >
        {/* Animated corner glow */}
        <motion.div
          className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
          animate={{ opacity: [0.15, 0.35, 0.15], scale: [1, 1.15, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ background: "radial-gradient(circle, rgba(147,197,253,0.4), transparent 70%)" }}
        />
        <h2
          className="text-xl font-bold mb-3 relative z-10"
          style={{
            background: "linear-gradient(90deg, #fff 30%, #93c5fd 65%, #a78bfa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            filter: "drop-shadow(0 0 12px rgba(147,197,253,0.5))",
          }}
        >
          {plan.title}
        </h2>
        <p className="text-blue-50 text-sm leading-relaxed relative z-10" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{summary}<span className="animate-pulse text-cyan-300" style={{ textShadow: "0 0 8px rgba(103,232,249,0.8)" }}>▊</span></p>
      </motion.div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Launch Window */}
        <PlanCard icon="🚀" title="Launch Window" delay={0.05}>
          <Row label="Optimal window" value={plan.launchWindow.date} />
          <Row label="Why optimal" value={plan.launchWindow.reason} />
          <Row label="Backup window" value={plan.launchWindow.backupDate} />
        </PlanCard>

        {/* Orbit */}
        <PlanCard icon="🌐" title="Orbit Profile" delay={0.10}>
          <Row label="Orbit type" value={plan.orbit.type} />
          <Row label="Altitude" value={plan.orbit.altitude} />
          <Row label="Inclination" value={plan.orbit.inclination} />
          <Row label="Period" value={plan.orbit.period} />
        </PlanCard>

        {/* Spacecraft */}
        <PlanCard icon="🛸" title="Spacecraft" delay={0.15}>
          <Row label="Name" value={plan.spacecraft.name} />
          <Row label="Type" value={plan.spacecraft.type} />
          <p className="text-blue-100/90 text-xs mt-3 leading-relaxed">{plan.spacecraft.description}</p>
        </PlanCard>

        {/* Fuel */}
        <PlanCard icon="⚡" title="Propulsion & Fuel" delay={0.20}>
          <Row label="Total propellant" value={plan.fuel.total} />
          <Row label="Propellant type" value={plan.fuel.propellant} />
          <Row label="Total ΔV" value={plan.fuel.deltaV} />
          <p className="text-blue-100/90 text-xs mt-3 leading-relaxed">{plan.fuel.stages}</p>
        </PlanCard>

        {/* Crew */}
        {plan.crew.size > 0 && (
          <PlanCard icon="👨‍🚀" title="Crew" delay={0.25}>
            <Row label="Crew size" value={`${plan.crew.size} astronauts`} />
            <Row label="Roles" value={plan.crew.roles.join(", ")} />
            <Row label="Training" value={plan.crew.training} />
          </PlanCard>
        )}

        {/* Payload */}
        <PlanCard icon="📦" title="Payload" delay={0.25}>
          <Row label="Primary" value={plan.payload.primary} />
          <Row label="Secondary" value={plan.payload.secondary} />
          <Row label="Total mass" value={plan.payload.totalMass} />
        </PlanCard>

        {/* Cost */}
        <PlanCard icon="💰" title="Cost Estimate" delay={0.30}>
          <div className="mb-3">
            <span
              className="text-2xl font-bold"
              style={{ color: "#34d399", textShadow: "0 0 12px rgba(52,211,153,0.35)" }}
            >
              {plan.cost.estimated}
            </span>
          </div>
          {plan.cost.breakdown.map((item) => (
            <Row key={item.item} label={item.item} value={item.cost} />
          ))}
        </PlanCard>

        {/* Risk */}
        <PlanCard icon="⚠️" title="Risk Assessment" delay={0.35}>
          <div className="mb-3">
            <RiskGauge score={plan.risk.score} level={plan.risk.level} />
          </div>
          <div className="grid grid-cols-1 gap-1 mt-3">
            <span className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.5)" }}>Risk Factors</span>
            {plan.risk.factors.map((f) => (
              <div key={f} className="flex items-start gap-1.5 py-0.5">
                <span className="text-red-400 text-[11px] mt-0.5" style={{ textShadow: "0 0 6px rgba(248,113,113,0.6)" }}>▲</span>
                <span className="text-red-200 text-xs font-medium">{f}</span>
              </div>
            ))}
            <span className="text-[10px] font-bold uppercase tracking-wider mt-3 mb-1.5" style={{ color: "#34d399", textShadow: "0 0 10px rgba(52,211,153,0.5)" }}>Mitigations</span>
            {plan.risk.mitigations.map((m) => (
              <div key={m} className="flex items-start gap-1.5 py-0.5">
                <span className="text-emerald-400 text-[11px] mt-0.5" style={{ textShadow: "0 0 6px rgba(52,211,153,0.6)" }}>✓</span>
                <span className="text-emerald-100 text-xs font-medium">{m}</span>
              </div>
            ))}
          </div>
        </PlanCard>

      </div>

      {/* Timeline — full width */}
      <PlanCard icon="📅" title="Mission Timeline" delay={0.40}>
        <div className="flex flex-col gap-0">
          {plan.timeline.map((phase, i) => (
            <motion.div
              key={phase.phase}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.45 + i * 0.07, ease: "easeOut" }}
              className="flex gap-4 pb-5 last:pb-0"
            >
              {/* Vertical line + dot */}
              <div className="flex flex-col items-center">
                <motion.div
                  className="w-3 h-3 rounded-full shrink-0 mt-0.5"
                  animate={{ boxShadow: ["0 0 8px rgba(147,197,253,0.5), 0 0 16px rgba(147,197,253,0.2)", "0 0 14px rgba(147,197,253,0.9), 0 0 28px rgba(147,197,253,0.4)", "0 0 8px rgba(147,197,253,0.5), 0 0 16px rgba(147,197,253,0.2)"] }}
                  transition={{ duration: 2.5, delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "#93c5fd" }}
                />
                {i < plan.timeline.length - 1 && (
                  <div className="w-px flex-1 mt-1" style={{ background: "rgba(147,197,253,0.25)" }} />
                )}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-bold" style={{ textShadow: "0 0 12px rgba(147,197,253,0.4)" }}>{phase.phase}</span>
                  <span
                    className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(147,197,253,0.18)", color: "#bfdbfe", border: "1px solid rgba(147,197,253,0.35)", textShadow: "0 0 8px rgba(147,197,253,0.5)" }}
                  >
                    {phase.duration}
                  </span>
                </div>
                <p className="text-blue-100/90 text-xs leading-relaxed">{phase.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </PlanCard>

      {/* Backup plan — full width */}
      <PlanCard icon="🔄" title="Backup & Contingencies" delay={0.45}>
        <p className="text-blue-50 text-sm mb-4 leading-relaxed">{plan.backup.plan}</p>
        {plan.backup.contingencies.map((c) => (
          <div key={c} className="flex items-start gap-2 py-1.5">
            <span className="text-blue-400 text-xs mt-0.5" style={{ textShadow: "0 0 6px rgba(96,165,250,0.6)" }}>◆</span>
            <span className="text-white/95 text-xs leading-snug">{c}</span>
          </div>
        ))}
      </PlanCard>
    </div>
  );
}

// ── Loading steps ─────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  "Calculating orbital transfer windows…",
  "Computing Hohmann trajectory ΔV…",
  "Sizing propellant and staging…",
  "Assessing crew requirements…",
  "Estimating mission cost…",
  "Running risk analysis…",
  "Generating mission plan…",
];

function LoadingView() {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-20 relative"
    >
      {/* Pulsing background glow */}
      <motion.div
        className="absolute inset-0 rounded-3xl pointer-events-none"
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(ellipse at center, rgba(147,197,253,0.08) 0%, transparent 70%)" }}
      />

      {/* Triple-ring orbit spinner */}
      <div className="relative w-20 h-20">
        <motion.div
          className="absolute inset-0 rounded-full border-2"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: "transparent", borderTopColor: "#93c5fd", boxShadow: "0 0 12px rgba(147,197,253,0.5)" }}
        />
        <motion.div
          className="absolute inset-2 rounded-full border"
          animate={{ rotate: -360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: "transparent", borderTopColor: "#a78bfa", boxShadow: "0 0 8px rgba(167,139,250,0.5)" }}
        />
        <motion.div
          className="absolute inset-4 rounded-full border"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: "transparent", borderTopColor: "#34d399", boxShadow: "0 0 6px rgba(52,211,153,0.4)" }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xl">🚀</span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <span
          className="text-base font-bold"
          style={{ color: "#bfdbfe", textShadow: "0 0 14px rgba(147,197,253,0.6)" }}
        >
          Planning your mission…
        </span>
        {/* Progress dots */}
        <div className="flex gap-1.5 my-1">
          {LOADING_STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              animate={{ opacity: i <= stepIdx ? 1 : 0.2, scale: i === stepIdx ? 1.4 : 1 }}
              transition={{ duration: 0.3 }}
              style={{ background: i <= stepIdx ? "#93c5fd" : "rgba(147,197,253,0.3)", boxShadow: i === stepIdx ? "0 0 8px rgba(147,197,253,0.8)" : "none" }}
            />
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.span
            key={stepIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-xs font-semibold"
            style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}
          >
            {LOADING_STEPS[stepIdx]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MissionPlannerPage() {
  const [destination, setDestination] = useState("Mars");
  const [crew, setCrew] = useState(4);
  const [duration, setDuration] = useState(550);
  const [missionType, setMissionType] = useState<"crewed" | "robotic" | "cargo">("crewed");
  const [objectives, setObjectives] = useState<string[]>(["Sample collection", "Search for life"]);

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<MissionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);

  const resultRef = useRef<HTMLDivElement>(null);

  const toggleObjective = (obj: string) => {
    setObjectives((prev) =>
      prev.includes(obj) ? prev.filter((o) => o !== obj) : [...prev, obj]
    );
  };

  const applyExample = (ex: (typeof EXAMPLES)[0]) => {
    setDestination(ex.input.destination);
    setCrew(ex.input.crew);
    setDuration(ex.input.duration);
    setMissionType(ex.input.missionType as "crewed" | "robotic" | "cargo");
    setObjectives(ex.input.objectives);
    setPlan(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!destination) return;
    setLoading(true);
    setPlan(null);
    setError(null);
    setIsNew(true);

    const input: MissionInput = { destination, crew, duration, missionType, objectives };

    try {
      const res = await fetch("/api/mission-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json() as { plan: MissionPlan };
      setPlan(data.plan);
      // Scroll to result
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Mission planning failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#00030a url('/images/milkyway-bg.jpg') center top / cover no-repeat fixed" }}
    >
      {/* Star particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {STARS.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDelay: s.delay, animationDuration: s.duration }}
          />
        ))}
      </div>

      <div className="relative max-w-4xl mx-auto px-5 md:px-8 pt-28 pb-20">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors duration-150"
            style={{ color: "rgba(147,197,253,0.88)", textShadow: "0 0 10px rgba(147,197,253,0.35)" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            COSMOS-5H1
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="mb-10">
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3" style={{ color: "rgba(147,197,253,0.7)", textShadow: "0 0 10px rgba(147,197,253,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ boxShadow: "0 0 6px #60a5fa" }} />
            COSMOS-5H1 · AI Mission Planner
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3" style={{ background: "linear-gradient(100deg, #fff 20%, #93c5fd 55%, #a78bfa 80%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", filter: "drop-shadow(0 0 16px rgba(147,197,253,0.35))" }}>
            Mission<span> Planner</span>
          </h1>
          <p className="text-blue-100/90 text-sm leading-relaxed max-w-lg" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            Configure your mission parameters below. The AI engine will compute launch windows, orbital mechanics, fuel requirements, cost estimates, and a complete risk assessment.
          </p>
        </motion.div>

        {/* ── Quick examples ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex flex-wrap gap-2 mb-8">
          <span className="text-blue-200/80 text-xs self-center font-semibold">Quick examples:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => applyExample(ex)}
              className="px-3 py-1.5 rounded-full text-xs transition-all duration-200 hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(147,197,253,0.25)", color: "rgba(191,219,254,0.88)" }}
            >
              {ex.label}
            </button>
          ))}
        </motion.div>

        {/* ── Config form ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="rounded-2xl p-6 mb-8"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(147,197,253,0.1)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Destination grid */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}>Destination</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DESTINATIONS.map((d) => {
                const active = destination === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => setDestination(d.id)}
                    className="flex flex-col items-center gap-1 px-2 py-3 rounded-xl transition-all duration-200"
                    style={{
                      background: active ? "rgba(147,197,253,0.12)" : "rgba(255,255,255,0.03)",
                      border: active ? `1px solid ${d.color}55` : "1px solid rgba(255,255,255,0.06)",
                      boxShadow: active ? `0 0 12px ${d.color}25` : "none",
                    }}
                  >
                    <span className="text-xl">{d.emoji}</span>
                    <span className="text-[10px] font-semibold" style={{ color: active ? d.color : "rgba(255,255,255,0.75)" }}>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mission type */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}>Mission Type</label>
            <div className="flex gap-2 flex-wrap">
              {(["crewed", "robotic", "cargo"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setMissionType(t);
                    if (t !== "crewed") setCrew(0);
                    else setCrew(4);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold capitalize transition-all duration-200"
                  style={{
                    background: missionType === t ? "rgba(147,197,253,0.15)" : "rgba(255,255,255,0.06)",
                    border: missionType === t ? "1px solid rgba(147,197,253,0.3)" : "1px solid rgba(255,255,255,0.18)",
                    color: missionType === t ? "#93c5fd" : "rgba(255,255,255,0.82)",
                    textShadow: missionType === t ? "0 0 10px rgba(147,197,253,0.4)" : "none",
                  }}
                >
                  {t === "crewed" ? "👨‍🚀 Crewed" : t === "robotic" ? "🤖 Robotic" : "📦 Cargo"}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            {/* Crew */}
            {missionType === "crewed" && (
              <div>
                <label className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-between" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}>
                  <span>Crew Size</span>
                  <span style={{ color: "#fff", textShadow: "0 0 8px rgba(147,197,253,0.5)" }}>{crew} astronauts</span>
                </label>
                <input
                  type="range" min={1} max={7} step={1} value={crew}
                  onChange={(e) => setCrew(Number(e.target.value))}
                  className="w-full accent-blue-400"
                />
                <div className="flex justify-between text-[10px] mt-1 font-medium" style={{ color: "rgba(147,197,253,0.72)" }}>
                  <span>1</span><span>4</span><span>7</span>
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center justify-between" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}>
                <span>Duration</span>
                <span style={{ color: "#fff", textShadow: "0 0 8px rgba(147,197,253,0.5)" }}>{duration} days</span>
              </label>
              <input
                type="range" min={7} max={1800} step={7} value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-blue-400"
              />
              <div className="flex justify-between text-[10px] mt-1 font-medium" style={{ color: "rgba(147,197,253,0.72)" }}>
                <span>7d</span><span>~1yr</span><span>5yr</span>
              </div>
            </div>
          </div>

          {/* Objectives */}
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-widest mb-3 block" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}>Mission Objectives</label>
            <div className="flex flex-wrap gap-2">
              {ALL_OBJECTIVES.map((obj) => {
                const selected = objectives.includes(obj);
                return (
                  <button
                    key={obj}
                    onClick={() => toggleObjective(obj)}
                    className="px-3 py-1.5 rounded-full text-xs transition-all duration-200 font-medium"
                    style={{
                      background: selected ? "rgba(167,139,250,0.15)" : "rgba(255,255,255,0.06)",
                      border: selected ? "1px solid rgba(167,139,250,0.45)" : "1px solid rgba(255,255,255,0.18)",
                      color: selected ? "#ddd6fe" : "rgba(219,234,254,0.82)",
                    }}
                  >
                    {selected ? "✓ " : ""}{obj}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || objectives.length === 0}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
            style={{
              background: loading ? "rgba(147,197,253,0.08)" : "linear-gradient(120deg, rgba(99,102,241,0.5), rgba(147,197,253,0.3))",
              border: "1px solid rgba(147,197,253,0.25)",
              color: "#e0f2fe",
              boxShadow: loading ? "none" : "0 0 24px rgba(147,197,253,0.15)",
              textShadow: "0 0 10px rgba(147,197,253,0.4)",
            }}
          >
            {loading ? "Planning mission…" : "🚀 Generate Mission Plan"}
          </button>
        </motion.div>

        {/* ── Result area ──────────────────────────────────────────────────── */}
        <div ref={resultRef}>
          <AnimatePresence mode="wait">
            {loading && <LoadingView key="loading" />}

            {error && !loading && (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl px-6 py-5 text-center"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}
              >
                <p className="text-sm">⚠️ {error}</p>
              </motion.div>
            )}

            {plan && !loading && (
              <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <MissionPlanView plan={plan} isNew={isNew} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
