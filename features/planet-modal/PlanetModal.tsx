"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Planet } from "@/types";

interface PlanetModalProps {
  planet: Planet | null;
  onClose: () => void;
  onAskAI: (question: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  terrestrial: "#4a9eff",
  "gas-giant": "#e0a050",
  "ice-giant": "#7de8e8",
  dwarf: "#c8b89a",
};

export default function PlanetModal({ planet, onClose, onAskAI }: PlanetModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "facts" | "ai">("overview");

  return (
    <AnimatePresence>
      {planet && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal card */}
          <motion.div
            className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "rgba(4,10,32,0.97)",
              border: "1px solid rgba(80,140,255,0.22)",
              backdropFilter: "blur(24px)",
              boxShadow: `0 32px 80px rgba(0,0,0,0.75), 0 0 50px ${planet.glowColor}1a`,
            }}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.22, ease: [0.32, 0, 0.67, 0] }}
          >
            {/* Header */}
            <div className="relative flex-shrink-0 overflow-hidden">
              {/* Glow backdrop */}
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse at 50% -20%, ${planet.glowColor}, transparent 65%)`,
                }}
              />
              <div className="relative flex items-start justify-between p-6 pb-5">
                <div className="flex items-center gap-4">
                  {/* Planet sphere */}
                  <div
                    className="w-16 h-16 rounded-full flex-shrink-0"
                    style={{
                      background: `radial-gradient(circle at 32% 32%, ${planet.glowColor}, ${planet.color} 50%, #080818 100%)`,
                      boxShadow: `0 0 28px ${planet.glowColor}55, inset -4px -4px 12px rgba(0,0,0,0.55)`,
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h2 className="text-2xl font-bold text-white tracking-tight">{planet.name}</h2>
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${TYPE_COLORS[planet.type] ?? "#888"}1a`,
                          border: `1px solid ${TYPE_COLORS[planet.type] ?? "#888"}44`,
                          color: TYPE_COLORS[planet.type] ?? "#888",
                        }}
                      >
                        {planet.type.replace("-", " ")}
                      </span>
                    </div>
                    <p className="text-blue-300/65 text-sm leading-relaxed max-w-sm">{planet.description}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-400/50 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 ml-4 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div
              className="flex border-b flex-shrink-0 px-6"
              style={{ borderColor: "rgba(80,140,255,0.12)" }}
            >
              {(["overview", "facts", "ai"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                    activeTab === tab
                      ? "text-cyan-400 border-cyan-400"
                      : "text-blue-400/45 border-transparent hover:text-blue-300/80"
                  }`}
                >
                  {tab === "ai" ? "🧠 AI Insights" : tab === "facts" ? "⭐ Fun Facts" : "📊 Overview"}
                </button>
              ))}
            </div>

            {/* Scrollable tab content */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {[
                      { label: "Distance from Sun", value: planet.distanceSun, icon: "☀️" },
                      { label: "Diameter", value: planet.diameter, icon: "📏" },
                      { label: "Gravity", value: planet.gravity, icon: "⬇️" },
                      { label: "Temperature", value: planet.temperature, icon: "🌡️" },
                      { label: "Moons", value: planet.moons.toString(), icon: "🌙" },
                      { label: "Orbital Period", value: `${planet.orbitalPeriod} Earth years`, icon: "🔄" },
                    ].map(({ label, value, icon }) => (
                      <div
                        key={label}
                        className="rounded-xl p-4"
                        style={{
                          background: "rgba(255,255,255,0.035)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div className="text-base mb-1.5">{icon}</div>
                        <div className="text-xs text-blue-400/45 uppercase tracking-wider mb-1">{label}</div>
                        <div className="text-white text-sm font-semibold">{value}</div>
                      </div>
                    ))}

                    {/* Atmosphere */}
                    <div
                      className="col-span-2 rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="text-xs text-blue-400/45 uppercase tracking-wider mb-2">🌫️ Atmosphere</div>
                      <div className="text-white/85 text-sm leading-relaxed">{planet.atmosphere}</div>
                    </div>
                  </motion.div>
                )}

                {activeTab === "facts" && (
                  <motion.div
                    key="facts"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {planet.funFacts.map((fact, i) => (
                      <motion.div
                        key={i}
                        className="flex gap-3 rounded-xl p-4"
                        style={{
                          background: "rgba(255,255,255,0.035)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{
                            background: `${planet.glowColor}1e`,
                            color: planet.glowColor,
                            border: `1px solid ${planet.glowColor}44`,
                          }}
                        >
                          {i + 1}
                        </span>
                        <p className="text-blue-100/75 text-sm leading-relaxed">{fact}</p>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {activeTab === "ai" && (
                  <motion.div
                    key="ai"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2.5"
                  >
                    <p className="text-blue-300/55 text-sm mb-5">
                      Ask IBM Granite AI anything about {planet.name}:
                    </p>
                    {[
                      `What makes ${planet.name} unique?`,
                      `Could humans ever live on ${planet.name}?`,
                      `What space missions have visited ${planet.name}?`,
                      `What is the atmosphere of ${planet.name} like?`,
                      `Tell me about ${planet.name}'s moons`,
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          onAskAI(q);
                          onClose();
                        }}
                        className="w-full text-left rounded-xl p-4 transition-all group"
                        style={{
                          background: "rgba(255,255,255,0.035)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-blue-200/75 text-sm group-hover:text-white transition-colors leading-relaxed">
                            {q}
                          </span>
                          <span className="text-blue-400/35 group-hover:text-blue-400/80 text-base transition-all group-hover:translate-x-0.5 flex-shrink-0">
                            →
                          </span>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
