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

  // Determine what kind of media we have
  const isDirectVideo = Boolean(data.video_url); // mp4/webm from apod.nasa.gov
  const isYouTube = !isDirectVideo && data.media_type === "video";

  // Normalise YouTube URL to nocookie embed (avoids "content blocked" by tracking protection)
  const youtubeEmbedUrl = isYouTube
    ? data.url
        .replace(/https?:\/\/(www\.)?youtube\.com\/watch\?v=/, "https://www.youtube-nocookie.com/embed/")
        .replace(/https?:\/\/youtu\.be\//, "https://www.youtube-nocookie.com/embed/")
        .replace("www.youtube.com/embed/", "www.youtube-nocookie.com/embed/")
    : "";

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>
          {isDirectVideo ? "🎬" : isYouTube ? "▶️" : "📸"} NASA APOD — {data.date}
        </span>
        {data.copyright && <span className="api-widget-credit">© {data.copyright}</span>}
      </div>

      {/* ── Case 1: direct mp4/webm from apod.nasa.gov ── */}
      {isDirectVideo && (
        <video
          src={data.video_url}
          className="api-widget-video"
          controls
          autoPlay={false}
          loop={false}
          playsInline
          style={{ filter: `drop-shadow(0 0 24px ${accent}44)` }}
        />
      )}

      {/* ── Case 2: YouTube embed (nocookie to avoid content-blocked) ── */}
      {isYouTube && (
        <div className="api-widget-video-wrap">
          <iframe
            src={youtubeEmbedUrl}
            title={data.title}
            className="api-widget-video"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
        </div>
      )}

      {/* ── Case 3: image ── */}
      {!isDirectVideo && !isYouTube && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.url} alt={data.title} className="api-widget-img" style={{ filter: `drop-shadow(0 0 24px ${accent}44)` }} />
      )}

      <h3 className="api-widget-title" style={{ color: accent }}>{data.title}</h3>
      <p className="api-widget-text">{data.explanation}</p>
    </motion.div>
  );
}
