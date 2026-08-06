"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// ─── Constants & Planet Data ──────────────────────────────────────────────────

const PLANET_DATA = {
  Earth:   { GM: 3.986e14, radius: 6_371_000,  color: "#3b82f6", glowColor: "rgba(59,130,246,0.6)",  label: "Earth"   },
  Mars:    { GM: 4.283e13, radius: 3_389_500,  color: "#ef4444", glowColor: "rgba(239,68,68,0.6)",   label: "Mars"    },
  Jupiter: { GM: 1.267e17, radius: 69_911_000, color: "#f97316", glowColor: "rgba(249,115,22,0.6)",  label: "Jupiter" },
  Moon:    { GM: 4.905e12, radius:  1_737_400, color: "#94a3b8", glowColor: "rgba(148,163,184,0.6)", label: "Moon"    },
} as const;

type PlanetKey = keyof typeof PLANET_DATA;

// m/s² per pixel — set during render from canvas scale
interface SimState {
  x: number;   // metres from planet centre
  y: number;
  vx: number;  // m/s
  vy: number;
}

interface TrailPoint {
  x: number;
  y: number;
  age: number; // 0-1, 0 = fresh
}

// ─── Physics helpers ─────────────────────────────────────────────────────────

function circularVelocity(GM: number, r: number) {
  return Math.sqrt(GM / r);
}

function escapeVelocity(GM: number, r: number) {
  return Math.sqrt(2 * GM / r);
}

function orbitalPeriod(GM: number, r: number) {
  return 2 * Math.PI * Math.sqrt(r ** 3 / GM);
}

// Semi-major axis from specific energy
function semiMajorFromState(GM: number, r: number, v: number) {
  const energy = 0.5 * v * v - GM / r;
  if (energy >= 0) return Infinity;
  return -GM / (2 * energy);
}

// Apoapsis / periapsis from vis-viva
function apoperiFromState(GM: number, x: number, y: number, vx: number, vy: number) {
  const r = Math.sqrt(x * x + y * y);
  const v = Math.sqrt(vx * vx + vy * vy);
  const a = semiMajorFromState(GM, r, v);
  if (!isFinite(a)) return { apo: Infinity, peri: Infinity };
  // Specific angular momentum
  const h = x * vy - y * vx;
  // eccentricity vector magnitude via vis-viva shortcut: e = sqrt(1 + 2*E*h²/GM²)
  const E = 0.5 * v * v - GM / r;
  const ecc = Math.sqrt(Math.max(0, 1 + (2 * E * h * h) / (GM * GM)));
  const apo  = a * (1 + ecc);
  const peri = a * (1 - ecc);
  return { apo, peri };
}

// Hohmann delta-vs and transfer time
function hohmann(GM: number, r1: number, r2: number) {
  const dv1 = Math.sqrt(GM / r1) * (Math.sqrt((2 * r2) / (r1 + r2)) - 1);
  const dv2 = Math.sqrt(GM / r2) * (1 - Math.sqrt((2 * r1) / (r1 + r2)));
  const tt  = Math.PI * Math.sqrt((r1 + r2) ** 3 / (8 * GM));
  return { dv1, dv2, tt };
}

// ─── Canvas scale helper ──────────────────────────────────────────────────────
// We map planetRadius*viewScale → visual pixels so orbit heights are visible.

function getScale(planetRadius: number, orbitHeight: number): number {
  // We want the orbit circle to span ~55% of canvas half-width (350 px)
  const targetPx = 200; // orbit in pixels from centre
  const r = planetRadius + orbitHeight;
  return targetPx / r;
}

// ─── Star field (generated once) ─────────────────────────────────────────────
const STARS = Array.from({ length: 180 }, () => ({
  x: Math.random() * 700,
  y: Math.random() * 500,
  r: Math.random() * 1.4 + 0.3,
  a: Math.random() * 0.85 + 0.15,
}));

// ─── Component ───────────────────────────────────────────────────────────────

export default function OrbitalMechanicsSim() {
  // ── Controls state ──────────────────────────────────────────────────────────
  const [planet, setPlanet]           = useState<PlanetKey>("Earth");
  const [orbitHeight, setOrbitHeight] = useState(400_000);    // m
  const [satMass]                     = useState(500);         // kg (only shown)
  const [velMult, setVelMult]         = useState(1.0);
  const [showHohmann, setShowHohmann] = useState(false);
  const [targetHeight, setTargetHeight] = useState(2_000_000); // m
  const [speedMult, setSpeedMult]     = useState(1);
  const [paused, setPaused]           = useState(false);

  // ── Sim refs (avoid re-render per frame) ────────────────────────────────────
  const simRef  = useRef<SimState | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const rafRef  = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Live stats (updated every animation frame) ──────────────────────────────
  const [stats, setStats] = useState({
    vel:     0,
    vcir:    0,
    vesc:    0,
    period:  0,
    alt:     0,
    apo:     0,
    peri:    0,
    orbitType: "Circular" as string,
  });

  // ── Derived planet+orbit values ─────────────────────────────────────────────
  const pd = PLANET_DATA[planet];

  // ── Reset simulation whenever inputs change ─────────────────────────────────
  const resetSim = useCallback(() => {
    const r = pd.radius + orbitHeight;
    const v = circularVelocity(pd.GM, r) * velMult;
    // Start at (r, 0) moving in +y direction
    simRef.current = { x: r, y: 0, vx: 0, vy: v };
    trailRef.current = [];
  }, [pd, orbitHeight, velMult]);

  useEffect(() => { resetSim(); }, [resetSim]);

  // ── Animation loop ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) return;
    const c = ctx; // narrowed non-null alias for use inside closure

    const W = 700, H = 500;
    const cx = W / 2, cy = H / 2;

    // Physical time step per wall-clock second (scaled)
    const BASE_DT = 60; // simulate 60 real-seconds per wall-second at 1×

    function drawFrame(ts: number) {
      if (!simRef.current) { rafRef.current = requestAnimationFrame(drawFrame); return; }
      const wallDt = Math.min((ts - lastTsRef.current) / 1000, 0.05); // cap at 50 ms
      lastTsRef.current = ts;

      // ── Physics step (sub-step for accuracy) ────────────────────────────────
      if (!paused) {
        const physDt   = BASE_DT * speedMult * wallDt;
        const SUBSTEPS  = 8;
        const subDt    = physDt / SUBSTEPS;

        for (let s = 0; s < SUBSTEPS; s++) {
          const sx2: number = simRef.current.x;
          const sy2: number = simRef.current.y;
          const svx: number = simRef.current.vx;
          const svy: number = simRef.current.vy;
          const r2: number  = sx2 * sx2 + sy2 * sy2;
          const r: number   = Math.sqrt(r2);
          // Crash check
          if (r < pd.radius * 1.01) break;
          const acc: number = pd.GM / r2;
          const ax: number  = -acc * (sx2 / r);
          const ay: number  = -acc * (sy2 / r);
          simRef.current = {
            x:  sx2 + svx * subDt + 0.5 * ax * subDt * subDt,
            y:  sy2 + svy * subDt + 0.5 * ay * subDt * subDt,
            vx: svx + ax * subDt,
            vy: svy + ay * subDt,
          };
        }
      }

      const { x, y, vx, vy } = simRef.current;
      const r   = Math.sqrt(x * x + y * y);
      const vel = Math.sqrt(vx * vx + vy * vy);

      // ── Scale ────────────────────────────────────────────────────────────────
      const scale = getScale(pd.radius, orbitHeight);
      const toCanvasX = (mx: number) => cx + mx * scale;
      const toCanvasY = (my: number) => cy - my * scale; // flip y

      // ── Trail ────────────────────────────────────────────────────────────────
      if (!paused) {
        trailRef.current.push({ x, y, age: 0 });
        // age existing points
        trailRef.current = trailRef.current
          .map(p => ({ ...p, age: p.age + 0.003 * speedMult }))
          .filter(p => p.age < 1)
          .slice(-320);
      }

      // ── Draw ─────────────────────────────────────────────────────────────────
      c.clearRect(0, 0, W, H);

      // Background
      c.fillStyle = "#020714";
      c.fillRect(0, 0, W, H);

      // Stars
      for (const s of STARS) {
        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fillStyle = `rgba(200,220,255,${s.a})`;
        c.fill();
      }

      // Reference orbit circle (dashed)
      const refR = (pd.radius + orbitHeight) * scale;
      c.beginPath();
      c.arc(cx, cy, refR, 0, Math.PI * 2);
      c.setLineDash([4, 8]);
      c.strokeStyle = "rgba(6,182,212,0.18)";
      c.lineWidth = 1;
      c.stroke();
      c.setLineDash([]);

      // Hohmann transfer ellipse (dashed orange)
      if (showHohmann) {
        const r1h = pd.radius + orbitHeight;
        const r2h = pd.radius + targetHeight;
        const ah  = (r1h + r2h) / 2;
        const ch  = ah - r1h;
        const bh  = Math.sqrt(Math.max(0, ah * ah - ch * ch));
        const asPx = ah * scale;
        const bPx  = bh * scale;
        const cPx  = ch * scale;
        c.save();
        c.translate(cx, cy);
        c.beginPath();
        c.ellipse(-cPx, 0, asPx, bPx, 0, 0, Math.PI * 2);
        c.setLineDash([5, 5]);
        c.strokeStyle = "rgba(249,115,22,0.75)";
        c.lineWidth = 1.5;
        c.stroke();
        c.setLineDash([]);
        // Target orbit
        const r2Px = r2h * scale;
        c.beginPath();
        c.arc(0, 0, r2Px, 0, Math.PI * 2);
        c.strokeStyle = "rgba(249,115,22,0.25)";
        c.lineWidth = 1;
        c.stroke();
        c.restore();
      }

      // Trail dots
      for (const p of trailRef.current) {
        const tx = toCanvasX(p.x);
        const ty = toCanvasY(p.y);
        const alpha = (1 - p.age) * 0.55;
        c.beginPath();
        c.arc(tx, ty, 1.5, 0, Math.PI * 2);
        c.fillStyle = `rgba(6,182,212,${alpha.toFixed(3)})`;
        c.fill();
      }

      // Planet glow
      const planetVisPx = Math.max(18, pd.radius * scale);
      const glowGrad = c.createRadialGradient(cx, cy, planetVisPx * 0.3, cx, cy, planetVisPx * 2.2);
      glowGrad.addColorStop(0, pd.glowColor);
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      c.beginPath();
      c.arc(cx, cy, planetVisPx * 2.2, 0, Math.PI * 2);
      c.fillStyle = glowGrad;
      c.fill();

      // Planet surface
      const pGrad = c.createRadialGradient(cx - planetVisPx * 0.3, cy - planetVisPx * 0.3, 1, cx, cy, planetVisPx);
      pGrad.addColorStop(0, lightenHex(pd.color, 60));
      pGrad.addColorStop(1, pd.color);
      c.beginPath();
      c.arc(cx, cy, planetVisPx, 0, Math.PI * 2);
      c.fillStyle = pGrad;
      c.fill();

      // Planet label
      c.font = "11px 'JetBrains Mono', monospace";
      c.fillStyle = "rgba(255,255,255,0.45)";
      c.textAlign = "center";
      c.fillText(pd.label, cx, cy + planetVisPx + 14);

      // Satellite
      const satX = toCanvasX(x);
      const satY = toCanvasY(y);
      const crashed = r < pd.radius * 1.05;
      const escaped = r > (pd.radius + orbitHeight) * 40;

      // Satellite glow
      const satGlow = c.createRadialGradient(satX, satY, 0, satX, satY, 10);
      satGlow.addColorStop(0, crashed ? "rgba(239,68,68,0.9)" : "rgba(34,211,238,0.9)");
      satGlow.addColorStop(1, "rgba(0,0,0,0)");
      c.beginPath();
      c.arc(satX, satY, 10, 0, Math.PI * 2);
      c.fillStyle = satGlow;
      c.fill();

      c.beginPath();
      c.arc(satX, satY, 3.5, 0, Math.PI * 2);
      c.fillStyle = crashed ? "#ef4444" : "#22d3ee";
      c.fill();

      // Velocity arrow
      const arrowScale = 0.00008 / Math.max(scale, 1e-12);
      const vArrowX = vx * arrowScale;
      const vArrowY = -vy * arrowScale; // flip y
      const arrowLen = Math.sqrt(vArrowX * vArrowX + vArrowY * vArrowY);
      if (arrowLen > 2) {
        const ux = vArrowX / arrowLen, uy = vArrowY / arrowLen;
        const ex = satX + vArrowX, ey = satY + vArrowY;
        c.beginPath();
        c.moveTo(satX, satY);
        c.lineTo(ex, ey);
        c.strokeStyle = "#22c55e";
        c.lineWidth = 1.5;
        c.stroke();
        // Arrowhead
        const hs = 7;
        c.beginPath();
        c.moveTo(ex, ey);
        c.lineTo(ex - hs * ux + hs * 0.4 * (-uy), ey - hs * uy + hs * 0.4 * ux);
        c.lineTo(ex - hs * ux - hs * 0.4 * (-uy), ey - hs * uy - hs * 0.4 * ux);
        c.closePath();
        c.fillStyle = "#22c55e";
        c.fill();
      }

      // Trajectory label
      if (crashed) {
        c.font = "bold 13px 'JetBrains Mono', monospace";
        c.fillStyle = "#ef4444";
        c.textAlign = "center";
        c.fillText("⚠ CRASH TRAJECTORY", W / 2, 30);
      } else if (escaped) {
        c.font = "bold 13px 'JetBrains Mono', monospace";
        c.fillStyle = "#f97316";
        c.textAlign = "center";
        c.fillText("🚀 ESCAPE TRAJECTORY", W / 2, 30);
      }

      // ── Orbit type ──────────────────────────────────────────────────────────
      const vcirCur = circularVelocity(pd.GM, r);
      const vescCur = escapeVelocity(pd.GM, r);
      let orbitType = "Elliptical";
      if (vel < vcirCur * 0.8) orbitType = "Suborbital";
      else if (Math.abs(vel - vcirCur) / vcirCur < 0.02) orbitType = "Circular";
      else if (vel >= vescCur) orbitType = "Escape";

      // ── Apoapsis / Periapsis ─────────────────────────────────────────────────
      const { apo, peri } = apoperiFromState(pd.GM, x, y, vx, vy);

      // ── Stats update (throttle to every ~6 frames for perf) ─────────────────
      setStats({
        vel,
        vcir:     vcirCur,
        vesc:     vescCur,
        period:   orbitalPeriod(pd.GM, r),
        alt:      (r - pd.radius),
        apo:      isFinite(apo)  ? apo  - pd.radius : Infinity,
        peri:     isFinite(peri) ? peri - pd.radius : 0,
        orbitType,
      });

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    rafRef.current = requestAnimationFrame((ts) => {
      lastTsRef.current = ts;
      rafRef.current = requestAnimationFrame(drawFrame);
    });

    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planet, orbitHeight, velMult, showHohmann, targetHeight, speedMult, paused]);

  // ── Hohmann stats ────────────────────────────────────────────────────────────
  const hohData = showHohmann
    ? hohmann(pd.GM, pd.radius + orbitHeight, pd.radius + targetHeight)
    : null;

  // ── Formatting helpers ───────────────────────────────────────────────────────
  const fmt  = (n: number, dec = 0) => isFinite(n) ? n.toFixed(dec) : "∞";
  const fmKm = (m: number)          => isFinite(m) ? (m / 1000).toFixed(1) : "∞";
  const fmMin= (s: number)          => isFinite(s) ? (s / 60).toFixed(1)   : "∞";

  const orbitTypeColor: Record<string, string> = {
    Circular:    "#22d3ee",
    Elliptical:  "#a78bfa",
    Escape:      "#f97316",
    Suborbital:  "#ef4444",
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-4 font-mono"
      style={{ color: "#e2e8f0" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-wide text-cyan-300">
            Orbital Mechanics Simulator
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Real Keplerian / Newtonian gravity</p>
        </div>
        <span
          className="px-2 py-1 rounded text-xs font-semibold"
          style={{
            background: `${orbitTypeColor[stats.orbitType]}22`,
            color: orbitTypeColor[stats.orbitType],
            border: `1px solid ${orbitTypeColor[stats.orbitType]}55`,
          }}
        >
          {stats.orbitType}
        </span>
      </motion.div>

      {/* ── Main layout ────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row gap-4">

        {/* ── Canvas column ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          {/* Canvas */}
          <div
            className="relative rounded-xl overflow-hidden"
            style={{
              boxShadow: "0 0 0 1px rgba(6,182,212,0.15), 0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <canvas
              ref={canvasRef}
              width={700}
              height={500}
              className="block"
              style={{ borderRadius: "0.75rem" }}
            />
          </div>

          {/* Speed + Pause controls */}
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-2.5"
            style={{
              background: "rgba(2,7,20,0.7)",
              border: "1px solid rgba(6,182,212,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span className="text-xs text-slate-500 mr-1">Speed:</span>
            {([0.5, 1, 2, 5] as const).map(s => (
              <button
                key={s}
                onClick={() => setSpeedMult(s)}
                className="px-2.5 py-1 rounded text-xs transition-all"
                style={{
                  background: speedMult === s ? "rgba(6,182,212,0.25)" : "rgba(255,255,255,0.04)",
                  color:      speedMult === s ? "#22d3ee" : "#64748b",
                  border:     `1px solid ${speedMult === s ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {s}×
              </button>
            ))}

            <div className="flex-1" />

            <motion.button
              onClick={() => setPaused(p => !p)}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all"
              style={{
                background: paused ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.15)",
                color:      paused ? "#22c55e" : "#f87171",
                border:     `1px solid ${paused ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              {paused ? "▶ Play" : "⏸ Pause"}
            </motion.button>

            <motion.button
              onClick={resetSim}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs transition-all"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              ↺ Reset
            </motion.button>
          </div>
        </div>

        {/* ── Right column: controls + stats ─────────────────────────────── */}
        <div className="flex flex-col gap-3 xl:w-72 xl:min-w-[17rem]">

          {/* Controls panel */}
          <GlassPanel title="Controls">
            {/* Planet selector */}
            <ControlRow label="Planet">
              <div className="grid grid-cols-2 gap-1">
                {(Object.keys(PLANET_DATA) as PlanetKey[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlanet(p)}
                    className="py-1 rounded text-xs transition-all"
                    style={{
                      background: planet === p ? `${PLANET_DATA[p].color}33` : "rgba(255,255,255,0.04)",
                      color:      planet === p ? "#e2e8f0" : "#64748b",
                      border:     `1px solid ${planet === p ? `${PLANET_DATA[p].color}66` : "rgba(255,255,255,0.06)"}`,
                      fontWeight: planet === p ? 600 : 400,
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </ControlRow>

            {/* Orbit height */}
            <ControlRow label={`Orbit alt: ${(orbitHeight / 1000).toFixed(0)} km`}>
              <input
                type="range"
                min={200_000} max={50_000_000} step={50_000}
                value={orbitHeight}
                onChange={e => setOrbitHeight(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>200 km</span><span>50 000 km</span>
              </div>
            </ControlRow>

            {/* Velocity multiplier */}
            <ControlRow label={`Velocity: ${velMult.toFixed(2)}× v_c`}>
              <input
                type="range"
                min={0.5} max={2.0} step={0.01}
                value={velMult}
                onChange={e => setVelMult(Number(e.target.value))}
                className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                <span>0.5×</span><span>2.0×</span>
              </div>
            </ControlRow>

            {/* Satellite mass (display only) */}
            <ControlRow label="Satellite mass">
              <span className="text-xs text-cyan-300">{satMass} kg</span>
            </ControlRow>

            {/* Hohmann toggle */}
            <ControlRow label="Hohmann Transfer">
              <button
                onClick={() => setShowHohmann(h => !h)}
                className="px-3 py-1 rounded text-xs transition-all"
                style={{
                  background: showHohmann ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.04)",
                  color:      showHohmann ? "#fb923c" : "#64748b",
                  border:     `1px solid ${showHohmann ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {showHohmann ? "ON" : "OFF"}
              </button>
            </ControlRow>

            {showHohmann && (
              <ControlRow label={`Target alt: ${(targetHeight / 1000).toFixed(0)} km`}>
                <input
                  type="range"
                  min={200_000} max={50_000_000} step={50_000}
                  value={targetHeight}
                  onChange={e => setTargetHeight(Number(e.target.value))}
                  className="w-full accent-orange-400"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                  <span>200 km</span><span>50 000 km</span>
                </div>
              </ControlRow>
            )}
          </GlassPanel>

          {/* Live stats panel */}
          <GlassPanel title="Live Telemetry">
            <StatRow label="Velocity"       value={`${fmt(stats.vel, 1)} m/s`}   color="#22d3ee" />
            <StatRow label="Circular v"     value={`${fmt(stats.vcir, 1)} m/s`}  color="#a78bfa" />
            <StatRow label="Escape v"       value={`${fmt(stats.vesc, 1)} m/s`}  color="#fb923c" />
            <Divider />
            <StatRow label="Altitude"       value={`${fmKm(stats.alt)} km`}      color="#22d3ee" />
            <StatRow label="Period"         value={`${fmMin(stats.period)} min`}  color="#22d3ee" />
            <Divider />
            <StatRow label="Apoapsis"       value={`${fmKm(stats.apo)} km`}      color="#86efac" />
            <StatRow label="Periapsis"      value={`${fmKm(stats.peri)} km`}     color="#fca5a5" />

            {hohData && (
              <>
                <Divider />
                <p className="text-[10px] text-orange-400 uppercase tracking-widest mb-1">Hohmann Δv</p>
                <StatRow label="Δv₁ burn"     value={`${fmt(hohData.dv1, 1)} m/s`}  color="#fb923c" />
                <StatRow label="Δv₂ burn"     value={`${fmt(hohData.dv2, 1)} m/s`}  color="#fb923c" />
                <StatRow label="Transfer time" value={`${fmMin(hohData.tt)} min`}   color="#fb923c" />
              </>
            )}
          </GlassPanel>

          {/* Physics reference */}
          <GlassPanel title="Physics Reference">
            <FormulaRow formula="v_c = √(GM/r)" />
            <FormulaRow formula="v_esc = √(2GM/r)" />
            <FormulaRow formula="T = 2π√(r³/GM)" />
            <FormulaRow formula="F = GMm/r²" />
            {showHohmann && (
              <>
                <FormulaRow formula="Δv₁ = √(GM/r₁)·(√(2r₂/(r₁+r₂))−1)" />
                <FormulaRow formula="Δv₂ = √(GM/r₂)·(1−√(2r₁/(r₁+r₂)))" />
              </>
            )}
            <div className="mt-2 pt-2 border-t border-white/5">
              <p className="text-[10px] text-slate-600">
                GM<sub>Earth</sub> = 3.986×10¹⁴ m³/s²
              </p>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GlassPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(4,13,32,0.75)",
        border: "1px solid rgba(6,182,212,0.1)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-600 mb-3">{title}</p>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
      {children}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-slate-500">{label}</span>
      <span className="text-[11px] font-semibold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/5 my-0.5" />;
}

function FormulaRow({ formula }: { formula: string }) {
  return (
    <p
      className="text-[10px] px-2 py-1 rounded"
      style={{
        background: "rgba(6,182,212,0.05)",
        color: "#a5f3fc",
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: "0.01em",
      }}
    >
      {formula}
    </p>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function lightenHex(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0xff) + amount);
  const b = Math.min(255, (num & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}
