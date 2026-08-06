"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MorseVisualizer — Canvas-based real-time signal pulse visualization
// Shows moving dot/dash pulses, timing gaps, radio wave propagation
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useEffect, useCallback } from "react";
import { morseToSymbols, wpmToUnitMs } from "@/lib/morse-code";

interface VisualizerProps {
  morse: string;
  wpm: number;
  isPlaying: boolean;
  /** 0–1 progress through the morse sequence */
  progress?: number;
}

interface Pulse {
  x: number;
  width: number;
  type: "dot" | "dash";
  alpha: number;
  lit: boolean;
}

export default function MorseVisualizer({ morse, wpm, isPlaying, progress = 0 }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const scanRef = useRef(0);   // current x scan position

  // Build pulses from morse string
  const buildPulses = useCallback((): Pulse[] => {
    const symbols = morseToSymbols(morse);
    const unit = 18; // px per unit for display
    const pulses: Pulse[] = [];
    let x = 0;

    symbols.forEach((sym) => {
      const w = sym.durationUnits * unit;
      if (sym.type === "dot" || sym.type === "dash") {
        pulses.push({ x, width: w, type: sym.type, alpha: 1, lit: false });
      }
      x += w;
    });
    return pulses;
  }, [morse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TRACK_H = 24;
    const WAVE_H = 48;
    const CANVAS_H = TRACK_H + WAVE_H + 20;
    const dpr = window.devicePixelRatio || 1;
    let width = canvas.offsetWidth;
    canvas.width = width * dpr;
    canvas.height = CANVAS_H * dpr;
    ctx.scale(dpr, dpr);

    const pulses = buildPulses();
    const totalW = pulses.length > 0
      ? pulses[pulses.length - 1].x + pulses[pulses.length - 1].width + 40
      : width;
    const scrollMax = Math.max(0, totalW - width);
    let scrollX = 0;

    let rafId: number;
    let tick = 0;

    function draw() {
      if (!canvas || !ctx) return;
      width = canvas.offsetWidth;

      ctx.clearRect(0, 0, width, CANVAS_H);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      bg.addColorStop(0, "rgba(5,15,40,0.95)");
      bg.addColorStop(1, "rgba(2,7,20,0.98)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, CANVAS_H);

      // Grid lines
      ctx.strokeStyle = "rgba(147,197,253,0.06)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < width; gx += 18) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, CANVAS_H);
        ctx.stroke();
      }

      // Scan position advance when playing
      if (isPlaying) {
        scanRef.current += 0.8;
        if (scanRef.current > totalW) scanRef.current = 0;
        scrollX = Math.min(scrollMax, Math.max(0, scanRef.current - width * 0.4));
      }

      // ── Draw signal track ─────────────────────────────────────────────────
      const trackY = 8;

      // Baseline
      ctx.strokeStyle = "rgba(147,197,253,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, trackY + TRACK_H / 2);
      ctx.lineTo(width, trackY + TRACK_H / 2);
      ctx.stroke();

      // Pulses
      pulses.forEach((pulse) => {
        const px = pulse.x - scrollX;
        if (px + pulse.width < 0 || px > width) return;

        const isActive = isPlaying && Math.abs(px + pulse.width / 2 - scanRef.current + scrollX) < 20;

        // Glow
        if (isActive) {
          const glow = ctx.createRadialGradient(px + pulse.width / 2, trackY + TRACK_H / 2, 0, px + pulse.width / 2, trackY + TRACK_H / 2, 30);
          glow.addColorStop(0, "rgba(147,197,253,0.6)");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.fillRect(px - 20, trackY - 8, pulse.width + 40, TRACK_H + 16);
        }

        // Pulse bar
        const alpha = isActive ? 0.95 : 0.45;
        const color = pulse.type === "dash" ? `rgba(167,139,250,${alpha})` : `rgba(147,197,253,${alpha})`;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(px + 1, trackY + 2, pulse.width - 2, TRACK_H - 4, 3);
        ctx.fill();

        // Top shine
        ctx.fillStyle = `rgba(255,255,255,${isActive ? 0.3 : 0.08})`;
        ctx.beginPath();
        ctx.roundRect(px + 2, trackY + 2, pulse.width - 4, 4, 2);
        ctx.fill();
      });

      // Scan cursor
      if (isPlaying) {
        const cursorX = scanRef.current - scrollX;
        if (cursorX >= 0 && cursorX <= width) {
          ctx.strokeStyle = "rgba(52,211,153,0.8)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cursorX, trackY - 4);
          ctx.lineTo(cursorX, trackY + TRACK_H + 4);
          ctx.stroke();

          // Cursor glow
          const cGlow = ctx.createLinearGradient(cursorX - 12, 0, cursorX + 12, 0);
          cGlow.addColorStop(0, "transparent");
          cGlow.addColorStop(0.5, "rgba(52,211,153,0.15)");
          cGlow.addColorStop(1, "transparent");
          ctx.fillStyle = cGlow;
          ctx.fillRect(cursorX - 12, trackY, 24, TRACK_H);
        }
      }

      // ── Waveform visualizer ───────────────────────────────────────────────
      const waveY = trackY + TRACK_H + 12;
      const waveAmplitude = WAVE_H / 2 - 4;
      const waveCenterY = waveY + WAVE_H / 2;

      ctx.beginPath();
      ctx.moveTo(0, waveCenterY);

      for (let wx = 0; wx < width; wx += 2) {
        const worldX = wx + scrollX;
        let inPulse = false;
        for (const p of pulses) {
          if (worldX >= p.x && worldX <= p.x + p.width) { inPulse = true; break; }
        }

        let y: number;
        if (inPulse && isPlaying) {
          const freq = 0.12;
          y = waveCenterY + waveAmplitude * Math.sin((worldX + tick * 4) * freq);
        } else if (inPulse) {
          const freq = 0.08;
          y = waveCenterY + waveAmplitude * 0.6 * Math.sin(worldX * freq);
        } else {
          y = waveCenterY + 1.5 * Math.sin(worldX * 0.04 + tick * 0.05);
        }
        if (wx === 0) ctx.moveTo(wx, y);
        else ctx.lineTo(wx, y);
      }

      ctx.strokeStyle = isPlaying ? "rgba(52,211,153,0.6)" : "rgba(147,197,253,0.25)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      tick++;
      rafId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [morse, wpm, isPlaying, buildPulses]);

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{ border: "1px solid rgba(147,197,253,0.15)", background: "rgba(2,7,20,0.8)" }}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: "rgba(147,197,253,0.08)" }}>
        <span className="w-2 h-2 rounded-full" style={{ background: isPlaying ? "#34d399" : "#93c5fd", boxShadow: isPlaying ? "0 0 8px #34d399" : "none" }} />
        <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: "rgba(147,197,253,0.6)" }}>
          Signal Monitor · {wpm} WPM · 600 Hz CW
        </span>
        <span className="ml-auto text-[10px] font-mono" style={{ color: isPlaying ? "#34d399" : "rgba(147,197,253,0.4)" }}>
          {isPlaying ? "TX ▶" : "STANDBY"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "92px", display: "block" }}
      />
    </div>
  );
}
