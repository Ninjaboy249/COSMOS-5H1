"use client";
// ─────────────────────────────────────────────────────────────────────────────
// FlashlightMode — Morse code visual flash signaling
// Modes: Screen Flash, Virtual LED, Beacon Animation
// Adjustable brightness + flash speed
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { morseToSymbols, wpmToUnitMs, textToMorse } from "@/lib/morse-code";

type FlashMode = "screen" | "led" | "beacon";

interface FlashlightModeProps {
  morse?: string;
  wpm?: number;
}

export default function FlashlightMode({ morse: externalMorse, wpm: externalWpm }: FlashlightModeProps) {
  const [mode, setMode] = useState<FlashMode>("led");
  const [brightness, setBrightness] = useState(85);
  const [wpm, setWpm] = useState(externalWpm ?? 10);
  const [morse, setMorse] = useState(externalMorse ?? "... --- ...");
  const [isFlashing, setIsFlashing] = useState(false);
  const [lit, setLit] = useState(false);
  const [currentChar, setCurrentChar] = useState("");
  const [screenFlash, setScreenFlash] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (externalMorse !== undefined) setMorse(externalMorse);
  }, [externalMorse]);

  useEffect(() => {
    if (externalWpm !== undefined) setWpm(externalWpm);
  }, [externalWpm]);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const stop = useCallback(() => {
    clearTimeouts();
    setIsFlashing(false);
    setLit(false);
    setScreenFlash(false);
    setCurrentChar("");
  }, [clearTimeouts]);

  const flash = useCallback(() => {
    stop();
    setIsFlashing(true);

    const symbols = morseToSymbols(morse);
    const unit = wpmToUnitMs(wpm);
    let t = 0;

    symbols.forEach((sym) => {
      const dur = sym.durationUnits * unit;

      if (sym.type === "dot" || sym.type === "dash") {
        timeoutsRef.current.push(setTimeout(() => {
          setLit(true);
          setScreenFlash(true);
          setCurrentChar(sym.type === "dot" ? "·" : "—");
        }, t));
        timeoutsRef.current.push(setTimeout(() => {
          setLit(false);
          setScreenFlash(false);
          setCurrentChar("");
        }, t + dur));
      }
      t += dur;
    });

    // Done
    timeoutsRef.current.push(setTimeout(() => {
      setIsFlashing(false);
      setLit(false);
      setScreenFlash(false);
    }, t + unit));
  }, [stop, morse, wpm]);

  const alpha = brightness / 100;

  return (
    <>
      {/* Screen flash overlay */}
      <AnimatePresence>
        {screenFlash && mode === "screen" && (
          <motion.div
            className="fixed inset-0 z-[9000] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: alpha }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.02 }}
            style={{ background: "#ffffff", mixBlendMode: "screen" }}
          />
        )}
      </AnimatePresence>

      <div className="mc-panel">
        <div className="mc-panel-header">
          <span className="text-xl">🔦</span>
          <h2 className="mc-panel-title">Flashlight Mode</h2>
          <AnimatePresence>
            {isFlashing && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="ml-2 text-xs px-2.5 py-1 rounded-full"
                style={{ background: "rgba(251,191,36,0.14)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}
              >
                ⚡ Transmitting
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Mode selector */}
          <div className="flex gap-2">
            {(["led", "screen", "beacon"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold capitalize transition-all duration-200"
                style={{
                  background: mode === m ? "rgba(251,191,36,0.14)" : "rgba(255,255,255,0.04)",
                  border: mode === m ? "1px solid rgba(251,191,36,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: mode === m ? "#fde68a" : "rgba(255,255,255,0.5)",
                  textShadow: mode === m ? "0 0 10px rgba(251,191,36,0.4)" : "none",
                }}
              >
                {m === "led" ? "💡 LED" : m === "screen" ? "📱 Screen" : "🔆 Beacon"}
              </button>
            ))}
          </div>

          {/* Morse input */}
          {externalMorse === undefined && (
            <div className="flex flex-col gap-1.5">
              <label className="mc-label">Message (Morse or text)</label>
              <div className="flex gap-2">
                <input
                  className="mc-input flex-1"
                  value={morse}
                  onChange={(e) => setMorse(e.target.value)}
                  placeholder="... --- ..."
                  spellCheck={false}
                />
                <button
                  onClick={() => {
                    // Try to detect if input is text or morse
                    const isText = /[A-Za-z0-9]/.test(morse) && !morse.includes(".");
                    if (isText) setMorse(textToMorse(morse));
                  }}
                  className="mc-btn-secondary text-xs"
                >
                  Convert
                </button>
              </div>
            </div>
          )}

          {/* Main visual */}
          <div className="flex justify-center py-4">
            {mode === "led" && (
              <div className="flex flex-col items-center gap-4">
                {/* LED bulb */}
                <motion.div
                  className="w-24 h-24 rounded-full flex items-center justify-center relative"
                  animate={lit ? {
                    background: [`rgba(255,240,100,${0.3 * alpha})`, `rgba(255,240,100,${0.9 * alpha})`, `rgba(255,240,100,${0.9 * alpha})`],
                    boxShadow: [
                      `0 0 20px rgba(255,240,100,${0.3 * alpha}), 0 0 40px rgba(255,200,50,${0.2 * alpha})`,
                      `0 0 40px rgba(255,240,100,${0.8 * alpha}), 0 0 80px rgba(255,200,50,${0.5 * alpha}), 0 0 120px rgba(255,180,0,${0.3 * alpha})`,
                      `0 0 40px rgba(255,240,100,${0.8 * alpha}), 0 0 80px rgba(255,200,50,${0.5 * alpha})`,
                    ],
                  } : {
                    background: "rgba(40,30,10,0.8)",
                    boxShadow: "0 0 4px rgba(100,80,0,0.2), inset 0 2px 8px rgba(0,0,0,0.6)",
                  }}
                  transition={{ duration: 0.05 }}
                  style={{ border: "3px solid rgba(255,200,50,0.3)" }}
                >
                  <span className="text-4xl" style={{ filter: lit ? `brightness(${1 + alpha})` : "brightness(0.3)" }}>💡</span>
                  {/* Base */}
                  <div className="absolute -bottom-6 w-8 h-6 rounded-b-lg" style={{ background: "rgba(100,100,120,0.6)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </motion.div>
                <div className="text-2xl font-bold font-mono" style={{ color: lit ? "#fde68a" : "rgba(255,255,255,0.2)", textShadow: lit ? "0 0 20px rgba(253,230,138,0.8)" : "none", minWidth: "2rem", textAlign: "center" }}>
                  {currentChar}
                </div>
              </div>
            )}

            {mode === "screen" && (
              <div className="flex flex-col items-center gap-3">
                <motion.div
                  className="w-40 h-32 rounded-2xl flex items-center justify-center text-5xl"
                  animate={lit ? {
                    background: `rgba(255,255,255,${0.9 * alpha})`,
                    boxShadow: `0 0 60px rgba(255,255,255,${0.6 * alpha})`,
                  } : {
                    background: "rgba(5,10,25,0.95)",
                    boxShadow: "none",
                  }}
                  transition={{ duration: 0.04 }}
                  style={{ border: "2px solid rgba(147,197,253,0.2)" }}
                >
                  <span style={{ filter: `brightness(${lit ? 1 : 0.2})` }}>📱</span>
                </motion.div>
                <p className="text-xs text-center" style={{ color: "rgba(147,197,253,0.5)" }}>Full-screen flash simulation</p>
              </div>
            )}

            {mode === "beacon" && (
              <div className="flex flex-col items-center gap-4 relative w-40 h-40">
                {/* Concentric rings */}
                {[60, 80, 100, 120].map((size, i) => (
                  <motion.div
                    key={size}
                    className="absolute rounded-full border"
                    animate={lit ? {
                      opacity: [0.8 - i * 0.15, 0.2, 0],
                      scale: [1, 1 + (i + 1) * 0.25],
                    } : { opacity: 0.08, scale: 1 }}
                    transition={{ duration: 0.6, delay: i * 0.12, repeat: lit ? Infinity : 0, ease: "easeOut" }}
                    style={{
                      width: size, height: size,
                      top: `calc(50% - ${size / 2}px)`, left: `calc(50% - ${size / 2}px)`,
                      borderColor: `rgba(251,191,36,${0.6 - i * 0.12})`,
                    }}
                  />
                ))}
                {/* Center beacon */}
                <motion.div
                  className="absolute rounded-full flex items-center justify-center text-2xl"
                  animate={lit ? {
                    background: `rgba(255,230,80,${0.9 * alpha})`,
                    boxShadow: `0 0 30px rgba(255,230,80,${0.8 * alpha}), 0 0 60px rgba(255,200,0,${0.4 * alpha})`,
                  } : { background: "rgba(40,30,10,0.8)", boxShadow: "none" }}
                  transition={{ duration: 0.05 }}
                  style={{ width: 52, height: 52, top: "calc(50% - 26px)", left: "calc(50% - 26px)" }}
                >
                  🔆
                </motion.div>
              </div>
            )}
          </div>

          {/* Brightness slider */}
          <div className="flex items-center gap-3">
            <label className="mc-label shrink-0">Brightness</label>
            <input
              type="range" min={20} max={100} step={5} value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="mc-slider flex-1"
            />
            <span className="text-xs font-bold w-10 text-right" style={{ color: "#fde68a" }}>
              {brightness}%
            </span>
          </div>

          {/* WPM / speed */}
          <div className="flex items-center gap-3">
            <label className="mc-label shrink-0">Speed</label>
            <input
              type="range" min={3} max={20} step={1} value={wpm}
              onChange={(e) => setWpm(Number(e.target.value))}
              className="mc-slider flex-1"
            />
            <span className="text-xs font-bold w-16 text-right" style={{ color: "#fde68a" }}>
              {wpm} WPM
            </span>
          </div>

          {/* Controls */}
          <div className="flex gap-3 justify-center">
            <button onClick={flash} disabled={isFlashing} className="mc-btn-primary" style={{ background: "linear-gradient(120deg, rgba(251,191,36,0.3), rgba(251,191,36,0.15))", border: "1px solid rgba(251,191,36,0.4)", color: "#fde68a", textShadow: "0 0 10px rgba(251,191,36,0.4)" }}>
              {isFlashing ? "⚡ Flashing…" : "⚡ Flash"}
            </button>
            <button onClick={stop} className="mc-btn-secondary" disabled={!isFlashing}>
              ⏹ Stop
            </button>
          </div>

          {/* Info */}
          <div className="text-center text-xs" style={{ color: "rgba(147,197,253,0.45)" }}>
            SOS mirror flash: 3 short · 3 long · 3 short — visible up to 10 km
          </div>
        </div>
      </div>
    </>
  );
}
