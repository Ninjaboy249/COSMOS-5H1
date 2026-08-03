"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface GalleryImage {
  src: string;
  caption: string;
}

export default function SpaceGallery({ images, accent }: { images: GalleryImage[]; accent: string }) {
  const [selected, setSelected] = useState<GalleryImage | null>(null);

  if (!images.length) return null;
  return (
    <>
      <div className="space-gallery">
        {images.map((img, i) => (
          <motion.button
            key={img.src + i}
            className="space-gallery-thumb"
            onClick={() => setSelected(img)}
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.04 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            style={{ borderColor: `${accent}30` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} alt={img.caption} className="space-gallery-img" style={{ filter: `drop-shadow(0 0 14px ${accent}44)` }} />
            <span className="space-gallery-caption">{img.caption}</span>
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
              <button className="space-lightbox-close" onClick={() => setSelected(null)}>✕</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
