"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Physical Constants ───────────────────────────────────────────────────────

const G = 6.674e-11;       // m³ kg⁻¹ s⁻²
const C = 3e8;             // m/s
const M_SUN = 1.989e30;    // kg

// ─── Physics Helpers ──────────────────────────────────────────────────────────

function schwarzschildRadius(massSolar: number): number {
  return (2 * G * massSolar * M_SUN) / (C * C);
}

function photonSphere(rs: number): number {
  return 1.5 * rs;
}

function isco(rs: number): number {
  return 3 * rs;
}

function timeDilation(rs: number, r: number): number {
  // τ/t = sqrt(1 − r_s / r); clamped to r > rs
  const ratio = rs / Math.max(r, rs * 1.001);
  return Math.sqrt(Math.max(0, 1 - ratio));
}

function gravitationalRedshift(rs: number, r: number): number {
  // z = 1/sqrt(1 − r_s/r) − 1
  const ratio = rs / Math.max(r, rs * 1.001);
  return 1 / Math.sqrt(Math.max(1e-9, 1 - ratio)) - 1;
}

function tidalForce(massSolar: number, rs: number, r: number): number {
  // Δa ≈ 2·G·M·Δl / r³  — per metre per kg (Δl = 1 m, m_obj = 1 kg)
  const M = massSolar * M_SUN;
  return (2 * G * M) / Math.pow(Math.max(r, rs * 1.001), 3);
}

// ─── Fun Facts ────────────────────────────────────────────────────────────────

function getFunFacts(massSolar: number): [string, string, string] {
  const rs = schwarzschildRadius(massSolar);
  const rsKm = rs / 1e3;

  if (massSolar <= 5) {
    return [
      `At ${massSolar} M☉ this is a stellar-mass black hole — the endpoint of a massive star's life after a supernova.`,
      `Its Schwarzschild radius is only ${rsKm.toFixed(2)} km — smaller than a city, yet its gravity is inescapable.`,
      `A neutron star of the same mass would be ~20 km wide; collapse it further and you get this black hole.`,
    ];
  }
  if (massSolar <= 30) {
    return [
      `At ${massSolar} M☉ this black hole could be a merger remnant from two neutron stars or lighter black holes.`,
      `GW150914 produced a ~62 M☉ black hole — at ${massSolar} M☉ you're in the same stellar-mass league.`,
      `Its event horizon radius (${rsKm.toFixed(1)} km) is well within a single city — yet tidal forces are immense.`,
    ];
  }
  if (massSolar <= 70) {
    return [
      `At ${massSolar} M☉ you're in binary X-ray source territory — Cygnus X-1 holds ~21 M☉, yours is more massive.`,
      `The Schwarzschild radius is ${rsKm.toFixed(0)} km — tidal forces at the event horizon would shred any human.`,
      `Hawking radiation from a black hole this size would take ~10⁷⁵ years to evaporate. Heat death comes first.`,
    ];
  }
  return [
    `At ${massSolar} M☉ this approaches the upper limit of stellar-mass black holes before intermediate-mass territory.`,
    `Tidal forces at the event horizon (r = ${rsKm.toFixed(0)} km) are still strong enough for spaghettification.`,
    `Such a massive black hole could only form through repeated mergers or accretion in dense stellar clusters.`,
  ];
}

// ─── Region Classification ────────────────────────────────────────────────────

type Region = "safe" | "danger" | "spaghettification" | "horizon";

function classifyRegion(distRs: number): Region {
  if (distRs <= 1.05) return "horizon";
  if (distRs <= 3)    return "spaghettification";
  if (distRs <= 6)    return "danger";
  return "safe";
}

const REGION_CONFIG: Record<Region, { label: string; color: string; bg: string }> = {
  safe:             { label: "Safe Zone",           color: "#4ade80", bg: "rgba(74,222,128,0.15)"  },
  danger:           { label: "Danger Zone",         color: "#fb923c", bg: "rgba(251,146,60,0.15)"  },
  spaghettification:{ label: "Spaghettification",   color: "#f87171", bg: "rgba(248,113,113,0.15)" },
  horizon:          { label: "Event Horizon",       color: "#c084fc", bg: "rgba(192,132,252,0.15)" },
};

// ─── Canvas Drawing ───────────────────────────────────────────────────────────

const CW = 700;
const CH = 480;
const CX = CW / 2;
const CY = CH / 2;

// Map r_s multiples → canvas pixels. r_s = 1 ↔ 15 px; max 100 r_s = 150 px clamped to half-canvas.
const RS_PX = 15; // pixels per Schwarzschild radius unit

function rsToPx(rsMultiple: number): number {
  return rsMultiple * RS_PX;
}

function drawSpacetimeGrid(
  ctx: CanvasRenderingContext2D,
  rs: number,
  time: number
): void {
  const cols = 20;
  const rows = 20;
  const cellW = CW / cols;
  const cellH = CH / rows;

  ctx.save();
  ctx.strokeStyle = "rgba(139,92,246,0.35)";
  ctx.lineWidth = 0.7;

  // Warp factor: how strongly grid points are pulled toward centre
  const warpStrength = rsToPx(1); // 1 r_s in pixels = warp amplitude

  function warpPoint(gx: number, gy: number): [number, number] {
    const dx = gx - CX;
    const dy = gy - CY;
    const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
    // Animated oscillation in warp depth
    const pulse = 1 + 0.04 * Math.sin(time * 0.9);
    // Schwarzschild-inspired warp: displacement ∝ r_s_px / d
    const warp = (warpStrength * pulse) / (1 + d / warpStrength);
    const nx = gx - (dx / d) * warp;
    const ny = gy - (dy / d) * warp;
    return [nx, ny];
  }

  // Horizontal grid lines
  for (let row = 0; row <= rows; row++) {
    const gy = row * cellH;
    ctx.beginPath();
    for (let col = 0; col <= cols; col++) {
      const gx = col * cellW;
      const [wx, wy] = warpPoint(gx, gy);
      col === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  // Vertical grid lines
  for (let col = 0; col <= cols; col++) {
    const gx = col * cellW;
    ctx.beginPath();
    for (let row = 0; row <= rows; row++) {
      const gy = row * cellH;
      const [wx, wy] = warpPoint(gx, gy);
      row === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawBlackHole(ctx: CanvasRenderingContext2D, rsPx: number): void {
  // Black hole body — radial gradient, black centre → dark-purple rim
  const bhRadius = Math.max(rsPx, 12);
  const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, bhRadius * 1.6);
  grad.addColorStop(0,   "#000000");
  grad.addColorStop(0.6, "#0a0010");
  grad.addColorStop(1,   "#2d0050");
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, bhRadius * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();

  // Outer glow
  const glowGrad = ctx.createRadialGradient(CX, CY, bhRadius * 1.6, CX, CY, bhRadius * 2.6);
  glowGrad.addColorStop(0,   "rgba(139,92,246,0.35)");
  glowGrad.addColorStop(1,   "rgba(139,92,246,0)");
  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, bhRadius * 2.6, 0, Math.PI * 2);
  ctx.fillStyle = glowGrad;
  ctx.fill();
  ctx.restore();
}

function drawAccretionDisk(
  ctx: CanvasRenderingContext2D,
  rsPx: number,
  time: number
): void {
  const rx = rsPx * 5.5;
  const ry = rsPx * 1.2;
  const brightness = 0.7 + 0.3 * Math.sin(time * 1.4);
  const alpha = brightness;

  ctx.save();
  ctx.translate(CX, CY);

  // Back half (behind the black hole, drawn first so BH occludes)
  const backGrad = ctx.createLinearGradient(-rx, 0, rx, 0);
  backGrad.addColorStop(0,   `rgba(120,40,0,${0.3 * alpha})`);
  backGrad.addColorStop(0.3, `rgba(220,80,10,${0.55 * alpha})`);
  backGrad.addColorStop(0.5, `rgba(255,160,30,${0.65 * alpha})`);
  backGrad.addColorStop(0.7, `rgba(220,80,10,${0.55 * alpha})`);
  backGrad.addColorStop(1,   `rgba(120,40,0,${0.3 * alpha})`);

  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.fillStyle = backGrad;
  ctx.fill();

  // Front half
  const frontGrad = ctx.createLinearGradient(-rx, 0, rx, 0);
  frontGrad.addColorStop(0,   `rgba(120,40,0,${0.45 * alpha})`);
  frontGrad.addColorStop(0.3, `rgba(240,90,10,${0.8 * alpha})`);
  frontGrad.addColorStop(0.5, `rgba(255,180,50,${0.95 * alpha})`);
  frontGrad.addColorStop(0.7, `rgba(240,90,10,${0.8 * alpha})`);
  frontGrad.addColorStop(1,   `rgba(120,40,0,${0.45 * alpha})`);

  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.fillStyle = frontGrad;
  ctx.fill();

  ctx.restore();
}

function drawPhotonSphere(
  ctx: CanvasRenderingContext2D,
  rsPx: number,
  time: number
): void {
  const r = rsToPx(1.5);
  const pulse = 1 + 0.06 * Math.sin(time * 2.1);

  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, r * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,240,80,0.7)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.shadowColor = "#ffe84d";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Label
  ctx.save();
  ctx.fillStyle = "rgba(255,240,80,0.8)";
  ctx.font = "10px monospace";
  ctx.fillText("r_ph", CX + r * 0.72 + 3, CY - r * 0.72 - 3);
  ctx.restore();
}

function drawEventHorizon(ctx: CanvasRenderingContext2D, _rsPx: number): void {
  const r = rsToPx(1);

  ctx.save();
  ctx.beginPath();
  ctx.arc(CX, CY, Math.max(r, 12), 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(192,132,252,0.9)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(192,132,252,0.85)";
  ctx.font = "10px monospace";
  ctx.fillText("r_s", CX + Math.max(r, 12) + 4, CY - 4);
  ctx.restore();
}

function drawTestObject(
  ctx: CanvasRenderingContext2D,
  distRs: number,
  rsPx: number,
  time: number
): void {
  const objR = rsToPx(distRs);
  // Position on canvas: orbit on the right side, angle animated for orbit
  const angle = time * 0.5;
  const px = CX + objR * Math.cos(angle);
  const py = CY + objR * Math.sin(angle) * 0.3; // flatten for perspective

  const region = classifyRegion(distRs);

  ctx.save();
  if (region === "spaghettification" || region === "horizon") {
    // Spaghettification: elongate vertically with pulsing stretch
    const stretch = 1 + 4 * Math.sin(time * 3) * Math.max(0, (3 - distRs) / 2);
    ctx.translate(px, py);
    ctx.scale(0.4, Math.max(1, stretch));
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 8;
    ctx.fill();
  } else {
    // Stable or danger: plain white dot with glow
    const glowColor = region === "danger" ? "rgba(251,146,60,0.8)" : "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 12;
    ctx.fill();
  }
  ctx.restore();

  // Label
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "10px monospace";
  ctx.fillText(`${distRs.toFixed(1)} r_s`, px + 8, py - 8);
  ctx.restore();
}

function drawLightRays(ctx: CanvasRenderingContext2D, rsPx: number, time: number): void {
  const _bhGlowR = Math.max(rsPx, 12) * 1.6; // retained for future use
  // Animate a subtle shift to suggest dynamic lensing
  const shift = 4 * Math.sin(time * 0.7);

  const rays: Array<{
    start: [number, number];
    cp1:   [number, number];
    cp2:   [number, number];
    end:   [number, number];
  }> = [
    {
      // Top ray: enters from left, bends around top
      start: [0,        CY - 90 + shift],
      cp1:   [CX - 80,  CY - 50 + shift],
      cp2:   [CX + 80,  CY - 90 + shift],
      end:   [CW,       CY - 140 + shift],
    },
    {
      // Middle ray: grazes the photon sphere
      start: [0,        CY - 24 + shift * 0.4],
      cp1:   [CX - 60,  CY - 10 + shift * 0.4],
      cp2:   [CX + 60,  CY - 24 + shift * 0.4],
      end:   [CW,       CY - 60 + shift * 0.4],
    },
    {
      // Bottom ray: enters from left, bends downward
      start: [0,        CY + 70 - shift],
      cp1:   [CX - 80,  CY + 40 - shift],
      cp2:   [CX + 80,  CY + 70 - shift],
      end:   [CW,       CY + 120 - shift],
    },
  ];

  ctx.save();
  rays.forEach((ray) => {
    ctx.beginPath();
    ctx.moveTo(...ray.start);
    ctx.bezierCurveTo(...ray.cp1, ...ray.cp2, ...ray.end);
    const grad = ctx.createLinearGradient(0, 0, CW, 0);
    grad.addColorStop(0,   "rgba(255,240,60,0)");
    grad.addColorStop(0.3, "rgba(255,240,60,0.7)");
    grad.addColorStop(0.7, "rgba(255,240,60,0.7)");
    grad.addColorStop(1,   "rgba(255,240,60,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2;
    ctx.shadowColor = "rgba(255,240,60,0.5)";
    ctx.shadowBlur = 5;
    ctx.stroke();
  });
  ctx.restore();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BlackHoleSim() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timeRef   = useRef<number>(0);

  const [massSolar,  setMassSolar]  = useState<number>(10);
  const [distRs,     setDistRs]     = useState<number>(8);
  const [objectMass, setObjectMass] = useState<number>(80);
  const [factIndex,  setFactIndex]  = useState<number>(0);

  // Derived physics (re-computed on slider change)
  const rs       = schwarzschildRadius(massSolar);
  const rsPh     = photonSphere(rs);
  const rsISCO   = isco(rs);
  const r        = distRs * rs;
  const dilation = timeDilation(rs, r);
  const redshift = gravitationalRedshift(rs, r);
  const tidal    = tidalForce(massSolar, rs, r) * objectMass; // N/m per object
  const region   = classifyRegion(distRs);
  const regionCfg = REGION_CONFIG[region];
  const facts    = getFunFacts(massSolar);

  // Rotate fun facts
  const cycleFact = () => setFactIndex((i) => (i + 1) % 3);

  // Reset fact index when mass changes (deferred to avoid sync setState in effect)
  useEffect(() => {
    const t = setTimeout(() => setFactIndex(0), 0);
    return () => clearTimeout(t);
  }, [massSolar]);

  // Use a ref for the draw function so it can self-reference without circular dependency
  const drawRef = useRef<(timestamp: number) => void>(() => undefined);

  useEffect(() => {
    drawRef.current = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const time = timestamp / 1000;
      timeRef.current = time;

      const rsPx = rsToPx(1);

      ctx.clearRect(0, 0, CW, CH);
      const bgGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(CW, CH) * 0.8);
      bgGrad.addColorStop(0,   "#0c001f");
      bgGrad.addColorStop(0.5, "#050010");
      bgGrad.addColorStop(1,   "#000000");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CW, CH);

      drawSpacetimeGrid(ctx, rs, time);
      drawAccretionDisk(ctx, rsPx, time);
      drawLightRays(ctx, rsPx, time);
      drawPhotonSphere(ctx, rsPx, time);
      drawEventHorizon(ctx, rsPx);
      drawBlackHole(ctx, rsPx);
      drawTestObject(ctx, distRs, rsPx, time);

      rafRef.current = requestAnimationFrame((ts) => drawRef.current(ts));
    };
  }, [distRs, rs]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame((ts) => drawRef.current(ts));
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Formatters ─────────────────────────────────────────────────────────────

  function fmt(val: number, digits = 2): string {
    if (!isFinite(val)) return "∞";
    if (val >= 1e9)  return (val / 1e9).toFixed(digits)  + " Gm";
    if (val >= 1e6)  return (val / 1e6).toFixed(digits)  + " Mm";
    if (val >= 1e3)  return (val / 1e3).toFixed(digits)  + " km";
    return val.toFixed(digits) + " m";
  }

  function fmtTidal(n: number): string {
    if (!isFinite(n)) return "∞ N/m";
    if (n >= 1e12) return (n / 1e12).toFixed(2) + " TN/m";
    if (n >= 1e9)  return (n / 1e9).toFixed(2)  + " GN/m";
    if (n >= 1e6)  return (n / 1e6).toFixed(2)  + " MN/m";
    if (n >= 1e3)  return (n / 1e3).toFixed(2)  + " kN/m";
    return n.toFixed(2) + " N/m";
  }

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-400 via-purple-300 to-orange-400 bg-clip-text text-transparent">
          Black Hole Spacetime Simulator
        </h1>
        <p className="text-sm text-purple-300/70 mt-1">
          Schwarzschild metric · General Relativistic effects · Interactive
        </p>
      </div>

      {/* Main layout */}
      <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">
        {/* Left: controls + canvas */}
        <div className="flex flex-col gap-4">
          {/* Controls */}
          <div
            className="rounded-2xl border border-purple-800/50 p-4 flex flex-wrap gap-6"
            style={{ background: "rgba(20,0,40,0.7)", backdropFilter: "blur(12px)" }}
          >
            {/* Mass */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs text-purple-300 font-mono uppercase tracking-widest">
                Black Hole Mass
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={1} max={100} step={1}
                  value={massSolar}
                  onChange={(e) => setMassSolar(Number(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="text-orange-300 font-mono text-sm w-16 text-right">
                  {massSolar} M☉
                </span>
              </div>
            </div>

            {/* Distance */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs text-purple-300 font-mono uppercase tracking-widest">
                Distance
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={1} max={100} step={0.5}
                  value={distRs}
                  onChange={(e) => setDistRs(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                />
                <span className="text-orange-300 font-mono text-sm w-20 text-right">
                  {distRs.toFixed(1)} r_s
                </span>
              </div>
            </div>

            {/* Object mass */}
            <div className="flex flex-col gap-1 min-w-[160px]">
              <label className="text-xs text-purple-300 font-mono uppercase tracking-widest">
                Object Mass
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range" min={1} max={1000} step={1}
                  value={objectMass}
                  onChange={(e) => setObjectMass(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <span className="text-orange-300 font-mono text-sm w-16 text-right">
                  {objectMass} kg
                </span>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div
            className="rounded-2xl overflow-hidden border border-purple-900/60"
            style={{ boxShadow: "0 0 40px rgba(139,92,246,0.25)" }}
          >
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              style={{ display: "block", maxWidth: "100%" }}
            />
          </div>
        </div>

        {/* Right: stats + fun facts */}
        <div className="flex flex-col gap-4 xl:w-72 w-full">
          {/* Stats panel */}
          <div
            className="rounded-2xl border border-purple-800/50 p-5 flex flex-col gap-4"
            style={{ background: "rgba(20,0,40,0.75)", backdropFilter: "blur(12px)" }}
          >
            <h2 className="text-sm font-mono uppercase tracking-widest text-purple-300">
              Physics Stats
            </h2>

            {/* Region badge */}
            <motion.div
              key={region}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl px-4 py-2 text-center font-bold text-sm font-mono"
              style={{ color: regionCfg.color, background: regionCfg.bg, border: `1px solid ${regionCfg.color}55` }}
            >
              {regionCfg.label}
            </motion.div>

            {/* Stat rows */}
            {[
              { label: "Schwarzschild Radius",   value: fmt(rs)    },
              { label: "Photon Sphere r_ph",      value: fmt(rsPh)  },
              { label: "ISCO r_ISCO",             value: fmt(rsISCO)},
              {
                label: "Time Dilation",
                value: isFinite(dilation) && dilation > 0
                  ? `${(1 / dilation).toFixed(3)}× slower`
                  : "∞× slower",
              },
              {
                label: "Grav. Redshift z",
                value: isFinite(redshift) ? redshift.toFixed(4) : "∞",
              },
              {
                label: `Tidal Force (${objectMass} kg)`,
                value: fmtTidal(tidal),
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center gap-2 text-sm">
                <span className="text-purple-300/80 font-mono">{label}</span>
                <motion.span
                  key={value}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 1 }}
                  className="text-orange-300 font-mono font-semibold text-right"
                >
                  {value}
                </motion.span>
              </div>
            ))}
          </div>

          {/* Fun facts card */}
          <div
            className="rounded-2xl border border-violet-700/50 p-5 flex flex-col gap-3 cursor-pointer"
            style={{ background: "rgba(30,5,55,0.75)", backdropFilter: "blur(12px)" }}
            onClick={cycleFact}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-mono uppercase tracking-widest text-violet-300">
                Did You Know?
              </h2>
              <span className="text-violet-400/60 text-xs font-mono">
                {factIndex + 1} / 3 · tap to cycle
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.p
                key={`${massSolar}-${factIndex}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="text-sm text-purple-100/85 leading-relaxed"
              >
                {facts[factIndex]}
              </motion.p>
            </AnimatePresence>

            {/* Dot indicators */}
            <div className="flex gap-2 mt-1">
              {([0, 1, 2] as const).map((i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setFactIndex(i); }}
                  className="w-2 h-2 rounded-full transition-all duration-200"
                  style={{
                    background: i === factIndex ? "#a78bfa" : "rgba(167,139,250,0.25)",
                    transform: i === factIndex ? "scale(1.3)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Orbital regions legend */}
          <div
            className="rounded-2xl border border-purple-900/40 p-4 flex flex-col gap-2"
            style={{ background: "rgba(15,0,30,0.7)", backdropFilter: "blur(12px)" }}
          >
            <h2 className="text-xs font-mono uppercase tracking-widest text-purple-400 mb-1">
              Orbital Regions
            </h2>
            {(Object.entries(REGION_CONFIG) as [Region, typeof REGION_CONFIG[Region]][]).map(
              ([key, cfg]) => (
                <div key={key} className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: cfg.color }}
                  />
                  <span style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="text-purple-400/50 ml-auto">
                    {key === "safe"              && "> 6 r_s"}
                    {key === "danger"            && "3 – 6 r_s"}
                    {key === "spaghettification" && "1 – 3 r_s"}
                    {key === "horizon"           && "≤ 1 r_s"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
