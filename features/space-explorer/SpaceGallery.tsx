"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface GalleryImage {
  src: string;
  caption: string;
  credit?: string;
  creditUrl?: string;
  pexelsPage?: string;
}

interface PexelsPhoto {
  id: number;
  alt: string;
  url: string;
  src: { large: string; medium: string };
  photographer: string;
  photographer_url: string;
}

export default function SpaceGallery({
  images,
  accent,
  topic,
}: {
  images: GalleryImage[];
  accent: string;
  topic?: string;
}) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [pexelsImages, setPexelsImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"pexels" | "static">("static");

  useEffect(() => {
    if (!topic) return;
    setLoading(true);
    fetch(`/api/pexels?query=${encodeURIComponent(topic + " space astronomy")}&per_page=12`)
      .then((r) => r.json())
      .then((data: { photos?: PexelsPhoto[] }) => {
        const photos = data.photos ?? [];
        if (photos.length > 0) {
          setPexelsImages(
            photos.map((p) => ({
              src: p.src.large,
              caption: p.alt || topic,
              credit: p.photographer,
              creditUrl: p.photographer_url,
              pexelsPage: p.url,
            }))
          );
          setSource("pexels");
        }
      })
      .catch(() => {/* stay on static */})
      .finally(() => setLoading(false));
  }, [topic]);

  const displayImages = source === "pexels" && pexelsImages.length > 0 ? pexelsImages : images;

  if (!displayImages.length && !loading) return null;

  return (
    <>
      {/* Source badge */}
      <div className="flex items-center gap-2 mb-4">
        {loading ? (
          <span className="text-xs text-white/30 flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border border-t-transparent animate-spin inline-block" style={{ borderColor: `${accent}40`, borderTopColor: accent }} />
            Loading images from Pexels…
          </span>
        ) : source === "pexels" ? (
          <a
            href={`https://www.pexels.com/search/${encodeURIComponent(topic ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
            style={{ background: `${accent}15`, border: `1px solid ${accent}35`, color: accent }}
          >
            📷 Photos from Pexels · {pexelsImages.length} results
          </a>
        ) : (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}>
            📁 Local gallery
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="space-gallery">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="space-gallery-thumb animate-pulse"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: `${accent}20`, minHeight: 160 }}
              />
            ))
          : displayImages.map((img, i) => (
              <motion.button
                key={img.src + i}
                className="space-gallery-thumb"
                onClick={() => setSelected(img)}
                initial={{ opacity: 0, scale: 0.92 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                style={{ borderColor: `${accent}30` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.caption}
                  className="space-gallery-img"
                  style={{ filter: `drop-shadow(0 0 14px ${accent}44)` }}
                  loading="lazy"
                />
                <span className="space-gallery-caption">{img.caption}</span>
                {img.credit && (
                  <span className="space-gallery-credit">© {img.credit}</span>
                )}
              </motion.button>
            ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="space-lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="space-lightbox-inner"
              initial={{ scale: 0.88, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selected.src} alt={selected.caption} className="space-lightbox-img" />
              <p className="space-lightbox-caption">{selected.caption}</p>
              {selected.credit && (
                <p className="text-xs text-white/35 mt-1 text-center">
                  Photo by{" "}
                  {selected.creditUrl ? (
                    <a href={selected.creditUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                      {selected.credit}
                    </a>
                  ) : (
                    selected.credit
                  )}
                  {selected.pexelsPage && (
                    <>
                      {" · "}
                      <a href={selected.pexelsPage} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/60">
                        View on Pexels
                      </a>
                    </>
                  )}
                </p>
              )}
              <button className="space-lightbox-close" onClick={() => setSelected(null)}>✕</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
