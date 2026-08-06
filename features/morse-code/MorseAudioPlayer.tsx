"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MorseAudioPlayer — Web Audio API Morse tone generator
// Precise ITU timing, WPM slider 5–40, volume, play/pause/stop/replay
// Tone: 600 Hz CW tone with smooth attack/decay envelope
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { morseToSymbols, wpmToUnitMs, textToMorse } from "@/lib/morse-code";

interface MorseAudioPlayerProps {
  /** Morse string to play (e.g. "... --- ...") — if null shows idle state */
  morse?: string;
  /** Called with symbol index as playback progresses */
  onSymbolChange?: (symbolIndex: number, total: number) => void;
  onComplete?: () => void;
}

type PlayState = "idle" | "playing" | "paused" | "done";

const TONE_FREQ = 600; // Hz — classic CW tone

export default function MorseAudioPlayer({ morse, onSymbolChange, onComplete }: MorseAudioPlayerProps) {
  const [wpm, setWpm] = useState(12);
  const [volume, setVolume] = useState(0.7);
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [localMorse, setLocalMorse] = useState(morse ?? "... --- ...");
  const [currentSymIdx, setCurrentSymIdx] = useState(-1);

  // Sync external morse prop
  useEffect(() => {
    if (morse !== undefined) setLocalMorse(morse);
  }, [morse]);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const playStateRef = useRef<PlayState>("idle");
  const pauseAtRef = useRef<number>(0);       // AudioContext time paused at
  const startOffsetRef = useRef<number>(0);   // offset into sequence when paused

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }
    return { ctx: ctxRef.current, gain: gainRef.current! };
  }, []);

  // Stop and clear all scheduled nodes
  const stopAll = useCallback(() => {
    scheduledNodesRef.current.forEach((n) => { try { n.stop(); } catch { /* already stopped */ } });
    scheduledNodesRef.current = [];
  }, []);

  const schedulePlayback = useCallback((startAudioTime: number, offsetSec = 0) => {
    const { ctx, gain } = getCtx();
    gain.gain.setValueAtTime(volume, ctx.currentTime);

    const symbols = morseToSymbols(localMorse);
    const unit = wpmToUnitMs(wpm) / 1000; // seconds

    let t = startAudioTime;
    let elapsed = 0;

    symbols.forEach((sym, idx) => {
      const dur = sym.durationUnits * unit;

      if (elapsed + dur <= offsetSec) {
        elapsed += dur;
        return;
      }

      const symStart = Math.max(t, startAudioTime + (elapsed - offsetSec));
      const symDur = dur - Math.max(0, offsetSec - elapsed);
      elapsed += dur;

      if (sym.type === "dot" || sym.type === "dash") {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(TONE_FREQ, symStart);

        const env = ctx.createGain();
        const attack = Math.min(0.005, symDur * 0.1);
        const decay  = Math.min(0.005, symDur * 0.1);
        env.gain.setValueAtTime(0, symStart);
        env.gain.linearRampToValueAtTime(volume, symStart + attack);
        env.gain.setValueAtTime(volume, symStart + symDur - decay);
        env.gain.linearRampToValueAtTime(0, symStart + symDur);

        osc.connect(env);
        env.connect(ctx.destination);
        osc.start(symStart);
        osc.stop(symStart + symDur);

        // Track symbol for visualization
        const capturedIdx = idx;
        const capturedTotal = symbols.length;
        osc.onended = () => {
          if (playStateRef.current === "playing") {
            setCurrentSymIdx(capturedIdx);
            onSymbolChange?.(capturedIdx, capturedTotal);
          }
        };

        scheduledNodesRef.current.push(osc as unknown as AudioBufferSourceNode);
        t = symStart + symDur;
      } else {
        t = symStart + symDur;
      }
    });

    // Schedule completion
    const totalDur = symbols.reduce((acc, s) => acc + s.durationUnits * unit, 0);
    const endTime = startAudioTime + totalDur - offsetSec;
    const delay = (endTime - ctx.currentTime) * 1000;
    if (delay > 0) {
      const tid = window.setTimeout(() => {
        if (playStateRef.current === "playing") {
          playStateRef.current = "done";
          setPlayState("done");
          setCurrentSymIdx(-1);
          onComplete?.();
        }
      }, delay);
      // Store tid loosely (we'll reset state on stop)
      return tid;
    }
    return 0;
  }, [getCtx, localMorse, volume, wpm, onSymbolChange, onComplete]);

  const play = useCallback(async () => {
    const { ctx } = getCtx();
    if (ctx.state === "suspended") await ctx.resume();
    stopAll();
    playStateRef.current = "playing";
    setPlayState("playing");
    setCurrentSymIdx(-1);
    startOffsetRef.current = 0;
    schedulePlayback(ctx.currentTime, 0);
  }, [getCtx, stopAll, schedulePlayback]);

  const pause = useCallback(() => {
    const { ctx } = getCtx();
    pauseAtRef.current = ctx.currentTime;
    stopAll();
    ctx.suspend();
    playStateRef.current = "paused";
    setPlayState("paused");
  }, [getCtx, stopAll]);

  const resume = useCallback(async () => {
    const { ctx } = getCtx();
    await ctx.resume();
    playStateRef.current = "playing";
    setPlayState("playing");
    schedulePlayback(ctx.currentTime, 0);
  }, [getCtx, schedulePlayback]);

  const stop = useCallback(() => {
    stopAll();
    playStateRef.current = "idle";
    setPlayState("idle");
    setCurrentSymIdx(-1);
    startOffsetRef.current = 0;
    const { ctx } = getCtx();
    if (ctx.state === "running") ctx.suspend();
  }, [stopAll, getCtx]);

  const replay = useCallback(() => {
    stop();
    setTimeout(() => play(), 80);
  }, [stop, play]);

  // Sync volume to gain node in real time
  useEffect(() => {
    if (gainRef.current && ctxRef.current) {
      gainRef.current.gain.setValueAtTime(volume, ctxRef.current.currentTime);
    }
  }, [volume]);

  const symbols = morseToSymbols(localMorse);
  const activeType = currentSymIdx >= 0 ? symbols[currentSymIdx]?.type : null;

  return (
    <div className="mc-panel">
      <div className="mc-panel-header">
        <span className="text-xl">🔊</span>
        <h2 className="mc-panel-title">Audio Player</h2>
        <AnimatePresence>
          {playState === "playing" && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="ml-2 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{ background: "rgba(52,211,153,0.14)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Transmitting
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* Input morse string (editable) */}
        {morse === undefined && (
          <div className="flex flex-col gap-1.5">
            <label className="mc-label">Morse code to play</label>
            <input
              className="mc-input"
              value={localMorse}
              onChange={(e) => { setLocalMorse(e.target.value); stop(); }}
              placeholder="... --- ..."
              spellCheck={false}
            />
            <div className="flex gap-2 flex-wrap">
              {["SOS", "CQ CQ DE COSMOS", "HELLO WORLD", "73 DE W1AW"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => { setLocalMorse(textToMorse(preset)); stop(); }}
                  className="mc-chip"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live signal indicator */}
        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(147,197,253,0.1)" }}>
          <motion.div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl"
            animate={playState === "playing" && (activeType === "dot" || activeType === "dash") ? {
              background: ["rgba(147,197,253,0.15)", "rgba(147,197,253,0.55)", "rgba(147,197,253,0.15)"],
              boxShadow: ["0 0 8px rgba(147,197,253,0.2)", "0 0 28px rgba(147,197,253,0.8)", "0 0 8px rgba(147,197,253,0.2)"],
            } : { background: "rgba(147,197,253,0.06)", boxShadow: "0 0 4px rgba(147,197,253,0.1)" }}
            transition={{ duration: 0.1 }}
          >
            {playState === "playing" ? (activeType === "dot" ? "·" : activeType === "dash" ? "—" : "○") : "○"}
          </motion.div>

          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-xs font-semibold" style={{ color: "#bfdbfe" }}>
              {playState === "idle" && "Ready to transmit"}
              {playState === "playing" && (activeType === "dot" ? "DOT" : activeType === "dash" ? "DASH" : "Gap")}
              {playState === "paused" && "Paused"}
              {playState === "done" && "Transmission complete"}
            </span>
            <span className="text-[11px]" style={{ color: "rgba(147,197,253,0.5)" }}>
              {wpm} WPM · {TONE_FREQ} Hz CW tone
            </span>
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={playState === "playing" ? pause : playState === "paused" ? resume : play}
            className="mc-btn-primary"
          >
            {playState === "playing" ? "⏸ Pause" : playState === "paused" ? "▶ Resume" : "▶ Play"}
          </button>
          <button onClick={stop} className="mc-btn-secondary" disabled={playState === "idle"}>
            ⏹ Stop
          </button>
          <button onClick={replay} className="mc-btn-secondary">
            ↺ Replay
          </button>
        </div>

        {/* WPM slider */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="mc-label">Speed</label>
            <span className="text-sm font-bold" style={{ color: "#93c5fd", textShadow: "0 0 10px rgba(147,197,253,0.4)" }}>{wpm} WPM</span>
          </div>
          <input
            type="range" min={5} max={40} step={1} value={wpm}
            onChange={(e) => { setWpm(Number(e.target.value)); if (playState === "playing") { stop(); } }}
            className="mc-slider"
          />
          <div className="flex justify-between text-[10px]" style={{ color: "rgba(147,197,253,0.5)" }}>
            <span>5 WPM (Beginner)</span>
            <span>20 WPM (Standard)</span>
            <span>40 WPM (Expert)</span>
          </div>
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-3">
          <label className="mc-label shrink-0">🔊 Volume</label>
          <input
            type="range" min={0} max={1} step={0.05} value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="mc-slider flex-1"
          />
          <span className="text-xs font-bold w-10 text-right" style={{ color: "#93c5fd" }}>
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Timing info */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "·  dot", val: `${wpmToUnitMs(wpm)}ms` },
            { label: "—  dash", val: `${wpmToUnitMs(wpm) * 3}ms` },
            { label: "∥  letter gap", val: `${wpmToUnitMs(wpm) * 3}ms` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-2.5"
              style={{ background: "rgba(147,197,253,0.06)", border: "1px solid rgba(147,197,253,0.12)" }}
            >
              <div className="text-white text-sm font-bold">{item.val}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "rgba(147,197,253,0.6)" }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
