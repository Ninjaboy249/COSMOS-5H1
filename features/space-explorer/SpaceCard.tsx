"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { SpaceCategory } from "@/lib/space-explorer-data";

export default function SpaceCard({ cat, index }: { cat: SpaceCategory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: (index % 5) * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/space/${cat.slug}`} className="block focus:outline-none group" tabIndex={0}>
        <motion.article
          className="space-card"
          style={{ "--card-accent": cat.accent, "--card-glow": cat.glow } as React.CSSProperties}
          whileHover={{ y: -6, scale: 1.018 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
        >
          {/* Glow layer */}
          <div className="space-card-glow" />

          {/* Header */}
          <div className="space-card-header">
            <span className="space-card-icon">{cat.icon}</span>
            <span
              className="space-card-badge"
              style={{ color: cat.statusColor, borderColor: `${cat.statusColor}44`, background: `${cat.statusColor}10` }}
            >
              <span
                className="space-card-badge-dot"
                style={{ background: cat.statusColor, boxShadow: `0 0 6px ${cat.statusColor}` }}
              />
              {cat.status}
            </span>
          </div>

          {/* Image */}
          <div className="space-card-image-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cat.image}
              alt={cat.title}
              className="space-card-image"
              style={{ filter: `drop-shadow(0 0 18px ${cat.glow})` }}
            />
          </div>

          {/* Body */}
          <div className="space-card-body">
            <h3 className="space-card-title">{cat.title}</h3>
            <p className="space-card-subtitle">{cat.subtitle}</p>
            <p className="space-card-desc">{cat.description}</p>

            {/* Tags */}
            <div className="space-card-tags">
              {cat.tags.map((tag) => (
                <span key={tag} className="space-card-tag">{tag}</span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="space-card-footer">
            <span className="space-card-explore">
              Explore
              <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}
