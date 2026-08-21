"use client";
// ─────────────────────────────────────────────────────────────────────────────
// NewtonGravitySim — Interactive Newton's Law of Universal Gravitation
// simulator. Visualises F = G·m₁·m₂ / r² with animated bodies, force arrows,
// collision explosion, and live stats.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Physics constants ────────────────────────────────────────────────────────

const G = 6.674e-11; // N·m²/kg²
const EARTH_MOON_FORCE = 1.98e20; // N
const EARTH_SUN_FORCE = 3.54e22; // N

// ─── Canvas geometry ──────────────────────────────────────────────────────────

const CW = 700;
const CH = 400;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map a log-scale slider value [0,1] onto [minVal, maxVal] in log space. */
function logSliderToValue(t: number, minVal: number, maxVal: number): number {
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  return Math.pow(10, logMin + t * (logMax - logMin));
}

function valueToLogSlider(v: number, minVal: number, maxVal: number): number {
  const logMin = Math.log10(minVal);
  const logMax = Math.log10(maxVal);
  return (Math.log10(v) - logMin) / (logMax - logMin);
}

function toSci(v: number, digits = 3): string {
  if (v === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const coeff = v / Math.pow(10, exp);
  return `${coeff.toFixed(digits)} × 10^${exp}`;
}

function toSciSup(v: number, digits = 3): React.ReactElement {
  if (v === 0) return <span>0</span>;
  const exp = Math.floor(Math.log10(Math.abs(v)));
  const coeff = v / Math.pow(10, exp);
  return (
    <span>
      {coeff.toFixed(digits)} × 10<sup>{exp}</sup>
    </span>
  );
}

/** Sphere radius in pixels from mass (log-scaled, 15–80 px). */
function massToRadius(m: number): number {
  const t = valueToLogSlider(m, 1e10, 1e30);
  return 15 + t * (80 - 15);
}

// ─── Star field (deterministic seed) ─────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  r: number;
  alpha: number;
}

function buildStars(count: number): Star[] {
  // Simple LCG seeded PRNG so the field is deterministic across renders.
  let seed = 0xdeadbeef;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return ((seed >>> 0) / 0xffffffff);
  };
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * CW,
      y: rand() * CH,
      r: rand() * 1.4 + 0.4,
      alpha: rand() * 0.6 + 0.4,
    });
  }
  return stars;
}

const STARS = buildStars(180);

// ─── Simulation state ─────────────────────────────────────────────────────────

interface SimBodies {
  x1: number; // canvas px (centre)
  x2: number;
  v1: number; // px/s towards right (+) for body1
  v2: number; // px/s towards left  (−) for body2
}

const DEFAULT_M1 = 5.972e24; // Earth mass
const DEFAULT_M2 = 7.342e22; // Moon mass
const DEFAULT_DIST = 3.844e8; // Earth-Moon distance (m)

// How many metres one canvas pixel represents.
function metersPerPixel(dist: number): number {
  // Keep 70 % of canvas width as the gap between sphere edges.
  return dist / (CW * 0.7);
}

function initialBodies(r1px: number, r2px: number, dist: number): SimBodies {
  const mpp = metersPerPixel(dist);
  const centre = CW / 2;
  const halfGapPx = (dist / mpp) / 2;
  return {
    x1: centre - halfGapPx - r1px,
    x2: centre + halfGapPx + r2px,
    v1: 0,
    v2: 0,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExplosionState {
  x: number;
  y: number;
  t: number; // [0, 1]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SliderRowProps {
  label: string;
  unit: string;
  value: number;
  minVal: number;
  maxVal: number;
  onChange: (v: number) => void;
  formatVal?: (v: number) => string;
}

function SliderRow({ label, unit, value, minVal, maxVal, onChange, formatVal }: SliderRowProps) {
  const t = valueToLogSlider(value, minVal, maxVal);
  const display = formatVal ? formatVal(value) : toSci(value, 2);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className="text-cyan-300 font-mono">{display} {unit}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={t}
        onChange={(e) => onChange(logSliderToValue(parseFloat(e.target.value), minVal, maxVal))}
        className="w-full accent-cyan-400 cursor-pointer"
      />
    </div>
  );
}

interface StatRowProps {
  label: string;
  children: React.ReactNode;
}

function StatRow({ label, children }: StatRowProps) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-white/5 last:border-0">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-sm font-mono text-cyan-300 leading-snug">{children}</span>
    </div>
  );
}

// ─── Canvas draw (pure function, no React state dependencies) ─────────────────

function drawSceneToCanvas(
  canvas: HTMLCanvasElement,
  bodies: SimBodies,
  explosion: ExplosionState | null,
  simDistM: number,
  m1: number,
  m2: number,
  r1px: number,
  r2px: number,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = "#050a14";
  ctx.fillRect(0, 0, CW, CH);

  // Stars
  for (const s of STARS) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fill();
  }

  const cx1 = bodies.x1;
  const cx2 = bodies.x2;
  const midX = (cx1 + cx2) / 2;
  const midY = CH / 2;

  // ── Distance line ────────────────────────────────────────────────────────
  const distPx = Math.max(0, cx2 - r2px - (cx1 + r1px));
  if (distPx > 4) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(148,163,184,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx1 + r1px, midY);
    ctx.lineTo(cx2 - r2px, midY);
    ctx.stroke();

    // Tick marks
    ctx.setLineDash([]);
    ctx.lineWidth = 1.5;
    for (const tickX of [cx1 + r1px, cx2 - r2px]) {
      ctx.beginPath();
      ctx.moveTo(tickX, midY - 6);
      ctx.lineTo(tickX, midY + 6);
      ctx.stroke();
    }

    // Label
    const labelDist = simDistM < 1.496e11
      ? `${(simDistM / 1e3).toExponential(2)} km`
      : `${(simDistM / 1.496e11).toFixed(2)} AU`;
    ctx.fillStyle = "rgba(148,163,184,0.9)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText(labelDist, midX, midY - 10);
    ctx.restore();
  }

  // ── Force arrows ─────────────────────────────────────────────────────────
  const currentForce = (G * m1 * m2) / (simDistM * simDistM);
  const logF = Math.log10(Math.max(currentForce, 1));
  const arrowLen = Math.min(80, Math.max(12, (logF - 5) * 6));

  const drawArrow = (fromX: number, towardX: number, y: number) => {
    const dir = towardX > fromX ? 1 : -1;
    const ax = fromX + dir * arrowLen;
    ctx.save();
    ctx.strokeStyle = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.lineWidth = 2.5;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(fromX, y);
    ctx.lineTo(ax, y);
    ctx.stroke();
    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(ax, y);
    ctx.lineTo(ax - dir * 10, y - 5);
    ctx.lineTo(ax - dir * 10, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  drawArrow(cx1 + r1px + 3, cx2, midY - r1px * 0.3);
  drawArrow(cx2 - r2px - 3, cx1, midY - r2px * 0.3);

  // ── Glow spheres ─────────────────────────────────────────────────────────
  const drawGlowSphere = (
    x: number,
    radius: number,
    color1: string,
    color2: string,
    glowColor: string,
    label: string,
  ) => {
    // Outer glow
    const grd = ctx.createRadialGradient(x, midY, radius * 0.2, x, midY, radius * 2.2);
    grd.addColorStop(0, glowColor);
    grd.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(x, midY, radius * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Sphere body
    const bodyGrd = ctx.createRadialGradient(
      x - radius * 0.35, midY - radius * 0.35, radius * 0.1,
      x, midY, radius,
    );
    bodyGrd.addColorStop(0, color1);
    bodyGrd.addColorStop(1, color2);
    ctx.beginPath();
    ctx.arc(x, midY, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrd;
    ctx.fill();

    // Specular highlight
    const hiliteGrd = ctx.createRadialGradient(
      x - radius * 0.3, midY - radius * 0.3, 0,
      x - radius * 0.3, midY - radius * 0.3, radius * 0.55,
    );
    hiliteGrd.addColorStop(0, "rgba(255,255,255,0.45)");
    hiliteGrd.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(x, midY, radius, 0, Math.PI * 2);
    ctx.fillStyle = hiliteGrd;
    ctx.fill();

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `bold ${Math.max(10, radius * 0.45)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(label, x, midY + radius + 14);
  };

  drawGlowSphere(cx1, r1px, "#a78bfa", "#4c1d95", "rgba(167,139,250,0.25)", "m₁");
  drawGlowSphere(cx2, r2px, "#22d3ee", "#164e63", "rgba(34,211,238,0.25)", "m₂");

  // ── Explosion ────────────────────────────────────────────────────────────
  if (explosion) {
    const t = explosion.t;
    const maxR = 120;
    const ringR = t * maxR;

    // Expanding ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(251,146,60,${1 - t})`;
    ctx.lineWidth = 6 * (1 - t) + 1;
    ctx.shadowColor = "rgba(251,146,60,0.8)";
    ctx.shadowBlur = 20;
    ctx.stroke();
    ctx.restore();

    // Inner flash
    const flashGrd = ctx.createRadialGradient(
      explosion.x, explosion.y, 0,
      explosion.x, explosion.y, ringR * 0.7,
    );
    flashGrd.addColorStop(0, `rgba(255,200,50,${0.9 * (1 - t)})`);
    flashGrd.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, ringR * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = flashGrd;
    ctx.fill();

    // Shockwave particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pr = ringR * 0.9;
      ctx.beginPath();
      ctx.arc(
        explosion.x + Math.cos(angle) * pr,
        explosion.y + Math.sin(angle) * pr,
        4 * (1 - t) + 1,
        0, Math.PI * 2,
      );
      ctx.fillStyle = `rgba(253,224,71,${1 - t})`;
      ctx.fill();
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NewtonGravitySim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);
  const bodiesRef = useRef<SimBodies | null>(null);
  const explosionRef = useRef<ExplosionState | null>(null);

  // Keep always-current refs for values used inside the rAF loop so the loop
  // never goes stale and never needs to be restarted when sliders change.
  const m1Ref = useRef(DEFAULT_M1);
  const m2Ref = useRef(DEFAULT_M2);
  const distRef = useRef(DEFAULT_DIST);

  const [m1, setM1Raw] = useState(DEFAULT_M1);
  const [m2, setM2Raw] = useState(DEFAULT_M2);
  const [dist, setDistRaw] = useState(DEFAULT_DIST);
  const [animating, setAnimating] = useState(false);
  const [exploded, setExploded] = useState(false);

  // Keep refs in sync whenever state changes.
  useEffect(() => { m1Ref.current = m1; }, [m1]);
  useEffect(() => { m2Ref.current = m2; }, [m2]);
  useEffect(() => { distRef.current = dist; }, [dist]);

  // Derived physics for display panels (always from slider state).
  const r1px = massToRadius(m1);
  const r2px = massToRadius(m2);
  const force = (G * m1 * m2) / (dist * dist);
  const a1 = force / m1;
  const a2 = force / m2;
  const potentialEnergy = (-G * m1 * m2) / dist;
  const distKm = dist / 1e3;
  const distAU = dist / 1.496e11;

  // ── Reset helper ─────────────────────────────────────────────────────────────

  const resetSim = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    bodiesRef.current = null;
    explosionRef.current = null;
    lastTimeRef.current = null;
    setAnimating(false);
    setExploded(false);
  }, []);

  // ── Static draw (when not animating) ─────────────────────────────────────────

  useEffect(() => {
    if (animating || exploded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r1 = massToRadius(m1);
    const r2 = massToRadius(m2);
    const bodies = bodiesRef.current ?? initialBodies(r1, r2, dist);
    drawSceneToCanvas(canvas, bodies, null, dist, m1, m2, r1, r2);
  }, [animating, exploded, m1, m2, dist]);

  // ── Animation loop ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!animating) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use snapshot of dist/radii at the moment animation starts.
    // These are fixed for the duration of this animation run so the
    // scale doesn't jump when sliders are touched while animating.
    const startDist = distRef.current;
    const startM1 = m1Ref.current;
    const startM2 = m2Ref.current;
    const startR1 = massToRadius(startM1);
    const startR2 = massToRadius(startM2);
    const mpp = metersPerPixel(startDist);

    // Initialise bodies if starting fresh.
    if (!bodiesRef.current) {
      bodiesRef.current = initialBodies(startR1, startR2, startDist);
      lastTimeRef.current = null;
    }

    const step = (ts: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      // Cap raw dt at 50 ms to avoid huge jumps after tab switch.
      const rawDt = Math.min((ts - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = ts;

      // Time-scale: slow motion factor so the drift is visually interesting.
      const dt = rawDt * 5e6;

      const bodies = bodiesRef.current!;

      // Current edge-to-edge gap in pixels → convert to metres.
      const edgePx = bodies.x2 - startR2 - (bodies.x1 + startR1);
      const simDistM = Math.max(edgePx * mpp, 1e3);

      // Compute accelerations (m/s²) then convert to px/s².
      const f = (G * startM1 * startM2) / (simDistM * simDistM);
      const acc1ms2 = f / startM1;
      const acc2ms2 = f / startM2;
      const acc1px = acc1ms2 / mpp; // px/s²
      const acc2px = acc2ms2 / mpp;

      // Integrate: v += a·dt  then  x += v·dt  (symplectic Euler)
      bodies.v1 += acc1px * dt;  // body 1 accelerates rightward (+)
      bodies.v2 -= acc2px * dt;  // body 2 accelerates leftward  (−)
      bodies.x1 += bodies.v1 * dt;
      bodies.x2 += bodies.v2 * dt;

      // Collision check: edge-to-edge distance ≤ 0.
      const newEdgePx = bodies.x2 - startR2 - (bodies.x1 + startR1);
      if (newEdgePx <= 0) {
        const collisionX = (bodies.x1 + startR1 + bodies.x2 - startR2) / 2;
        explosionRef.current = { x: collisionX, y: CH / 2, t: 0 };
        drawSceneToCanvas(canvas, bodies, explosionRef.current, simDistM, startM1, startM2, startR1, startR2);
        setExploded(true);
        setAnimating(false);
        return;
      }

      drawSceneToCanvas(canvas, bodies, null, simDistM, startM1, startM2, startR1, startR2);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animating]); // Only re-run when animating flag changes — not on slider changes.

  // ── Explosion afterburn ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!exploded || !explosionRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Snapshot the bodies and params at collision moment.
    const snap = bodiesRef.current ? { ...bodiesRef.current } : initialBodies(massToRadius(m1Ref.current), massToRadius(m2Ref.current), distRef.current);
    const snapM1 = m1Ref.current;
    const snapM2 = m2Ref.current;
    const snapR1 = massToRadius(snapM1);
    const snapR2 = massToRadius(snapM2);
    const explosionX = explosionRef.current.x;

    let start: number | null = null;

    const animateExplosion = (ts: number) => {
      if (!start) start = ts;
      const t = Math.min((ts - start) / 1400, 1);
      const ex: ExplosionState = { x: explosionX, y: CH / 2, t };
      drawSceneToCanvas(canvas, snap, ex, 1e5, snapM1, snapM2, snapR1, snapR2);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animateExplosion);
      } else {
        // Auto-reset after explosion finishes.
        explosionRef.current = null;
        bodiesRef.current = null;
        setExploded(false);
        setM1Raw(DEFAULT_M1);
        setM2Raw(DEFAULT_M2);
        setDistRaw(DEFAULT_DIST);
      }
    };

    rafRef.current = requestAnimationFrame(animateExplosion);
    return () => cancelAnimationFrame(rafRef.current);
  }, [exploded]); // Only re-run when exploded flag changes.

  // ── Slider handlers ───────────────────────────────────────────────────────────

  const handleM1 = useCallback((v: number) => {
    setM1Raw(v);
    // Stop animation so the static draw re-renders with new positions.
    setAnimating(false);
    bodiesRef.current = null;
  }, []);

  const handleM2 = useCallback((v: number) => {
    setM2Raw(v);
    setAnimating(false);
    bodiesRef.current = null;
  }, []);

  const handleDist = useCallback((v: number) => {
    setDistRaw(v);
    setAnimating(false);
    bodiesRef.current = null;
  }, []);

  // Comparison ratios.
  const vsEarthMoon = force / EARTH_MOON_FORCE;
  const vsEarthSun = force / EARTH_SUN_FORCE;

  return (
    <div className="flex flex-col gap-6 p-4 min-h-screen bg-[#050a14] text-white font-sans">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">
          Newton&apos;s Law of Universal Gravitation
        </h1>
        <p className="text-slate-400 text-sm mt-1 font-mono">F = G · m₁ · m₂ / r²</p>
      </div>

      {/* Canvas + Formula Panel */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Canvas */}
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
          style={{ width: CW, height: CH, flexShrink: 0 }}
        >
          <canvas ref={canvasRef} width={CW} height={CH} />

          {/* Exploded banner */}
          <AnimatePresence>
            {exploded && (
              <motion.div
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-orange-500/20 border border-orange-400/50 backdrop-blur rounded-2xl px-8 py-4 text-center">
                  <div className="text-2xl font-bold text-orange-300">💥 Collision!</div>
                  <div className="text-sm text-orange-200/80 mt-1">Resetting simulation…</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Formula Panel */}
        <div
          className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-4"
          style={{ minWidth: 220 }}
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Formulas
          </h2>

          <div className="bg-black/40 rounded-xl p-4 font-mono text-xs leading-7 border border-white/5">
            <div className="text-purple-300">G = 6.674 × 10⁻¹¹ N·m²/kg²</div>
            <div className="mt-2 text-slate-300">
              <span className="text-cyan-300 font-bold">F</span>
              {" = G · m₁ · m₂ / r²"}
            </div>
            <div className="text-slate-300">
              {"a₁ = "}
              <span className="text-cyan-300 font-bold">F</span>
              {" / m₁"}
            </div>
            <div className="text-slate-300">
              {"a₂ = "}
              <span className="text-cyan-300 font-bold">F</span>
              {" / m₂"}
            </div>
            <div className="mt-2 text-slate-300">U = −G · m₁ · m₂ / r</div>

            <div className="mt-3 border-t border-white/10 pt-3 space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                Current values
              </div>
              <div>
                <span className="text-slate-500">F = </span>
                <span className="text-cyan-300">{toSci(force, 3)} N</span>
              </div>
              <div>
                <span className="text-slate-500">a₁ = </span>
                <span className="text-cyan-300">{toSci(a1, 3)} m/s²</span>
              </div>
              <div>
                <span className="text-slate-500">a₂ = </span>
                <span className="text-cyan-300">{toSci(a2, 3)} m/s²</span>
              </div>
              <div>
                <span className="text-slate-500">U = </span>
                <span className="text-cyan-300">{toSci(potentialEnergy, 3)} J</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls + Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sliders */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            Parameters
          </h2>

          <SliderRow
            label="Mass 1 (m₁)"
            unit="kg"
            value={m1}
            minVal={1e10}
            maxVal={1e30}
            onChange={handleM1}
          />
          <SliderRow
            label="Mass 2 (m₂)"
            unit="kg"
            value={m2}
            minVal={1e10}
            maxVal={1e30}
            onChange={handleM2}
          />
          <SliderRow
            label="Distance (r)"
            unit="m"
            value={dist}
            minVal={1e8}
            maxVal={1e13}
            onChange={handleDist}
          />

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => {
                if (exploded) return;
                if (animating) {
                  // Stop: cancel loop, restore static view.
                  cancelAnimationFrame(rafRef.current);
                  lastTimeRef.current = null;
                  setAnimating(false);
                } else {
                  // Start fresh each time.
                  bodiesRef.current = null;
                  lastTimeRef.current = null;
                  setAnimating(true);
                }
              }}
              disabled={exploded}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all border ${
                animating
                  ? "bg-red-500/20 border-red-400/50 text-red-300 hover:bg-red-500/30"
                  : "bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30"
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {animating ? "⏹ Stop" : "▶ Animate Attraction"}
            </button>
            <button
              onClick={() => {
                resetSim();
                setM1Raw(DEFAULT_M1);
                setM2Raw(DEFAULT_M2);
                setDistRaw(DEFAULT_DIST);
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold bg-purple-500/20 border border-purple-400/50 text-purple-300 hover:bg-purple-500/30 transition-all"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Live Stats */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 flex flex-col">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Live Stats
          </h2>
          <StatRow label="Gravitational Force">
            {toSciSup(force)} N
          </StatRow>
          <StatRow label="Acceleration of m₁">
            {toSciSup(a1)} m/s²
          </StatRow>
          <StatRow label="Acceleration of m₂">
            {toSciSup(a2)} m/s²
          </StatRow>
          <StatRow label="Distance">
            <span className="block">{toSciSup(dist)} m</span>
            <span className="block text-slate-400 text-xs mt-0.5">
              {toSci(distKm, 3)} km &nbsp;|&nbsp; {distAU.toFixed(4)} AU
            </span>
          </StatRow>
          <StatRow label="Gravitational Potential Energy">
            {toSciSup(potentialEnergy)} J
          </StatRow>
        </div>
      </div>

      {/* Real-World Comparisons */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-4">
          Real-World Force Comparisons
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Earth–Moon */}
          <ComparisonCard
            title="Earth ↔ Moon"
            referenceLabel="~1.98 × 10²⁰ N"
            referenceForce={EARTH_MOON_FORCE}
            currentForce={force}
            ratio={vsEarthMoon}
            accentColor="#a78bfa"
          />
          {/* Earth–Sun */}
          <ComparisonCard
            title="Earth ↔ Sun"
            referenceLabel="~3.54 × 10²² N"
            referenceForce={EARTH_SUN_FORCE}
            currentForce={force}
            ratio={vsEarthSun}
            accentColor="#22d3ee"
          />
          {/* Current vs both */}
          <div className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-3">
            <div className="text-xs font-semibold text-slate-300">Your Setup</div>
            <div className="text-lg font-mono font-bold text-cyan-300 leading-tight">
              {toSciSup(force)} N
            </div>
            <div className="flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                <span className="text-slate-400">vs Earth-Moon:</span>
                <span className={vsEarthMoon >= 1 ? "text-green-400" : "text-slate-300"}>
                  {vsEarthMoon >= 1e3
                    ? `${(vsEarthMoon / 1e3).toFixed(1)}k×`
                    : vsEarthMoon >= 1
                    ? `${vsEarthMoon.toFixed(2)}×`
                    : `1/${(1 / vsEarthMoon).toFixed(2)}×`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span className="text-slate-400">vs Earth-Sun:</span>
                <span className={vsEarthSun >= 1 ? "text-green-400" : "text-slate-300"}>
                  {vsEarthSun >= 1e3
                    ? `${(vsEarthSun / 1e3).toFixed(1)}k×`
                    : vsEarthSun >= 1
                    ? `${vsEarthSun.toFixed(2)}×`
                    : `1/${(1 / vsEarthSun).toFixed(2)}×`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ComparisonCard ───────────────────────────────────────────────────────────

interface ComparisonCardProps {
  title: string;
  referenceLabel: string;
  referenceForce: number;
  currentForce: number;
  ratio: number;
  accentColor: string;
}

function ComparisonCard({
  title,
  referenceLabel,
  currentForce,
  ratio,
  accentColor,
}: ComparisonCardProps) {
  // Bar: reference is always full width; current scales relative.
  const currentBarW = Math.min(1, ratio) * 100;
  const referenceBarW = Math.min(1, 1 / ratio) * 100;

  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 flex flex-col gap-3">
      <div className="text-xs font-semibold text-slate-300">{title}</div>
      <div className="text-sm font-mono" style={{ color: accentColor }}>
        {referenceLabel}
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-2 text-[10px] font-mono text-slate-500">
        <div>
          <div className="flex justify-between mb-0.5">
            <span>Reference</span>
            <span style={{ color: accentColor }}>{referenceLabel}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${referenceBarW}%`,
                backgroundColor: accentColor,
                opacity: 0.6,
              }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span>Your force</span>
            <span className="text-cyan-300">{toSci(currentForce, 2)} N</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all duration-500"
              style={{ width: `${currentBarW}%`, opacity: 0.8 }}
            />
          </div>
        </div>
      </div>

      <div className="text-[11px] font-mono text-slate-400 mt-auto pt-1 border-t border-white/5">
        {ratio > 1
          ? <span className="text-green-400">{ratio >= 1e3 ? `${(ratio / 1e3).toFixed(1)}k` : ratio.toFixed(2)}× stronger</span>
          : ratio < 1
          ? <span className="text-orange-300">1/{(1 / ratio).toFixed(2)}× weaker</span>
          : <span className="text-cyan-300">Equal</span>
        }
      </div>
    </div>
  );
}
