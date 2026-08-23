"use client";
// ─────────────────────────────────────────────────────────────────────────────
// COSMOS-5H1 — Morse Code Communication Center
// Route: /morse-code
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { textToMorse } from "@/lib/morse-code";
import MorseTranslator from "@/features/morse-code/MorseTranslator";
import MorseVisualizer from "@/features/morse-code/MorseVisualizer";
import MorseLessons from "@/features/morse-code/MorseLessons";
import ChallengeMode from "@/features/morse-code/ChallengeMode";
import SpaceCommSim from "@/features/morse-code/SpaceCommSim";

// Dynamic imports for audio-heavy components (avoid SSR AudioContext issues)
const MorseAudioPlayer = dynamic(() => import("@/features/morse-code/MorseAudioPlayer"), { ssr: false });
const KeyboardPractice = dynamic(() => import("@/features/morse-code/KeyboardPractice"), { ssr: false });
const FlashlightMode  = dynamic(() => import("@/features/morse-code/FlashlightMode"), { ssr: false });

// ── Tab definitions ────────────────────────────────────────────────────────────
const TABS = [
  { id: "translator",   label: "Translator",  icon: "⟷" },
  { id: "audio",        label: "Audio",        icon: "🔊" },
  { id: "flashlight",   label: "Flashlight",   icon: "🔦" },
  { id: "practice",     label: "Practice",     icon: "⌨️" },
  { id: "lessons",      label: "Lessons",      icon: "📚" },
  { id: "challenge",    label: "Challenge",    icon: "⚔️" },
  { id: "space-sim",    label: "Space Sim",    icon: "🛸" },
] as const;

type TabId = typeof TABS[number]["id"];

// Star field — static to avoid hydration mismatch
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: `${(i * 1.27) % 100}%`,
  top:  `${(i * 2.43) % 100}%`,
  delay: `${(i * 0.11) % 7}s`,
  dur:   `${4 + (i * 0.08) % 5}s`,
  size:  `${1 + (i % 2)}px`,
  opacity: 0.12 + (i % 5) * 0.06,
}));

export default function MorseCodePage() {
  const [activeTab, setActiveTab] = useState<TabId>("translator");
  const [sharedMorse, setSharedMorse] = useState("... --- ...");
  const [audioWpm, setAudioWpm] = useState(12);
  const [audioPlaying, setAudioPlaying] = useState(false);

  // Called by child components that want to play audio
  const handlePlay = useCallback((morse: string) => {
    setSharedMorse(morse);
    setActiveTab("audio");
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "#00030a url('/images/milkyway-bg.jpg') center top / cover no-repeat fixed" }}
    >
      {/* Star particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {STARS.map((s) => (
          <span
            key={s.id}
            className="absolute rounded-full bg-white animate-pulse"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDelay: s.delay, animationDuration: s.dur }}
          />
        ))}
      </div>

      {/* Dark overlay — darkens milkyway so all text stays legible */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "rgba(0,2,10,0.62)" }} />

      <div className="relative max-w-6xl mx-auto px-5 md:px-8 pt-24 pb-20">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-1"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold transition-colors duration-150"
            style={{ color: "rgba(147,197,253,0.88)", textShadow: "0 0 10px rgba(147,197,253,0.35)" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            COSMOS-5H1
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="mb-10"
        >
          <p
            className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3"
            style={{ color: "rgba(147,197,253,0.7)", textShadow: "0 0 10px rgba(147,197,253,0.3)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" style={{ boxShadow: "0 0 6px #60a5fa" }} />
            COSMOS-5H1 · Communication Center
          </p>
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
            style={{
              background: "linear-gradient(100deg, #fff 20%, #93c5fd 50%, #a78bfa 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              filter: "drop-shadow(0 0 16px rgba(147,197,253,0.35))",
            }}
          >
            Morse Code <span>Center</span>
          </h1>
          <p className="text-blue-100/90 text-sm leading-relaxed max-w-xl" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            Learn, practice, and use International Morse code — from SOS distress signals to deep-space communication. Translate, listen, flash, and challenge yourself.
          </p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { label: "Characters", value: "56", color: "#93c5fd" },
              { label: "ITU Standard", value: "M.1677-1", color: "#a78bfa" },
              { label: "Max Speed", value: "40 WPM", color: "#34d399" },
              { label: "Tone", value: "600 Hz", color: "#fbbf24" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: `${stat.color}12`,
                  border: `1px solid ${stat.color}35`,
                }}
              >
                <span className="font-bold" style={{ color: stat.color }}>{stat.value}</span>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{stat.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Signal Visualizer (always visible) ───────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <MorseVisualizer morse={sharedMorse} wpm={audioWpm} isPlaying={audioPlaying} />
        </motion.div>

        {/* ── Tab bar ──────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex gap-1.5 overflow-x-auto pb-1 mb-6 mc-tab-bar"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="mc-tab"
              style={{
                background: activeTab === tab.id ? "rgba(147,197,253,0.14)" : "rgba(255,255,255,0.04)",
                border: activeTab === tab.id ? "1px solid rgba(147,197,253,0.35)" : "1px solid rgba(255,255,255,0.08)",
                color: activeTab === tab.id ? "#bfdbfe" : "rgba(147,197,253,0.55)",
                textShadow: activeTab === tab.id ? "0 0 10px rgba(147,197,253,0.4)" : "none",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {activeTab === "translator" && (
            <MorseTranslator
              onPlay={(morse) => {
                setSharedMorse(morse);
                setActiveTab("audio");
              }}
            />
          )}

          {activeTab === "audio" && (
            <MorseAudioPlayer
              morse={sharedMorse}
              onSymbolChange={(idx, total) => {
                setAudioPlaying(idx < total - 1);
              }}
              onComplete={() => setAudioPlaying(false)}
            />
          )}

          {activeTab === "flashlight" && (
            <FlashlightMode morse={sharedMorse} wpm={audioWpm} />
          )}

          {activeTab === "practice" && (
            <KeyboardPractice />
          )}

          {activeTab === "lessons" && (
            <MorseLessons onPlay={handlePlay} />
          )}

          {activeTab === "challenge" && (
            <ChallengeMode onPlay={handlePlay} />
          )}

          {activeTab === "space-sim" && (
            <SpaceCommSim onPlay={handlePlay} />
          )}
        </motion.div>

        {/* ── Quick reference card ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-8 rounded-2xl p-5"
          style={{
            background: "linear-gradient(135deg, rgba(10,22,51,0.65), rgba(2,7,20,0.55))",
            border: "1px solid rgba(147,197,253,0.14)",
            backdropFilter: "blur(14px)",
          }}
        >
          <p className="mc-label mb-4">Quick Morse Reference · ITU International Standard</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {["SOS","CQ","DE","73","QSL","QRZ"].map((word) => (
              <button
                key={word}
                onClick={() => { setSharedMorse(textToMorse(word)); setActiveTab("audio"); }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all hover:scale-105"
                style={{ background: "rgba(147,197,253,0.06)", border: "1px solid rgba(147,197,253,0.15)" }}
              >
                <span className="text-sm font-bold text-white">{word}</span>
                <span className="text-[9px] font-mono text-center break-all" style={{ color: "#93c5fd" }}>
                  {textToMorse(word)}
                </span>
              </button>
            ))}
          </div>

          {/* Timing reminder */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4" style={{ borderColor: "rgba(147,197,253,0.1)" }}>
            {[
              { sym: "·", label: "Dot", units: "1 unit" },
              { sym: "—", label: "Dash", units: "3 units" },
              { sym: "∣", label: "Symbol gap", units: "1 unit" },
              { sym: "∥", label: "Letter gap", units: "3 units" },
              { sym: "∣∣∣", label: "Word gap", units: "7 units" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-base font-mono font-bold" style={{ color: "#93c5fd", minWidth: "1.5rem" }}>{item.sym}</span>
                <div>
                  <div className="text-xs font-semibold text-white">{item.label}</div>
                  <div className="text-[10px]" style={{ color: "rgba(147,197,253,0.55)" }}>{item.units}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: "rgba(147,197,253,0.35)" }}>
          COSMOS-5H1 Morse Code Center · ITU-R M.1677-1 Standard · Web Audio API
        </p>
      </div>
    </div>
  );
}
