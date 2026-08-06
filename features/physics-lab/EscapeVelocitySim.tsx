"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants & Planet Data ──────────────────────────────────────────────────

const G = 6.674e-11;

const PLANETS = {
  Earth:   { mass: 5.972e24, radius: 6_371_000,  color: "#3b82f6", glow: "rgba(59,130,246,0.55)",  label: "Earth"   },
  Moon:    { mass: 7.342e22, radius: 1_737_400,   color: "#94a3b8", glow: "rgba(148,163,184,0.55)", label: "Moon"    },
  Mars:    { mass: 6.417e23, radius: 3_389_500,   color: "#ef4444", glow: "rgba(239,68,68,0.55)",   label: "Mars"    },
  Venus:   { mass: 4.867e24, radius: 6_051_800,   color: "#f59e0b", glow: "rgba(245,158,11,0.55)",  label: "Venus"   },
  Mercury: { mass: 3.285e23, radius: 2_439_700,   color: "#a78bfa", glow: "rgba(167,139,250,0.55)", label: "Mercury" },
  Jupiter: { mass: 1.898e27, radius: 69_911_000,  color: "#f97316", glow: "rgba(249,115,22,0.55)",  label: "Jupiter" },
} as const;

type PlanetKey = keyof typeof PLANETS;

// ─── Physics helpers ──────────────────────────────────────────────────────────

const GM = (p: PlanetKey) => G * PLANETS[p].mass;
const vEsc  = (p: PlanetKey) => Math.sqrt(2 * GM(p) / PLANETS[p].radius);
const vCirc = (p: PlanetKey) => Math.sqrt(GM(p) / PLANETS[p].radius);

// specific mechanical energy (per unit mass), E = ½v² − GM/r
function specificEnergy(gm: number, r: number, v: number): number {
  return 0.5 * v * v - gm / r;
}

// ─── Star field (seeded, stable between renders) ──────────────────────────────

const STARS = Array.from({ length: 200 }, (_, i) => {
  // LCG so stars don't change on re-render
  const a = ((i * 1_664_525 + 1_013_904_223) & 0x7fffffff);
  const b = ((a  * 1_664_525 + 1_013_904_223) & 0x7fffffff);
  const c = ((b  * 1_664_525 + 1_013_904_223) & 0x7fffffff);
  return {
    x: (a  / 0x7fffffff) * 700,
    y: (b  / 0x7fffffff) * 400,
    r: (c  / 0x7fffffff) * 1.3 + 0.25,
    a: 0.25 + (a  / 0x7fffffff) * 0.75,
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return `rgb(${r},${g},${b})`;
}

type FlightState = "idle" | "suborbital" | "orbit" | "escape" | "crashed";

interface SimState {
  x: number;   // metres from planet centre
  y: number;
  vx: number;  // m/s
  vy: number;
}

interface TrailPoint { x: number; y: number; age: number }

// ─── Canvas dimensions ────────────────────────────────────────────────────────

const CW = 700;
const CH = 400;

// ─── Component ───────────────────────────────────────────────────────────────

export default function EscapeVelocitySim() {

  // ── Controls ─────────────────────────────────────────────────────────────────
  const [planet,       setPlanet]      = useState<PlanetKey>("Earth");
  const [velFrac,      setVelFrac]     = useState(0.8);   // 0 – 1.2 × v_esc
  const [angleDeg,     setAngleDeg]    = useState(45);    // 0 – 90°
  const [launched,     setLaunched]    = useState(false);
  const [flightState,  setFlightState] = useState<FlightState>("idle");

  // ── Stats (updated every frame) ──────────────────────────────────────────────
  const [stats, setStats] = useState({
    vEsc:    0,
    vCirc:   0,
    vCur:    0,
    energy:  0,
    alt:     0,
  });

  // ── Simulation refs ───────────────────────────────────────────────────────────
  const simRef   = useRef<SimState | null>(null);
  const trailRef = useRef<TrailPoint[]>([]);
  const rafRef   = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const stateRef   = useRef<FlightState>("idle"); // shadow for inside rAF

  // ── Derived constants for current planet ─────────────────────────────────────
  const pd      = PLANETS[planet];
  const gm      = GM(planet);
  const ve      = vEsc(planet);
  const vc      = vCirc(planet);
  const launchV = velFrac * ve;          // m/s

  // ── Canvas scale: planet surface → fixed visual radius ───────────────────────
  // We want escape boundary (10R) to just fit within canvas at ~160px
  const escBoundaryM  = pd.radius * 10;
  const CANVAS_MARGIN = 170;                              // px from centre
  const scale         = CANVAS_MARGIN / escBoundaryM;    // px per metre
  const planetVisPx   = Math.max(14, pd.radius * scale);
  const cx = CW / 2;
  const cy = CH / 2;

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    simRef.current  = null;
    trailRef.current = [];
    stateRef.current = "idle";
    setFlightState("idle");
    setLaunched(false);
    setStats({
      vEsc:   vEsc(planet),
      vCirc:  vCirc(planet),
      vCur:   velFrac * vEsc(planet),
      energy: 0,
      alt:    0,
    });
  }, [planet, velFrac]);

  // Re-seed stats when planet or velocity changes (while not launched)
  useEffect(() => {
    if (launched) return;
    const t = setTimeout(() => {
      setStats({
        vEsc:   vEsc(planet),
        vCirc:  vCirc(planet),
        vCur:   velFrac * vEsc(planet),
        energy: 0,
        alt:    0,
      });
    }, 0);
    return () => clearTimeout(t);
  }, [planet, velFrac, launched]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Launch ────────────────────────────────────────────────────────────────────
  const launch = useCallback(() => {
    const angleRad  = (angleDeg * Math.PI) / 180;
    // Launch from just above the surface to avoid the r <= pd.radius crash check
    // firing on the very first substep due to floating-point equality.
    const startR    = pd.radius * 1.002;
    // Velocity direction: angle from radial (outward)
    // 0° = straight up (radial), 90° = tangential
    const vx = launchV * Math.cos(angleRad);   // radial component
    const vy = launchV * Math.sin(angleRad);   // tangential component
    simRef.current  = { x: startR, y: 0, vx, vy };
    trailRef.current = [];
    stateRef.current = "suborbital";
    setFlightState("suborbital");
    setLaunched(true);
  }, [pd.radius, launchV, angleDeg]);

  // ── Animation loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!launched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BASE_DT   = 30;   // simulated seconds per wall-second at 1×
    const SUBSTEPS  = 16;

    function drawFrame(ts: number) {
      if (!simRef.current) { rafRef.current = requestAnimationFrame(drawFrame); return; }

      const wallDt  = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;

      // ── Physics ──────────────────────────────────────────────────────────────
      const physDt = BASE_DT * wallDt;
      const subDt  = physDt / SUBSTEPS;
      let crashed  = false;
      let escaped  = false;

      for (let s = 0; s < SUBSTEPS; s++) {
        const sx: number  = simRef.current!.x;
        const sy: number  = simRef.current!.y;
        const svx: number = simRef.current!.vx;
        const svy: number = simRef.current!.vy;
        const r2: number  = sx * sx + sy * sy;
        const r: number   = Math.sqrt(r2);

        if (r <= pd.radius) { crashed = true; break; }
        if (r > pd.radius * 200) { escaped = true; break; }

        const acc: number = gm / r2;
        const ax: number  = -acc * (sx / r);
        const ay: number  = -acc * (sy / r);

        simRef.current = {
          x:  sx  + svx * subDt + 0.5 * ax * subDt * subDt,
          y:  sy  + svy * subDt + 0.5 * ay * subDt * subDt,
          vx: svx + ax * subDt,
          vy: svy + ay * subDt,
        };
      }

      const { x, y, vx, vy } = simRef.current!;
      const r   = Math.sqrt(x * x + y * y);
      const vel = Math.sqrt(vx * vx + vy * vy);
      const E   = specificEnergy(gm, r, vel);

      // ── Determine flight state ────────────────────────────────────────────────
      let fs: FlightState = stateRef.current;
      if (crashed) {
        fs = "crashed";
      } else if (escaped) {
        fs = "escape";
      } else if (E >= 0) {
        fs = "escape";
      } else {
        // bound — check if effectively circular (tolerance 5%)
        const vCirNow = Math.sqrt(gm / r);
        const ratio   = vel / vCirNow;
        if (ratio > 0.95 && ratio < 1.05) {
          fs = "orbit";
        } else {
          fs = "suborbital";
        }
      }

      if (fs !== stateRef.current) {
        stateRef.current = fs;
        setFlightState(fs);
      }

      // ── Trail ─────────────────────────────────────────────────────────────────
      if (!crashed && !escaped) {
        trailRef.current.push({ x, y, age: 0 });
        trailRef.current = trailRef.current
          .map(p => ({ ...p, age: p.age + 0.006 }))
          .filter(p => p.age < 1)
          .slice(-400);
      }

      // ── Update stats (throttle to avoid flooding react) ──────────────────────
      setStats({
        vEsc:   ve,
        vCirc:  vc,
        vCur:   vel,
        energy: E * pd.mass,   // total energy (use planet mass as surrogate 1 kg rocket is trivial)
        alt:    (r - pd.radius) / 1000,
      });

      // ── Draw ──────────────────────────────────────────────────────────────────
      const c = ctx!;
      c.clearRect(0, 0, CW, CH);

      // Background
      c.fillStyle = "#020714";
      c.fillRect(0, 0, CW, CH);

      // Stars
      for (const s of STARS) {
        c.beginPath();
        c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        c.fillStyle = `rgba(200,220,255,${s.a})`;
        c.fill();
      }

      const toX = (mx: number) => cx + mx * scale;
      const toY = (my: number) => cy - my * scale;

      // ── Reference circles ──────────────────────────────────────────────────────
      // 1) Planet surface
      drawDashedCircle(c, cx, cy, planetVisPx, "rgba(255,255,255,0.12)", [3, 6]);
      // 2) Circular orbit radius
      const vCircPx = pd.radius * scale;
      drawDashedCircle(c, cx, cy, vCircPx * 1.0, "rgba(251,191,36,0.28)", [5, 7]);
      // label
      c.font = "9px monospace";
      c.fillStyle = "rgba(251,191,36,0.55)";
      c.textAlign = "left";
      c.fillText("orbit", cx + vCircPx * 0.72 + 3, cy - vCircPx * 0.72 - 3);
      // 3) Escape boundary (10R)
      const escPx = escBoundaryM * scale;  // = CANVAS_MARGIN
      drawDashedCircle(c, cx, cy, escPx, "rgba(34,197,94,0.22)", [6, 8]);
      c.fillStyle = "rgba(34,197,94,0.45)";
      c.fillText("escape boundary", cx + escPx * 0.64 + 2, cy - escPx * 0.64 - 2);

      // ── Trail dots ────────────────────────────────────────────────────────────
      for (const p of trailRef.current) {
        const alpha = (1 - p.age) * 0.65;
        c.beginPath();
        c.arc(toX(p.x), toY(p.y), 1.6, 0, Math.PI * 2);
        c.fillStyle = `rgba(6,182,212,${alpha.toFixed(3)})`;
        c.fill();
      }

      // ── Planet glow ───────────────────────────────────────────────────────────
      const glowGrad = c.createRadialGradient(cx, cy, planetVisPx * 0.3, cx, cy, planetVisPx * 2.4);
      glowGrad.addColorStop(0, pd.glow);
      glowGrad.addColorStop(1, "rgba(0,0,0,0)");
      c.beginPath();
      c.arc(cx, cy, planetVisPx * 2.4, 0, Math.PI * 2);
      c.fillStyle = glowGrad;
      c.fill();

      // ── Planet surface ────────────────────────────────────────────────────────
      const pGrad = c.createRadialGradient(
        cx - planetVisPx * 0.3, cy - planetVisPx * 0.3, 1,
        cx, cy, planetVisPx,
      );
      pGrad.addColorStop(0, lighten(pd.color, 55));
      pGrad.addColorStop(1, pd.color);
      c.beginPath();
      c.arc(cx, cy, planetVisPx, 0, Math.PI * 2);
      c.fillStyle = pGrad;
      c.fill();

      // planet label
      c.font = "10px monospace";
      c.fillStyle = "rgba(255,255,255,0.4)";
      c.textAlign = "center";
      c.fillText(pd.label, cx, cy + planetVisPx + 13);

      // ── Rocket ───────────────────────────────────────────────────────────────
      if (!crashed && !escaped) {
        const rx = toX(x);
        const ry = toY(y);
        // Heading angle (velocity direction)
        const heading = Math.atan2(-vy, vx);   // negative vy because canvas y is flipped
        drawRocket(c, rx, ry, heading, stateRef.current);
      }

      // ── Status overlay ────────────────────────────────────────────────────────
      const statusText = flightStateLabel(stateRef.current);
      c.font = "bold 13px monospace";
      c.textAlign = "center";
      c.fillStyle = "rgba(0,0,0,0.55)";
      c.fillRect(cx - 155, 10, 310, 26);
      c.fillStyle = flightStateColor(stateRef.current);
      c.fillText(statusText, cx, 27);

      if (crashed || escaped) {
        return; // stop rAF
      }

      rafRef.current = requestAnimationFrame(drawFrame);
    }

    lastTsRef.current = performance.now();
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [launched, planet, gm, ve, vc, pd, scale, planetVisPx, escBoundaryM, cx, cy]);

  // ── Draw idle canvas (stars + planet) ────────────────────────────────────────
  useEffect(() => {
    if (launched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    c.clearRect(0, 0, CW, CH);
    c.fillStyle = "#020714";
    c.fillRect(0, 0, CW, CH);

    for (const s of STARS) {
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fillStyle = `rgba(200,220,255,${s.a})`;
      c.fill();
    }

    // Reference circles
    drawDashedCircle(c, cx, cy, planetVisPx, "rgba(255,255,255,0.10)", [3, 6]);
    const escPx = escBoundaryM * scale;
    drawDashedCircle(c, cx, cy, escPx, "rgba(34,197,94,0.18)", [6, 8]);
    c.font = "9px monospace";
    c.fillStyle = "rgba(34,197,94,0.40)";
    c.textAlign = "left";
    c.fillText("escape boundary", cx + escPx * 0.64 + 2, cy - escPx * 0.64 - 2);

    // Planet
    const glowGrad = c.createRadialGradient(cx, cy, planetVisPx * 0.3, cx, cy, planetVisPx * 2.4);
    glowGrad.addColorStop(0, pd.glow);
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    c.beginPath();
    c.arc(cx, cy, planetVisPx * 2.4, 0, Math.PI * 2);
    c.fillStyle = glowGrad;
    c.fill();

    const pGrad = c.createRadialGradient(
      cx - planetVisPx * 0.3, cy - planetVisPx * 0.3, 1,
      cx, cy, planetVisPx,
    );
    pGrad.addColorStop(0, lighten(pd.color, 55));
    pGrad.addColorStop(1, pd.color);
    c.beginPath();
    c.arc(cx, cy, planetVisPx, 0, Math.PI * 2);
    c.fillStyle = pGrad;
    c.fill();

    c.font = "10px monospace";
    c.fillStyle = "rgba(255,255,255,0.4)";
    c.textAlign = "center";
    c.fillText(pd.label, cx, cy + planetVisPx + 13);

    // Rocket on surface at angle
    const angleRad = (angleDeg * Math.PI) / 180;
    const rx = cx + pd.radius * scale;
    const ry = cy;
    drawRocket(c, rx, ry, Math.PI - angleRad, "idle");
  }, [launched, planet, pd, scale, planetVisPx, escBoundaryM, cx, cy, angleDeg]);

  // ── Speed gauge config ────────────────────────────────────────────────────────
  const gaugeFrac = Math.min(stats.vCur / ve, 1.3);
  // const gaugeAngle = -135 + gaugeFrac * 270; // unused — gauge driven by gaugeFrac directly

  return (
    <div className="min-h-screen bg-[#020714] text-white p-4 flex flex-col items-center gap-5">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-cyan-400 tracking-wide font-mono">
          🚀 Escape Velocity Lab
        </h1>
        <p className="text-xs text-slate-400 mt-1 font-mono">
          Launch a rocket — does it escape, orbit, or fall back?
        </p>
      </div>

      {/* Main layout */}
      <div className="w-full max-w-[1100px] flex flex-col xl:flex-row gap-4">

        {/* Left column: canvas + controls */}
        <div className="flex flex-col gap-4 flex-1">

          {/* Canvas */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10"
               style={{ background: "rgba(255,255,255,0.03)" }}>
            <canvas ref={canvasRef} width={CW} height={CH}
                    className="block w-full" style={{ maxWidth: CW }} />
          </div>

          {/* Controls */}
          <div className="rounded-2xl border border-white/10 p-4 flex flex-col gap-4"
               style={{ background: "rgba(255,255,255,0.04)" }}>

            {/* Planet selector */}
            <div>
              <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-2 block">
                Planet
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PLANETS) as PlanetKey[]).map(p => (
                  <button
                    key={p}
                    onClick={() => { reset(); setPlanet(p); }}
                    className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-all
                      ${planet === p
                        ? "border-cyan-400 bg-cyan-400/15 text-cyan-300"
                        : "border-white/15 text-slate-400 hover:border-white/30 hover:text-white"}`}
                  >
                    {PLANETS[p].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Velocity slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                  Launch velocity
                </label>
                <span className="text-xs font-mono text-orange-300">
                  {(launchV / 1000).toFixed(2)} km/s
                  <span className="text-slate-500 ml-1">({(velFrac * 100).toFixed(0)}% v_esc)</span>
                </span>
              </div>
              <input type="range" min={0} max={1.2} step={0.01}
                     value={velFrac}
                     onChange={e => { if (!launched) setVelFrac(parseFloat(e.target.value)); }}
                     className="w-full accent-orange-400"
              />
              <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
                <span>0</span>
                <span className="text-yellow-600">v_c = {(vc/1000).toFixed(2)} km/s</span>
                <span className="text-green-600">v_esc = {(ve/1000).toFixed(2)} km/s</span>
                <span>{(ve*1.2/1000).toFixed(2)} km/s</span>
              </div>
            </div>

            {/* Angle slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                  Launch angle from radial
                </label>
                <span className="text-xs font-mono text-cyan-300">{angleDeg}°</span>
              </div>
              <input type="range" min={0} max={90} step={1}
                     value={angleDeg}
                     onChange={e => { if (!launched) setAngleDeg(parseInt(e.target.value)); }}
                     className="w-full accent-cyan-400"
              />
              <div className="flex justify-between text-[9px] text-slate-600 font-mono mt-0.5">
                <span>0° (radial)</span>
                <span>45°</span>
                <span>90° (tangential)</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={launch}
                disabled={launched}
                className={`flex-1 py-2 rounded-xl font-mono font-bold text-sm border transition-all
                  ${launched
                    ? "border-white/10 text-slate-600 cursor-not-allowed"
                    : "border-orange-400 text-orange-300 bg-orange-400/10 hover:bg-orange-400/20"}`}
              >
                🚀 Launch!
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={reset}
                className="flex-1 py-2 rounded-xl font-mono font-bold text-sm border
                           border-white/20 text-slate-300 hover:bg-white/5 transition-all"
              >
                ↺ Reset
              </motion.button>
            </div>
          </div>
        </div>

        {/* Right column: gauge + stats + explanation */}
        <div className="flex flex-col gap-4 w-full xl:w-72">

          {/* Speed gauge */}
          <div className="rounded-2xl border border-white/10 p-5 flex flex-col items-center gap-2"
               style={{ background: "rgba(255,255,255,0.04)" }}>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
              Speed Gauge
            </span>
            <SpeedGauge
              velFrac={gaugeFrac}
              vcFrac={vc / ve}
              vCurKms={stats.vCur / 1000}
              vEscKms={ve / 1000}
            />
          </div>

          {/* Stats panel */}
          <div className="rounded-2xl border border-white/10 p-4 flex flex-col gap-2"
               style={{ background: "rgba(255,255,255,0.04)" }}>
            <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-1">
              Live Stats
            </span>
            <StatRow label="Escape velocity"       value={`${(stats.vEsc/1000).toFixed(2)} km/s`}  color="text-green-400" />
            <StatRow label="Circular orbit vel."   value={`${(stats.vCirc/1000).toFixed(2)} km/s`} color="text-yellow-400" />
            <StatRow label="Current velocity"      value={`${(stats.vCur/1000).toFixed(2)} km/s`}  color="text-cyan-300" />
            <StatRow label="Energy (J)"
              value={launched
                ? (stats.energy >= 0
                    ? `+${stats.energy.toExponential(2)}`
                    : stats.energy.toExponential(2))
                : "—"}
              color={stats.energy >= 0 ? "text-green-400" : "text-red-400"}
            />
            <StatRow label="Altitude"
              value={launched ? `${stats.alt >= 0 ? stats.alt.toFixed(0) : 0} km` : "—"}
              color="text-slate-300"
            />
            <div className="mt-1 pt-2 border-t border-white/10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={flightState}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.25 }}
                  className={`text-xs font-mono font-bold px-2 py-1 rounded-lg text-center
                    ${badgeStyle(flightState)}`}
                >
                  {flightStateLabel(flightState)}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Explanation card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={flightState}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-2xl border border-cyan-500/20 p-4"
              style={{ background: "rgba(6,182,212,0.05)" }}
            >
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-2">
                What&apos;s happening
              </p>
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {explanation(flightState, planet)}
              </p>
            </motion.div>
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatRowProps { label: string; value: string; color: string }
function StatRow({ label, value, color }: StatRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-500 font-mono">{label}</span>
      <span className={`text-xs font-mono font-semibold ${color}`}>{value}</span>
    </div>
  );
}

interface SpeedGaugeProps {
  velFrac: number;   // 0-1.3 (0 = 0 m/s, 1 = v_esc)
  vcFrac:  number;   // v_circ / v_esc (typically ~0.707)
  vCurKms: number;
  vEscKms: number;
}

function SpeedGauge({ velFrac, vcFrac, vCurKms, vEscKms }: SpeedGaugeProps) {
  const R      = 70;
  const stroke = 12;
  const cx     = 85;
  const cy     = 85;
  // Arc: -135° to +135° (total 270°)
  const START_DEG  = -135;
  const TOTAL_DEG  = 270;

  function polarToXY(deg: number) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + R * Math.cos(rad),
      y: cy + R * Math.sin(rad),
    };
  }

  function arcPath(startDeg: number, endDeg: number) {
    const s   = polarToXY(startDeg);
    const e   = polarToXY(endDeg);
    const span = endDeg - startDeg;
    const large = span > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  const redEnd    = START_DEG + TOTAL_DEG * vcFrac;           // up to v_c
  const orangeEnd = START_DEG + TOTAL_DEG;                    // v_c to v_esc
  const needleDeg = START_DEG + Math.min(velFrac, 1.3) * TOTAL_DEG;
  const needleXY  = polarToXY(needleDeg);

  return (
    <svg width={170} height={110} viewBox="0 0 170 110">
      {/* Track background */}
      <path d={arcPath(START_DEG, START_DEG + TOTAL_DEG)}
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}
            strokeLinecap="round" />

      {/* Red zone: 0 → v_c */}
      <path d={arcPath(START_DEG, redEnd)}
            fill="none" stroke="#ef4444" strokeWidth={stroke}
            strokeLinecap="round" opacity={0.7} />

      {/* Orange zone: v_c → v_esc */}
      <path d={arcPath(redEnd, orangeEnd)}
            fill="none" stroke="#f97316" strokeWidth={stroke}
            strokeLinecap="round" opacity={0.7} />

      {/* Green zone: v_esc → 1.3× */}
      <path d={arcPath(orangeEnd, START_DEG + 1.3 * TOTAL_DEG)}
            fill="none" stroke="#22c55e" strokeWidth={stroke}
            strokeLinecap="round" opacity={0.7} />

      {/* Needle */}
      <motion.line
        x1={cx} y1={cy}
        x2={needleXY.x} y2={needleXY.y}
        stroke="white" strokeWidth={2} strokeLinecap="round"
        animate={{ x2: needleXY.x, y2: needleXY.y }}
        transition={{ type: "spring", stiffness: 80, damping: 18 }}
      />
      <circle cx={cx} cy={cy} r={4} fill="white" />

      {/* Labels */}
      <text x={cx} y={cy + 22} textAnchor="middle"
            fontSize={11} fontFamily="monospace" fill="#06b6d4">
        {vCurKms.toFixed(2)} km/s
      </text>
      <text x={16}  y={cy + 28} fontSize={8} fontFamily="monospace" fill="#ef4444" textAnchor="middle">v=0</text>
      <text x={cx}  y={16}      fontSize={8} fontFamily="monospace" fill="#f97316" textAnchor="middle">v_c</text>
      <text x={154} y={cy + 28} fontSize={8} fontFamily="monospace" fill="#22c55e" textAnchor="middle">
        v_esc
      </text>
      <text x={cx} y={cy + 36} textAnchor="middle"
            fontSize={8} fontFamily="monospace" fill="rgba(255,255,255,0.3)">
        v_esc = {vEscKms.toFixed(2)} km/s
      </text>
    </svg>
  );
}

// ─── Canvas draw helpers ──────────────────────────────────────────────────────

function drawDashedCircle(
  c: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  color: string, dash: number[],
) {
  if (r < 1) return;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.setLineDash(dash);
  c.strokeStyle = color;
  c.lineWidth = 1;
  c.stroke();
  c.setLineDash([]);
}

function drawRocket(
  c: CanvasRenderingContext2D,
  x: number, y: number,
  heading: number,
  state: FlightState,
) {
  c.save();
  c.translate(x, y);
  c.rotate(heading + Math.PI / 2);

  const color = state === "escape"     ? "#22c55e"
              : state === "orbit"      ? "#facc15"
              : state === "crashed"    ? "#ef4444"
              : "#f97316";

  // Body (triangle pointing up)
  c.beginPath();
  c.moveTo(0, -7);
  c.lineTo(4, 4);
  c.lineTo(-4, 4);
  c.closePath();
  c.fillStyle = color;
  c.fill();

  // Exhaust glow
  if (state !== "crashed" && state !== "idle") {
    const grad = c.createRadialGradient(0, 5, 0, 0, 5, 8);
    grad.addColorStop(0, "rgba(249,115,22,0.8)");
    grad.addColorStop(1, "rgba(249,115,22,0)");
    c.beginPath();
    c.arc(0, 5, 8, 0, Math.PI * 2);
    c.fillStyle = grad;
    c.fill();
  }

  c.restore();
}

// ─── State label/color helpers ────────────────────────────────────────────────

function flightStateLabel(state: FlightState): string {
  switch (state) {
    case "idle":       return "⏸ Ready to launch";
    case "suborbital": return "🔻 SUBORBITAL — will fall back";
    case "orbit":      return "🌍 STABLE ORBIT";
    case "escape":     return "🚀 ESCAPING GRAVITY";
    case "crashed":    return "💥 CRASHED";
  }
}

function flightStateColor(state: FlightState): string {
  switch (state) {
    case "idle":       return "rgba(148,163,184,0.9)";
    case "suborbital": return "rgba(239,68,68,0.95)";
    case "orbit":      return "rgba(250,204,21,0.95)";
    case "escape":     return "rgba(34,197,94,0.95)";
    case "crashed":    return "rgba(239,68,68,0.95)";
  }
}

function badgeStyle(state: FlightState): string {
  switch (state) {
    case "idle":       return "bg-slate-700/50 text-slate-400";
    case "suborbital": return "bg-red-500/20 text-red-400 border border-red-500/30";
    case "orbit":      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
    case "escape":     return "bg-green-500/20 text-green-400 border border-green-500/30";
    case "crashed":    return "bg-red-600/30 text-red-300 border border-red-500/40";
  }
}

function explanation(state: FlightState, planet: PlanetKey): string {
  const pd = PLANETS[planet];
  switch (state) {
    case "idle":
      return `${pd.label}'s escape velocity is ${(vEsc(planet)/1000).toFixed(2)} km/s — `
           + `the speed at which kinetic energy exactly cancels gravitational potential energy. `
           + `Adjust the slider and angle, then hit Launch!`;
    case "suborbital":
      return `Total mechanical energy E < 0 — the rocket is gravitationally bound. `
           + `Without additional thrust it will follow a ballistic arc and fall back to ${pd.label}. `
           + `Increase velocity above the circular orbit speed (~${(vCirc(planet)/1000).toFixed(2)} km/s) to change that.`;
    case "orbit":
      return `Velocity ≈ √(GM/r) — the centripetal acceleration exactly matches gravity. `
           + `The rocket traces a stable circular orbit around ${pd.label} indefinitely with no thrust required. `
           + `This is how the ISS stays aloft at 7.66 km/s around Earth.`;
    case "escape":
      return `Total energy E ≥ 0 — the rocket has overcome ${pd.label}'s gravity well. `
           + `It will continue to decelerate but its speed will never reach zero; it escapes to infinity. `
           + `Voyager 1 achieved this and is now in interstellar space.`;
    case "crashed":
      return `The rocket's trajectory intersected ${pd.label}'s surface. `
           + `A suborbital path with insufficient horizontal velocity curves back into the planet. `
           + `Increase launch angle or velocity to achieve orbit or escape.`;
  }
}
