"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AIInsightsPanel — Cosmic Compare AI comparison with typewriter animation
// Fixed: markdown rendering, typewriter effect, visible text on dark bg
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CelestialCompareData } from "@/lib/cosmic-compare-data";

interface Props { objA: CelestialCompareData; objB: CelestialCompareData }

// ── Typewriter streaming text ──────────────────────────────────────────────────
function TypewriterText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const chunkSize = text.length > 600 ? 5 : 3;
    const delay    = text.length > 600 ? 8  : 14;
    const timer = setInterval(() => {
      i += chunkSize;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDisplayed(text);
        setDone(true);
        onDone?.();
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, onDone]);

  return (
    <span className="whitespace-pre-wrap">
      {done ? text : displayed}
      {!done && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="inline-block ml-0.5 w-0.5 h-[1em] align-middle"
          style={{ background: "#a78bfa", borderRadius: 1 }}
        />
      )}
    </span>
  );
}

// ── Markdown-lite renderer (same as AIAssistant) ───────────────────────────────
function RenderAIText({ text, streaming }: { text: string; streaming: boolean }) {
  if (streaming) return <TypewriterText text={text} />;

  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return <div key={i} className="text-purple-200 font-bold text-sm mt-3 mb-1">{line.slice(3)}</div>;
        if (line.startsWith("# "))
          return <div key={i} className="text-white font-bold text-base mt-3 mb-1">{line.slice(2)}</div>;
        if (line.startsWith("**") && line.endsWith("**"))
          return <div key={i} className="text-blue-200 font-semibold text-sm my-0.5">{line.slice(2, -2)}</div>;
        if (line.startsWith("• ") || line.startsWith("  • "))
          return (
            <div key={i} className="flex gap-2 my-0.5">
              <span style={{ color: "#a78bfa" }}>•</span>
              <span className="text-blue-100/85 text-sm">{line.replace(/^  ?•\s*/, "")}</span>
            </div>
          );
        if (line.trim() === "") return <div key={i} className="h-2" />;
        // inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={i} className="text-blue-100/85 text-sm leading-relaxed">
            {parts.map((p, j) =>
              p.startsWith("**") && p.endsWith("**")
                ? <strong key={j} className="text-white">{p.slice(2, -2)}</strong>
                : <span key={j}>{p}</span>
            )}
          </div>
        );
      })}
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function AIInsightsPanel({ objA, objB }: Props) {
  const [insight, setInsight]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [generated, setGenerated] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [aiSource, setAiSource]   = useState<"granite" | "groq" | "openai" | "offline" | null>(null);

  const generate = async () => {
    setLoading(true);
    setInsight("");
    setGenerated(false);
    setStreaming(false);
    setAiSource(null);

    try {
      const res = await fetch("/api/cosmos-ai/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objA: {
            name: objA.name,
            diameter: objA.diameter,
            gravity: objA.gravity,
            surfaceTemp: objA.surfaceTemp,
            mass: objA.mass,
            moons: objA.moons,
            atmosphere: objA.atmosphere,
            habitability: objA.habitability,
            escapeVelocity: objA.escapeVelocity,
            distanceFromSun: objA.distanceFromSun,
            waterPresence: objA.waterPresence,
            lifePossibility: objA.lifePossibility,
            age: objA.age,
          },
          objB: {
            name: objB.name,
            diameter: objB.diameter,
            gravity: objB.gravity,
            surfaceTemp: objB.surfaceTemp,
            mass: objB.mass,
            moons: objB.moons,
            atmosphere: objB.atmosphere,
            habitability: objB.habitability,
            escapeVelocity: objB.escapeVelocity,
            distanceFromSun: objB.distanceFromSun,
            waterPresence: objB.waterPresence,
            lifePossibility: objB.lifePossibility,
            age: objB.age,
          },
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json() as { comparison: string; source: string };
      const answer = data.comparison || generateFallback(objA, objB);
      setInsight(answer);
      setStreaming(true);
      setAiSource(
        data.source === "granite" ? "granite"
        : data.source === "groq" ? "groq"
        : data.source === "openai" ? "openai"
        : "offline"
      );
    } catch {
      setInsight(generateFallback(objA, objB));
      setStreaming(true);
      setAiSource("offline");
    } finally {
      setLoading(false);
      setGenerated(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(10,5,30,0.85)",
        border: "1px solid rgba(139,92,246,0.3)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 0 40px rgba(139,92,246,0.1)",
      }}
    >
      {/* ── Header ── */}
      <div className="px-6 py-5 border-b border-purple-500/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.35)", boxShadow: "0 0 16px rgba(139,92,246,0.3)" }}
          >
            🧠
          </div>
          <div>
            <h3 className="text-white font-bold text-sm" style={{ textShadow: "0 0 12px rgba(167,139,250,0.5)" }}>
              COSMOS AI Insights
            </h3>
            <p className="text-purple-300/70 text-xs">
              {aiSource === "granite"
                ? "🔷 Powered by IBM Granite 3.3"
                : aiSource === "groq"
                ? "⚡ Powered by Groq Cloud"
                : aiSource === "openai"
                ? "✨ Powered by OpenAI GPT"
                : aiSource === "offline"
                ? "📡 Offline RAG Engine"
                : "Generated locally from structured scientific data"}
            </p>
          </div>
        </div>

        <motion.button
          onClick={generate}
          disabled={loading}
          whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(139,92,246,0.5)" }}
          whileTap={{ scale: 0.96 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #2563eb)",
            color: "#fff",
            border: "1px solid rgba(139,92,246,0.5)",
            boxShadow: "0 0 20px rgba(139,92,246,0.3)",
          }}
        >
          {loading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >⟳</motion.span>
              Generating…
            </>
          ) : (
            <>✨ Generate AI Comparison</>
          )}
        </motion.button>
      </div>

      {/* ── Body ── */}
      <div className="px-6 py-5 min-h-[180px]">
        <AnimatePresence mode="wait">
          {/* Idle state */}
          {!generated && !loading && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 gap-3"
            >
              <div className="text-5xl">🪐</div>
              <p className="text-blue-200/60 text-sm text-center max-w-xs leading-relaxed">
                Click <span className="text-purple-300 font-semibold">Generate AI Comparison</span> to get an intelligent deep-dive analysis of{" "}
                <span style={{ color: objA.color, textShadow: `0 0 8px ${objA.color}` }}>{objA.name}</span>
                {" "}vs{" "}
                <span style={{ color: objB.color, textShadow: `0 0 8px ${objB.color}` }}>{objB.name}</span>
              </p>
            </motion.div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="py-6 space-y-3"
            >
              <div className="flex items-center gap-2 mb-4">
                <motion.div
                  className="w-2 h-2 rounded-full bg-purple-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-blue-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                />
                <span className="text-purple-300/60 text-xs ml-1">COSMOS AI is thinking…</span>
              </div>
              {[95, 75, 88, 60, 80].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-2.5 rounded-full"
                  style={{ width: `${w}%`, background: "rgba(139,92,246,0.15)" }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </motion.div>
          )}

          {/* Result with typewriter */}
          {generated && !loading && insight && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Object chips */}
              <div className="flex gap-2 mb-5 flex-wrap">
                {[objA, objB].map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: `${obj.color}18`, border: `1px solid ${obj.color}50` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={obj.image} alt={obj.name} className="w-4 h-4 object-contain" />
                    <span className="text-xs font-semibold" style={{ color: obj.color, textShadow: `0 0 8px ${obj.color}` }}>
                      {obj.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* AI response with typewriter */}
              <div className="space-y-0.5">
                <RenderAIText text={insight} streaming={streaming} />
              </div>

              <div className="mt-5 flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => { setGenerated(false); setInsight(""); setStreaming(false); setAiSource(null); }}
                  className="text-xs text-purple-300/50 hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  ↩ Generate again
                </button>
                {aiSource && (
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full font-medium"
                    style={{
                      background: aiSource === "granite" ? "rgba(14,165,233,0.15)" : aiSource === "groq" ? "rgba(251,191,36,0.12)" : aiSource === "openai" ? "rgba(99,102,241,0.15)" : "rgba(147,197,253,0.08)",
                      border: aiSource === "granite" ? "1px solid rgba(14,165,233,0.3)" : aiSource === "groq" ? "1px solid rgba(251,191,36,0.3)" : aiSource === "openai" ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(147,197,253,0.15)",
                      color: aiSource === "granite" ? "#38bdf8" : aiSource === "groq" ? "#fbbf24" : aiSource === "openai" ? "#a78bfa" : "rgba(147,197,253,0.6)",
                    }}
                  >
                    {aiSource === "granite" ? "🔷 IBM Granite 3.3" : aiSource === "groq" ? "⚡ Groq Cloud" : aiSource === "openai" ? "✨ OpenAI GPT" : "📡 Offline mode"}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Offline fallback ───────────────────────────────────────────────────────────
function generateFallback(a: CelestialCompareData, b: CelestialCompareData): string {
  const bigger  = a.diameterKm >= b.diameterKm ? a : b;
  const smaller = a.diameterKm < b.diameterKm  ? a : b;
  const ratio   = bigger.diameterKm > 0 && smaller.diameterKm > 0
    ? (bigger.diameterKm / smaller.diameterKm).toFixed(1) : null;

  return [
    `## Key Differences`,
    ratio ? `• ${bigger.name} is ${ratio}× wider than ${smaller.name}.` : "",
    `• Gravity: ${a.name} ${a.gravity} vs ${b.name} ${b.gravity}.`,
    `• Surface temperature: ${a.name} ${a.surfaceTemp} vs ${b.name} ${b.surfaceTemp}.`,
    `• Moons: ${a.name} has ${a.moons}, ${b.name} has ${b.moons}.`,
    ``,
    `## Atmosphere`,
    `• ${a.name}: ${a.atmosphere}`,
    `• ${b.name}: ${b.atmosphere}`,
    ``,
    `## Habitability & Exploration`,
    `• ${a.name}: ${a.habitability} — ${a.lifePossibility}`,
    `• ${b.name}: ${b.habitability} — ${b.lifePossibility}`,
    ``,
    `## Fun Facts`,
    `• Both objects formed approximately ${a.age} ago.`,
    `• ${a.name} has ${a.waterPresence.toLowerCase()}, while ${b.name} has ${b.waterPresence.toLowerCase()}.`,
    `• Escape velocity: ${a.name} ${a.escapeVelocity} vs ${b.name} ${b.escapeVelocity}.`,
  ].filter(Boolean).join("\n");
}
