"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { fetchIssPosition, type IssPosition } from "@/lib/nasa-api";

// Simple ASCII-art-style map using a div + dot
export default function IssWidget({ accent }: { accent: string }) {
  const [pos, setPos] = useState<IssPosition | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lon: number }[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    const p = await fetchIssPosition();
    setPos(p);
    setTrail((prev) => [...prev.slice(-24), { lat: p.latitude, lon: p.longitude }]);
  };

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>
          <span className="iss-live-dot" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
          🛰 ISS Live Position — Open Notify API — Refreshes every 10s
        </span>
      </div>

      {/* Map placeholder with positioned ISS dot */}
      <div className="iss-map">
        <div className="iss-map-grid" />
        {/* Equator */}
        <div className="iss-equator" />
        {/* Trail */}
        {trail.map((t, i) => (
          <div
            key={i}
            className="iss-trail-dot"
            style={{
              left: `${((t.lon + 180) / 360) * 100}%`,
              top: `${((90 - t.lat) / 180) * 100}%`,
              opacity: (i + 1) / trail.length * 0.6,
              background: accent,
            }}
          />
        ))}
        {/* ISS dot */}
        {pos && (
          <motion.div
            className="iss-dot"
            animate={{ left: `${((pos.longitude + 180) / 360) * 100}%`, top: `${((90 - pos.latitude) / 180) * 100}%` }}
            transition={{ duration: 2, ease: "linear" }}
            style={{ boxShadow: `0 0 16px ${accent}` }}
          >
            🛰
          </motion.div>
        )}
        <div className="iss-map-labels">
          <span>180°W</span><span>0°</span><span>180°E</span>
        </div>
      </div>

      {pos && (
        <div className="iss-data-row">
          {[
            { label: "Latitude", val: `${pos.latitude.toFixed(4)}°` },
            { label: "Longitude", val: `${pos.longitude.toFixed(4)}°` },
            { label: "Altitude", val: `~${pos.altitude} km` },
            { label: "Velocity", val: `~${pos.velocity?.toLocaleString()} km/h` },
          ].map(({ label, val }) => (
            <div key={label} className="iss-data-item">
              <span className="iss-data-label">{label}</span>
              <span className="iss-data-val" style={{ color: accent }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
