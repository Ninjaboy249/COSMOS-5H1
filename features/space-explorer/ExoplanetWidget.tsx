"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Exoplanet Widget — Exoplanet data from NASA Exoplanet Archive
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Exoplanet } from "@/lib/exoplanet-api";

interface Props { accent: string }

export default function ExoplanetWidget({ accent }: Props) {
  const [planets, setPlanets] = useState<Exoplanet[]>([]);
  const [tab, setTab] = useState<"all" | "habitable">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/exoplanets?type=${tab}&limit=20`);
        const data = await res.json();
        setPlanets(data.planets ?? []);
      } catch {
        setPlanets([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tab]);

  // Classify planet type by radius
  const planetType = (r: number | null): { label: string; color: string; emoji: string } => {
    if (!r) return { label: "Unknown", color: "#6b7280", emoji: "❓" };
    if (r < 1.2)  return { label: "Earth-like", color: "#22c55e", emoji: "🌍" };
    if (r < 2)    return { label: "Super-Earth", color: "#3b82f6", emoji: "🌐" };
    if (r < 4)    return { label: "Mini-Neptune", color: "#a78bfa", emoji: "💠" };
    if (r < 10)   return { label: "Neptune-like", color: "#60a5fa", emoji: "🔵" };
    return { label: "Gas Giant", color: "#f59e0b", emoji: "🪐" };
  };

  const tempLabel = (t: number | null): string => {
    if (!t) return "—";
    if (t < 200)  return "❄️ Frozen";
    if (t < 260)  return "🟢 Habitable";
    if (t < 350)  return "🟡 Warm";
    if (t < 600)  return "🔴 Hot";
    return "🔥 Extreme";
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,15,40,0.6)", border: `1px solid ${accent}20`, backdropFilter: "blur(16px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔭</span>
          <span className="text-sm font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>Exoplanet Archive</span>
          <span className="text-white/40 text-xs">NASA Exoplanet Archive</span>
        </div>
        <div className="flex gap-1.5">
          {([["all", "All"], ["habitable", "Habitable Zone"]] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={{
                background: tab === id ? `${accent}25` : "rgba(255,255,255,0.05)",
                border: `1px solid ${tab === id ? accent + "55" : "rgba(255,255,255,0.1)"}`,
                color: tab === id ? accent : "rgba(191,219,254,0.6)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
          </div>
        ) : (
          <>
            {/* Summary row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Total shown", value: String(planets.length) },
                { label: "Earth-like", value: String(planets.filter((p) => p.pl_rade && p.pl_rade < 1.5).length) },
                { label: "In hab. zone", value: String(planets.filter((p) => p.pl_eqt && p.pl_eqt > 200 && p.pl_eqt < 350).length) },
              ].map(({ label, value }) => (
                <div key={label} className="text-center p-2 rounded-xl" style={{ background: `${accent}0d`, border: `1px solid ${accent}20` }}>
                  <div className="text-white font-bold text-sm" style={{ textShadow: `0 0 10px ${accent}60` }}>{value}</div>
                  <div className="text-white/40 text-[10px] mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Planet list */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {planets.map((p, i) => {
                const pt = planetType(p.pl_rade);
                return (
                  <motion.div
                    key={`${p.pl_name}-${i}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="text-xl flex-shrink-0">{pt.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-semibold truncate">{p.pl_name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: `${pt.color}15`, border: `1px solid ${pt.color}35`, color: pt.color }}>
                          {pt.label}
                        </span>
                      </div>
                      <div className="flex gap-3 mt-0.5 flex-wrap">
                        <span className="text-white/40 text-[10px]">⭐ {p.hostname}</span>
                        {p.pl_rade && <span className="text-white/40 text-[10px]">⌀ {p.pl_rade.toFixed(2)}R⊕</span>}
                        {p.disc_year && <span className="text-white/30 text-[10px]">{p.disc_year}</span>}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[10px]" style={{ color: "rgba(191,219,254,0.7)" }}>{tempLabel(p.pl_eqt)}</div>
                      {p.st_dist && <div className="text-white/25 text-[9px]">{p.st_dist.toFixed(1)} pc</div>}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-white/20 text-[10px] mt-3 text-center">
              Source: NASA Exoplanet Archive · R⊕ = Earth radii · pc = parsecs
            </p>
          </>
        )}
      </div>
    </div>
  );
}
