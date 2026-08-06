"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AsteroidImpactSim — Asteroid impact energy calculator with animated impact
// simulation.  Physics-grounded, fully self-contained, TypeScript strict.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Constants ────────────────────────────────────────────────────────────────

const CANVAS_W = 700;
const CANVAS_H = 400;
const GROUND_Y = CANVAS_H - 80;

// Physics constants
const TNT_J = 4.184e9; // joules per ton of TNT
const STRENGTH_Y = 8.3e6; // Pa — target rock strength
const RHO_TARGET = 2700; // kg/m³ — target density
const NUCLEAR_BOMB_MT = 0.015; // 15 kT per bomb (Hiroshima-scale)

// ── Types ─────────────────────────────────────────────────────────────────────

type DensityKey = "rocky" | "iron" | "icy";
type PlanetKey = "earth" | "mars" | "moon" | "venus";

interface DensityOption {
  key: DensityKey;
  label: string;
  rho: number; // kg/m³
  color: string;
}

interface PlanetOption {
  key: PlanetKey;
  label: string;
  surfaceColor: string;
  skyColor: string;
  landmarkColor: string;
}

interface ImpactResults {
  ke_J: number;
  tnt_tons: number;
  crater_km: number;
  shockwave_km: number;
  thermal_km: number;
  nuclear_bombs: number;
  classification: string;
  classColor: string;
  destroyed: boolean;
}

interface EjectaParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  alpha: number;
}

// ── Static data ───────────────────────────────────────────────────────────────

const DENSITY_OPTIONS: DensityOption[] = [
  { key: "rocky", label: "Rocky",  rho: 2500, color: "#a8856b" },
  { key: "iron",  label: "Iron",   rho: 7900, color: "#8fa9b8" },
  { key: "icy",   label: "Icy",    rho: 900,  color: "#b8dff0" },
];

const PLANET_OPTIONS: PlanetOption[] = [
  { key: "earth", label: "Earth",  surfaceColor: "#2d5a27", skyColor: "#1a3a5c",      landmarkColor: "#1e4d1a" },
  { key: "mars",  label: "Mars",   surfaceColor: "#8b4513", skyColor: "#3d1a00",      landmarkColor: "#6b3410" },
  { key: "moon",  label: "Moon",   surfaceColor: "#5a5a5a", skyColor: "#0a0a0a",      landmarkColor: "#444444" },
  { key: "venus", label: "Venus",  surfaceColor: "#8b7355", skyColor: "#2a1a00",      landmarkColor: "#6b5a3a" },
];

const HISTORICAL = [
  {
    name: "Tunguska 1908",
    diameter: "~50 m",
    energy: "~10 MT TNT",
    desc: "Flattened 2,000 km² of Siberian forest. Air-burst, no crater.",
    color: "#f97316",
  },
  {
    name: "Chicxulub ~66 Mya",
    diameter: "~10 km",
    energy: "~100 000 000 MT TNT",
    desc: "Ended the Cretaceous. Created a 180 km crater, triggered mass extinction.",
    color: "#ef4444",
  },
  {
    name: "Chelyabinsk 2013",
    diameter: "~20 m",
    energy: "~500 kT TNT",
    desc: "Air-burst over Russia; shockwave shattered windows, injured 1 500 people.",
    color: "#eab308",
  },
];

// ── Physics helpers ───────────────────────────────────────────────────────────

function logSlider(value: number, min: number, max: number): number {
  // map 0–100 slider position to log-scale value
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return Math.pow(10, logMin + (value / 100) * (logMax - logMin));
}

function logSliderInverse(value: number, min: number, max: number): number {
  const logMin = Math.log10(min);
  const logMax = Math.log10(max);
  return ((Math.log10(value) - logMin) / (logMax - logMin)) * 100;
}

function computeResults(
  diameter_m: number,
  rho: number,
  velocity_kms: number,
  angle_deg: number,
): ImpactResults {
  const r = diameter_m / 2;
  const mass = rho * (4 / 3) * Math.PI * r * r * r; // kg
  const v = velocity_kms * 1e3; // m/s
  const sinA = Math.sin((angle_deg * Math.PI) / 180);

  // KE adjusted for impact angle
  const ke_J = 0.5 * mass * v * v * sinA * sinA;

  // TNT equivalent (tons)
  const tnt_tons = ke_J / TNT_J;

  // Crater diameter — Melosh scaling (simplified)
  const D_melosh =
    1.56 *
    Math.pow(ke_J / STRENGTH_Y, 0.294) *
    Math.pow(RHO_TARGET / rho, 0.333) *
    1e-3; // → km

  // Empirical backup: D ≈ 0.0133 × d_m^0.78
  const D_empirical = 0.0133 * Math.pow(diameter_m, 0.78) * 1e-3; // km

  // Use geometric mean of both for a rounded estimate
  const crater_km = Math.sqrt(D_melosh * D_empirical);

  const shockwave_km = 14 * (crater_km / 2);
  const thermal_km = 1.5 * shockwave_km;

  const tnt_MT = tnt_tons / 1e6;
  const nuclear_bombs = Math.max(1, Math.round(tnt_MT / NUCLEAR_BOMB_MT));

  let classification: string;
  let classColor: string;
  if (tnt_MT < 0.001) {
    classification = "Harmless Fireball";
    classColor = "#22c55e";
  } else if (tnt_MT < 10) {
    classification = "Local Destruction";
    classColor = "#f97316";
  } else if (tnt_MT < 1e6) {
    classification = "Regional Catastrophe";
    classColor = "#ef4444";
  } else {
    classification = "Mass Extinction Event";
    classColor = "#dc2626";
  }

  const destroyed = diameter_m < 25;

  return {
    ke_J,
    tnt_tons,
    crater_km,
    shockwave_km,
    thermal_km,
    nuclear_bombs,
    classification,
    classColor,
    destroyed,
  };
}

function formatEnergy(j: number): string {
  if (j >= 1e24) return `${(j / 1e24).toFixed(2)} YJ`;
  if (j >= 1e21) return `${(j / 1e21).toFixed(2)} ZJ`;
  if (j >= 1e18) return `${(j / 1e18).toFixed(2)} EJ`;
  if (j >= 1e15) return `${(j / 1e15).toFixed(2)} PJ`;
  if (j >= 1e12) return `${(j / 1e12).toFixed(2)} TJ`;
  if (j >= 1e9) return `${(j / 1e9).toFixed(2)} GJ`;
  return `${j.toExponential(2)} J`;
}

function formatTNT(tons: number): string {
  if (tons >= 1e12) return `${(tons / 1e12).toFixed(2)} Trillion MT`;
  if (tons >= 1e9) return `${(tons / 1e9).toFixed(2)} Billion MT`;
  if (tons >= 1e6) return `${(tons / 1e6).toFixed(2)} MT`;
  if (tons >= 1e3) return `${(tons / 1e3).toFixed(2)} kT`;
  return `${tons.toFixed(2)} T`;
}

function formatBombs(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} million`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${n}`;
}

// ── Canvas drawing helpers ────────────────────────────────────────────────────

function drawPlanetBackground(
  ctx: CanvasRenderingContext2D,
  planet: PlanetOption,
) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, "#000000");
  skyGrad.addColorStop(1, planet.skyColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // Stars (fixed seed via simple deterministic loop)
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (let i = 0; i < 120; i++) {
    const sx = ((i * 137 + 41) % CANVAS_W);
    const sy = ((i * 97 + 17) % (GROUND_Y - 20));
    const sr = i % 5 === 0 ? 1.5 : 0.8;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  groundGrad.addColorStop(0, planet.surfaceColor);
  groundGrad.addColorStop(1, "#000000");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

  // Landmark silhouette (simple skyline / mountains)
  ctx.fillStyle = planet.landmarkColor;
  // Three mountain shapes
  const peaks = [
    { x: 60, h: 70 },
    { x: 160, h: 110 },
    { x: 280, h: 55 },
    { x: 500, h: 90 },
    { x: 620, h: 65 },
  ];
  peaks.forEach(({ x, h }) => {
    ctx.beginPath();
    ctx.moveTo(x - h * 0.8, GROUND_Y);
    ctx.lineTo(x, GROUND_Y - h);
    ctx.lineTo(x + h * 0.8, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  });
}

function makeEjecta(impactX: number, count: number): EjectaParticle[] {
  const particles: EjectaParticle[] = [];
  const colors = ["#ff8c00", "#ffa500", "#ffcc00", "#ff4500", "#ffffff", "#aaaaaa", "#888888"];
  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 60 + Math.random() * 200;
    particles.push({
      x: impactX,
      y: GROUND_Y,
      vx: Math.cos(angle) * speed,
      vy: -(Math.abs(Math.sin(angle)) * speed + 40),
      r: 1.5 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
    });
  }
  return particles;
}

// ── Animation state ───────────────────────────────────────────────────────────

interface AnimState {
  phase: 0 | 1 | 2 | 3 | 4; // 0=idle,1=streak,2=flash,3=crater,4=shockwave
  t: number; // phase-local elapsed time (s)
  globalT: number; // absolute elapsed (s)
  ejecta: EjectaParticle[];
  craterR: number; // px
  shockR: number; // px
  cloudH: number; // px — mushroom cloud height
  cloudW: number; // px
}

const IDLE_STATE: AnimState = {
  phase: 0,
  t: 0,
  globalT: 0,
  ejecta: [],
  craterR: 0,
  shockR: 0,
  cloudH: 0,
  cloudW: 0,
};

// ── Main component ────────────────────────────────────────────────────────────

export default function AsteroidImpactSim() {
  // ── Control state ─────────────────────────────────────────────────────────
  const [diamSlider, setDiamSlider] = useState<number>(
    logSliderInverse(500, 10, 10000),
  );
  const [density, setDensity] = useState<DensityKey>("rocky");
  const [velocity, setVelocity] = useState<number>(20); // km/s
  const [angle, setAngle] = useState<number>(45); // degrees
  const [planet, setPlanet] = useState<PlanetKey>("earth");
  const [results, setResults] = useState<ImpactResults | null>(null);
  const [simRunning, setSimRunning] = useState(false);

  // ── Canvas refs ───────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const animStateRef = useRef<AnimState>({ ...IDLE_STATE });
  const ejectaRef = useRef<EjectaParticle[]>([]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const diameter_m = logSlider(diamSlider, 10, 10000);
  const rho = DENSITY_OPTIONS.find((d) => d.key === density)!.rho;
  const planetData = PLANET_OPTIONS.find((p) => p.key === planet)!;

  const IMPACT_X = CANVAS_W * 0.45;

  // ── Idle scene draw ────────────────────────────────────────────────────────
  const drawIdle = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawPlanetBackground(ctx, planetData);
  }, [planetData]);

  // Re-draw idle scene whenever planet changes (and no sim running)
  useEffect(() => {
    if (!simRunning && animStateRef.current.phase === 0) {
      drawIdle();
    }
  }, [planet, drawIdle, simRunning]);

  // ── Animation loop ─────────────────────────────────────────────────────────
  const runAnimation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();
    const EJECTA_COUNT = 60;

    function tick(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const s = animStateRef.current;
      s.t += dt;
      s.globalT += dt;

      ctx!.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawPlanetBackground(ctx!, planetData);

      const impactX = IMPACT_X;
      const impactY = GROUND_Y;

      // ── Phase transitions ────────────────────────────────────────────────
      if (s.phase === 1 && s.t >= 1.0) {
        s.phase = 2;
        s.t = 0;
      } else if (s.phase === 2 && s.t >= 0.5) {
        s.phase = 3;
        s.t = 0;
        ejectaRef.current = makeEjecta(impactX, EJECTA_COUNT);
      } else if (s.phase === 3 && s.t >= 1.5) {
        s.phase = 4;
        s.t = 0;
      } else if (s.phase === 4 && s.t >= 2.0) {
        // Done
        setSimRunning(false);
        animStateRef.current = { ...IDLE_STATE };
        // Final frame: just show crater
        drawPlanetBackground(ctx!, planetData);
        drawFinalFrame(ctx!, impactX, impactY, s.craterR);
        return;
      }

      // ── Phase 1: Streak ───────────────────────────────────────────────────
      if (s.phase === 1) {
        const prog = s.t / 1.0; // 0→1
        // asteroid travels from top-right toward impact point
        const startX = CANVAS_W - 40;
        const startY = 30;
        const ax = startX + (impactX - startX) * prog;
        const ay = startY + (impactY - startY) * prog;

        // Heat color: white(0) → orange(0.6) → red(1)
        const heatProg = prog;
        let asteroidColor: string;
        if (heatProg < 0.5) {
          const t2 = heatProg * 2;
          const r = Math.round(255);
          const g = Math.round(255 - t2 * (255 - 140));
          asteroidColor = `rgb(${r},${g},0)`;
        } else {
          const t2 = (heatProg - 0.5) * 2;
          const r = 255;
          const g = Math.round(140 - t2 * 140);
          asteroidColor = `rgb(${r},${g},0)`;
        }

        // Trail
        const trailLen = 60;
        for (let i = trailLen; i >= 0; i--) {
          const tp = Math.max(0, prog - (i / trailLen) * 0.35);
          const tx = startX + (impactX - startX) * tp;
          const ty = startY + (impactY - startY) * tp;
          const alpha = (1 - i / trailLen) * 0.6;
          const trailR = 6 * (1 - i / trailLen);
          ctx!.beginPath();
          ctx!.arc(tx, ty, Math.max(0.5, trailR), 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,120,0,${alpha})`;
          ctx!.fill();
        }

        // Glow
        const glow = ctx!.createRadialGradient(ax, ay, 0, ax, ay, 28);
        glow.addColorStop(0, "rgba(255,200,100,0.6)");
        glow.addColorStop(1, "rgba(255,100,0,0)");
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(ax, ay, 28, 0, Math.PI * 2);
        ctx!.fill();

        // Asteroid body
        ctx!.beginPath();
        ctx!.arc(ax, ay, 8, 0, Math.PI * 2);
        ctx!.fillStyle = asteroidColor;
        ctx!.fill();
      }

      // ── Phase 2: Flash explosion ──────────────────────────────────────────
      if (s.phase === 2) {
        const prog = s.t / 0.5;
        const burstR = prog * 120;
        const alpha = 1 - prog;

        // Outer orange ring
        const burst = ctx!.createRadialGradient(
          impactX, impactY, 0,
          impactX, impactY, burstR,
        );
        burst.addColorStop(0, `rgba(255,255,255,${alpha})`);
        burst.addColorStop(0.3, `rgba(255,180,0,${alpha * 0.8})`);
        burst.addColorStop(1, "rgba(255,80,0,0)");
        ctx!.fillStyle = burst;
        ctx!.beginPath();
        ctx!.arc(impactX, impactY, burstR, 0, Math.PI * 2);
        ctx!.fill();

        // Central white flash
        const flash = ctx!.createRadialGradient(
          impactX, impactY, 0,
          impactX, impactY, 50 * (1 - prog),
        );
        flash.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
        flash.addColorStop(1, "rgba(255,255,255,0)");
        ctx!.fillStyle = flash;
        ctx!.beginPath();
        ctx!.arc(impactX, impactY, 50 * (1 - prog), 0, Math.PI * 2);
        ctx!.fill();
      }

      // ── Phase 3: Crater + Ejecta + Mushroom cloud ─────────────────────────
      if (s.phase === 3) {
        const prog = Math.min(s.t / 1.5, 1);

        s.craterR = prog * 55;
        s.cloudH = prog * 130;
        s.cloudW = prog * 70;

        // Crater
        drawCrater(ctx!, impactX, impactY, s.craterR);

        // Ejecta physics update
        ejectaRef.current = ejectaRef.current
          .map((p) => {
            const nx = p.x + p.vx * dt;
            const ny = p.y + p.vy * dt;
            const nvy = p.vy + 200 * dt; // gravity pull-down
            const nalpha = p.alpha - dt * 0.5;
            return { ...p, x: nx, y: ny, vy: nvy, alpha: Math.max(0, nalpha) };
          })
          .filter((p) => p.alpha > 0);

        ejectaRef.current.forEach((p) => {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = p.color.replace(")", `,${p.alpha})`).replace("rgb", "rgba");
          ctx!.fill();
        });

        // Mushroom cloud stem
        const stemGrad = ctx!.createLinearGradient(
          impactX, impactY - s.cloudH,
          impactX, impactY,
        );
        stemGrad.addColorStop(0, "rgba(100,80,60,0.0)");
        stemGrad.addColorStop(1, "rgba(80,60,40,0.7)");
        ctx!.fillStyle = stemGrad;
        ctx!.fillRect(impactX - 12, impactY - s.cloudH, 24, s.cloudH);

        // Mushroom cap
        if (s.cloudW > 5) {
          const capGrad = ctx!.createRadialGradient(
            impactX, impactY - s.cloudH,
            0,
            impactX, impactY - s.cloudH,
            s.cloudW,
          );
          capGrad.addColorStop(0, "rgba(180,140,100,0.85)");
          capGrad.addColorStop(0.6, "rgba(120,90,60,0.6)");
          capGrad.addColorStop(1, "rgba(80,60,40,0)");
          ctx!.fillStyle = capGrad;
          ctx!.beginPath();
          ctx!.ellipse(
            impactX, impactY - s.cloudH,
            s.cloudW, s.cloudW * 0.6,
            0, 0, Math.PI * 2,
          );
          ctx!.fill();
        }
      }

      // ── Phase 4: Shockwave ring + dust settling ───────────────────────────
      if (s.phase === 4) {
        const prog = s.t / 2.0;

        // Keep crater and cloud visible but fading
        drawCrater(ctx!, impactX, impactY, s.craterR);

        // Residual ejecta
        ejectaRef.current = ejectaRef.current.map((p) => ({
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          vy: p.vy + 200 * dt,
          alpha: Math.max(0, p.alpha - dt * 0.8),
        }));
        ejectaRef.current.forEach((p) => {
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx!.fillStyle = p.color.replace(")", `,${p.alpha})`).replace("rgb", "rgba");
          ctx!.fill();
        });

        // Fading cloud
        const cloudAlpha = Math.max(0, 1 - prog * 0.6);
        const stemGrad = ctx!.createLinearGradient(
          impactX, impactY - s.cloudH,
          impactX, impactY,
        );
        stemGrad.addColorStop(0, `rgba(100,80,60,0)`);
        stemGrad.addColorStop(1, `rgba(80,60,40,${cloudAlpha * 0.7})`);
        ctx!.fillStyle = stemGrad;
        ctx!.fillRect(impactX - 12, impactY - s.cloudH, 24, s.cloudH);

        const capGrad = ctx!.createRadialGradient(
          impactX, impactY - s.cloudH, 0,
          impactX, impactY - s.cloudH, s.cloudW,
        );
        capGrad.addColorStop(0, `rgba(180,140,100,${cloudAlpha * 0.85})`);
        capGrad.addColorStop(1, "rgba(80,60,40,0)");
        ctx!.fillStyle = capGrad;
        ctx!.beginPath();
        ctx!.ellipse(
          impactX, impactY - s.cloudH,
          s.cloudW, s.cloudW * 0.6,
          0, 0, Math.PI * 2,
        );
        ctx!.fill();

        // Shockwave ring
        s.shockR = prog * CANVAS_W * 0.85;
        const shockAlpha = Math.max(0, 0.7 - prog * 0.7);
        ctx!.beginPath();
        ctx!.arc(impactX, impactY, s.shockR, -Math.PI, 0); // upper hemisphere
        ctx!.strokeStyle = `rgba(255,255,255,${shockAlpha})`;
        ctx!.lineWidth = 3 + (1 - prog) * 6;
        ctx!.stroke();

        // Second inner ring (thermal)
        const shockR2 = prog * CANVAS_W * 0.55;
        ctx!.beginPath();
        ctx!.arc(impactX, impactY, shockR2, -Math.PI, 0);
        ctx!.strokeStyle = `rgba(255,180,0,${shockAlpha * 0.5})`;
        ctx!.lineWidth = 2;
        ctx!.stroke();

        // Dust cloud spreading along ground
        const dustW = prog * CANVAS_W;
        const dustGrad = ctx!.createRadialGradient(
          impactX, GROUND_Y, 0,
          impactX, GROUND_Y, dustW / 2,
        );
        dustGrad.addColorStop(0, `rgba(180,140,100,${(1 - prog) * 0.4})`);
        dustGrad.addColorStop(1, "rgba(180,140,100,0)");
        ctx!.fillStyle = dustGrad;
        ctx!.fillRect(impactX - dustW / 2, GROUND_Y - 20, dustW, 40);
      }

      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
  }, [planetData, IMPACT_X]);

  // ── Crater draw helper ─────────────────────────────────────────────────────
  function drawCrater(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
  ) {
    if (r < 1) return;
    // Crater bowl
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, "rgba(0,0,0,0.9)");
    grad.addColorStop(0.7, "rgba(40,20,10,0.7)");
    grad.addColorStop(1, "rgba(80,40,20,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim highlight
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,130,80,0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawFinalFrame(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
  ) {
    drawCrater(ctx, cx, cy, r);
  }

  // ── Simulate click ─────────────────────────────────────────────────────────
  const handleSimulate = useCallback(() => {
    if (simRunning) return;

    const res = computeResults(diameter_m, rho, velocity, angle);
    setResults(res);
    setSimRunning(true);

    // Cancel any previous animation
    cancelAnimationFrame(animRef.current);

    // Reset anim state and start phase 1
    animStateRef.current = { ...IDLE_STATE, phase: 1, t: 0 };
    ejectaRef.current = [];

    // Small timeout to let state flush before starting rAF
    setTimeout(runAnimation, 16);
  }, [simRunning, diameter_m, rho, velocity, angle, runAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  // Draw idle scene on mount
  useEffect(() => {
    drawIdle();
  }, [drawIdle]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const diamLabel =
    diameter_m >= 1000
      ? `${(diameter_m / 1000).toFixed(2)} km`
      : `${Math.round(diameter_m)} m`;

  const densityOption = DENSITY_OPTIONS.find((d) => d.key === density)!;

  return (
    <div className="min-h-screen bg-[#06080f] text-white font-sans select-none">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-4 border-b border-white/10">
        <h1 className="text-2xl font-bold tracking-tight text-orange-400">
          ☄️ Asteroid Impact Simulator
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Physics-based kinetic energy calculator with animated impact
          visualization
        </p>
      </div>

      <div className="px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5">
          {/* Canvas */}
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="w-full block"
              style={{ background: "#000" }}
            />
            {!simRunning && animStateRef.current.phase === 0 && (
              <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
                <span className="text-white/30 text-sm italic">
                  Configure parameters and press &ldquo;Simulate Impact!&rdquo;
                </span>
              </div>
            )}
          </div>

          {/* Simulate button */}
          <motion.button
            onClick={handleSimulate}
            disabled={simRunning}
            whileTap={{ scale: 0.96 }}
            className={`w-full py-3 rounded-xl font-bold text-lg tracking-wide transition-all
              ${simRunning
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/40 cursor-pointer"
              }`}
          >
            {simRunning ? "⚡ Impact in progress…" : "💥 Simulate Impact!"}
          </motion.button>

          {/* Results panel */}
          <AnimatePresence>
            {results && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.4 }}
                className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-4"
              >
                {/* Classification badge */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="px-4 py-1.5 rounded-full text-sm font-bold tracking-wide"
                    style={{
                      background: results.classColor + "33",
                      border: `1px solid ${results.classColor}66`,
                      color: results.classColor,
                    }}
                  >
                    {results.classification}
                  </span>
                  <span className="text-white/50 text-sm">
                    Object{" "}
                    <span
                      className={
                        results.destroyed ? "text-green-400" : "text-red-400"
                      }
                    >
                      {results.destroyed ? "DESTROYED" : "SURVIVES"}
                    </span>{" "}
                    in atmosphere
                  </span>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <ResultCard
                    label="Impact Energy"
                    value={formatEnergy(results.ke_J)}
                    sub={formatTNT(results.tnt_tons) + " TNT"}
                    accent="#f97316"
                  />
                  <ResultCard
                    label="Crater Diameter"
                    value={`${results.crater_km.toFixed(2)} km`}
                    sub={`radius ${(results.crater_km / 2).toFixed(2)} km`}
                    accent="#ef4444"
                  />
                  <ResultCard
                    label="Shockwave Radius"
                    value={`${results.shockwave_km.toFixed(1)} km`}
                    sub={`thermal ${results.thermal_km.toFixed(1)} km`}
                    accent="#eab308"
                  />
                  <ResultCard
                    label="Nuclear Equivalents"
                    value={formatBombs(results.nuclear_bombs)}
                    sub="Hiroshima-scale bombs"
                    accent="#a78bfa"
                  />
                  <ResultCard
                    label="KE (Joules)"
                    value={results.ke_J.toExponential(3)}
                    sub=""
                    accent="#60a5fa"
                  />
                  <ResultCard
                    label="TNT Equivalent"
                    value={formatTNT(results.tnt_tons)}
                    sub=""
                    accent="#34d399"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Historical comparisons */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
              Historical Impacts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {HISTORICAL.map((h) => (
                <div
                  key={h.name}
                  className="rounded-lg border bg-white/5 backdrop-blur-sm p-3 space-y-1"
                  style={{ borderColor: h.color + "55" }}
                >
                  <div
                    className="text-xs font-bold"
                    style={{ color: h.color }}
                  >
                    {h.name}
                  </div>
                  <div className="text-white/80 text-sm font-medium">
                    {h.diameter}
                  </div>
                  <div
                    className="text-xs font-mono"
                    style={{ color: h.color }}
                  >
                    {h.energy}
                  </div>
                  <div className="text-white/45 text-xs leading-snug">
                    {h.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: Controls ──────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-5 space-y-6">
            {/* Asteroid diameter */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-semibold text-white/80">
                  Asteroid Diameter
                </label>
                <span className="text-orange-400 font-mono text-sm font-bold">
                  {diamLabel}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={diamSlider}
                onChange={(e) => setDiamSlider(Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-white/30">
                <span>10 m</span>
                <span>1 km</span>
                <span>10 km</span>
              </div>
            </div>

            {/* Density selector */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">
                Composition
              </label>
              <div className="flex gap-2">
                {DENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setDensity(opt.key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer
                      ${density === opt.key
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    style={
                      density === opt.key
                        ? { borderColor: opt.color, color: opt.color }
                        : {}
                    }
                  >
                    {opt.label}
                    <div className="text-[10px] mt-0.5 opacity-70">
                      {opt.rho.toLocaleString()} kg/m³
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Impact velocity */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-semibold text-white/80">
                  Impact Velocity
                </label>
                <span className="text-yellow-400 font-mono text-sm font-bold">
                  {velocity} km/s
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={72}
                step={1}
                value={velocity}
                onChange={(e) => setVelocity(Number(e.target.value))}
                className="w-full accent-yellow-400"
              />
              <div className="flex justify-between text-[10px] text-white/30">
                <span>10 km/s</span>
                <span>~20 typical</span>
                <span>72 km/s</span>
              </div>
            </div>

            {/* Impact angle */}
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <label className="text-sm font-semibold text-white/80">
                  Impact Angle
                </label>
                <span className="text-red-400 font-mono text-sm font-bold">
                  {angle}°
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={90}
                step={1}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-[10px] text-white/30">
                <span>15° (grazing)</span>
                <span>45°</span>
                <span>90° (vertical)</span>
              </div>
            </div>

            {/* Planet target */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-white/80">
                Target Planet
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PLANET_OPTIONS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPlanet(p.key)}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer
                      ${planet === p.key
                        ? "border-white/40 bg-white/15 text-white"
                        : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full mx-auto mb-1"
                      style={{ background: p.surfaceColor }}
                    />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live preview physics */}
          <LivePreview
            diameter_m={diameter_m}
            rho={rho}
            velocity={velocity}
            angle={angle}
            densityColor={densityOption.color}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ResultCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-lg p-3 border bg-black/30"
      style={{ borderColor: accent + "44" }}
    >
      <div className="text-[11px] text-white/50 mb-1">{label}</div>
      <div className="font-mono font-bold text-sm" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-white/40 mt-0.5">{sub}</div>}
    </div>
  );
}

function LivePreview({
  diameter_m,
  rho,
  velocity,
  angle,
  densityColor,
}: {
  diameter_m: number;
  rho: number;
  velocity: number;
  angle: number;
  densityColor: string;
}) {
  const res = computeResults(diameter_m, rho, velocity, angle);
  const tnt_MT = res.tnt_tons / 1e6;

  // Danger bar 0-1 (log scale 0→10^18 tons)
  const dangerLog = Math.min(
    1,
    (Math.log10(Math.max(1, res.tnt_tons)) / 18),
  );
  const dangerColor =
    dangerLog < 0.3 ? "#22c55e" : dangerLog < 0.6 ? "#f97316" : "#ef4444";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 space-y-3">
      <div className="text-xs font-semibold text-white/60 uppercase tracking-widest">
        Live Estimate
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-white/60">Energy</span>
          <span className="font-mono text-white/90">
            {formatEnergy(res.ke_J)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/60">TNT equiv.</span>
          <span className="font-mono text-white/90">
            {formatTNT(res.tnt_tons)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/60">Crater</span>
          <span className="font-mono text-white/90">
            {res.crater_km < 0.1
              ? `${(res.crater_km * 1000).toFixed(0)} m`
              : `${res.crater_km.toFixed(2)} km`}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-white/60">Category</span>
          <span
            className="font-bold text-xs"
            style={{ color: res.classColor }}
          >
            {res.classification}
          </span>
        </div>
      </div>

      {/* Danger bar */}
      <div className="space-y-1">
        <div className="text-[10px] text-white/40 flex justify-between">
          <span>Danger Level</span>
          <span>{(dangerLog * 100).toFixed(0)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: dangerColor }}
            animate={{ width: `${dangerLog * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Asteroid size visualizer */}
      <div className="flex items-center gap-3 pt-1">
        <div className="text-[10px] text-white/40 w-16">vs. human</div>
        <div className="relative flex items-end gap-2">
          {/* Human silhouette ~1.8m */}
          <div
            className="rounded-sm"
            style={{
              width: 4,
              height: 14,
              background: "#60a5fa",
              opacity: 0.7,
            }}
          />
          {/* Asteroid size dot, capped for display */}
          <motion.div
            className="rounded-full"
            style={{ background: densityColor }}
            animate={{
              width: Math.min(60, Math.max(4, diameter_m / 200)),
              height: Math.min(60, Math.max(4, diameter_m / 200)),
            }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="text-[10px] text-white/40">
          {diameter_m >= 1000
            ? `${(diameter_m / 1000).toFixed(1)} km`
            : `${Math.round(diameter_m)} m`}
        </div>
      </div>

      {tnt_MT > 0 && (
        <div className="text-[10px] text-white/35 border-t border-white/10 pt-2">
          ≈ {formatBombs(res.nuclear_bombs)} nuclear bomb
          {res.nuclear_bombs === 1 ? "" : "s"}
        </div>
      )}
    </div>
  );
}
