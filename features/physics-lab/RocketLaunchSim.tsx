"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Planet Data ───────────────────────────────────────────────────────────────

interface PlanetConfig {
  name: string;
  gravity: number;      // m/s²
  radius: number;       // metres (for escape velocity)
  airDensity: number;   // kg/m³ at surface (ρ₀)
  scaleHeight: number;  // H in metres for density falloff
  groundColor: string;
  skyColor: string;
  emoji: string;
}

const PLANETS: Record<string, PlanetConfig> = {
  Earth:   { name: "Earth",   gravity: 9.807,  radius: 6.371e6, airDensity: 1.225, scaleHeight: 8500, groundColor: "#16a34a", skyColor: "#0ea5e9", emoji: "🌍" },
  Moon:    { name: "Moon",    gravity: 1.622,  radius: 1.737e6, airDensity: 0,     scaleHeight: 8500, groundColor: "#94a3b8", skyColor: "#1e1b4b", emoji: "🌕" },
  Mars:    { name: "Mars",    gravity: 3.721,  radius: 3.390e6, airDensity: 0.020, scaleHeight: 11100,groundColor: "#b45309", skyColor: "#c2410c", emoji: "🔴" },
  Venus:   { name: "Venus",   gravity: 8.870,  radius: 6.051e6, airDensity: 65.0,  scaleHeight: 5000, groundColor: "#ca8a04", skyColor: "#78350f", emoji: "🟡" },
  Mercury: { name: "Mercury", gravity: 3.700,  radius: 2.440e6, airDensity: 0,     scaleHeight: 8500, groundColor: "#78716c", skyColor: "#1c1917", emoji: "⚫" },
  Jupiter: { name: "Jupiter", gravity: 24.790, radius: 6.991e7, airDensity: 0.160, scaleHeight: 27000,groundColor: "#92400e", skyColor: "#78350f", emoji: "🟠" },
  Saturn:  { name: "Saturn",  gravity: 10.440, radius: 5.823e7, airDensity: 0.100, scaleHeight: 59500,groundColor: "#d97706", skyColor: "#451a03", emoji: "🪐" },
  Neptune: { name: "Neptune", gravity: 11.150, radius: 2.462e7, airDensity: 0.450, scaleHeight: 19700,groundColor: "#1d4ed8", skyColor: "#1e3a5f", emoji: "🔵" },
};

// ─── Physics Types ─────────────────────────────────────────────────────────────

interface SimState {
  running: boolean;
  finished: boolean;
  landed: boolean;        // true = soft, false = crash (when finished)
  t: number;              // elapsed time seconds
  x: number;              // horizontal metres
  y: number;              // height metres
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  fuelMass: number;
  fuelUsed: number;
  maxHeight: number;
  drag: number;           // N
  burnFinished: boolean;
}

interface TrailPoint { x: number; y: number }
interface Particle   { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; r: number }
interface Star       { x: number; y: number; r: number; brightness: number }

// ─── Constants ────────────────────────────────────────────────────────────────

const G0      = 9.80665;   // standard gravity (m/s²) for Isp
const ISP     = 350;       // specific impulse (s) – RP-1/LOX typical
const CD      = 0.5;       // drag coefficient
const AREA    = 3.5;       // rocket frontal area m²
const BURN_RATE = 150;     // kg/s propellant flow rate

const CANVAS_W = 800;
const CANVAS_H = 480;
const GROUND_Y = CANVAS_H - 60;  // pixel y of the ground

// ─── Seed-based Star Field ─────────────────────────────────────────────────────

function buildStars(count: number): Star[] {
  // deterministic PRNG (mulberry32)
  let s = 0xdeadbeef;
  const rand = () => { s |= 0; s = s + 0x6d2b79f5 | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return Array.from({ length: count }, () => ({
    x: rand() * CANVAS_W,
    y: rand() * (GROUND_Y - 10),
    r: rand() * 1.5 + 0.3,
    brightness: rand() * 0.7 + 0.3,
  }));
}

const STARS = buildStars(180);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeVelocity(planet: PlanetConfig): number {
  return Math.sqrt(2 * planet.gravity * planet.radius); // m/s
}

function atmosphericDensity(h: number, planet: PlanetConfig): number {
  if (planet.airDensity === 0) return 0;
  return planet.airDensity * Math.exp(-Math.max(h, 0) / planet.scaleHeight);
}

function dragForce(v: number, h: number, planet: PlanetConfig, dragOn: boolean): number {
  if (!dragOn) return 0;
  const rho = atmosphericDensity(h, planet);
  return 0.5 * rho * v * v * CD * AREA;
}

// ─── Canvas Utilities ─────────────────────────────────────────────────────────

/** Map simulation coords → canvas pixels.
 *  x=0 → canvas 80px (launch pad)
 *  y=0 → GROUND_Y
 *  Scale is auto-computed from maxHeight to always fit trajectory on screen.
 */
function simToCanvas(
  sx: number, sy: number,
  scaleX: number, scaleY: number,
): { cx: number; cy: number } {
  return {
    cx: 80 + sx * scaleX,
    cy: GROUND_Y - sy * scaleY,
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RocketLaunchSim() {
  // ── Controls state ──────────────────────────────────────────────────────────
  const [angle,       setAngle]       = useState(85);            // degrees
  const [initVel,     setInitVel]     = useState(3000);          // m/s
  const [rocketMass,  setRocketMass]  = useState(8000);          // kg
  const [fuelMass,    setFuelMass]    = useState(12000);         // kg
  const [planet,      setPlanet]      = useState<string>("Earth");
  const [dragOn,      setDragOn]      = useState(true);
  const [slowMo,      setSlowMo]      = useState(false);
  const [result,      setResult]      = useState<"landed"|"crash"|null>(null);
  const [isRunning,   setIsRunning]   = useState(false);

  // ── Refs that the animation loop reads ──────────────────────────────────────
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const simRef         = useRef<SimState | null>(null);
  const trailRef       = useRef<TrailPoint[]>([]);
  const particlesRef   = useRef<Particle[]>([]);
  const rafRef         = useRef<number>(0);
  const scaleRef       = useRef({ x: 0.00004, y: 0.000035 }); // px/m
  // Mirror every reactive value the RAF loop needs so it can read the latest
  // value without being re-created on each render.
  const slowMoRef      = useRef(slowMo);
  const dragOnRef      = useRef(dragOn);
  const planetRef      = useRef(planet);
  const fuelMassRef    = useRef(fuelMass);
  const stepSimRef     = useRef<typeof stepSim | null>(null);
  const drawRef        = useRef<typeof draw | null>(null);
  // The animate loop is stored in a ref so it can self-schedule without
  // any hook dependency array, avoiding both stale-closure and forward-
  // reference lint errors.
  const animateRef     = useRef<() => void>(() => undefined);

  // ── Derived (reactive) ──────────────────────────────────────────────────────
  const planetData  = PLANETS[planet];
  const vEsc        = escapeVelocity(planetData);

  // ── Δv from Tsiolkovsky ─────────────────────────────────────────────────────
  const m0  = rocketMass + fuelMass;
  const mf  = rocketMass;
  const dv  = ISP * G0 * Math.log(m0 / mf);

  // ── Live stats (updated by animation loop) ──────────────────────────────────
  const [stats, setStats] = useState({
    maxHeight: 0,
    flightTime: 0,
    distance: 0,
    velocity: 0,
    accel: 0,
    fuelRemaining: 0,
    fuelUsedPct: 0,
    airResistance: 0,
  });

  // ─── Draw frame ─────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sim = simRef.current;
    const sx  = scaleRef.current.x;
    const sy  = scaleRef.current.y;

    // --- Background ---
    ctx.fillStyle = "#00030a";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // --- Stars ---
    STARS.forEach(star => {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${star.brightness})`;
      ctx.fill();
    });

    // --- Ground ---
    const grd = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
    grd.addColorStop(0, planetData.groundColor);
    grd.addColorStop(1, "#000");
    ctx.fillStyle = grd;
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

    // horizon line
    ctx.strokeStyle = planetData.groundColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_W, GROUND_Y);
    ctx.stroke();

    if (!sim) {
      // --- Static launch pad ---
      drawLaunchPad(ctx, 80, GROUND_Y);
      drawRocket(ctx, 80, GROUND_Y - 18, angle, false);
      return;
    }

    // --- Trajectory trail (dotted cyan) ---
    const trail = trailRef.current;
    if (trail.length > 1) {
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = "rgba(34,211,238,0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const p0 = simToCanvas(trail[0].x, trail[0].y, sx, sy);
      ctx.moveTo(p0.cx, p0.cy);
      for (let i = 1; i < trail.length; i++) {
        const p = simToCanvas(trail[i].x, trail[i].y, sx, sy);
        ctx.lineTo(p.cx, p.cy);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // --- Smoke particles ---
    particlesRef.current.forEach(p => {
      const alpha = p.life / p.maxLife * 0.55;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,170,160,${alpha})`;
      ctx.fill();
    });

    // --- Rocket or landing marker ---
    if (!sim.finished) {
      const { cx, cy } = simToCanvas(sim.x, sim.y, sx, sy);
      const isThrusting = !sim.burnFinished;
      drawRocket(ctx, cx, cy, angle, isThrusting);
    } else {
      const { cx } = simToCanvas(sim.x, 0, sx, sy);
      if (sim.landed) {
        // success flag
        ctx.font = "22px serif";
        ctx.textAlign = "center";
        ctx.fillText("🚀", cx, GROUND_Y - 8);
      } else {
        // explosion
        ctx.font = "22px serif";
        ctx.textAlign = "center";
        ctx.fillText("💥", cx, GROUND_Y - 8);
      }
    }

    // --- Launch pad ---
    drawLaunchPad(ctx, 80, GROUND_Y);

    // --- Labels: escape / Δv badge ---
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(34,211,238,0.6)";
    ctx.font = "11px monospace";
    ctx.fillText(`vₑₛ꜀ = ${(vEsc / 1000).toFixed(2)} km/s`, 8, 16);
    ctx.fillText(`Δv   = ${(dv / 1000).toFixed(2)} km/s`, 8, 30);

  }, [angle, planetData, vEsc, dv]);

  // ─── Step simulation ────────────────────────────────────────────────────────
  const stepSim = useCallback((sim: SimState, dt: number, planetCfg: PlanetConfig, atDrag: boolean) => {
    const g = planetCfg.gravity;

    // Current total mass (structural + remaining fuel)
    const totalMass = rocketMass + sim.fuelMass;

    // Thrust phase: burn fuel at BURN_RATE until exhausted
    let thrust = 0;
    let fuelBurned = 0;
    if (!sim.burnFinished && sim.fuelMass > 0) {
      fuelBurned = Math.min(BURN_RATE * dt, sim.fuelMass);
      // Tsiolkovsky: exhaust velocity = Isp * g0
      const ve = ISP * G0;
      thrust = ve * (fuelBurned / dt);  // F = ve * dm/dt
    }

    const speed = Math.sqrt(sim.vx * sim.vx + sim.vy * sim.vy);
    const Fd    = dragForce(speed, sim.y, planetCfg, atDrag);

    // Unit vector of velocity for drag direction
    const ux = speed > 0 ? sim.vx / speed : 0;
    const uy = speed > 0 ? sim.vy / speed : 0;

    // Thrust direction: along velocity when burning (simplification)
    const thrustMag = thrust / totalMass;
    const thrustX   = thrustMag * ux;
    const thrustY   = thrustMag * uy;

    const dragAx = -(Fd / totalMass) * ux;
    const dragAy = -(Fd / totalMass) * uy;

    const ax = thrustX + dragAx;
    const ay = thrustY + dragAy - g;

    // Verlet integration
    const newVx = sim.vx + ax * dt;
    const newVy = sim.vy + ay * dt;
    const newX  = sim.x  + sim.vx * dt + 0.5 * ax * dt * dt;
    const newY  = sim.y  + sim.vy * dt + 0.5 * ay * dt * dt;

    const newFuel      = sim.fuelMass - fuelBurned;
    const newFuelUsed  = sim.fuelUsed + fuelBurned;
    const burnFinished = newFuel <= 0;

    const landed  = newY <= 0 && sim.y >= 0 && sim.t > 0.1;
    const crashed = landed && Math.abs(newVy) > 50; // >50 m/s landing = crash

    const newMaxH = Math.max(sim.maxHeight, newY);

    return {
      ...sim,
      t:            sim.t + dt,
      x:            Math.max(0, newX),
      y:            Math.max(0, newY),
      vx:           newVx,
      vy:           newVy,
      ax,
      ay,
      fuelMass:     Math.max(0, newFuel),
      fuelUsed:     newFuelUsed,
      burnFinished,
      maxHeight:    newMaxH,
      drag:         Fd,
      finished:     landed,
      landed:       !crashed,
      running:      !landed,
    };
  }, [rocketMass]);

  // ─── Auto-scale from first peak estimate ────────────────────────────────────
  const computeScale = useCallback((v0: number, theta: number, planetCfg: PlanetConfig) => {
    const g = planetCfg.gravity;
    const rad = (theta * Math.PI) / 180;
    const vy0 = v0 * Math.sin(rad);
    const vx0 = v0 * Math.cos(rad);
    // rough apogee without drag
    const tApex  = vy0 / g;
    const yMax   = vy0 * tApex - 0.5 * g * tApex * tApex;
    const tTotal = 2 * tApex;
    const xMax   = vx0 * tTotal;

    const drawW = CANVAS_W - 100;
    const drawH = GROUND_Y - 20;

    scaleRef.current = {
      x: xMax > 0 ? Math.min(drawW / xMax, 0.0008) : 0.00004,
      y: yMax > 0 ? Math.min(drawH / yMax, 0.0008) : 0.00004,
    };
  }, []);

  // ─── Sync mutable state values into mirror refs each render ─────────────────
  // (safe: these run after the return of render, never during it)
  useEffect(() => { slowMoRef.current  = slowMo;   }, [slowMo]);
  useEffect(() => { dragOnRef.current  = dragOn;   }, [dragOn]);
  useEffect(() => { planetRef.current  = planet;   }, [planet]);
  useEffect(() => { fuelMassRef.current= fuelMass; }, [fuelMass]);
  useEffect(() => { stepSimRef.current = stepSim;  }, [stepSim]);
  useEffect(() => { drawRef.current    = draw;     }, [draw]);

  // ─── Animation loop — stored in a ref so it can self-schedule without
  //     ever appearing in a hook dependency array ─────────────────────────────
  useEffect(() => {
    animateRef.current = () => {
      const sim    = simRef.current;
      const doStep = stepSimRef.current;
      const doDraw = drawRef.current;
      if (!sim || !sim.running || !doStep || !doDraw) {
        drawRef.current?.();
        return;
      }

      const dt   = slowMoRef.current ? 0.05 : 0.5;
      const next = doStep(sim, dt, PLANETS[planetRef.current], dragOnRef.current);
      simRef.current = next;

      // append trail at coarse intervals
      if (Math.floor(next.t / 0.5) !== Math.floor(sim.t / 0.5)) {
        trailRef.current.push({ x: next.x, y: next.y });
      }

      // spawn smoke particles near launch
      if (next.y < 500 && !next.burnFinished) {
        const { cx, cy } = simToCanvas(next.x, next.y, scaleRef.current.x, scaleRef.current.y);
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push({
            x: cx + (Math.random() - 0.5) * 10,
            y: cy + 14,
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 1.2 + 0.5,
            life: 40 + Math.random() * 30,
            maxLife: 70,
            r: 2 + Math.random() * 4,
          });
        }
      }

      // age particles
      particlesRef.current = particlesRef.current
        .map(p => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
        .filter(p => p.life > 0);

      // live telemetry
      const totalFuel = fuelMassRef.current;
      setStats({
        maxHeight:      next.maxHeight / 1000,
        flightTime:     next.t,
        distance:       next.x / 1000,
        velocity:       Math.sqrt(next.vx ** 2 + next.vy ** 2),
        accel:          Math.sqrt(next.ax ** 2 + next.ay ** 2),
        fuelRemaining:  next.fuelMass,
        fuelUsedPct:    totalFuel > 0 ? (next.fuelUsed / totalFuel) * 100 : 0,
        airResistance:  next.drag,
      });

      doDraw();

      if (next.finished) {
        setIsRunning(false);
        setResult(next.landed ? "landed" : "crash");
        doDraw();
        return;
      }

      rafRef.current = requestAnimationFrame(animateRef.current);
    };
  }); // runs every render — always fresh, never stale

  // ─── Launch ─────────────────────────────────────────────────────────────────
  const launch = useCallback(() => {
    if (simRef.current?.running) return;

    const rad = (angle * Math.PI) / 180;
    const v0  = initVel;

    computeScale(v0, angle, PLANETS[planet]);

    simRef.current = {
      running:      true,
      finished:     false,
      landed:       false,
      t:            0,
      x:            0,
      y:            0,
      vx:           v0 * Math.cos(rad),
      vy:           v0 * Math.sin(rad),
      ax:           0,
      ay:           0,
      fuelMass:     fuelMass,
      fuelUsed:     0,
      maxHeight:    0,
      drag:         0,
      burnFinished: false,
    };

    trailRef.current    = [{ x: 0, y: 0 }];
    particlesRef.current= [];
    setResult(null);
    setIsRunning(true);
    setStats({ maxHeight:0, flightTime:0, distance:0, velocity:v0, accel:0, fuelRemaining:fuelMass, fuelUsedPct:0, airResistance:0 });

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animateRef.current);
  }, [angle, initVel, fuelMass, planet, computeScale]);

  // ─── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    simRef.current      = null;
    trailRef.current    = [];
    particlesRef.current= [];
    setResult(null);
    setIsRunning(false);
    setStats({ maxHeight:0, flightTime:0, distance:0, velocity:0, accel:0, fuelRemaining:fuelMass, fuelUsedPct:0, airResistance:0 });
    draw();
  }, [draw, fuelMass]);

  // initial draw
  useEffect(() => { draw(); }, [draw]);

  // re-draw when idle (sim drives its own RAF when running)
  useEffect(() => {
    if (!isRunning) draw();
  });

  // cleanup on unmount
  useEffect(() => {
    return () => { cancelAnimationFrame(rafRef.current); };
  }, []);

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const glass: React.CSSProperties = {
    background:    "rgba(5,15,40,0.80)",
    border:        "1px solid rgba(34,211,238,0.20)",
    backdropFilter:"blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderRadius:  "16px",
    padding:       "16px",
  };

  const labelStyle: React.CSSProperties = {
    color:    "rgba(103,232,249,0.75)",
    fontSize: "11px",
    fontFamily: "monospace",
    marginBottom: "2px",
    display: "block",
  };

  const valueStyle: React.CSSProperties = {
    color:      "#ffffff",
    fontWeight: 600,
    fontSize:   "13px",
    fontFamily: "monospace",
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    accentColor: "#22d3ee",
    cursor: "pointer",
  };

  const btnBase: React.CSSProperties = {
    border:       "none",
    borderRadius: "12px",
    padding:      "8px 18px",
    fontWeight:   700,
    fontSize:     "13px",
    cursor:       "pointer",
    transition:   "opacity 0.2s",
  };

  const pillStyle = (active: boolean): React.CSSProperties => ({
    ...btnBase,
    padding:    "5px 12px",
    fontSize:   "11px",
    background: active
      ? "linear-gradient(135deg,#22d3ee,#0ea5e9)"
      : "rgba(255,255,255,0.07)",
    color:      active ? "#000" : "rgba(255,255,255,0.7)",
    border:     active ? "none" : "1px solid rgba(34,211,238,0.25)",
  });

  return (
    <div style={{ color: "#fff", fontFamily: "sans-serif", maxWidth: "1080px", margin: "0 auto", padding: "16px" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, background: "linear-gradient(90deg,#22d3ee,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          🚀 Rocket Launch Simulator
        </h1>
        <p style={{ color: "rgba(103,232,249,0.6)", fontSize: "12px", margin: "4px 0 0" }}>
          Tsiolkovsky · Drag · Atmospheric Physics
        </p>
      </div>

      {/* Main layout */}
      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>

        {/* ── Left: Canvas + result ── */}
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          <div style={{ position: "relative", borderRadius: "14px", overflow: "hidden", border: "1px solid rgba(34,211,238,0.18)" }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ display: "block", width: "100%", height: "auto" }}
            />
            {/* Result overlay */}
            <AnimatePresence>
              {result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: "absolute",
                    bottom: "24px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: result === "landed" ? "rgba(5,46,22,0.88)" : "rgba(69,10,10,0.88)",
                    border: `1px solid ${result === "landed" ? "#22d3ee" : "#f97316"}`,
                    borderRadius: "14px",
                    padding: "10px 28px",
                    fontSize: "16px",
                    fontWeight: 700,
                    backdropFilter: "blur(10px)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {result === "landed" ? "🎉 Successful Landing!" : "💥 Crash!"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Launch controls row */}
          <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={launch}
              disabled={isRunning}
              style={{
                ...btnBase,
                flex: "1 1 120px",
                background: isRunning ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#22d3ee,#0ea5e9)",
                color: isRunning ? "rgba(255,255,255,0.4)" : "#000",
                cursor: isRunning ? "not-allowed" : "pointer",
              }}
            >
              🚀 Launch
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={reset}
              style={{ ...btnBase, flex: "1 1 100px", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff" }}
            >
              🔄 Reset
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setSlowMo(v => !v)}
              style={{
                ...btnBase,
                flex: "1 1 130px",
                background: slowMo ? "linear-gradient(135deg,#a855f7,#7c3aed)" : "rgba(255,255,255,0.07)",
                color: "#fff",
                border: slowMo ? "none" : "1px solid rgba(168,85,247,0.4)",
              }}
            >
              {slowMo ? "🐢 Slow-Mo ON" : "⚡ Slow-Mo OFF"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setDragOn(v => !v)}
              style={{
                ...btnBase,
                flex: "1 1 130px",
                background: dragOn ? "linear-gradient(135deg,#22d3ee,#0284c7)" : "rgba(255,255,255,0.07)",
                color: dragOn ? "#000" : "rgba(255,255,255,0.6)",
                border: dragOn ? "none" : "1px solid rgba(34,211,238,0.3)",
              }}
            >
              {dragOn ? "🌬️ Drag ON" : "🌬️ Drag OFF"}
            </motion.button>
          </div>
        </div>

        {/* ── Right: Controls + Stats ── */}
        <div style={{ flex: "0 0 260px", display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* Planet selector */}
          <div style={glass}>
            <span style={{ ...labelStyle, fontSize: "12px", color: "#22d3ee", marginBottom: "8px" }}>PLANET</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Object.keys(PLANETS).map(p => (
                <button
                  key={p}
                  onClick={() => { setPlanet(p); if (!isRunning) reset(); }}
                  style={pillStyle(planet === p)}
                >
                  {PLANETS[p].emoji} {p}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div style={glass}>
            <span style={{ ...labelStyle, fontSize: "12px", color: "#22d3ee", marginBottom: "8px" }}>PARAMETERS</span>
            {[
              { label: "Launch Angle", value: angle,      setValue: setAngle,      min: 0,   max: 90,    step: 1,   unit: "°",   fmt: (v: number) => `${v}°` },
              { label: "Init. Velocity",value: initVel,   setValue: setInitVel,   min: 100, max: 12000, step: 100, unit: "m/s", fmt: (v: number) => `${v.toLocaleString()} m/s` },
              { label: "Rocket Mass",   value: rocketMass, setValue: setRocketMass, min: 1000,max: 50000, step: 500, unit: "kg",  fmt: (v: number) => `${v.toLocaleString()} kg` },
              { label: "Fuel Mass",     value: fuelMass,   setValue: setFuelMass,   min: 500, max: 40000, step: 500, unit: "kg",  fmt: (v: number) => `${v.toLocaleString()} kg` },
            ].map(({ label, value, setValue, min, max, step, fmt }) => (
              <div key={label} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={labelStyle}>{label}</span>
                  <span style={valueStyle}>{fmt(value)}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={step}
                  value={value}
                  onChange={e => setValue(Number(e.target.value))}
                  style={sliderStyle}
                  disabled={isRunning}
                />
              </div>
            ))}

            {/* Δv readout */}
            <div style={{ marginTop: "4px", padding: "8px", background: "rgba(34,211,238,0.07)", borderRadius: "8px", border: "1px solid rgba(34,211,238,0.18)" }}>
              <span style={labelStyle}>Tsiolkovsky Δv</span>
              <span style={{ ...valueStyle, color: "#22d3ee" }}>{(dv / 1000).toFixed(2)} km/s</span>
            </div>
          </div>

          {/* Live Stats */}
          <div style={glass}>
            <span style={{ ...labelStyle, fontSize: "12px", color: "#22d3ee", marginBottom: "8px" }}>LIVE TELEMETRY</span>
            {[
              ["Max Height",    `${stats.maxHeight.toFixed(2)} km`],
              ["Flight Time",   `${stats.flightTime.toFixed(1)} s`],
              ["H. Distance",   `${stats.distance.toFixed(2)} km`],
              ["Velocity",      `${stats.velocity.toFixed(0)} m/s`],
              ["Acceleration",  `${stats.accel.toFixed(1)} m/s²`],
              ["Escape Vel.",   `${(vEsc / 1000).toFixed(2)} km/s`],
              ["Surface g",     `${planetData.gravity.toFixed(3)} m/s²`],
              ["Fuel Left",     `${stats.fuelRemaining.toFixed(0)} kg`],
              ["Fuel Used",     `${stats.fuelUsedPct.toFixed(1)}%`],
              ["Air Resist.",   `${stats.airResistance.toFixed(0)} N`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "6px" }}>
                <span style={labelStyle}>{lbl}</span>
                <span style={valueStyle}>{val}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Physics legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        style={{ ...glass, marginTop: "12px", fontSize: "11px", color: "rgba(103,232,249,0.55)", lineHeight: "1.7", fontFamily: "monospace" }}
      >
        <span style={{ color: "#22d3ee", fontWeight: 700 }}>Physics: </span>
        y(t) = v₀sin(θ)·t − ½g·t²&nbsp;&nbsp;|&nbsp;&nbsp;
        Δv = Isp·g₀·ln(m₀/mf)&nbsp;&nbsp;|&nbsp;&nbsp;
        F_drag = ½ρv²·Cd·A&nbsp;&nbsp;|&nbsp;&nbsp;
        ρ(h) = ρ₀·e<sup>−h/H</sup>&nbsp;&nbsp;|&nbsp;&nbsp;
        v_esc = √(2gR)
      </motion.div>
    </div>
  );
}

// ─── Canvas Drawing Helpers ───────────────────────────────────────────────────

function drawLaunchPad(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  ctx.fillStyle = "#475569";
  ctx.fillRect(x - 18, groundY - 6, 36, 6);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x - 3, groundY - 18, 6, 12);
  // legs
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x - 3, groundY - 6); ctx.lineTo(x - 14, groundY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 3, groundY - 6); ctx.lineTo(x + 14, groundY); ctx.stroke();
}

function drawRocket(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  angleDeg: number,
  thrusting: boolean,
) {
  ctx.save();
  ctx.translate(cx, cy);
  // rotate so rocket points in launch direction
  // canvas y is inverted so we negate
  ctx.rotate(-(angleDeg * Math.PI) / 180 + Math.PI / 2);

  // Body
  ctx.beginPath();
  ctx.moveTo(0, -14);      // nose
  ctx.lineTo(-5, 8);
  ctx.lineTo(5,  8);
  ctx.closePath();
  ctx.fillStyle = "#e2e8f0";
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Nose cone
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(-4, -6);
  ctx.lineTo(4,  -6);
  ctx.closePath();
  ctx.fillStyle = "#f97316";
  ctx.fill();

  // Fins
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath(); ctx.moveTo(-5, 6); ctx.lineTo(-10, 12); ctx.lineTo(-5, 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5,  6); ctx.lineTo(10,  12); ctx.lineTo(5,  10); ctx.closePath(); ctx.fill();

  // Window
  ctx.beginPath();
  ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.fill();

  // Flame
  if (thrusting) {
    const flameLen = 10 + Math.random() * 8;
    const grad = ctx.createLinearGradient(0, 8, 0, 8 + flameLen);
    grad.addColorStop(0, "rgba(249,115,22,0.95)");
    grad.addColorStop(0.4, "rgba(250,204,21,0.8)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(0, 8 + flameLen);
    ctx.lineTo(4, 8);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  ctx.restore();
}
