"use client";
// ─────────────────────────────────────────────────────────────────────────────
// SpaceCommSim — Animated space communication simulator
// Scenarios: distress signal, mission control, repair comms, decode transmission
// Canvas animation: spacecraft, ground station, radio waves, signal strength
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { textToMorse, morseToText, MORSE_TABLE } from "@/lib/morse-code";

interface Scenario {
  id: string;
  title: string;
  icon: string;
  description: string;
  message: string;
  delay: number;   // communication delay in seconds
  color: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "distress",
    title: "Send Distress Signal",
    icon: "🆘",
    description: "Your spacecraft has experienced a critical systems failure. Send SOS to Mission Control.",
    message: "SOS",
    delay: 0,
    color: "#f87171",
  },
  {
    id: "mission_control",
    title: "Contact Mission Control",
    icon: "📡",
    description: "Establish a communication link with Houston. Transmit your mission status.",
    message: "DE COSMOS STATUS OK",
    delay: 2.5,
    color: "#93c5fd",
  },
  {
    id: "repair",
    title: "Repair Communication Array",
    icon: "🔧",
    description: "Primary comms are down. Use backup Morse to report repair progress to ground.",
    message: "ANTENNA REPAIR COMPLETE",
    delay: 8.3,
    color: "#fbbf24",
  },
  {
    id: "decode",
    title: "Decode Incoming Transmission",
    icon: "📥",
    description: "Ground station is sending you a Morse message. Decode it to continue the mission.",
    message: "PROCEED TO MARS ORBIT",
    delay: 4.1,
    color: "#34d399",
  },
  {
    id: "rescue",
    title: "Rescue Mission",
    icon: "🚀",
    description: "A crew needs rescue. Triangulate their distress signal and respond.",
    message: "RESCUE EN ROUTE 73",
    delay: 12.7,
    color: "#a78bfa",
  },
];

interface Wave {
  id: number;
  x: number;
  progress: number;
  fromShip: boolean;
}

export default function SpaceCommSim({ onPlay }: { onPlay?: (morse: string) => void }) {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [transmitting, setTransmitting] = useState(false);
  const [received, setReceived] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);
  const [userDecode, setUserDecode] = useState("");
  const [decodeResult, setDecodeResult] = useState<"correct" | "wrong" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const wavesRef = useRef<Wave[]>([]);
  const waveIdRef = useRef(0);
  const tickRef = useRef(0);

  const startTransmission = useCallback((scenario: Scenario) => {
    setTransmitting(true);
    setReceived(false);
    setSignalStrength(0);
    setDecodeResult(null);
    setUserDecode("");
    wavesRef.current = [];

    // Animate signal strength increasing
    let strength = 0;
    const buildUp = setInterval(() => {
      strength = Math.min(strength + 4, 100);
      setSignalStrength(strength);
      if (strength >= 100) clearInterval(buildUp);
    }, 50);

    // Simulate delay + reception
    setTimeout(() => {
      setReceived(true);
      setTransmitting(false);
      if (onPlay) onPlay(textToMorse(scenario.message));
    }, (scenario.delay + 2) * 1000);
  }, [onPlay]);

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = canvas.offsetWidth;
    let h = 160;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    function drawScene(tick: number) {
      if (!canvas || !ctx) return;
      w = canvas.offsetWidth;
      ctx.clearRect(0, 0, w, h);

      // Space background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#000510");
      grad.addColorStop(1, "#020714");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Stars
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 73 + 11) % w);
        const sy = ((i * 41 + 7) % h);
        const alpha = 0.2 + 0.4 * Math.sin(tick * 0.02 + i);
        ctx.fillStyle = `rgba(200,220,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground station (left)
      const gsX = 60, gsY = h - 35;
      // Antenna mast
      ctx.strokeStyle = "rgba(147,197,253,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gsX, gsY);
      ctx.lineTo(gsX, gsY - 30);
      ctx.stroke();
      // Dish
      ctx.strokeStyle = "rgba(147,197,253,0.9)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(gsX, gsY - 30, 14, Math.PI + 0.2, Math.PI * 2 - 0.2);
      ctx.stroke();
      // Base
      ctx.fillStyle = "rgba(100,130,200,0.5)";
      ctx.fillRect(gsX - 18, gsY, 36, 8);
      ctx.fillStyle = "rgba(147,197,253,0.3)";
      ctx.fillRect(gsX - 6, gsY - 4, 12, 4);

      // Earth surface line
      ctx.fillStyle = "rgba(34,197,94,0.2)";
      ctx.fillRect(0, h - 20, w * 0.35, 20);
      ctx.strokeStyle = "rgba(34,197,94,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 20);
      ctx.lineTo(w * 0.35, h - 20);
      ctx.stroke();

      // Spacecraft (right)
      const shipX = w - 80, shipY = 55;
      // Body
      ctx.fillStyle = "rgba(147,197,253,0.8)";
      ctx.beginPath();
      ctx.roundRect(shipX - 22, shipY - 12, 44, 24, 5);
      ctx.fill();
      // Solar panels
      ctx.fillStyle = "rgba(99,102,241,0.7)";
      ctx.fillRect(shipX - 42, shipY - 6, 16, 12);
      ctx.fillRect(shipX + 26, shipY - 6, 16, 12);
      // Antenna
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - 12);
      ctx.lineTo(shipX, shipY - 22);
      ctx.stroke();
      // Thruster glow
      if (transmitting || received) {
        const tGlow = ctx.createRadialGradient(shipX - 22, shipY, 0, shipX - 22, shipY, 12);
        tGlow.addColorStop(0, "rgba(99,102,241,0.6)");
        tGlow.addColorStop(1, "transparent");
        ctx.fillStyle = tGlow;
        ctx.beginPath();
        ctx.arc(shipX - 22, shipY, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // Radio waves (animated)
      if (transmitting || received) {
        const transmitted = received;
        // Spawn waves every 30 ticks
        if (tick % 30 === 0) {
          wavesRef.current.push({
            id: waveIdRef.current++,
            x: transmitted ? gsX + 20 : shipX - 30,
            progress: 0,
            fromShip: !transmitted,
          });
        }

        wavesRef.current = wavesRef.current
          .map((wave) => ({ ...wave, progress: wave.progress + 0.012 }))
          .filter((w) => w.progress < 1);

        wavesRef.current.forEach((wave) => {
          const startX = wave.fromShip ? shipX - 30 : gsX + 20;
          const endX   = wave.fromShip ? gsX + 20 : shipX - 30;
          const px = startX + (endX - startX) * wave.progress;
          const py = gsY - 30 + (shipY - (gsY - 30)) * wave.progress;

          const alpha = 0.7 * (1 - wave.progress);
          for (let r = 6; r <= 18; r += 6) {
            ctx.strokeStyle = `rgba(147,197,253,${alpha * (1 - r / 24)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Dot on signal
          ctx.fillStyle = `rgba(147,197,253,${alpha})`;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Signal path (dashed line)
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(147,197,253,0.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gsX + 20, gsY - 30);
      ctx.lineTo(shipX - 30, shipY);
      ctx.stroke();
      ctx.setLineDash([]);

      tickRef.current = tick + 1;
    }

    let raf: number;
    let t = 0;
    function loop() {
      drawScene(t++);
      raf = requestAnimationFrame(loop);
    }
    loop();
    return () => cancelAnimationFrame(raf);
  }, [transmitting, received]);

  const handleDecode = () => {
    if (!selectedScenario) return;
    const correct = userDecode.trim().toUpperCase() === selectedScenario.message.toUpperCase();
    setDecodeResult(correct ? "correct" : "wrong");
  };

  return (
    <div className="mc-panel">
      <div className="mc-panel-header">
        <span className="text-xl">🛸</span>
        <h2 className="mc-panel-title">Space Communication Simulator</h2>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Canvas */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(147,197,253,0.18)" }}>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ background: "rgba(5,10,25,0.8)", borderColor: "rgba(147,197,253,0.1)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: transmitting || received ? "#34d399" : "#374151", boxShadow: transmitting || received ? "0 0 8px #34d399" : "none" }} />
            <span className="text-[10px] font-mono" style={{ color: "rgba(147,197,253,0.6)" }}>
              COSMOS DEEP SPACE COMMS · {selectedScenario ? `${selectedScenario.delay}s DELAY` : "SELECT SCENARIO"}
            </span>
            {signalStrength > 0 && (
              <span className="ml-auto text-[10px] font-mono" style={{ color: "#34d399" }}>
                SIG: {"█".repeat(Math.ceil(signalStrength / 20))}{"░".repeat(5 - Math.ceil(signalStrength / 20))} {signalStrength}%
              </span>
            )}
          </div>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "160px", display: "block", background: "#000510" }}
          />
        </div>

        {/* Scenario selector */}
        {!selectedScenario ? (
          <div className="flex flex-col gap-2">
            <p className="mc-label">Select a mission scenario:</p>
            {SCENARIOS.map((scenario) => (
              <motion.button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="text-left rounded-xl p-4 transition-all"
                style={{
                  background: "linear-gradient(135deg, rgba(10,22,51,0.7), rgba(2,7,20,0.6))",
                  border: `1px solid ${scenario.color}33`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{scenario.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{scenario.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(191,219,254,0.65)" }}>{scenario.description}</p>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: scenario.color }}>
                      Delay: {scenario.delay}s · Message: {scenario.message}
                    </p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Scenario header */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: `${selectedScenario.color}10`, border: `1px solid ${selectedScenario.color}33` }}>
              <span className="text-2xl">{selectedScenario.icon}</span>
              <div>
                <p className="text-sm font-bold" style={{ color: selectedScenario.color }}>{selectedScenario.title}</p>
                <p className="text-xs" style={{ color: "rgba(191,219,254,0.65)" }}>{selectedScenario.description}</p>
              </div>
              <button onClick={() => { setSelectedScenario(null); setTransmitting(false); setReceived(false); setSignalStrength(0); wavesRef.current = []; }} className="ml-auto mc-chip">← Change</button>
            </div>

            {/* Message to send */}
            <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(147,197,253,0.12)" }}>
              <p className="mc-label mb-2">Message</p>
              <p className="text-lg font-bold text-white">{selectedScenario.message}</p>
              <p className="text-sm font-mono mt-1" style={{ color: "#93c5fd", letterSpacing: "0.08em" }}>
                {textToMorse(selectedScenario.message)}
              </p>
            </div>

            {/* Communication delay info */}
            <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(147,197,253,0.6)" }}>
              <span>⏱ Round-trip delay:</span>
              <span className="font-bold" style={{ color: "#fbbf24" }}>{selectedScenario.delay}s</span>
              <span>({(selectedScenario.delay * 299792).toLocaleString()} km)</span>
            </div>

            {/* Transmit controls */}
            {!received && (
              <button
                onClick={() => startTransmission(selectedScenario)}
                disabled={transmitting}
                className="mc-btn-primary"
              >
                {transmitting ? "📡 Transmitting…" : "📡 Transmit Signal"}
              </button>
            )}

            {/* Signal strength bar */}
            {(transmitting || received) && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <p className="mc-label">Signal Strength</p>
                  <span className="text-xs font-bold" style={{ color: "#34d399" }}>{signalStrength}%</span>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    animate={{ width: `${signalStrength}%` }}
                    style={{ background: "linear-gradient(90deg, #34d39988, #34d399)", boxShadow: "0 0 8px rgba(52,211,153,0.5)" }}
                  />
                </div>
              </div>
            )}

            {/* Receive + decode (for "decode" scenario type) */}
            <AnimatePresence>
              {received && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3 rounded-xl p-4"
                  style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "#34d399" }}>✓ Signal Received!</p>
                  {selectedScenario.id === "decode" ? (
                    <>
                      <p className="text-xs" style={{ color: "rgba(191,219,254,0.7)" }}>
                        Incoming Morse: <span className="font-mono text-white">{textToMorse(selectedScenario.message)}</span>
                      </p>
                      <div className="flex gap-2">
                        <input
                          className="mc-input flex-1 uppercase font-bold tracking-wider"
                          value={userDecode}
                          onChange={(e) => { setUserDecode(e.target.value); setDecodeResult(null); }}
                          placeholder="Decode the message…"
                        />
                        <button onClick={handleDecode} className="mc-btn-primary text-xs">Decode</button>
                      </div>
                      {decodeResult && (
                        <p className="text-xs font-semibold" style={{ color: decodeResult === "correct" ? "#34d399" : "#f87171" }}>
                          {decodeResult === "correct" ? "✓ Mission successful!" : `✗ Expected: "${selectedScenario.message}"`}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs" style={{ color: "rgba(191,219,254,0.7)" }}>
                      Mission Control acknowledged. Message delivered successfully.
                    </p>
                  )}
                  {onPlay && (
                    <button onClick={() => onPlay(textToMorse(selectedScenario.message))} className="mc-chip text-xs self-start">
                      ▶ Play Signal Audio
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
