"use client";
// ─────────────────────────────────────────────────────────────────────────────
// AIInsightsPanel — IBM Granite AI comparison summary
// Uses the existing /api/cosmos-ai endpoint
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CelestialCompareData } from "@/lib/cosmic-compare-data";

interface AIInsightsPanelProps {
  objA: CelestialCompareData;
  objB: CelestialCompareData;
}

export default function AIInsightsPanel({ objA, objB }: AIInsightsPanelProps) {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    setInsight("");
    try {
      const prompt = `Compare ${objA.name} and ${objB.name} in detail. 
        ${objA.name}: diameter ${objA.diameter}, gravity ${objA.gravity}, temperature ${objA.surfaceTemp}, mass ${objA.mass}, ${objA.moons} moons, atmosphere: ${objA.atmosphere}. 
        ${objB.name}: diameter ${objB.diameter}, gravity ${objB.gravity}, temperature ${objB.surfaceTemp}, mass ${objB.mass}, ${objB.moons} moons, atmosphere: ${objB.atmosphere}. 
        Highlight the most interesting differences and similarities. Include habitability and exploration prospects.`;

      const res = await fetch("/api/cosmos-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, context: [] }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setInsight(data.answer || "Unable to generate insight at this time.");
    } catch {
      // Fallback: generate a meaningful summary from data
      setInsight(generateFallback(objA, objB));
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
        background: "linear-gradient(135deg, rgba(91,33,182,0.15), rgba(30,58,138,0.15))",
        border: "1px solid rgba(139,92,246,0.25)",
      }}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-purple-500/10 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
            🧠
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">COSMOS AI Insights</h3>
            <p className="text-purple-300/50 text-xs">Powered by IBM Granite · Offline RAG</p>
          </div>
        </div>
        <motion.button
          onClick={generate}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.8), rgba(59,130,246,0.8))",
            color: "#fff",
            border: "1px solid rgba(139,92,246,0.4)",
            boxShadow: "0 0 20px rgba(139,92,246,0.25)",
          }}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating...
            </>
          ) : (
            <>✨ Generate AI Comparison</>
          )}
        </motion.button>
      </div>

      {/* Content */}
      <div className="px-6 py-5">
        <AnimatePresence mode="wait">
          {!generated && !loading && (
            <motion.div
              key="prompt"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-3">🪐</div>
              <p className="text-blue-300/40 text-sm">
                Click <span className="text-purple-300/70">Generate AI Comparison</span> to get an intelligent analysis of {objA.name} vs {objB.name}
              </p>
            </motion.div>
          )}

          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8 space-y-3"
            >
              {[100, 80, 90, 60].map((w, i) => (
                <motion.div
                  key={i}
                  className="h-3 rounded-full bg-white/5"
                  style={{ width: `${w}%` }}
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </motion.div>
          )}

          {generated && !loading && insight && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Object chips */}
              <div className="flex gap-3 mb-4 flex-wrap">
                {[objA, objB].map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                    style={{ background: `${obj.color}18`, border: `1px solid ${obj.color}40` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={obj.image} alt={obj.name} className="w-4 h-4 object-contain" />
                    <span className="text-xs font-medium" style={{ color: obj.color }}>{obj.name}</span>
                  </div>
                ))}
              </div>
              <p className="text-blue-100/80 text-sm leading-relaxed whitespace-pre-wrap">{insight}</p>
              <button
                onClick={() => { setGenerated(false); setInsight(""); }}
                className="mt-4 text-xs text-purple-300/50 hover:text-purple-300/80 transition-colors"
              >
                ↩ Generate again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Offline fallback summary ──────────────────────────────────────────────────
function generateFallback(a: CelestialCompareData, b: CelestialCompareData): string {
  const bigger = a.diameterKm >= b.diameterKm ? a : b;
  const smaller = a.diameterKm < b.diameterKm ? a : b;
  const ratio = bigger.diameterKm > 0 && smaller.diameterKm > 0
    ? (bigger.diameterKm / smaller.diameterKm).toFixed(1)
    : null;

  const sizeClause = ratio
    ? `${bigger.name} is approximately ${ratio}× wider than ${smaller.name}.`
    : `${a.name} and ${b.name} are remarkably different in scale.`;

  const gravClause = a.gravityMs2 > 0 && b.gravityMs2 > 0
    ? `Gravity on ${a.name} is ${a.gravityMs2} m/s² compared to ${b.gravityMs2} m/s² on ${b.name}.`
    : "";

  const tempClause = `Surface temperatures differ dramatically — ${a.name} averages ${a.surfaceTemp} while ${b.name} reaches ${b.surfaceTemp}.`;

  const habitClause = `Regarding habitability: ${a.name} — ${a.habitability.toLowerCase()}. ${b.name} — ${b.habitability.toLowerCase()}.`;

  return [sizeClause, gravClause, tempClause, habitClause,
    `Both objects are ${a.age === b.age ? "roughly the same age" : "from different eras of cosmic history"} and offer fascinating insights into the diversity of our universe.`
  ].filter(Boolean).join(" ");
}
