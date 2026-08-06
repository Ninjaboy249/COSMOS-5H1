"use client";
// ─────────────────────────────────────────────────────────────────────────────
// KeyboardPractice — Morse code input via spacebar, mouse, touch
// Measures dot/dash timing, accuracy, speed, consistency
// Real-time feedback with per-symbol correctness
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MORSE_TABLE, MORSE_REVERSE, morseToSymbols, wpmToUnitMs } from "@/lib/morse-code";

interface PressEvent {
  start: number;
  end: number;
  type: "dot" | "dash";
}

interface AttemptResult {
  input: string;
  expected: string;
  decoded: string;
  correct: boolean;
  accuracy: number;
  wpm: number;
}

const PRACTICE_CHARS = ["E","T","A","N","I","S","O","R","H","L","D","C","U","M","F","G","W","Y","P"];
const DASH_THRESHOLD = 3; // ratio of dash/dot to classify

export default function KeyboardPractice() {
  const [targetChar, setTargetChar] = useState("E");
  const [currentInput, setCurrentInput] = useState<string>("");  // e.g. ".-"
  const [pressEvents, setPressEvents] = useState<PressEvent[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [message, setMessage] = useState("");
  const [dotReference, setDotReference] = useState(80); // ms — calibrated
  const [showCalibrate, setShowCalibrate] = useState(true);
  const [calibrationTaps, setCalibrationTaps] = useState<number[]>([]);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const pressStartRef = useRef<number>(0);
  const lastReleaseRef = useRef<number>(0);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef<string>("");

  const nextChar = useCallback(() => {
    const chars = PRACTICE_CHARS;
    const idx = Math.floor(Math.random() * chars.length);
    setTargetChar(chars[idx]);
    setCurrentInput("");
    sequenceRef.current = "";
    setPressEvents([]);
    setResult(null);
    setMessage("");
  }, []);

  const evaluate = useCallback((inputSeq: string) => {
    const expected = MORSE_TABLE[targetChar] ?? "";
    const decoded = MORSE_REVERSE[inputSeq] ?? "?";
    const correct = inputSeq === expected;

    // Accuracy: correct symbols / total symbols
    const expChars = expected.split("");
    const inpChars = inputSeq.split("");
    let matches = 0;
    expChars.forEach((c, i) => { if (inpChars[i] === c) matches++; });
    const accuracy = expected.length > 0 ? Math.round((matches / Math.max(expected.length, inputSeq.length)) * 100) : 0;

    // WPM estimate based on timings
    const events = pressEvents;
    let totalMs = 0;
    if (events.length > 0) {
      totalMs = events[events.length - 1].end - events[0].start;
    }
    const wpm = totalMs > 0 ? Math.round((1 / (totalMs / 1000)) * 12) : 0;

    const res: AttemptResult = { input: inputSeq, expected, decoded, correct, accuracy, wpm };
    setResult(res);
    setHistory((h) => [res, ...h].slice(0, 20));
    setMessage(correct ? "✓ Correct!" : `✗ Got '${decoded}', expected '${targetChar}' (${expected})`);
  }, [targetChar, pressEvents]);

  const handlePressStart = useCallback(() => {
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    pressStartRef.current = Date.now();
    setIsPressed(true);
  }, []);

  const handlePressEnd = useCallback(() => {
    const now = Date.now();
    const duration = now - pressStartRef.current;
    lastReleaseRef.current = now;
    setIsPressed(false);

    // Determine dot vs dash using calibrated threshold
    const threshold = dotReference * DASH_THRESHOLD;
    const type: "dot" | "dash" = duration < threshold ? "dot" : "dash";
    const sym = type === "dot" ? "." : "-";

    sequenceRef.current += sym;
    setCurrentInput(sequenceRef.current);
    setPressEvents((prev) => [...prev, { start: pressStartRef.current, end: now, type }]);

    // Schedule letter completion
    const letterGapMs = dotReference * 3;
    gapTimerRef.current = setTimeout(() => {
      evaluate(sequenceRef.current);
    }, letterGapMs);
  }, [dotReference, evaluate]);

  // Keyboard: spacebar = key
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) { e.preventDefault(); handlePressStart(); }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); handlePressEnd(); }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [handlePressStart, handlePressEnd]);

  // Calibration — tap 5 times at "dot" speed
  const handleCalibrateTap = useCallback(() => {
    if (!isCalibrating) return;
    const now = Date.now();
    setCalibrationTaps((prev) => {
      const taps = [...prev, now];
      if (taps.length >= 5) {
        const diffs = taps.slice(1).map((t, i) => t - taps[i]);
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        setDotReference(Math.round(avg * 0.7)); // ~70% of interval = dot duration
        setShowCalibrate(false);
        setIsCalibrating(false);
      }
      return taps.slice(-5);
    });
  }, [isCalibrating]);

  const accuracy = history.length > 0
    ? Math.round(history.filter((h) => h.correct).length / history.length * 100)
    : 0;

  const streak = (() => {
    let s = 0;
    for (const h of history) { if (h.correct) s++; else break; }
    return s;
  })();

  return (
    <div className="mc-panel">
      <div className="mc-panel-header">
        <span className="text-xl">⌨️</span>
        <h2 className="mc-panel-title">Keyboard Practice</h2>
        {history.length > 0 && (
          <div className="ml-auto flex gap-2">
            <span className="mc-chip">{accuracy}% accuracy</span>
            {streak > 2 && <span className="mc-chip" style={{ color: "#34d399" }}>🔥 {streak} streak</span>}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Calibration */}
        <AnimatePresence>
          {showCalibrate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl p-4 mb-1" style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "#c4b5fd" }}>Calibrate your dot speed</p>
                <p className="text-xs mb-3" style={{ color: "rgba(196,181,253,0.7)" }}>Tap the button 5 times at your natural "dot" speed so the system can learn your timing.</p>
                <div className="flex gap-3 items-center">
                  <button
                    onPointerDown={handleCalibrateTap}
                    onClick={() => { if (!isCalibrating) { setIsCalibrating(true); setCalibrationTaps([]); } }}
                    className="mc-btn-secondary"
                    style={{ borderColor: "rgba(167,139,250,0.4)", color: "#c4b5fd" }}
                  >
                    {isCalibrating ? `Tap ${5 - calibrationTaps.length} more…` : "Start Calibration"}
                  </button>
                  <button onClick={() => setShowCalibrate(false)} className="text-xs" style={{ color: "rgba(147,197,253,0.5)" }}>
                    Skip (use {dotReference}ms)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Target character */}
        <div className="flex gap-4 items-center">
          <div
            className="flex flex-col items-center justify-center w-24 h-24 rounded-2xl shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(147,197,253,0.12), rgba(167,139,250,0.08))", border: "1px solid rgba(147,197,253,0.25)" }}
          >
            <span className="text-5xl font-bold text-white" style={{ textShadow: "0 0 20px rgba(147,197,253,0.5)" }}>{targetChar}</span>
            <span className="text-sm font-mono mt-1" style={{ color: "#93c5fd", letterSpacing: "0.2em" }}>
              {MORSE_TABLE[targetChar] ?? ""}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold mb-2" style={{ color: "#bfdbfe" }}>Send this character in Morse code</p>
            <p className="text-xs mb-3" style={{ color: "rgba(147,197,253,0.6)" }}>
              Press and hold <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>SPACE</kbd> or hold the button below.<br />
              Short press = dot · Long press = dash —
            </p>
            <p className="text-xs" style={{ color: "rgba(147,197,253,0.5)" }}>Dot ≤ {dotReference}ms · Dash &gt; {dotReference * DASH_THRESHOLD}ms</p>
          </div>
        </div>

        {/* Input display */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 p-3 rounded-xl min-h-[3rem]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(147,197,253,0.15)" }}>
            <span className="text-xl font-mono tracking-widest flex-1" style={{ color: "#93c5fd", letterSpacing: "0.2em" }}>
              {currentInput.split("").map((c, i) => (
                <span key={i} style={{ color: c === "." ? "#93c5fd" : "#a78bfa" }}>{c === "." ? "·" : "—"} </span>
              ))}
              {isPressed && <motion.span animate={{ opacity: [1, 0] }} transition={{ duration: 0.4, repeat: Infinity }}>|</motion.span>}
            </span>
          </div>

          {/* Press button (mouse/touch) */}
          <motion.button
            onPointerDown={handlePressStart}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
            animate={isPressed ? {
              background: ["rgba(147,197,253,0.15)", "rgba(147,197,253,0.35)"],
              boxShadow: ["0 0 12px rgba(147,197,253,0.2)", "0 0 32px rgba(147,197,253,0.6)"],
            } : {
              background: "rgba(147,197,253,0.08)",
              boxShadow: "0 0 4px rgba(147,197,253,0.1)",
            }}
            className="w-full py-8 rounded-2xl text-lg font-bold select-none touch-none"
            style={{
              border: "2px solid rgba(147,197,253,0.3)",
              color: isPressed ? "#fff" : "#93c5fd",
              cursor: "pointer",
            }}
          >
            {isPressed ? (Date.now() - pressStartRef.current > dotReference * DASH_THRESHOLD ? "— DASH" : "· DOT") : "Hold to Send"}
          </motion.button>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl px-4 py-3"
              style={{
                background: result.correct ? "rgba(52,211,153,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${result.correct ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
              }}
            >
              <p className="text-sm font-bold mb-1" style={{ color: result.correct ? "#34d399" : "#f87171" }}>
                {message}
              </p>
              <div className="flex gap-4 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span>You sent: <span className="font-mono text-white">{result.input}</span></span>
                <span>Expected: <span className="font-mono text-white">{result.expected}</span></span>
                <span>Accuracy: <span className="font-bold text-white">{result.accuracy}%</span></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button onClick={nextChar} className="mc-btn-primary">Next Character →</button>
          <button onClick={() => { setCurrentInput(""); sequenceRef.current = ""; setPressEvents([]); setResult(null); setMessage(""); if (gapTimerRef.current) clearTimeout(gapTimerRef.current); }} className="mc-btn-secondary">
            Clear
          </button>
          <button onClick={() => { setShowCalibrate(true); setIsCalibrating(false); setCalibrationTaps([]); }} className="mc-btn-secondary">
            Recalibrate
          </button>
        </div>

        {/* History stats */}
        {history.length > 0 && (
          <div className="border-t pt-4" style={{ borderColor: "rgba(147,197,253,0.1)" }}>
            <p className="mc-label mb-2">Recent History</p>
            <div className="flex flex-wrap gap-1.5">
              {history.slice(0, 12).map((h, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{
                    background: h.correct ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                    border: `1px solid ${h.correct ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
                    color: h.correct ? "#34d399" : "#f87171",
                  }}
                  title={`${h.input} → ${h.decoded} (${h.correct ? "✓" : "✗"})`}
                >
                  {h.decoded}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
