"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AsciiGlitchRipple } from "@/components/ui/ascii-glitch-ripple";
import WelcomeVideo from "@/features/loading/WelcomeVideo";
import HeroContent from "@/features/hero/HeroContent";
import SolarSystemCSS from "@/features/hero/SolarSystemCSS";
import PlanetList from "@/features/solar-system/PlanetList";
import AIAssistant from "@/features/ai-assistant/AIAssistant";
import Navbar from "@/components/layout/Navbar";
import { AgentBentoGrid } from "@/components/ui/agent-bento-grid";
import CelestialDetails from "@/features/solar-system/CelestialDetails";
import { CELESTIAL_DETAILS, type CelestialBodyDetails } from "@/lib/celestial-data";
import Link from "next/link";

export default function Home() {
  const [introStage, setIntroStage] = useState<"welcome" | "ready">("welcome");
  const [aiOpen, setAiOpen] = useState(false);
  const [celestialBody, setCelestialBody] = useState<CelestialBodyDetails | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const solarRef = useRef<HTMLElement>(null);
  const planetsRef = useRef<HTMLElement>(null);
  const missionsRef = useRef<HTMLElement>(null);
  const galaxyRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attempt to play music — call this on any user interaction
  const tryPlayMusic = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.paused) return;
    audio.play().catch(() => undefined);
  }, []);

  // Start background music immediately (during intro) on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.loop = true;
    audio.muted = isMuted;
    // Try immediately (may work if page was interacted with)
    audio.play().catch(() => {
      // Autoplay blocked — music starts on first user interaction
      const startOnInteraction = () => {
        audio.play().catch(() => undefined);
        window.removeEventListener("click", startOnInteraction);
        window.removeEventListener("keydown", startOnInteraction);
        window.removeEventListener("touchstart", startOnInteraction);
      };
      window.addEventListener("click", startOnInteraction);
      window.addEventListener("keydown", startOnInteraction);
      window.addEventListener("touchstart", startOnInteraction);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync mute state to audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Background music — persists for entire session, starts from intro */}
      <audio ref={audioRef} src="/audio/space.mp3" loop preload="auto" />

      <AnimatePresence>
        {introStage === "welcome" && (
          <WelcomeVideo
            onComplete={() => setIntroStage("ready")}
            onInteract={tryPlayMusic}
          />
        )}
      </AnimatePresence>

      {introStage === "ready" && (
        <motion.main
          className="premium-shell relative min-h-screen overflow-x-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Navbar */}
          <Navbar
            isMuted={isMuted}
            onToggleMute={() => setIsMuted((v) => !v)}
            onNavClick={(section) => {
              if (section === "Solar System") scrollTo(solarRef);
              else if (section === "Planets") scrollTo(planetsRef);
              else if (section === "Missions") scrollTo(missionsRef);
              else if (section === "Galaxy") scrollTo(galaxyRef);
            }}
          />

          {/* ── Hero Section ───────────────────────────────────────── */}
          <section
            id="solar-system"
            ref={solarRef as React.RefObject<HTMLElement>}
            className="hero-stage relative min-h-screen overflow-hidden"
          >

            {/* Dark overlay to keep text readable over the photo */}
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 70% 50%, rgba(255,130,45,.06) 0%, rgba(0,3,10,0.52) 42%, rgba(0,1,6,0.68) 100%)",
              }}
            />

            {/* CSS Solar System — right side background */}
            <div className="hero-solar-system absolute inset-0 z-[1]">
              <SolarSystemCSS onSelect={(id) => setCelestialBody(CELESTIAL_DETAILS[id])} />
            </div>

            {/* Left-side gradient fade so text is always readable */}
            <div
              className="hero-reading-shade absolute inset-0 z-[2] pointer-events-none"
              style={{
                background:
                  "linear-gradient(to right, rgba(2,7,20,1) 0%, rgba(2,7,20,0.94) 25%, rgba(2,7,20,0.48) 48%, rgba(2,7,20,0.02) 67%, transparent 100%)",
              }}
            />

            {/* Hero text — left aligned, above all layers */}
            <div className="relative z-[3] flex min-h-screen items-center">
              <div className="mx-auto w-full max-w-7xl px-5 pb-24 pt-28 sm:px-8 md:px-14 lg:px-20">
                <HeroContent
                  onStartExploring={() => scrollTo(planetsRef)}
                  onOpenAI={() => setAiOpen(true)}
                />
              </div>
            </div>

            {/* Scroll indicator */}
            <motion.div
              className="absolute bottom-8 left-1/2 z-[3] hidden -translate-x-1/2 flex-col items-center gap-2 text-xs tracking-widest text-blue-400/40 pointer-events-none sm:flex"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="uppercase">Scroll to explore</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </section>

          {/* ── Solar System Planet Cards ──────────────────────────── */}
          <section
            id="planets"
            ref={planetsRef as React.RefObject<HTMLElement>}
            className="relative z-10"
            style={{
              background: "rgba(2,7,20,0.92)",
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <PlanetList onSelect={(id) => setCelestialBody(CELESTIAL_DETAILS[id])} />
          </section>

          {/* ── Features / Missions Section ────────────────────────── */}
          <section
            id="missions"
            ref={missionsRef as React.RefObject<HTMLElement>}
            className="relative z-10 py-24 px-8"
            style={{ background: "rgba(2,7,20,0.98)" }}
          >
            <div className="max-w-6xl mx-auto">
              <motion.div
                className="text-center mb-16"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
              >
                <p className="text-blue-400/60 text-xs tracking-[0.3em] uppercase mb-3">Capabilities</p>
                <h2
                  className="text-4xl font-bold mb-4"
                  style={{
                    background: "linear-gradient(135deg, #ffffff, #93c5fd, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  <AsciiGlitchRipple as="span" dur={1000} spread={1.3}>Powered by IBM Granite AI</AsciiGlitchRipple>
                </h2>
                <p className="text-blue-300/50 text-lg max-w-2xl mx-auto">
                  A complete offline AI system for space exploration, running 100% locally on your machine
                </p>
              </motion.div>

              <AgentBentoGrid className="agent-capabilities-grid my-8" />

              {/* CTA row */}
              <motion.div
                className="flex flex-wrap gap-4 justify-center mt-10"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Link
                  href="/space"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
                  style={{
                    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                    color: "#fff",
                    boxShadow: "0 0 28px rgba(99,102,241,0.35)",
                  }}
                >
                  🚀 Explore the Universe
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <button
                  onClick={() => setAiOpen(true)}
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-105"
                  style={{
                    background: "rgba(103,232,249,0.07)",
                    color: "#67e8f9",
                    border: "1px solid rgba(103,232,249,0.25)",
                  }}
                >
                  🧠 Ask COSMOS AI
                </button>
              </motion.div>
            </div>
          </section>

          {/* ── Galaxy / Footer Section ───────────────────────────── */}
          <section
            id="galaxy"
            ref={galaxyRef as React.RefObject<HTMLElement>}
            className="relative z-10"
          >
            <footer className="py-8 px-8 text-center border-t"
              style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(2,7,20,0.98)" }}>
              <p className="text-blue-400/30 text-sm">
                COSMOS-5H1 · Built with IBM Granite AI · 100% Offline · Open Source
              </p>
            </footer>
          </section>

          <CelestialDetails body={celestialBody} onClose={() => setCelestialBody(null)} />

          {/* ── AI Assistant ─────────────────────────────────────── */}
          <AIAssistant isOpen={aiOpen} onOpenChange={setAiOpen} />
        </motion.main>
      )}
    </>
  );
}
