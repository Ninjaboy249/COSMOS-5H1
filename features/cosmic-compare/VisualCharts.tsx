"use client";
// ─────────────────────────────────────────────────────────────────────────────
// VisualCharts — Animated visual comparison widgets
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from "framer-motion";
import type { CelestialCompareData } from "@/lib/cosmic-compare-data";

interface VisualChartsProps {
  objA: CelestialCompareData;
  objB: CelestialCompareData;
}

// ── Size Comparison ───────────────────────────────────────────────────────────
function SizeWidget({ objA, objB }: VisualChartsProps) {
  const maxD = Math.max(objA.diameterKm, objB.diameterKm, 1);
  const sizeA = Math.max(24, (objA.diameterKm / maxD) * 110);
  const sizeB = Math.max(24, (objB.diameterKm / maxD) * 110);
  return (
    <div className="compare-chart-card">
      <h3 className="compare-chart-title">⊙ Size Comparison</h3>
      <div className="flex items-end justify-center gap-8 py-6">
        <div className="flex flex-col items-center gap-2">
          <motion.div
            className="rounded-full flex-shrink-0"
            style={{ width: sizeA, height: sizeA, background: `radial-gradient(circle at 35% 35%, ${objA.color}cc, ${objA.color}44)`, boxShadow: `0 0 ${sizeA * 0.3}px ${objA.glowColor}` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
          <span className="text-white text-xs font-semibold">{objA.name}</span>
          <span className="text-blue-300/40 text-[10px]">{objA.diameter}</span>
        </div>
        <div className="text-blue-300/30 text-2xl font-light self-center">vs</div>
        <div className="flex flex-col items-center gap-2">
          <motion.div
            className="rounded-full flex-shrink-0"
            style={{ width: sizeB, height: sizeB, background: `radial-gradient(circle at 35% 35%, ${objB.color}cc, ${objB.color}44)`, boxShadow: `0 0 ${sizeB * 0.3}px ${objB.glowColor}` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
          <span className="text-white text-xs font-semibold">{objB.name}</span>
          <span className="text-blue-300/40 text-[10px]">{objB.diameter}</span>
        </div>
      </div>
    </div>
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────
interface BarChartProps {
  title: string;
  labelA: string;
  labelB: string;
  valA: number;
  valB: number;
  colorA: string;
  colorB: string;
  unit?: string;
  displayA?: string;
  displayB?: string;
}

function BarChart({ title, labelA, labelB, valA, valB, colorA, colorB, unit, displayA, displayB }: BarChartProps) {
  const max = Math.max(valA, valB, 1);
  const pA = (valA / max) * 100;
  const pB = (valB / max) * 100;
  return (
    <div className="compare-chart-card">
      <h3 className="compare-chart-title">{title}</h3>
      <div className="space-y-4 py-2">
        {[
          { label: labelA, val: valA, pct: pA, color: colorA, display: displayA ?? `${valA}${unit ? " " + unit : ""}` },
          { label: labelB, val: valB, pct: pB, color: colorB, display: displayB ?? `${valB}${unit ? " " + unit : ""}` },
        ].map(({ label, pct, color, display }) => (
          <div key={label} className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-white/80 text-xs font-medium">{label}</span>
              <span className="text-white/50 text-xs">{display}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 1.1, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Fun Facts ─────────────────────────────────────────────────────────────────
function FunFactsWidget({ objA, objB }: VisualChartsProps) {
  return (
    <div className="compare-chart-card col-span-full">
      <h3 className="compare-chart-title">💡 Fun Facts</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {[objA, objB].map((obj) => (
          <div key={obj.id}>
            <div className="flex items-center gap-2 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={obj.image} alt={obj.name} className="w-6 h-6 object-contain" />
              <span className="text-white font-semibold text-sm">{obj.name}</span>
            </div>
            <ul className="space-y-2">
              {obj.funFacts.map((fact, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-2 text-blue-200/60 text-xs"
                >
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: obj.color }} />
                  {fact}
                </motion.li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function VisualCharts({ objA, objB }: VisualChartsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <SizeWidget objA={objA} objB={objB} />
      <BarChart
        title="🌐 Gravity (m/s²)"
        labelA={objA.name} labelB={objB.name}
        valA={objA.gravityMs2} valB={objB.gravityMs2}
        colorA={objA.color} colorB={objB.color}
        unit="m/s²"
      />
      <BarChart
        title="🌡️ Surface Temperature (°C)"
        labelA={objA.name} labelB={objB.name}
        valA={Math.abs(objA.surfaceTempC)} valB={Math.abs(objB.surfaceTempC)}
        colorA={objA.color} colorB={objB.color}
        displayA={objA.surfaceTemp} displayB={objB.surfaceTemp}
      />
      <BarChart
        title="💨 Orbital Speed (km/s)"
        labelA={objA.name} labelB={objB.name}
        valA={objA.orbitalSpeedKms} valB={objB.orbitalSpeedKms}
        colorA={objA.color} colorB={objB.color}
        unit="km/s"
      />
      <BarChart
        title="🚀 Escape Velocity (km/s)"
        labelA={objA.name} labelB={objB.name}
        valA={Math.min(objA.escapeVelocityKms, 700)} valB={Math.min(objB.escapeVelocityKms, 700)}
        colorA={objA.color} colorB={objB.color}
        displayA={objA.escapeVelocity} displayB={objB.escapeVelocity}
      />
      <BarChart
        title="🧲 Magnetic Field Strength"
        labelA={objA.name} labelB={objB.name}
        valA={objA.magneticFieldScore} valB={objB.magneticFieldScore}
        colorA={objA.color} colorB={objB.color}
        displayA={objA.magneticField} displayB={objB.magneticField}
      />
      <FunFactsWidget objA={objA} objB={objB} />
    </div>
  );
}
