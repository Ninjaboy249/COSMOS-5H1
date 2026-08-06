"use client";
// ─────────────────────────────────────────────────────────────────────────────
// GravityComparisonSim — Drop balls simultaneously on different planets and
// watch which one lands first, driven by real free-fall physics.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Planet data ───────────────────────────────────────────────────────────────

interface Planet {
  id: string;
  name: string;
  g: number;      // m/s²
  color: string;
}

const PLANETS: Planet[] = [
  { id: "earth",   name: "Earth",   g: 9.807,  color: "#4fa3e0" },
  { id: "moon",    name: "Moon",    g: 1.622,  color: "#aaaaaa" },
  { id: "mars",    name: "Mars",    g: 3.721,  color: "#c1440e" },
  { id: "venus",   name: "Venus",   g: 8.87,   color: "#e8c97a" },
  { id: "mercury", name: "Mercury", g: 3.7,    color: "#9ca3af" },
  { id: "jupiter", name: "Jupiter", g: 24.79,  color: "#c88b3a" },
  { id: "saturn",  name: "Saturn",  g: 10.44,  color: "#e4d191" },
  { id: "uranus",  name: "Uranus",  g: 8.69,   color: "#7de8e8" },
  { id: "neptune", name: "Neptune", g: 11.15,  color: "#5b7fde" },
];

const DEFAULT_SELECTION = ["earth", "moon", "mars", "jupiter"];
const CANVAS_HEIGHT = 400;
const BALL_RADIUS = 10;
const HEADER_H = 52;   // px reserved for planet label at top
const GROUND_Y = CANVAS_HEIGHT - 24; // y-coordinate of ground line
const DROP_ZONE_H = GROUND_Y - HEADER_H - BALL_RADIUS; // drawable fall pixels
const TRAIL_MAX = 28;
const SLOW_FACTOR = 6; // slow-motion time divisor

// ── Physics helpers ───────────────────────────────────────────────────────────

function fallTime(H: number, g: number) {
  return Math.sqrt((2 * H) / g);
}

function impactVel(H: number, g: number) {
  return Math.sqrt(2 * g * H);
}

// ── Trail point ───────────────────────────────────────────────────────────────

interface TrailPt { x: number; y: number; age: number }

// ── Lane state ────────────────────────────────────────────────────────────────

interface LaneState {
  planet: Planet;
  landed: boolean;
  landedAt: number;   // sim-time in seconds
  flashAlpha: number; // 0–1 for landing flash
  trail: TrailPt[];
  rank: number;       // 1-based landing rank, 0 = not yet
}

// ── Canvas renderer (imperative, runs in rAF loop) ────────────────────────────

function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  lanes: LaneState[],
  simTime: number,
  H: number,
  winnerIdx: number | null,
) {
  ctx.clearRect(0, 0, width, CANVAS_HEIGHT);

  const n = lanes.length;
  const laneW = width / n;

  lanes.forEach((lane, i) => {
    const lx = i * laneW;
    const cx = lx + laneW / 2;

    // ── Lane background ──────────────────────────────────────────────────
    ctx.save();
    const isWinner = winnerIdx === i;
    const bgAlpha = isWinner ? 0.12 : 0.04;
    ctx.fillStyle = `${lane.planet.color}${Math.round(bgAlpha * 255).toString(16).padStart(2, "0")}`;
    ctx.fillRect(lx, 0, laneW, CANVAS_HEIGHT);

    // Winner glow
    if (isWinner) {
      const grad = ctx.createRadialGradient(cx, GROUND_Y, 0, cx, GROUND_Y, laneW * 0.7);
      grad.addColorStop(0, `${lane.planet.color}33`);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(lx, 0, laneW, CANVAS_HEIGHT);
    }

    // ── Lane divider ──────────────────────────────────────────────────────
    if (i > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, CANVAS_HEIGHT);
      ctx.stroke();
    }

    // ── Planet label ──────────────────────────────────────────────────────
    ctx.fillStyle = lane.planet.color;
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(lane.planet.name, cx, 18);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText(`${lane.planet.g} m/s²`, cx, 34);

    // ── Ground line ───────────────────────────────────────────────────────
    ctx.strokeStyle = `${lane.planet.color}88`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx + 8, GROUND_Y);
    ctx.lineTo(lx + laneW - 8, GROUND_Y);
    ctx.stroke();

    // ── Ball position ─────────────────────────────────────────────────────
    const tLand = fallTime(H, lane.planet.g);
    const t = lane.landed ? tLand : simTime;
    const frac = Math.min(t / tLand, 1);
    const ballY = HEADER_H + BALL_RADIUS + frac * frac * DROP_ZONE_H;

    // ── Trail ─────────────────────────────────────────────────────────────
    lane.trail.forEach((pt, ti) => {
      const alpha = ((ti + 1) / lane.trail.length) * 0.4;
      const r = BALL_RADIUS * 0.45 * ((ti + 1) / lane.trail.length);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `${lane.planet.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();
    });

    // ── Ball ──────────────────────────────────────────────────────────────
    const glowR = isWinner ? BALL_RADIUS * 2.8 : BALL_RADIUS * 1.8;
    const glow = ctx.createRadialGradient(cx, ballY, 0, cx, ballY, glowR);
    glow.addColorStop(0, `${lane.planet.color}cc`);
    glow.addColorStop(0.45, `${lane.planet.color}55`);
    glow.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, ballY, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    const ballGrad = ctx.createRadialGradient(cx - 3, ballY - 3, 1, cx, ballY, BALL_RADIUS);
    ballGrad.addColorStop(0, "#ffffff");
    ballGrad.addColorStop(0.3, lane.planet.color);
    ballGrad.addColorStop(1, `${lane.planet.color}88`);
    ctx.beginPath();
    ctx.arc(cx, ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    // ── Landing flash ──────────────────────────────────────────────────────
    if (lane.flashAlpha > 0) {
      const flash = ctx.createRadialGradient(cx, GROUND_Y, 0, cx, GROUND_Y, laneW * 0.55);
      flash.addColorStop(0, `${lane.planet.color}${Math.round(lane.flashAlpha * 220).toString(16).padStart(2, "0")}`);
      flash.addColorStop(1, "transparent");
      ctx.fillStyle = flash;
      ctx.fillRect(lx, 0, laneW, CANVAS_HEIGHT);
    }

    // ── "LANDED" label ────────────────────────────────────────────────────
    if (lane.landed) {
      const rankLabels = ["🥇", "🥈", "🥉", "4th"];
      const rankLabel = rankLabels[lane.rank - 1] ?? `${lane.rank}th`;
      ctx.fillStyle = lane.planet.color;
      ctx.font = "bold 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${rankLabel} LANDED`, cx, GROUND_Y - BALL_RADIUS - 16);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(`${lane.landedAt.toFixed(2)}s`, cx, GROUND_Y - BALL_RADIUS - 4);
    }

    ctx.restore();
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GravityComparisonSim() {
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [height, setHeight] = useState(300);
  const [mass, setMass] = useState(10);
  const [slowMo, setSlowMo] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [ranking, setRanking] = useState<{ planet: Planet; t: number }[]>([]);
  const [liveTimes, setLiveTimes] = useState<Record<string, number>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lanesRef = useRef<LaneState[]>([]);
  const simTimeRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number | null>(null);
  const winnerIdxRef = useRef<number | null>(null);
  const rankCounterRef = useRef(0);

  // ── Planet pill toggle ────────────────────────────────────────────────────

  function togglePlanet(id: string) {
    if (running) return;
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // min 2
        return prev.filter((p) => p !== id);
      } else {
        if (prev.length >= 4) return prev; // max 4
        return [...prev, id];
      }
    });
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function reset() {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setDone(false);
    setRanking([]);
    setLiveTimes({});
    lanesRef.current = [];
    simTimeRef.current = 0;
    lastTsRef.current = null;
    winnerIdxRef.current = null;
    rankCounterRef.current = 0;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Drop ──────────────────────────────────────────────────────────────────

  function drop() {
    reset();

    const planets = PLANETS.filter((p) => selected.includes(p.id));
    lanesRef.current = planets.map((planet) => ({
      planet,
      landed: false,
      landedAt: 0,
      flashAlpha: 0,
      trail: [],
      rank: 0,
    }));
    rankCounterRef.current = 0;
    simTimeRef.current = 0;
    lastTsRef.current = null;
    winnerIdxRef.current = null;

    setRunning(true);
    setDone(false);
  }

  // ── Animation loop ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!running) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    function loop(ts: number) {
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Delta time
      if (lastTsRef.current === null) lastTsRef.current = ts;
      const rawDt = Math.min((ts - lastTsRef.current) / 1000, 0.05);
      lastTsRef.current = ts;
      const dt = slowMo ? rawDt / SLOW_FACTOR : rawDt;
      simTimeRef.current += dt;

      const H = height;
      const lanes = lanesRef.current;
      let allLanded = true;
      const liveUpdate: Record<string, number> = {};

      lanes.forEach((lane, i) => {
        const tLand = fallTime(H, lane.planet.g);
        const t = Math.min(simTimeRef.current, tLand);
        const frac = t / tLand;
        const laneW = canvas.width / lanes.length;
        const cx = i * laneW + laneW / 2;
        const ballY = HEADER_H + BALL_RADIUS + frac * frac * DROP_ZONE_H;

        // Update trail
        if (!lane.landed) {
          lane.trail.push({ x: cx, y: ballY, age: 0 });
          if (lane.trail.length > TRAIL_MAX) lane.trail.shift();
          liveUpdate[lane.planet.id] = t;
        }

        // Landing detection
        if (!lane.landed && simTimeRef.current >= tLand) {
          lane.landed = true;
          lane.landedAt = tLand;
          lane.flashAlpha = 1;
          rankCounterRef.current += 1;
          lane.rank = rankCounterRef.current;
          if (rankCounterRef.current === 1) {
            winnerIdxRef.current = i;
          }
        }

        // Decay flash
        if (lane.flashAlpha > 0) {
          lane.flashAlpha = Math.max(0, lane.flashAlpha - dt * 2.5);
        }

        if (!lane.landed) allLanded = false;
      });

      setLiveTimes({ ...liveUpdate });
      drawFrame(ctx, canvas.width, lanes, simTimeRef.current, H, winnerIdxRef.current);

      if (allLanded) {
        // Final frame
        drawFrame(ctx, canvas.width, lanes, simTimeRef.current, H, winnerIdxRef.current);
        const sorted = [...lanes].sort((a, b) => a.landedAt - b.landedAt);
        setRanking(sorted.map((l) => ({ planet: l.planet, t: l.landedAt })));
        setRunning(false);
        setDone(true);
      } else {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, slowMo, height]);

  // ── Canvas resize observer ────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        canvas.width = e.contentRect.width;
        canvas.height = CANVAS_HEIGHT;
      }
    });
    ro.observe(canvas.parentElement ?? canvas);
    return () => ro.disconnect();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const activePlanets = PLANETS.filter((p) => selected.includes(p.id));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        background: "rgba(4,10,32,0.92)",
        border: "1px solid rgba(6,182,212,0.18)",
        backdropFilter: "blur(20px)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(6,182,212,0.06)",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
        style={{ borderBottom: "1px solid rgba(6,182,212,0.1)" }}
      >
        <div>
          <h2 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
            <span>🪐</span> Gravity Drop Comparison
          </h2>
          <p className="text-cyan-400/50 text-xs mt-0.5">y(t) = ½·g·t² — free fall from H metres</p>
        </div>
        <div className="flex items-center gap-2">
          <SlimBadge>{selected.length} planets</SlimBadge>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Planet selector ──────────────────────────────────────────── */}
        <div>
          <Label>Select planets (2–4)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PLANETS.map((p) => {
              const active = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlanet(p.id)}
                  disabled={running}
                  style={{
                    background: active ? `${p.color}22` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? p.color + "88" : "rgba(255,255,255,0.1)"}`,
                    color: active ? p.color : "rgba(255,255,255,0.45)",
                    boxShadow: active ? `0 0 10px ${p.color}33` : "none",
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Sliders ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <SliderField
            label={`Drop Height: ${height} m`}
            min={50} max={500} step={10}
            value={height}
            onChange={setHeight}
            disabled={running}
            accent="#22d3ee"
          />
          <SliderField
            label={`Object Mass: ${mass} kg`}
            min={1} max={100} step={1}
            value={mass}
            onChange={setMass}
            disabled={running}
            accent="#a78bfa"
          />
        </div>

        {/* ── Controls row ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            onClick={drop}
            disabled={running || selected.length < 2}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: running ? "rgba(6,182,212,0.1)" : "linear-gradient(135deg,#06b6d4,#3b82f6)",
              color: "#fff",
              boxShadow: running ? "none" : "0 0 24px rgba(6,182,212,0.4)",
              border: "1px solid rgba(6,182,212,0.3)",
            }}
          >
            {running ? "⏳ Dropping…" : "🚀 Drop!"}
          </motion.button>

          <button
            onClick={reset}
            disabled={running}
            className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            ↺ Reset
          </button>

          {/* Slow-mo toggle */}
          <button
            onClick={() => setSlowMo((s) => !s)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: slowMo ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${slowMo ? "rgba(251,191,36,0.4)" : "rgba(255,255,255,0.1)"}`,
              color: slowMo ? "#fbbf24" : "rgba(255,255,255,0.45)",
              boxShadow: slowMo ? "0 0 12px rgba(251,191,36,0.25)" : "none",
            }}
          >
            <span style={{ fontSize: 14 }}>🐢</span>
            <span>Slow Mo{slowMo ? " ON" : ""}</span>
          </button>
        </div>

        {/* ── Canvas ────────────────────────────────────────────────────── */}
        <div
          className="w-full relative overflow-hidden rounded-xl"
          style={{
            background: "rgba(2,7,20,0.9)",
            border: "1px solid rgba(6,182,212,0.12)",
            height: CANVAS_HEIGHT,
          }}
        >
          <canvas
            ref={canvasRef}
            height={CANVAS_HEIGHT}
            style={{ display: "block", width: "100%", height: CANVAS_HEIGHT }}
          />

          {/* Idle overlay */}
          <AnimatePresence>
            {!running && !done && (
              <motion.div
                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-cyan-400/30 text-sm font-mono">Select planets and press Drop!</p>
                <div className="flex gap-3 mt-4">
                  {activePlanets.map((p) => (
                    <div
                      key={p.id}
                      className="w-3 h-3 rounded-full"
                      style={{ background: p.color, boxShadow: `0 0 8px ${p.color}88` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Ranking banner ────────────────────────────────────────────── */}
        <AnimatePresence>
          {done && ranking.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl px-5 py-4"
              style={{
                background: "rgba(6,182,212,0.06)",
                border: "1px solid rgba(6,182,212,0.2)",
              }}
            >
              <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">🏁 Final Ranking</p>
              <div className="flex flex-wrap gap-3">
                {ranking.map((r, i) => {
                  const medals = ["🥇", "🥈", "🥉"];
                  const medal = medals[i] ?? `${i + 1}th`;
                  return (
                    <div
                      key={r.planet.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{
                        background: `${r.planet.color}14`,
                        border: `1px solid ${r.planet.color}44`,
                        color: r.planet.color,
                      }}
                    >
                      <span>{medal}</span>
                      <span className="font-bold">{r.planet.name}</span>
                      <span style={{ color: "rgba(255,255,255,0.45)" }}>{r.t.toFixed(2)}s</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats table ───────────────────────────────────────────────── */}
        <div>
          <Label>Physics Stats</Label>
          <div
            className="mt-2 rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Table header */}
            <div
              className="grid text-xs font-semibold uppercase tracking-wider px-4 py-2.5"
              style={{
                gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.35)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span>Planet</span>
              <span>g (m/s²)</span>
              <span>Fall Time</span>
              <span>Impact Vel</span>
              <span>Weight (N)</span>
            </div>

            {activePlanets.map((p, i) => {
              const tLand = fallTime(height, p.g);
              const vel = impactVel(height, p.g);
              const weight = mass * p.g;
              const live = liveTimes[p.id] ?? 0;
              const isLanded = done || (running && live >= tLand);
              const dispTime = isLanded ? tLand : live;

              return (
                <motion.div
                  key={p.id}
                  className="grid items-center px-4 py-3 text-xs font-mono"
                  style={{
                    gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr",
                    background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                    borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  }}
                >
                  {/* Planet name with dot */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }}
                    />
                    <span style={{ color: p.color }} className="font-bold">{p.name}</span>
                  </div>

                  {/* g */}
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{p.g.toFixed(3)}</span>

                  {/* Fall time — live */}
                  <span style={{ color: isLanded ? p.color : "rgba(255,255,255,0.55)" }}>
                    {running || done ? `${dispTime.toFixed(2)}s` : `${tLand.toFixed(2)}s`}
                    {isLanded && " ✓"}
                  </span>

                  {/* Impact velocity */}
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{vel.toFixed(1)} m/s</span>

                  {/* Weight */}
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{weight.toFixed(1)} N</span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ── Formula footnote ──────────────────────────────────────────── */}
        <div
          className="rounded-lg px-4 py-3 text-xs font-mono"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          <span className="text-cyan-400/60">Formulae: </span>
          y(t) = ½·g·t² &nbsp;│&nbsp; t_land = √(2H/g) &nbsp;│&nbsp; v_impact = √(2gH) &nbsp;│&nbsp; W = m·g
        </div>
      </div>
    </div>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(6,182,212,0.65)" }}>
      {children}
    </p>
  );
}

function SlimBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{
        background: "rgba(6,182,212,0.1)",
        border: "1px solid rgba(6,182,212,0.25)",
        color: "#22d3ee",
      }}
    >
      {children}
    </span>
  );
}

interface SliderFieldProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  accent: string;
}

function SliderField({ label, min, max, step, value, onChange, disabled, accent }: SliderFieldProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-2 relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
            // Webkit thumb
            WebkitAppearance: "none",
          }}
        />
        <style>{`
          input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px; height: 16px;
            border-radius: 50%;
            background: ${accent};
            box-shadow: 0 0 8px ${accent}88;
            cursor: pointer;
          }
          input[type="range"]::-moz-range-thumb {
            width: 16px; height: 16px;
            border-radius: 50%;
            border: none;
            background: ${accent};
            box-shadow: 0 0 8px ${accent}88;
            cursor: pointer;
          }
        `}</style>
      </div>
    </div>
  );
}
