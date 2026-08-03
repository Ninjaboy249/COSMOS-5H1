"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface SpaceHeroBannerProps {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  overview: string;
  image: string;
  backHref?: string;
}

export default function SpaceHeroBanner({ icon, title, subtitle, accent, overview, image, backHref = "/space" }: SpaceHeroBannerProps) {
  return (
    <section className="space-hero" style={{ "--hero-accent": accent } as React.CSSProperties}>
      {/* Background glow */}
      <div className="space-hero-bg" style={{ background: `radial-gradient(ellipse at 65% 50%, ${accent}22 0%, transparent 65%)` }} />

      {/* Image */}
      <div className="space-hero-image-wrap">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="space-hero-image-inner"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title}
            className="space-hero-img"
            style={{ filter: `drop-shadow(0 0 48px ${accent}88)` }}
          />
          {/* Orbit ring */}
          <div className="space-hero-orbit" style={{ borderColor: `${accent}30` }} />
        </motion.div>
      </div>

      {/* Content */}
      <div className="space-hero-content">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Link href={backHref} className="space-hero-back">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Space Explorer
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1 }}
        >
          <span className="space-hero-icon">{icon}</span>
          <p className="space-hero-sub" style={{ color: `${accent}cc` }}>{subtitle}</p>
          <h1 className="space-hero-title">{title}</h1>
          <p className="space-hero-overview">{overview}</p>
        </motion.div>
      </div>
    </section>
  );
}
