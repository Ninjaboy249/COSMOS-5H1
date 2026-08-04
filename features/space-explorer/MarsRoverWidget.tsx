"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchLatestMarsPhotos, type MarsPhoto } from "@/lib/nasa-api";

export default function MarsRoverWidget({ accent }: { accent: string }) {
  const [photos, setPhotos] = useState<MarsPhoto[]>([]);
  const [rover, setRover] = useState<"perseverance" | "curiosity">("perseverance");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MarsPhoto | null>(null);

  useEffect(() => {
    setLoading(true);
    setPhotos([]);
    fetchLatestMarsPhotos(rover).then((p) => { setPhotos(p); setLoading(false); });
  }, [rover]);

  const meta = photos[0];

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      {/* Header */}
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>
          🎥 Latest Mars Rover Photos — NASA
        </span>
        <div className="api-widget-toggle">
          {(["perseverance", "curiosity"] as const).map((r) => (
            <button
              key={r}
              className={`api-toggle-btn ${rover === r ? "active" : ""}`}
              style={rover === r ? { borderColor: accent, color: accent } : {}}
              onClick={() => { setRover(r); setSelected(null); }}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      {!loading && meta && (
        <div
          className="flex flex-wrap gap-4 mb-4 px-1 text-xs"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          <span>🚀 Rover: <strong style={{ color: accent }}>{meta.rover.name}</strong></span>
          <span>📅 Latest Earth Date: <strong style={{ color: accent }}>{meta.earth_date}</strong></span>
          <span>🌕 Sol: <strong style={{ color: accent }}>{meta.sol}</strong></span>
          <span>🔴 Status: <strong style={{ color: meta.rover.status === "active" ? "#4ade80" : "#f87171" }}>{meta.rover.status}</strong></span>
          <span>📷 Photos loaded: <strong style={{ color: accent }}>{photos.length}</strong></span>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="api-widget-photo-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
            <div key={i} className="api-widget-skeleton-sm" />
          ))}
        </div>
      ) : (
        <div className="api-widget-photo-grid">
          {photos.map((p) => (
            <button
              key={p.id}
              className="api-widget-photo-item"
              onClick={() => setSelected(p)}
              style={{ cursor: "pointer", background: "none", border: "none", padding: 0, textAlign: "left" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img_src} alt={p.camera.full_name} className="api-widget-photo-img" loading="lazy" />
              <div className="api-widget-photo-meta">
                <span>{p.camera.full_name}</span>
                <span>{p.earth_date}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {!loading && photos.length === 0 && (
        <p className="api-widget-text opacity-50">No latest photos available. NASA API may be temporarily unavailable.</p>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.88)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-3xl w-full mx-4 rounded-2xl overflow-hidden"
            style={{ background: "#0a0f1e", border: `1px solid ${accent}33` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.img_src} alt={selected.camera.full_name} className="w-full object-contain max-h-[65vh]" />
            <div className="p-4 flex flex-wrap gap-4 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              <span>📷 <strong style={{ color: accent }}>{selected.camera.full_name}</strong></span>
              <span>🚀 <strong style={{ color: accent }}>{selected.rover.name}</strong></span>
              <span>📅 <strong style={{ color: accent }}>{selected.earth_date}</strong></span>
              <span>🌕 Sol <strong style={{ color: accent }}>{selected.sol}</strong></span>
              <button
                className="ml-auto text-xs px-3 py-1 rounded-lg"
                style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
                onClick={() => setSelected(null)}
              >
                ✕ Close
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
