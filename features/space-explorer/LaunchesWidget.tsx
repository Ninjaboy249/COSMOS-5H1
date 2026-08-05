"use client";
// ─────────────────────────────────────────────────────────────────────────────
// Launches Widget — Upcoming & recent rocket launches from Launch Library 2
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { RocketLaunch } from "@/lib/launch-api";

interface Props { accent: string }

export default function LaunchesWidget({ accent }: Props) {
  const [launches, setLaunches] = useState<RocketLaunch[]>([]);
  const [tab, setTab] = useState<"upcoming" | "recent">("upcoming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/launches?type=${tab}&limit=8`);
        const data = await res.json();
        setLaunches(data.launches ?? []);
      } catch {
        setLaunches([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [tab]);

  const countdownTo = (iso: string): string => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms < 0) return "Launched";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return `T-${d}d ${h}h`;
    const m = Math.floor((ms % 3600000) / 60000);
    return `T-${h}h ${m}m`;
  };

  const agencyColor = (agency: string) => {
    const lower = agency.toLowerCase();
    if (lower.includes("spacex")) return "#4ade80";
    if (lower.includes("nasa"))   return "#60a5fa";
    if (lower.includes("isro"))   return "#f59e0b";
    if (lower.includes("esa"))    return "#a78bfa";
    if (lower.includes("roscosmos")) return "#f87171";
    return accent;
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(10,15,40,0.6)", border: `1px solid ${accent}20`, backdropFilter: "blur(16px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🛸</span>
          <span className="text-sm font-bold" style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>Launch Tracker</span>
          <span className="text-white/40 text-xs">Global Launches</span>
        </div>
        <div className="flex gap-1.5">
          {(["upcoming", "recent"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize"
              style={{
                background: tab === t ? `${accent}25` : "rgba(255,255,255,0.05)",
                border: `1px solid ${tab === t ? accent + "55" : "rgba(255,255,255,0.1)"}`,
                color: tab === t ? accent : "rgba(191,219,254,0.6)",
              }}
            >
              {t}
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
        ) : launches.length === 0 ? (
          <div className="text-center py-8 text-white/30 text-sm">No launch data available</div>
        ) : (
          <div className="space-y-2">
            {launches.slice(0, 7).map((l, i) => {
              const ac = agencyColor(l.launch_service_provider.name);
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 p-3 rounded-xl group cursor-default"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {/* Agency dot */}
                  <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: ac, boxShadow: `0 0 8px ${ac}` }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-xs font-semibold">{l.name}</span>
                      {/* Status badge */}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={{ background: `${ac}15`, border: `1px solid ${ac}35`, color: ac }}
                      >
                        {l.status.abbrev}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-white/40 text-[10px]">{l.launch_service_provider.name}</span>
                      <span className="text-white/30 text-[10px]">·</span>
                      <span className="text-white/40 text-[10px]">{l.pad.location.name}</span>
                    </div>
                    {l.mission && (
                      <p className="text-white/50 text-[10px] mt-1 line-clamp-1">{l.mission.type} — {l.mission.name}</p>
                    )}
                  </div>

                  {/* Countdown */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs font-bold" style={{ color: ac, textShadow: `0 0 8px ${ac}` }}>
                      {tab === "upcoming" ? countdownTo(l.net) : new Date(l.net).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
