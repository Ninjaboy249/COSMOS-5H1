"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import VoiceCommander from "@/features/voice/VoiceCommander";
import { getDetailBySlug, getCategoryBySlug, SPACE_CATEGORIES } from "@/lib/space-explorer-data";
import SpaceHeroBanner from "@/features/space-explorer/SpaceHeroBanner";
import StatGrid from "@/features/space-explorer/StatGrid";
import SpaceTimeline from "@/features/space-explorer/SpaceTimeline";
import MissionsPanel from "@/features/space-explorer/MissionsPanel";
import SpaceGallery from "@/features/space-explorer/SpaceGallery";
import SpaceAIChat from "@/features/space-explorer/SpaceAIChat";
import ApodWidget from "@/features/space-explorer/ApodWidget";
import MarsRoverWidget from "@/features/space-explorer/MarsRoverWidget";
import NeoWidget from "@/features/space-explorer/NeoWidget";
import IssWidget from "@/features/space-explorer/IssWidget";
import SpaceWeatherWidget from "@/features/space-explorer/SpaceWeatherWidget";
import EpicWidget from "@/features/space-explorer/EpicWidget";
import LaunchesWidget from "@/features/space-explorer/LaunchesWidget";
import ExoplanetWidget from "@/features/space-explorer/ExoplanetWidget";
import SpaceXWidget from "@/features/space-explorer/SpaceXWidget";

const SECTION_TABS = [
  { id: "overview", label: "Overview" },
  { id: "stats", label: "Statistics" },
  { id: "timeline", label: "Timeline" },
  { id: "missions", label: "Missions" },
  { id: "gallery", label: "Gallery" },
  { id: "live", label: "Live Data" },
  { id: "ai", label: "Ask AI" },
];

export default function SpaceDetailClient({ slug }: { slug: string }) {
  const detail = getDetailBySlug(slug);
  const cat = getCategoryBySlug(slug);
  const [activeTab, setActiveTab] = useState("overview");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!detail || !cat) {
    return (
      <div className="space-detail-not-found">
        <span className="text-6xl">🔭</span>
        <h2>Module Coming Soon</h2>
        <p>This section is under construction. Check back soon!</p>
        <Link href="/space" className="se-back-link mt-6">← Back to Space Explorer</Link>
      </div>
    );
  }

  const relatedCats = detail.relatedSlugs
    .map((s) => SPACE_CATEGORIES.find((c) => c.slug === s))
    .filter(Boolean);

  const showLiveData = [
    "apod", "mars-rover", "neo", "iss-tracker", "earth-live", "space-weather",
    "launches", "spacex", "exoplanets",
  ].includes(slug);

  return (
    <div className="space-detail-shell">
      {/* Hero */}
      <SpaceHeroBanner
        icon={detail.icon}
        title={detail.title}
        subtitle={detail.subtitle}
        accent={detail.accent}
        overview={detail.overview}
        image={detail.heroImage}
      />

      {/* Sticky tab navigation */}
      <div className="space-detail-tabs-wrap">
        <div className="space-detail-tabs">
          {SECTION_TABS.filter((t) => t.id !== "live" || showLiveData).map((tab) => (
            <button
              key={tab.id}
              className={`space-detail-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? { color: detail.accent, borderBottomColor: detail.accent } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="space-detail-content">
        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <motion.section key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Overview</h2>
            <p className="section-body-text">{detail.overview}</p>

            {/* Facts */}
            {detail.facts.length > 0 && (
              <>
                <h3 className="subsection-heading">Interesting Facts</h3>
                <div className="facts-grid">
                  {detail.facts.map((fact, i) => (
                    <motion.div
                      key={i}
                      className="fact-card"
                      style={{ borderColor: `${detail.accent}25` }}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <span className="fact-bullet" style={{ color: detail.accent }}>✦</span>
                      <p>{fact}</p>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.section>
        )}

        {/* ── STATS ── */}
        {activeTab === "stats" && (
          <motion.section key="stats" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Scientific Data</h2>
            {detail.stats.length > 0 ? (
              <StatGrid stats={detail.stats} accent={detail.accent} />
            ) : (
              <p className="section-body-text opacity-50">Statistical data loading via live APIs…</p>
            )}
          </motion.section>
        )}

        {/* ── TIMELINE ── */}
        {activeTab === "timeline" && (
          <motion.section key="timeline" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Historical Timeline</h2>
            {detail.timeline.length > 0 ? (
              <SpaceTimeline items={detail.timeline} accent={detail.accent} />
            ) : (
              <p className="section-body-text opacity-50">Timeline data not available for this module.</p>
            )}
          </motion.section>
        )}

        {/* ── MISSIONS ── */}
        {activeTab === "missions" && (
          <motion.section key="missions" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Space Missions</h2>
            {detail.missions.length > 0 ? (
              <MissionsPanel missions={detail.missions} />
            ) : (
              <p className="section-body-text opacity-50">Mission data will be loaded from Launch Library API.</p>
            )}
          </motion.section>
        )}

        {/* ── GALLERY ── */}
        {activeTab === "gallery" && (
          <motion.section key="gallery" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Image Gallery</h2>
            <SpaceGallery images={detail.gallery} accent={detail.accent} />
          </motion.section>
        )}

        {/* ── LIVE DATA ── */}
        {activeTab === "live" && showLiveData && mounted && (
          <motion.section key="live" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Live Data</h2>
            {slug === "apod" && <ApodWidget accent={detail.accent} />}
            {slug === "mars-rover" && <MarsRoverWidget accent={detail.accent} />}
            {slug === "neo" && <NeoWidget accent={detail.accent} />}
            {slug === "iss-tracker" && <IssWidget accent={detail.accent} />}
            {slug === "earth-live" && <EpicWidget accent={detail.accent} />}
            {slug === "space-weather" && <SpaceWeatherWidget accent={detail.accent} />}
            {slug === "launches" && <LaunchesWidget accent={detail.accent} />}
            {slug === "spacex" && <SpaceXWidget accent={detail.accent} />}
            {slug === "exoplanets" && <ExoplanetWidget accent={detail.accent} />}
          </motion.section>
        )}

        {/* ── AI CHAT ── */}
        {activeTab === "ai" && (
          <motion.section key="ai" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <h2 className="section-heading" style={{ color: detail.accent }}>Ask COSMOS AI</h2>
            <SpaceAIChat topic={detail.title} accent={detail.accent} prompts={detail.aiPrompts} />
          </motion.section>
        )}
      </div>

      {/* Related modules */}
      {relatedCats.length > 0 && (
        <div className="space-detail-related">
          <h3 className="subsection-heading">Related Modules</h3>
          <div className="related-grid">
            {relatedCats.map((rc) => rc && (
              <Link key={rc.slug} href={`/space/${rc.slug}`} className="related-card">
                <span className="related-icon">{rc.icon}</span>
                <div>
                  <div className="related-title">{rc.title}</div>
                  <div className="related-sub">{rc.subtitle}</div>
                </div>
                <svg className="w-4 h-4 ml-auto flex-shrink-0 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}
      {/* ── COSMOS Voice Commander ── */}
      <VoiceCommander />
    </div>
  );
}
