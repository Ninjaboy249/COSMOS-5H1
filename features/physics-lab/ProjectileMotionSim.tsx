"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SimParams {
  angle: number;       // degrees
  speed: number;       // m/s
  gravity: number;     // m/s²
  mass: number;        // kg
}

interface SimFrame {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  ke: number;
  pe: number;
  total: number;
}

type SimState = "idle" | "running" | "paused" | "done";

// ── Constants ──────────────────────────────────────────────────────────────────

const CANVAS_W = 700;
const CANVAS_H = 400;
const PAD_L = 52;
const PAD_R = 20;
const PAD_T = 20;
const PAD_B = 40;
const PLOT_W = CANVAS_W - PAD_L - PAD_R;
const PLOT_H = CANVAS_H - PAD_T - PAD_B;

const STAR_COUNT = 120;
const CHART_W = 200;
const CHART_H = 80;

// ── Physics helpers ────────────────────────────────────────────────────────────

function deg2rad(d: number) { return (d * Math.PI) / 180; }

function computeTrajectory(p: SimParams): SimFrame[] {
  const { angle, speed, gravity, mass } = p;
  const rad = deg2rad(angle);
  const vx = speed * Math.cos(rad);
  const vy0 = speed * Math.sin(rad);
  const T = (2 * vy0) / gravity;
  const steps = 600;
  const dt = T / steps;
  const frames: SimFrame[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const x = vx * t;
    const y = vy0 * t - 0.5 * gravity * t * t;
    const vy = vy0 - gravity * t;
    const spd = Math.sqrt(vx * vx + vy * vy);
    const ke = 0.5 * mass * spd * spd;
    const pe = mass * gravity * Math.max(y, 0);
    frames.push({ t, x, y: Math.max(y, 0), vx, vy, speed: spd, ke, pe, total: ke + pe });
  }
  return frames;
}

function deriveSummary(frames: SimFrame[], p: SimParams) {
  const rad = deg2rad(p.angle);
  const vy0 = p.speed * Math.sin(rad);
  const maxH = (vy0 * vy0) / (2 * p.gravity);
  const range = (p.speed * p.speed * Math.sin(2 * rad)) / p.gravity;
  const flightT = (2 * vy0) / p.gravity;
  return { maxH, range, flightT };
}

// ── Star field (generated once per canvas size) ────────────────────────────────

function makeStars(): { x: number; y: number; r: number; a: number }[] {
  const rng = (n: number) => Math.abs(Math.sin(n * 9301 + 49297) * 233280) % 1;
  return Array.from({ length: STAR_COUNT }, (_, i) => ({
    x: rng(i * 3) * CANVAS_W,
    y: rng(i * 3 + 1) * CANVAS_H,
    r: rng(i * 3 + 2) * 1.4 + 0.3,
    a: rng(i * 5) * 0.6 + 0.2,
  }));
}
const STARS = makeStars();

// ── Canvas drawing helpers ─────────────────────────────────────────────────────

function toCanvas(x: number, y: number, maxX: number, maxY: number) {
  return {
    cx: PAD_L + (x / maxX) * PLOT_W,
    cy: PAD_T + PLOT_H - (y / maxY) * PLOT_H,
  };
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  dx: number, dy: number,
  color: string,
  scale = 1,
) {
  const len = Math.sqrt(dx * dx + dy * dy) * scale;
  if (len < 2) return;
  const angle = Math.atan2(-dy, dx);
  const ex = x + Math.cos(angle) * len;
  const ey = y - Math.sin(angle) * len;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  // arrowhead
  const headLen = 8;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - headLen * Math.cos(angle - Math.PI / 7),
    ey + headLen * Math.sin(angle - Math.PI / 7),
  );
  ctx.lineTo(
    ex - headLen * Math.cos(angle + Math.PI / 7),
    ey + headLen * Math.sin(angle + Math.PI / 7),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  frames: SimFrame[],
  frameIdx: number,
  maxX: number,
  maxY: number,
  simState: SimState,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, "#010510");
  bg.addColorStop(1, "#020714");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars
  STARS.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.a})`;
    ctx.fill();
  });

  // Grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  const gridCols = 8;
  const gridRows = 5;
  for (let i = 0; i <= gridCols; i++) {
    const x = PAD_L + (i / gridCols) * PLOT_W;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, PAD_T + PLOT_H); ctx.stroke();
  }
  for (let i = 0; i <= gridRows; i++) {
    const y = PAD_T + (i / gridRows) * PLOT_H;
    ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(PAD_L + PLOT_W, y); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, PAD_T + PLOT_H);
  ctx.lineTo(PAD_L + PLOT_W, PAD_T + PLOT_H);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "10px JetBrains Mono, monospace";
  ctx.textAlign = "right";
  for (let i = 0; i <= gridRows; i++) {
    const val = ((gridRows - i) / gridRows) * maxY;
    const y = PAD_T + (i / gridRows) * PLOT_H;
    ctx.fillText(val.toFixed(0), PAD_L - 4, y + 3);
  }
  ctx.textAlign = "center";
  for (let i = 0; i <= gridCols; i++) {
    const val = (i / gridCols) * maxX;
    const x = PAD_L + (i / gridCols) * PLOT_W;
    ctx.fillText(val.toFixed(0), x, PAD_T + PLOT_H + 14);
  }
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.textAlign = "center";
  ctx.fillText("x (m)", PAD_L + PLOT_W / 2, CANVAS_H - 4);
  ctx.save();
  ctx.translate(12, PAD_T + PLOT_H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("y (m)", 0, 0);
  ctx.restore();

  if (frames.length === 0) return;

  // Dotted trajectory preview (always)
  ctx.save();
  ctx.strokeStyle = "rgba(6,182,212,0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  frames.forEach((f, i) => {
    const { cx, cy } = toCanvas(f.x, f.y, maxX, maxY);
    if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  });
  ctx.stroke();
  ctx.restore();

  // Ghost path up to current frame
  if ((simState === "running" || simState === "paused" || simState === "done") && frameIdx > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(6,182,212,0.22)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i <= frameIdx && i < frames.length; i++) {
      const { cx, cy } = toCanvas(frames[i].x, frames[i].y, maxX, maxY);
      if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Landing marker X
  const last = frames[frames.length - 1];
  const { cx: lx, cy: ly } = toCanvas(last.x, 0, maxX, maxY);
  ctx.save();
  ctx.strokeStyle = "#f97316";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#f97316";
  ctx.shadowBlur = 8;
  const xs = 7;
  ctx.beginPath();
  ctx.moveTo(lx - xs, ly - xs); ctx.lineTo(lx + xs, ly + xs);
  ctx.moveTo(lx + xs, ly - xs); ctx.lineTo(lx - xs, ly + xs);
  ctx.stroke();
  ctx.restore();

  // Projectile at current frame
  if (frameIdx >= 0 && frameIdx < frames.length && (simState === "running" || simState === "paused" || simState === "done")) {
    const f = frames[frameIdx];
    const { cx, cy } = toCanvas(f.x, f.y, maxX, maxY);

    // Glow
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    grad.addColorStop(0, "rgba(6,182,212,0.9)");
    grad.addColorStop(0.4, "rgba(6,182,212,0.3)");
    grad.addColorStop(1, "rgba(6,182,212,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.save();
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#22d3ee";
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Velocity vector (green) — scale so max v₀ maps to ~60px
    const vscale = PLOT_W / (last.x > 0 ? last.x : 1) * 3;
    drawArrow(ctx, cx, cy, f.vx, f.vy, "#4ade80", vscale * 0.5);

    // Acceleration vector (red) — constant downward
    const gMag = Math.sqrt(frames[0].vx * frames[0].vx + frames[0].vy * frames[0].vy);
    const ascale = PLOT_H / (maxY > 0 ? maxY : 1) * 3;
    drawArrow(ctx, cx, cy, 0, -gMag, "#f87171", ascale * 0.25);
  }
}

function drawMiniChart(
  ctx: CanvasRenderingContext2D,
  data: { t: number; values: number[] }[],
  colors: string[],
  maxT: number,
  maxVal: number,
  currentIdx: number,
) {
  const W = CHART_W, H = CHART_H;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "rgba(1,5,16,0.85)";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 1;
  [0.25, 0.5, 0.75].forEach(f => {
    const y = H - f * H;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  });

  if (data.length < 2 || currentIdx < 1) return;

  const slice = data.slice(0, currentIdx + 1);
  colors.forEach((color, ci) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    slice.forEach((d, i) => {
      const px = (d.t / maxT) * W;
      const v = Math.max(0, Math.min(d.values[ci], maxVal));
      const py = H - (v / maxVal) * (H - 4) - 2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
  });
}

// ── Slider component ───────────────────────────────────────────────────────────

function Slider({
  label, unit, min, max, step, value, onChange,
}: {
  label: string; unit: string;
  min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center">
        <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontFamily: "JetBrains Mono, monospace" }}>
          {label}
        </span>
        <span style={{ color: "#22d3ee", fontSize: 12, fontFamily: "JetBrains Mono, monospace", minWidth: 64, textAlign: "right" }}>
          {value % 1 === 0 ? value : value.toFixed(3)} {unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) ${((value - min) / (max - min)) * 100}%, rgba(255,255,255,0.12) 100%)`,
          outline: "none",
          accentColor: "#06b6d4",
        }}
      />
    </div>
  );
}

// ── Stat box ───────────────────────────────────────────────────────────────────

function Stat({ label, value, unit, color = "#22d3ee" }: { label: string; value: string | number; unit: string; color?: string }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      padding: "8px 12px",
      minWidth: 100,
      flex: 1,
    }}>
      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "JetBrains Mono, monospace", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ color, fontSize: 15, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
        {typeof value === "number" ? (Math.abs(value) < 1000 ? value.toFixed(2) : value.toFixed(0)) : value}
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProjectileMotionSim() {
  const [params, setParams] = useState<SimParams>({ angle: 45, speed: 50, gravity: 9.807, mass: 1 });
  const [simState, setSimState] = useState<SimState>("idle");
  const [currentFrameState, setCurrentFrameState] = useState<SimFrame | null>(null);
  const [trajSummary, setTrajSummary] = useState(() => deriveSummary(computeTrajectory({ angle: 45, speed: 50, gravity: 9.807, mass: 1 }), { angle: 45, speed: 50, gravity: 9.807, mass: 1 }));

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartHRef = useRef<HTMLCanvasElement>(null);
  const chartSRef = useRef<HTMLCanvasElement>(null);
  const chartERef = useRef<HTMLCanvasElement>(null);

  const framesRef = useRef<SimFrame[]>([]);
  const frameIdxRef = useRef(-1);
  const rafRef = useRef<number>(0);
  const simStateRef = useRef<SimState>("idle");
  const lastTimeRef = useRef<number>(0);

  // Keep simStateRef in sync
  useEffect(() => { simStateRef.current = simState; }, [simState]);

  // Derive trajectory summary purely during render (pure computation, no effect needed)
  const trajSummaryLive = simState === "idle" ? deriveSummary(computeTrajectory(params), params) : trajSummary;

  // Max bounds for scaling the canvas
  const getMaxBounds = useCallback((frames: SimFrame[]) => {
    const maxX = frames.reduce((m, f) => Math.max(m, f.x), 0) * 1.08 || 1;
    const maxY = frames.reduce((m, f) => Math.max(m, f.y), 0) * 1.15 || 1;
    return { maxX, maxY };
  }, []);

  // Main canvas render
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frames = framesRef.current.length > 0 ? framesRef.current : computeTrajectory(params);
    const { maxX, maxY } = getMaxBounds(frames);
    drawScene(ctx, frames, frameIdxRef.current, maxX, maxY, simStateRef.current);
  }, [params, getMaxBounds]);

  // Mini chart render
  const renderCharts = useCallback(() => {
    const frames = framesRef.current;
    const idx = frameIdxRef.current;
    if (frames.length === 0) return;

    const maxT = frames[frames.length - 1].t;
    const maxH = frames.reduce((m, f) => Math.max(m, f.y), 0) * 1.15 || 1;
    const maxSpd = frames[0].speed * 1.2 || 1;
    const maxE = frames[0].total * 1.2 || 1;

    const hCtx = chartHRef.current?.getContext("2d");
    const sCtx = chartSRef.current?.getContext("2d");
    const eCtx = chartERef.current?.getContext("2d");

    const hData = frames.map(f => ({ t: f.t, values: [f.y] }));
    const sData = frames.map(f => ({ t: f.t, values: [f.speed] }));
    const eData = frames.map(f => ({ t: f.t, values: [f.ke, f.pe, f.total] }));

    if (hCtx) drawMiniChart(hCtx, hData, ["#06b6d4"], maxT, maxH, idx);
    if (sCtx) drawMiniChart(sCtx, sData, ["#f97316"], maxT, maxSpd, idx);
    if (eCtx) drawMiniChart(eCtx, eData, ["#4ade80", "#60a5fa", "#ffffff"], maxT, maxE, idx);
  }, []);

  // Animation loop
  const startLoop = useCallback(() => {
    const frames = framesRef.current;
    if (frames.length === 0) return;
    const physicsT = frames[frames.length - 1].t;
    const animDuration = Math.max(1000, Math.min(physicsT * 600, 6000)); // ms

    let startTs: number | null = null;

    const tick = (now: number) => {
      if (simStateRef.current === "paused") {
        lastTimeRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (simStateRef.current !== "running") return;

      if (startTs === null) startTs = now - (frameIdxRef.current >= 0 ? (frameIdxRef.current / (frames.length - 1)) * animDuration : 0);
      const elapsed = now - startTs;
      const progress = Math.min(elapsed / animDuration, 1);
      const idx = Math.min(Math.floor(progress * (frames.length - 1)), frames.length - 1);

      frameIdxRef.current = idx;
      setCurrentFrameState(frames[idx]);
      renderCanvas();
      renderCharts();

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        frameIdxRef.current = frames.length - 1;
        setCurrentFrameState(frames[frames.length - 1]);
        setSimState("done");
        simStateRef.current = "done";
        renderCanvas();
        renderCharts();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [renderCanvas, renderCharts]);

  // Initial + param change canvas render (runs when params change)
  useEffect(() => {
    if (simState === "idle") {
      framesRef.current = computeTrajectory(params);
      frameIdxRef.current = -1;
      renderCanvas();
    }
  }, [params, simState, renderCanvas]);

  // Resize-aware — redraw on mount
  useEffect(() => {
    renderCanvas();
    renderCharts();
  }, [renderCanvas, renderCharts]);

  const handleLaunch = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const frames = computeTrajectory(params);
    framesRef.current = frames;
    frameIdxRef.current = 0;
    setCurrentFrameState(frames[0]);
    setTrajSummary(deriveSummary(frames, params));
    setSimState("running");
    simStateRef.current = "running";
    setTimeout(() => startLoop(), 0);
  }, [params, startLoop]);

  const handleReset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    framesRef.current = computeTrajectory(params);
    frameIdxRef.current = -1;
    setCurrentFrameState(null);
    setSimState("idle");
    simStateRef.current = "idle";
    // clear charts
    [chartHRef, chartSRef, chartERef].forEach(ref => {
      const ctx = ref.current?.getContext("2d");
      if (ctx) { ctx.clearRect(0, 0, CHART_W, CHART_H); ctx.fillStyle = "rgba(1,5,16,0.85)"; ctx.fillRect(0, 0, CHART_W, CHART_H); }
    });
    renderCanvas();
  }, [params, renderCanvas]);

  const handlePauseResume = useCallback(() => {
    if (simState === "running") {
      setSimState("paused");
      simStateRef.current = "paused";
    } else if (simState === "paused") {
      setSimState("running");
      simStateRef.current = "running";
    }
  }, [simState]);

  const setParam = useCallback(<K extends keyof SimParams>(key: K, val: number) => {
    setParams(p => ({ ...p, [key]: val }));
  }, []);

  // Stats to display — use only state values, never ref.current during render
  const displayMaxH = trajSummaryLive.maxH;
  const displayRange = trajSummaryLive.range;
  const displayT = trajSummaryLive.flightT;
  const curVx = currentFrameState?.vx ?? (params.speed * Math.cos(deg2rad(params.angle)));
  const curVy = currentFrameState?.vy ?? (params.speed * Math.sin(deg2rad(params.angle)));
  const curSpd = currentFrameState?.speed ?? params.speed;
  const curKE = currentFrameState?.ke ?? (0.5 * params.mass * params.speed * params.speed);
  const curPE = currentFrameState?.pe ?? 0;
  const curTotal = currentFrameState?.total ?? curKE;

  const glassPanelStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  };

  const btnBase: React.CSSProperties = {
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    padding: "8px 20px",
    border: "1px solid",
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "all 0.15s ease",
  };

  return (
    <div
      className="flex flex-col items-center gap-6 w-full"
      style={{ fontFamily: "JetBrains Mono, monospace", color: "white" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          background: "linear-gradient(90deg, #22d3ee, #f97316)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          Projectile Motion Simulator
        </h2>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          Real-time kinematics · Newtonian mechanics
        </p>
      </motion.div>

      {/* Main layout */}
      <div className="flex flex-col xl:flex-row gap-5 w-full" style={{ maxWidth: 960 }}>

        {/* Controls panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{ ...glassPanelStyle, padding: 20, minWidth: 220, width: "100%", maxWidth: 260 }}
          className="flex flex-col gap-4"
        >
          <div style={{ color: "#22d3ee", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>
            ⚙ Parameters
          </div>
          <Slider label="Launch Angle" unit="°" min={0} max={85} step={1} value={params.angle} onChange={v => setParam("angle", v)} />
          <Slider label="Initial Speed" unit="m/s" min={10} max={200} step={1} value={params.speed} onChange={v => setParam("speed", v)} />
          <Slider label="Gravity" unit="m/s²" min={1} max={25} step={0.001} value={params.gravity} onChange={v => setParam("gravity", v)} />
          <Slider label="Object Mass" unit="kg" min={0.1} max={100} step={0.1} value={params.mass} onChange={v => setParam("mass", v)} />

          {/* Equation reference */}
          <div style={{
            marginTop: 4,
            background: "rgba(6,182,212,0.06)",
            border: "1px solid rgba(6,182,212,0.15)",
            borderRadius: 8,
            padding: "10px 12px",
          }}>
            <div style={{ color: "#22d3ee", fontSize: 10, letterSpacing: "0.08em", marginBottom: 6 }}>EQUATIONS</div>
            {[
              ["x(t)", "v₀·cos θ·t"],
              ["y(t)", "v₀·sin θ·t − ½gt²"],
              ["H", "(v₀·sin θ)²/2g"],
              ["R", "v₀²·sin 2θ/g"],
              ["T", "2·v₀·sin θ/g"],
            ].map(([lhs, rhs]) => (
              <div key={lhs} style={{ display: "flex", gap: 6, fontSize: 10, marginBottom: 3, color: "rgba(255,255,255,0.55)" }}>
                <span style={{ color: "#f97316", minWidth: 34 }}>{lhs}</span>
                <span>= {rhs}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              style={{
                ...btnBase,
                background: simState === "running" || simState === "paused"
                  ? "rgba(6,182,212,0.08)"
                  : "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(6,182,212,0.1))",
                borderColor: "#06b6d4",
                color: "#22d3ee",
                opacity: simState === "running" || simState === "paused" ? 0.45 : 1,
              }}
              disabled={simState === "running" || simState === "paused"}
              onClick={handleLaunch}
            >
              🚀 Launch
            </button>
            <div className="flex gap-2">
              <button
                style={{
                  ...btnBase,
                  flex: 1,
                  background: "rgba(249,115,22,0.1)",
                  borderColor: "#f97316",
                  color: "#f97316",
                  opacity: simState !== "running" && simState !== "paused" ? 0.4 : 1,
                  padding: "8px 10px",
                  fontSize: 12,
                }}
                disabled={simState !== "running" && simState !== "paused"}
                onClick={handlePauseResume}
              >
                {simState === "paused" ? "▶ Resume" : "⏸ Pause"}
              </button>
              <button
                style={{
                  ...btnBase,
                  flex: 1,
                  background: "rgba(255,255,255,0.04)",
                  borderColor: "rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.65)",
                  padding: "8px 10px",
                  fontSize: 12,
                }}
                onClick={handleReset}
              >
                ↺ Reset
              </button>
            </div>
          </div>
        </motion.div>

        {/* Right column: canvas + stats + charts */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">

          {/* Canvas */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            style={{
              ...glassPanelStyle,
              padding: 12,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* State badge */}
            <div style={{
              position: "absolute", top: 18, right: 18, zIndex: 2,
              background: simState === "running" ? "rgba(6,182,212,0.18)" : simState === "paused" ? "rgba(249,115,22,0.18)" : simState === "done" ? "rgba(74,222,128,0.18)" : "rgba(255,255,255,0.07)",
              border: `1px solid ${simState === "running" ? "#06b6d4" : simState === "paused" ? "#f97316" : simState === "done" ? "#4ade80" : "rgba(255,255,255,0.15)"}`,
              borderRadius: 20, padding: "3px 10px",
              fontSize: 10, letterSpacing: "0.1em", color: simState === "running" ? "#22d3ee" : simState === "paused" ? "#f97316" : simState === "done" ? "#4ade80" : "rgba(255,255,255,0.4)",
            }}>
              {simState.toUpperCase()}
            </div>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ borderRadius: 8, width: "100%", maxWidth: CANVAS_W, display: "block" }}
            />
            {/* Vector legend */}
            <div style={{ display: "flex", gap: 16, marginTop: 8, paddingLeft: 4 }}>
              {[["#4ade80", "Velocity (vx, vy)"], ["#f87171", "Acceleration (g)"], ["#06b6d4", "Trajectory"], ["#f97316", "Landing"]].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                  <div style={{ width: 14, height: 2, background: color, borderRadius: 2 }} />
                  {label}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Live Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            style={{ ...glassPanelStyle, padding: "14px 16px" }}
          >
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              📊 Live Statistics
            </div>
            <div className="flex flex-wrap gap-2">
              <Stat label="Max Height" value={displayMaxH} unit="m" color="#22d3ee" />
              <Stat label="Range" value={displayRange} unit="m" color="#22d3ee" />
              <Stat label="Flight Time" value={displayT} unit="s" color="#22d3ee" />
              <Stat label="Current Vx" value={curVx} unit="m/s" color="#4ade80" />
              <Stat label="Current Vy" value={curVy} unit="m/s" color="#4ade80" />
              <Stat label="Speed" value={curSpd} unit="m/s" color="#f97316" />
              <Stat label="KE" value={curKE} unit="J" color="#4ade80" />
              <Stat label="PE" value={curPE} unit="J" color="#60a5fa" />
              <Stat label="Total E" value={curTotal} unit="J" color="rgba(255,255,255,0.85)" />
            </div>
          </motion.div>

          {/* Mini Charts */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.25 }}
            style={{ ...glassPanelStyle, padding: "14px 16px" }}
          >
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              📈 Charts
            </div>
            <div className="flex flex-wrap gap-4">
              {([
                { ref: chartHRef, label: "Height vs Time", color: "#06b6d4" },
                { ref: chartSRef, label: "Speed vs Time", color: "#f97316" },
                { ref: chartERef, label: "Energy vs Time", color: "#4ade80" },
              ] as { ref: React.RefObject<HTMLCanvasElement | null>; label: string; color: string }[]).map(({ ref, label, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
                    <span style={{ color, marginRight: 4 }}>▮</span>{label}
                  </div>
                  <canvas
                    ref={ref}
                    width={CHART_W}
                    height={CHART_H}
                    style={{
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.07)",
                      background: "rgba(1,5,16,0.85)",
                    }}
                  />
                </div>
              ))}
            </div>
            {/* Energy chart legend */}
            <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
              {[["#4ade80", "KE"], ["#60a5fa", "PE"], ["#ffffff", "Total"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                  <div style={{ width: 10, height: 2, background: c }} />{l}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
