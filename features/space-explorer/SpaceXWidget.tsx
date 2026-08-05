"use client";
// ─────────────────────────────────────────────────────────────────────────────
// SpaceX Widget — Recent & upcoming SpaceX launches + rocket info
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { SpaceXLaunch, SpaceXRocket } from "@/lib/spacex-api";

interface Props { accent: string }

export default function SpaceXWidget({ accent }: Props) {
  const [launches, setLaunches] = useState<SpaceXLaunch[]>([]);
  const [rockets, setRockets] = useState<SpaceXRocket[]>([]);
  const [upcoming, setUpcoming] = useState<SpaceXLaunch[]>([]);
  const [tab, setTab] = useState<"recent" | "upcoming" | "rockets">("recent");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [r1, r2, r3] = await Promise.all([
          fetch("/api/spacex?type=launches").then((r) => r.json()),
          fetch("/api/spacex?type=upcoming").then((r) => r.json()),
          fetch("/api/spacex?type=rockets").then((r) => r.json()),
        ]);
        setLaunches(r1.data ?? []);
        setUpcoming(r2.data ?? []);
        setRockets(r3.data ?? []);
      } catch {
        // silently use empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const TabBtn = ({ id, label }: { id: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
      style={{
        background: tab === id ? `${accent}28` : "rgba(255,255,255,0.05)",
        border: `1px solid ${tab === id ? accent + "60" : "rgba(255,255,255,0.1)"}`,
        color: tab === id ? accent : "rgba(191,219,254,0.6)",
        textShadow: tab === id ? `0 0 10px ${accent}` : "none",
      }}
    >
      {label}
    </button>
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const StatusBadge = ({ success }: { success: boolean | null }) => {
    const color = success === null ? "#f59e0b" : success ? "#22c55e" : "#ef4444";
    const label = success === null ? "Upcoming" : success ? "Success" : "Failed";
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}>
        {label}
      </span>
    );
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,15,40,0.6)", border: `1px solid ${accent}20`, backdropFilter: "blur(16px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚀</span>
          <span className="text-sm font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>SpaceX</span>
          <span className="text-white/40 text-xs">Mission Tracker</span>
        </div>
        <div className="flex gap-1.5">
          <TabBtn id="recent" label="Recent" />
          <TabBtn id="upcoming" label="Upcoming" />
          <TabBtn id="rockets" label="Rockets" />
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
          </div>
        ) : (
          <>
            {/* Recent Launches */}
            {tab === "recent" && (
              <div className="space-y-2">
                {launches.slice(0, 6).map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                      🚀
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-xs font-semibold truncate">{l.name}</span>
                        <StatusBadge success={l.success} />
                      </div>
                      <p className="text-white/40 text-[10px] mt-0.5">{formatDate(l.date_utc)} · Flight #{l.flight_number}</p>
                      {l.details && <p className="text-white/55 text-[10px] mt-1 line-clamp-2">{l.details}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Upcoming Launches */}
            {tab === "upcoming" && (
              <div className="space-y-2">
                {(upcoming.length > 0 ? upcoming : launches).slice(0, 6).map((l, i) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg" style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
                      ⏳
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-xs font-semibold">{l.name}</span>
                      <p className="text-white/40 text-[10px] mt-0.5">{formatDate(l.date_utc)}</p>
                      {l.mission && <p className="text-white/55 text-[10px] mt-1 line-clamp-2">{l.mission.description}</p>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Rockets */}
            {tab === "rockets" && (
              <div className="grid grid-cols-1 gap-3">
                {rockets.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-bold text-sm">{r.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: r.active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${r.active ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, color: r.active ? "#4ade80" : "#f87171" }}>
                        {r.active ? "Active" : "Retired"}
                      </span>
                    </div>
                    <p className="text-white/50 text-[11px] line-clamp-2 mb-3">{r.description}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Height", value: `${r.height.meters}m` },
                        { label: "Success", value: `${r.success_rate_pct}%` },
                        { label: "Engines", value: String(r.engines.number) },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center p-1.5 rounded-lg" style={{ background: `${accent}0d` }}>
                          <div className="text-white font-bold text-xs" style={{ textShadow: `0 0 10px ${accent}60` }}>{value}</div>
                          <div className="text-white/35 text-[9px]">{label}</div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
