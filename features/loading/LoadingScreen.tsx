"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LoadingScreenProps {
  onComplete: () => void;
}

const LOADING_MESSAGES = [
  "Initializing star maps...",
  "Loading planetary data...",
  "Preparing COSMOS AI...",
  "Calibrating telescope arrays...",
  "Mapping the cosmos...",
  "Warming up ion thrusters...",
  "Engaging warp drive...",
  "Entering orbit...",
];

// Inline SVG rocket — always renders, no external file needed
function RocketSVG() {
  return (
    <svg
      width="72"
      height="144"
      viewBox="0 0 80 160"
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: "drop-shadow(0 0 18px rgba(100,200,255,0.9))" }}
    >
      <defs>
        <linearGradient id="rb" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c0d8ff" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#7090c0" />
        </linearGradient>
        <linearGradient id="rf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff7a0" />
          <stop offset="40%" stopColor="#ff8800" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <radialGradient id="fw" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a0c8ff" stopOpacity="0.3" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Flame */}
      <ellipse cx="40" cy="138" rx="10" ry="22" fill="url(#rf)" filter="url(#glow)" />
      <ellipse cx="40" cy="130" rx="5" ry="10" fill="#fff7a0" opacity="0.8" />

      {/* Body */}
      <path
        d="M 25 120 L 20 60 Q 40 8 40 8 Q 40 8 60 60 L 55 120 Z"
        fill="url(#rb)"
        stroke="#5080a0"
        strokeWidth="0.8"
      />

      {/* Nose shade */}
      <path d="M 25 60 Q 40 8 55 60 Z" fill="#8ab8e0" opacity="0.6" />

      {/* Window */}
      <circle cx="40" cy="77" r="11" fill="#0d2060" stroke="#50a0d0" strokeWidth="1.5" />
      <circle cx="40" cy="77" r="7" fill="url(#fw)" opacity="0.85" />
      <circle cx="37" cy="74" r="2.5" fill="white" opacity="0.5" />

      {/* Fins */}
      <path d="M 25 120 L 8 142 L 26 128 Z" fill="#3060a0" stroke="#2050a0" strokeWidth="0.5" />
      <path d="M 55 120 L 72 142 L 54 128 Z" fill="#3060a0" stroke="#2050a0" strokeWidth="0.5" />

      {/* Body highlight */}
      <path
        d="M 32 44 Q 36 28 40 22 Q 43 32 40 42 Q 37 44 35 50 Z"
        fill="rgba(255,255,255,0.38)"
      />

      {/* Side stripe */}
      <rect x="33" y="88" width="14" height="2.5" rx="1.2" fill="#22d3ee" opacity="0.7" />
      <rect x="33" y="95" width="14" height="2.5" rx="1.2" fill="#a78bfa" opacity="0.7" />
    </svg>
  );
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [messageIdx, setMessageIdx] = useState(0);
  const [launched, setLaunched] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const progressRef = useRef(0);

  // Canvas star field + nebula
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars: { x: number; y: number; r: number; alpha: number; speed: number }[] = [];
    for (let i = 0; i < 900; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.2,
        alpha: Math.random(),
        speed: Math.random() * 0.01 + 0.004,
      });
    }

    const nebulas = [
      { x: canvas.width * 0.2, y: canvas.height * 0.3, r: 220, color: "rgba(100,50,200,0.07)" },
      { x: canvas.width * 0.8, y: canvas.height * 0.6, r: 260, color: "rgba(50,150,200,0.07)" },
      { x: canvas.width * 0.5, y: canvas.height * 0.1, r: 190, color: "rgba(200,80,100,0.05)" },
      { x: canvas.width * 0.1, y: canvas.height * 0.8, r: 160, color: "rgba(80,200,150,0.05)" },
    ];

    let nebulaOffset = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bg = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width
      );
      bg.addColorStop(0, "#060c20");
      bg.addColorStop(1, "#000005");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nebulaOffset += 0.001;
      nebulas.forEach((n, i) => {
        const nx = n.x + Math.sin(nebulaOffset + i) * 15;
        const ny = n.y + Math.cos(nebulaOffset + i * 0.7) * 10;
        const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
        ctx.fill();
      });

      stars.forEach((s) => {
        s.alpha += s.speed * (Math.random() > 0.5 ? 1 : -1);
        s.alpha = Math.max(0.1, Math.min(1, s.alpha));
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        if (s.r > 1.2) {
          const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
          glow.addColorStop(0, "rgba(180,200,255,0.3)");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Milky way band
      const milky = ctx.createLinearGradient(0, canvas.height * 0.4, canvas.width, canvas.height * 0.6);
      milky.addColorStop(0, "transparent");
      milky.addColorStop(0.3, "rgba(150,120,255,0.04)");
      milky.addColorStop(0.5, "rgba(180,160,255,0.08)");
      milky.addColorStop(0.7, "rgba(150,120,255,0.04)");
      milky.addColorStop(1, "transparent");
      ctx.fillStyle = milky;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Progress loader
  useEffect(() => {
    const interval = setInterval(() => {
      progressRef.current = Math.min(100, progressRef.current + Math.random() * 3 + 1);
      setProgress(Math.floor(progressRef.current));
      setMessageIdx(Math.floor((progressRef.current / 100) * LOADING_MESSAGES.length));

      if (progressRef.current >= 100) {
        clearInterval(interval);
        setLaunched(true);
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(onComplete, 900);
        }, 1600);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {!fadeOut && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.9, ease: "easeInOut" }}
        >
          {/* Star field canvas */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 0 }}
          />

          {/* Centered content block */}
          <motion.div
            className="loading-console relative z-10 flex w-[calc(100%-2rem)] max-w-lg flex-col items-center justify-center gap-5 rounded-[2rem] px-6 py-8 sm:gap-7 sm:px-10 sm:py-10"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.9 }}
          >
            {/* Rocket */}
            <motion.div
              className="relative flex flex-col items-center"
              animate={launched ? { y: "-60vh", scale: 1.12 } : { y: 0 }}
              transition={
                launched
                  ? { duration: 1.4, ease: [0.4, 0, 0.2, 1] }
                  : { type: "spring", stiffness: 50 }
              }
            >
              {/* Exhaust particles */}
              {!launched && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full">
                  {[...Array(14)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: 3 + (i % 4) * 2,
                        height: 3 + (i % 4) * 2,
                        background: `hsl(${18 + i * 6}, 100%, ${55 + i * 3}%)`,
                        left: `${(i % 6) * 9 - 22}px`,
                        filter: "blur(1px)",
                      }}
                      animate={{
                        y: [0, 45 + i * 8],
                        opacity: [0.9, 0],
                        scale: [1, 0.2],
                      }}
                      transition={{
                        duration: 0.38 + i * 0.04,
                        repeat: Infinity,
                        delay: i * 0.03,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="scale-75 sm:scale-90"><RocketSVG /></div>
            </motion.div>

            {/* Logo + progress — stays centered below rocket */}
            <div className="w-full flex flex-col items-center gap-6">
              {/* Logo */}
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-[0.22em] uppercase sm:text-4xl sm:tracking-[0.3em]"
                  style={{
                    background: "linear-gradient(90deg, #22d3ee, #60a5fa, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  COSMOS-5H1
                </h1>
                <p className="text-blue-300/90 text-sm tracking-[0.25em] mt-1 uppercase font-semibold" style={{ textShadow: "0 0 10px rgba(147,197,253,0.35)" }}>
                  COSMOS AI · Offline-capable
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full">
                <div className="flex justify-between text-xs text-blue-300/88 font-medium mb-2">
                  <span className="tracking-wider">
                    {LOADING_MESSAGES[Math.min(messageIdx, LOADING_MESSAGES.length - 1)]}
                  </span>
                  <span className="font-mono text-cyan-400">{progress}%</span>
                </div>
                <div className="h-[3px] bg-white/8 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #22d3ee, #60a5fa, #a78bfa)",
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                {/* Glow blur underneath */}
                <div
                  className="h-[3px] mt-0.5 rounded-full blur-sm opacity-50"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, #22d3ee, #60a5fa, #a78bfa)",
                    transition: "width 0.1s",
                  }}
                />
              </div>

              {/* Status dots */}
              <div className="grid w-full grid-cols-2 gap-x-5 gap-y-2 text-[9px] text-blue-300/85 font-medium sm:flex sm:text-xs">
                {["SYSTEMS", "AI CORE", "3D ENGINE", "KNOWLEDGE BASE"].map((s, i) => (
                  <motion.div
                    key={s}
                    className="flex items-center gap-1.5"
                    animate={{ opacity: progress > i * 25 ? 1 : 0.3 }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={
                        progress > i * 25
                          ? { background: "#22d3ee", boxShadow: "0 0 5px #22d3ee" }
                          : { background: "#1e3a5f" }
                      }
                    />
                    <span className="tracking-widest">{s}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
