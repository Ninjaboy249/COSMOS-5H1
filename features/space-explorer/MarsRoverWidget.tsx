"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchMarsPhotos, type MarsPhoto } from "@/lib/nasa-api";

export default function MarsRoverWidget({ accent }: { accent: string }) {
  const [photos, setPhotos] = useState<MarsPhoto[]>([]);
  const [rover, setRover] = useState<"perseverance" | "curiosity">("perseverance");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMarsPhotos(rover).then((p) => { setPhotos(p); setLoading(false); });
  }, [rover]);

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>🎥 Mars Rover Photos — NASA</span>
        <div className="api-widget-toggle">
          {(["perseverance", "curiosity"] as const).map((r) => (
            <button
              key={r}
              className={`api-toggle-btn ${rover === r ? "active" : ""}`}
              style={rover === r ? { borderColor: accent, color: accent } : {}}
              onClick={() => setRover(r)}
            >
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="api-widget-photo-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="api-widget-skeleton-sm" />)}
        </div>
      ) : (
        <div className="api-widget-photo-grid">
          {photos.slice(0, 6).map((p) => (
            <div key={p.id} className="api-widget-photo-item">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.img_src} alt={p.camera.full_name} className="api-widget-photo-img" />
              <div className="api-widget-photo-meta">
                <span>{p.camera.full_name}</span>
                <span>{p.earth_date}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && photos.length === 0 && (
        <p className="api-widget-text opacity-50">No photos available for this sol. Try a different rover.</p>
      )}
    </motion.div>
  );
}
