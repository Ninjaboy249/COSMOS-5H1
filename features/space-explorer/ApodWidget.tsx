"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchApod, type ApodData } from "@/lib/nasa-api";

export default function ApodWidget({ accent }: { accent: string }) {
  const [data, setData] = useState<ApodData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApod().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="api-widget-skeleton" />;
  if (!data) return null;

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>📸 NASA APOD — {data.date}</span>
        {data.copyright && <span className="api-widget-credit">© {data.copyright}</span>}
      </div>
      {data.media_type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.url} alt={data.title} className="api-widget-img" style={{ filter: `drop-shadow(0 0 24px ${accent}44)` }} />
      ) : (
        <div className="api-widget-video-wrap">
          <iframe src={data.url} title={data.title} className="api-widget-video" allowFullScreen />
        </div>
      )}
      <h3 className="api-widget-title" style={{ color: accent }}>{data.title}</h3>
      <p className="api-widget-text">{data.explanation}</p>
    </motion.div>
  );
}
