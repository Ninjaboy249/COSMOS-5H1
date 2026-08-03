"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchEpicImages } from "@/lib/nasa-api";

interface EpicImg { identifier: string; caption: string; date: string; url: string }

export default function EpicWidget({ accent }: { accent: string }) {
  const [images, setImages] = useState<EpicImg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    fetchEpicImages().then((imgs) => { setImages(imgs); setLoading(false); });
  }, []);

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>
          🌎 NASA EPIC — Earth Polychromatic Imaging Camera
        </span>
      </div>
      {loading ? (
        <div className="api-widget-skeleton" />
      ) : (
        <>
          <div className="epic-main">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[sel]?.url ?? "/images/planets/earth.png"}
              alt={images[sel]?.caption ?? "Earth"}
              className="api-widget-img epic-main-img"
              style={{ filter: `drop-shadow(0 0 32px ${accent}55)` }}
            />
            <p className="api-widget-text">{images[sel]?.caption}</p>
            <p className="api-widget-credit">{images[sel]?.date}</p>
          </div>
          {images.length > 1 && (
            <div className="epic-thumbs">
              {images.map((img, i) => (
                <button
                  key={img.identifier}
                  className={`epic-thumb ${i === sel ? "active" : ""}`}
                  onClick={() => setSel(i)}
                  style={i === sel ? { borderColor: accent } : {}}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="epic-thumb-img" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
