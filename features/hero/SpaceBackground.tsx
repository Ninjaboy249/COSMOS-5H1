"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Stars
    const stars = Array.from({ length: 1200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.2,
      alpha: Math.random(),
      speed: Math.random() * 0.008 + 0.002,
      twinkle: Math.random() * Math.PI * 2,
    }));

    // Meteors
    const meteors: {
      x: number; y: number; vx: number; vy: number; life: number; maxLife: number; len: number;
    }[] = [];

    const spawnMeteor = () => {
      const x = Math.random() * canvas.width;
      meteors.push({
        x,
        y: 0,
        vx: 4 + Math.random() * 3,
        vy: 2 + Math.random() * 2,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        len: 80 + Math.random() * 120,
      });
    };

    let meteorTimer = 0;
    let t = 0;

    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // BG gradient
      const bg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height)
      );
      bg.addColorStop(0, "#050a1e");
      bg.addColorStop(0.4, "#020714");
      bg.addColorStop(1, "#000005");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Milky Way
      const milky = ctx.createLinearGradient(0, canvas.height * 0.3, canvas.width, canvas.height * 0.7);
      milky.addColorStop(0, "transparent");
      milky.addColorStop(0.35, `rgba(160,140,255,${0.04 + Math.sin(t) * 0.01})`);
      milky.addColorStop(0.5, `rgba(200,180,255,${0.07 + Math.sin(t * 0.8) * 0.01})`);
      milky.addColorStop(0.65, `rgba(160,140,255,${0.04 + Math.sin(t) * 0.01})`);
      milky.addColorStop(1, "transparent");
      ctx.fillStyle = milky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Nebulae
      const nebulas = [
        { x: 0.15, y: 0.25, r: 0.18, c: [120, 60, 220] },
        { x: 0.85, y: 0.65, r: 0.22, c: [40, 140, 220] },
        { x: 0.55, y: 0.05, r: 0.14, c: [220, 80, 120] },
        { x: 0.08, y: 0.7, r: 0.15, c: [80, 220, 160] },
        { x: 0.95, y: 0.15, r: 0.16, c: [200, 160, 60] },
      ];
      nebulas.forEach((n, i) => {
        const nx = n.x * canvas.width + Math.sin(t * 0.3 + i) * 20;
        const ny = n.y * canvas.height + Math.cos(t * 0.25 + i * 0.7) * 15;
        const nr = n.r * Math.min(canvas.width, canvas.height);
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        grad.addColorStop(0, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.06)`);
        grad.addColorStop(0.5, `rgba(${n.c[0]},${n.c[1]},${n.c[2]},0.03)`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, Math.PI * 2);
        ctx.fill();
      });

      // Twinkling stars
      stars.forEach((s) => {
        s.twinkle += s.speed;
        const a = 0.3 + Math.abs(Math.sin(s.twinkle)) * 0.7;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = s.r > 1.2 ? "#e8f0ff" : "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.3) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          glow.addColorStop(0, "rgba(180,210,255,0.25)");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Meteors / shooting stars
      meteorTimer++;
      if (meteorTimer > 180 + Math.random() * 180) {
        spawnMeteor();
        meteorTimer = 0;
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.life++;
        m.x += m.vx;
        m.y += m.vy;
        const alpha = Math.min(1, 1 - m.life / m.maxLife);
        const grad = ctx.createLinearGradient(
          m.x - m.vx * (m.len / 6), m.y - m.vy * (m.len / 6),
          m.x, m.y
        );
        grad.addColorStop(0, "transparent");
        grad.addColorStop(1, `rgba(180,220,255,${alpha})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x - m.vx * (m.len / 6), m.y - m.vy * (m.len / 6));
        ctx.lineTo(m.x, m.y);
        ctx.stroke();
        if (m.life >= m.maxLife) meteors.splice(i, 1);
      }

      // Aurora at bottom
      const aurora = ctx.createLinearGradient(0, canvas.height * 0.8, 0, canvas.height);
      aurora.addColorStop(0, `rgba(0,200,150,${0.03 + Math.sin(t * 0.4) * 0.015})`);
      aurora.addColorStop(0.5, `rgba(0,150,200,${0.02 + Math.sin(t * 0.3) * 0.01})`);
      aurora.addColorStop(1, "transparent");
      ctx.fillStyle = aurora;
      ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height * 0.25);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
