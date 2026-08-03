"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeVideo from "@/features/loading/WelcomeVideo";
import HeroContent from "@/features/hero/HeroContent";
import SolarSystemCSS from "@/features/hero/SolarSystemCSS";
import PlanetList from "@/features/solar-system/PlanetList";
import AIAssistant from "@/features/ai-assistant/AIAssistant";
import Navbar from "@/components/layout/Navbar";
import { AgentBentoGrid } from "@/components/ui/agent-bento-grid";
import CelestialDetails from "@/features/solar-system/CelestialDetails";
import { CELESTIAL_DETAILS, type CelestialBodyDetails } from "@/lib/celestial-data";

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

  // Start background music immediately (during intro) on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;
    audio.loop = true;
    audio.muted = isMuted;
    audio.play().catch(() => {
      // Autoplay blocked — music will start on first user interaction
      const startOnInteraction = () => {
        audio.play().catch(() => undefined);
        window.removeEventListener("click", startOnInteraction);
        window.removeEventListener("keydown", startOnInteraction);
      };
      window.addEventListener("click", startOnInteraction);
      window.addEventListener("keydown", startOnInteraction);
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
      {/* Background music — persists for entire session */}
      <audio ref={audioRef} src="/audio/space.mp3" loop preload="auto" />

      <AnimatePresence>
        {introStage === "welcome" && (
          <WelcomeVideo onComplete={() => setIntroStage("ready")} />
        )}
      </AnimatePresence>

      {introStage === "ready" && (
        <motion.main
          className="premium-shell relative min-h-screen overflow-x-hidden"
          style={{ background: "#00030a" }}
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
            style={{ background: "#00030a" }}
          >

            {/* Star field behind everything */}
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 70% 50%, rgba(255,130,45,.08) 0%, #00030a 42%, #000106 100%)",
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
              background: "rgba(2,7,20,0.98)",
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
                  Powered by IBM Granite AI
                </h2>
                <p className="text-blue-300/50 text-lg max-w-2xl mx-auto">
                  A complete offline AI system for space exploration, running 100% locally on your machine
                </p>
              </motion.div>

              <AgentBentoGrid className="agent-capabilities-grid my-8" />
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
