"use client";
// ─────────────────────────────────────────────────────────────────────────────
// CompareCard — Animated side-by-side stat row with progress bars
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import type { CelestialCompareData } from "@/lib/cosmic-compare-data";

interface StatRowProps {
  label: string;
  icon: string;
  valueA: string;
  valueB: string;
  numA?: number;   // numeric for bar (0–100 scale handled by caller)
  numB?: number;
  colorA: string;
  colorB: string;
  unit?: string;
}

function StatRow({ label, icon, valueA, valueB, numA, numB, colorA, colorB }: StatRowProps) {
  const hasBar = numA !== undefined && numB !== undefined && (numA > 0 || numB > 0);
  const maxVal = Math.max(numA ?? 0, numB ?? 0, 1);
  const barA = hasBar ? Math.min(100, ((numA ?? 0) / maxVal) * 100) : 0;
  const barB = hasBar ? Math.min(100, ((numB ?? 0) / maxVal) * 100) : 0;

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center py-3 border-b border-white/5">
      {/* Left value */}
      <div className="text-right">
        <div className="text-white text-sm font-medium leading-tight">{valueA}</div>
        {hasBar && (
          <div className="mt-1.5 flex justify-end">
            <div className="w-full max-w-[120px] h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: colorA }}
                initial={{ width: 0 }}
                animate={{ width: `${barA}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Center label */}
      <div className="flex flex-col items-center gap-1 px-2 min-w-[90px]">
        <span className="text-lg leading-none">{icon}</span>
        <span className="text-blue-300/50 text-[10px] uppercase tracking-wider text-center leading-tight">{label}</span>
      </div>

      {/* Right value */}
      <div className="text-left">
        <div className="text-white text-sm font-medium leading-tight">{valueB}</div>
        {hasBar && (
          <div className="mt-1.5">
            <div className="w-full max-w-[120px] h-1 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: colorB }}
                initial={{ width: 0 }}
                animate={{ width: `${barB}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.15 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface CompareCardProps {
  objA: CelestialCompareData;
  objB: CelestialCompareData;
  section: "physical" | "orbital" | "atmosphere" | "habitability" | "overview";
}

export default function CompareCard({ objA, objB, section }: CompareCardProps) {
  const rows = getRows(section, objA, objB);

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
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: objA.color, boxShadow: `0 0 8px ${objA.glowColor}` }} />
          <span className="text-white font-semibold text-sm">{objA.name}</span>
        </div>
        <span className="text-blue-300/40 text-xs uppercase tracking-widest px-3">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{objB.name}</span>
          <div className="w-2 h-2 rounded-full" style={{ background: objB.color, boxShadow: `0 0 8px ${objB.glowColor}` }} />
        </div>
      </div>

      {/* Rows */}
      <div className="px-5 divide-y divide-white/0">
        {rows.map((row, i) => <StatRow key={i} {...row} colorA={objA.color} colorB={objB.color} />)}
      </div>
    </motion.div>
  );
}

// ── Row definitions per section ──────────────────────────────────────────────
function getRows(section: string, a: CelestialCompareData, b: CelestialCompareData): Omit<StatRowProps, "colorA" | "colorB">[] {
  switch (section) {
    case "physical": return [
      { label: "Diameter", icon: "⊙", valueA: a.diameter, valueB: b.diameter, numA: a.diameterKm, numB: b.diameterKm },
      { label: "Mass", icon: "⚖️", valueA: a.mass, valueB: b.mass, numA: a.massKg, numB: b.massKg },
      { label: "Gravity", icon: "🌐", valueA: a.gravity, valueB: b.gravity, numA: a.gravityMs2, numB: b.gravityMs2 },
      { label: "Density", icon: "💠", valueA: a.density, valueB: b.density },
      { label: "Escape Vel.", icon: "🚀", valueA: a.escapeVelocity, valueB: b.escapeVelocity, numA: a.escapeVelocityKms, numB: b.escapeVelocityKms },
      { label: "Moons", icon: "🌙", valueA: String(a.moons), valueB: String(b.moons), numA: a.moons, numB: b.moons },
      { label: "Surf. Temp", icon: "🌡️", valueA: a.surfaceTemp, valueB: b.surfaceTemp },
      { label: "Core Temp", icon: "🔥", valueA: a.coreTemp, valueB: b.coreTemp },
      { label: "Mag. Field", icon: "🧲", valueA: a.magneticField, valueB: b.magneticField, numA: a.magneticFieldScore, numB: b.magneticFieldScore },
      { label: "Composition", icon: "⚗️", valueA: a.composition, valueB: b.composition },
    ];
    case "orbital": return [
      { label: "Dist. Sun", icon: "☀️", valueA: a.distanceFromSun, valueB: b.distanceFromSun, numA: a.distanceFromSunAU, numB: b.distanceFromSunAU },
      { label: "Dist. Earth", icon: "🌍", valueA: a.distanceFromEarth, valueB: b.distanceFromEarth },
      { label: "Orbital Speed", icon: "💨", valueA: a.orbitalSpeed, valueB: b.orbitalSpeed, numA: a.orbitalSpeedKms, numB: b.orbitalSpeedKms },
      { label: "Orbital Period", icon: "🔄", valueA: a.orbitalPeriod, valueB: b.orbitalPeriod },
      { label: "Rotation", icon: "🌀", valueA: a.rotationPeriod, valueB: b.rotationPeriod },
      { label: "Day Length", icon: "⏱️", valueA: a.avgDayLength, valueB: b.avgDayLength },
      { label: "Year Length", icon: "📅", valueA: a.avgYearLength, valueB: b.avgYearLength },
      { label: "Age", icon: "⏳", valueA: a.age, valueB: b.age },
    ];
    case "atmosphere": return [
      { label: "Atmosphere", icon: "💨", valueA: a.atmosphere, valueB: b.atmosphere },
      { label: "Pressure", icon: "🔲", valueA: a.pressure, valueB: b.pressure },
      { label: "Surface Type", icon: "🏔️", valueA: a.surfaceType, valueB: b.surfaceType },
      { label: "Color", icon: "🎨", valueA: a.color_desc, valueB: b.color_desc },
      { label: "Water", icon: "💧", valueA: a.waterPresence, valueB: b.waterPresence },
    ];
    case "habitability": return [
      { label: "Life", icon: "🧬", valueA: a.lifePossibility, valueB: b.lifePossibility },
      { label: "Habitability", icon: "🏡", valueA: a.habitability, valueB: b.habitability },
      { label: "Terraform", icon: "🌱", valueA: a.terraform, valueB: b.terraform },
      { label: "Discovery", icon: "🔭", valueA: a.discovery, valueB: b.discovery },
    ];
    default: return [
      { label: "Type", icon: "🪐", valueA: a.type, valueB: b.type },
      { label: "Diameter", icon: "⊙", valueA: a.diameter, valueB: b.diameter, numA: a.diameterKm, numB: b.diameterKm },
      { label: "Gravity", icon: "🌐", valueA: a.gravity, valueB: b.gravity, numA: a.gravityMs2, numB: b.gravityMs2 },
      { label: "Surf. Temp", icon: "🌡️", valueA: a.surfaceTemp, valueB: b.surfaceTemp },
      { label: "Moons", icon: "🌙", valueA: String(a.moons), valueB: String(b.moons), numA: a.moons, numB: b.moons },
      { label: "Water", icon: "💧", valueA: a.waterPresence, valueB: b.waterPresence },
      { label: "Life", icon: "🧬", valueA: a.lifePossibility, valueB: b.lifePossibility },
    ];
  }
}
