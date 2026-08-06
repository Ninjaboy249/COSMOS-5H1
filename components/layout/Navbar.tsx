"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface NavbarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onNavClick: (section: string) => void;
}

// Only Solar System and Planets — Missions and Galaxy removed
const NAV_ITEMS = ["Solar System", "Planets"] as const;

// ── Spotlight Navbar — animated glowing beam that follows the hovered item ───

function SpotlightNavItems({
  onNavClick,
}: {
  onNavClick: (section: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [spotStyle, setSpotStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const updateSpot = (item: string | null) => {
    if (!item || !containerRef.current) {
      setSpotStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const btn = itemRefs.current.get(item);
    if (!btn) return;
    const container = containerRef.current;
    const btnRect = btn.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setSpotStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
      opacity: 1,
    });
  };

  const handleEnter = (item: string) => {
    setHovered(item);
    updateSpot(item);
  };

  const handleLeave = () => {
    setHovered(null);
    setSpotStyle((s) => ({ ...s, opacity: 0 }));
  };

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-0.5"
      onMouseLeave={handleLeave}
    >
      {/* Sliding spotlight pill */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 rounded-lg"
        animate={{
          left: spotStyle.left,
          width: spotStyle.width,
          opacity: spotStyle.opacity,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(147,197,253,0.18) 0%, transparent 70%)",
          boxShadow:
            "0 0 0 1px rgba(147,197,253,0.14), 0 -2px 12px rgba(147,197,253,0.25) inset",
        }}
      />

      {/* Beam streak above the pill */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 h-px rounded-full"
        animate={{
          left: spotStyle.left + spotStyle.width * 0.15,
          width: spotStyle.width * 0.7,
          opacity: spotStyle.opacity,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(147,197,253,0.7), transparent)",
          boxShadow: "0 0 8px 1px rgba(147,197,253,0.5)",
        }}
      />

      {NAV_ITEMS.map((item) => (
        <button
          key={item}
          ref={(el) => {
            if (el) itemRefs.current.set(item, el);
          }}
          onClick={() => onNavClick(item)}
          onMouseEnter={() => handleEnter(item)}
          className="relative z-10 px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 select-none"
          style={{
            color:
              hovered === item
                ? "rgba(219,234,254,0.95)"
                : "rgba(147,197,253,0.55)",
            textShadow:
              hovered === item
                ? "0 0 14px rgba(147,197,253,0.6)"
                : "none",
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ── Mobile spotlight items (vertical layout, spotlight on left edge) ──────────

function MobileSpotlightItems({
  onNavClick,
}: {
  onNavClick: (section: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => (
        <button
          key={item}
          onClick={() => onNavClick(item)}
          onMouseEnter={() => setHovered(item)}
          onMouseLeave={() => setHovered(null)}
          className="relative flex items-center w-full px-4 py-3 text-sm text-left rounded-xl overflow-hidden transition-colors duration-150"
          style={{
            color:
              hovered === item
                ? "rgba(219,234,254,0.95)"
                : "rgba(147,197,253,0.65)",
            background:
              hovered === item ? "rgba(147,197,253,0.07)" : "transparent",
            textShadow:
              hovered === item
                ? "0 0 12px rgba(147,197,253,0.5)"
                : "none",
          }}
        >
          {/* Left edge beam */}
          <AnimatePresence>
            {hovered === item && (
              <motion.span
                aria-hidden="true"
                className="absolute left-0 top-1 bottom-1 w-px rounded-full"
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(147,197,253,0.8), transparent)",
                  boxShadow: "0 0 6px rgba(147,197,253,0.6)",
                }}
              />
            )}
          </AnimatePresence>
          {item}
        </button>
      ))}
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────────

export default function Navbar({ isMuted, onToggleMute, onNavClick }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on scroll
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = () => setMobileOpen(false);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [mobileOpen]);

  const handleNavClick = (section: string) => {
    setMobileOpen(false);
    onNavClick(section);
  };

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
        style={{
          background:
            scrolled || mobileOpen ? "rgba(2,7,20,0.95)" : "transparent",
          backdropFilter:
            scrolled || mobileOpen ? "blur(20px)" : "none",
          WebkitBackdropFilter:
            scrolled || mobileOpen ? "blur(20px)" : "none",
          borderBottom:
            scrolled || mobileOpen
              ? "1px solid rgba(80,140,255,0.12)"
              : "1px solid transparent",
        }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 md:px-12 h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/cosmos-logo.png"
              alt="COSMOS-5H1"
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
              style={{ boxShadow: "0 0 14px rgba(100,150,255,0.4)" }}
            />
            <span
              className="text-base font-bold tracking-widest uppercase hidden sm:block"
              style={{
                background: "linear-gradient(90deg, #93c5fd, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              COSMOS-5H1
            </span>
          </Link>

          {/* Desktop Nav — spotlight items + CTA links */}
          <div className="hidden md:flex items-center gap-2">
            <SpotlightNavItems onNavClick={handleNavClick} />

            <div className="w-px h-5 bg-white/10 mx-1" aria-hidden="true" />

            <Link
              href="/space"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                color: "#67e8f9",
                background: "rgba(103,232,249,0.08)",
                border: "1px solid rgba(103,232,249,0.2)",
              }}
            >
              🚀 Space Explorer
            </Link>
            <Link
              href="/compare"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                color: "#c4b5fd",
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              🪐 Cosmic Compare
            </Link>
            <Link
              href="/mission-planner"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                color: "#86efac",
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.2)",
              }}
            >
              🛸 Mission Planner
            </Link>
            <Link
              href="/physics-lab"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                color: "#22d3ee",
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
              }}
            >
              ⚛️ Physics Lab
            </Link>
            <Link
              href="/morse-code"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 hover:scale-105"
              style={{
                color: "#fde68a",
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
              }}
            >
              📡 Morse Code
            </Link>
          </div>

          {/* Right side: AI status + music + hamburger */}
          <div className="flex items-center gap-3">
            <span
              className="hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(0,200,100,0.08)",
                border: "1px solid rgba(0,200,100,0.25)",
                color: "#34d399",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              IBM Granite Offline
            </span>

            {/* Music mute / unmute */}
            <button
              onClick={onToggleMute}
              title={isMuted ? "Unmute music" : "Mute music"}
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/10"
              style={{
                border: "1px solid rgba(80,140,255,0.25)",
                color: isMuted
                  ? "rgba(147,197,253,0.35)"
                  : "rgba(147,197,253,0.75)",
              }}
            >
              {isMuted ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536A5 5 0 005 12a5 5 0 003.464 4.536M12 6l-4.293 4.293A1 1 0 017 11H5a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 01.707.293L12 18V6z" />
                </svg>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex md:hidden items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 hover:bg-white/10"
              style={{
                border: "1px solid rgba(80,140,255,0.25)",
                color: "rgba(147,197,253,0.75)",
              }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="md:hidden overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="flex flex-col gap-1 px-5 pb-4 pt-2"
                style={{ borderTop: "1px solid rgba(80,140,255,0.10)" }}
              >
                <MobileSpotlightItems onNavClick={handleNavClick} />

                <Link
                  href="/space"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{
                    color: "#67e8f9",
                    background: "rgba(103,232,249,0.08)",
                    border: "1px solid rgba(103,232,249,0.2)",
                  }}
                >
                  🚀 Space Explorer
                </Link>
                <Link
                  href="/compare"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{
                    color: "#c4b5fd",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  🪐 Cosmic Compare
                </Link>
                <Link
                  href="/mission-planner"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{
                    color: "#86efac",
                    background: "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.2)",
                  }}
                >
                  🛸 Mission Planner
                </Link>
                <Link
                  href="/physics-lab"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{
                    color: "#22d3ee",
                    background: "rgba(34,211,238,0.08)",
                    border: "1px solid rgba(34,211,238,0.2)",
                  }}
                >
                  ⚛️ Physics Lab
                </Link>
                <Link
                  href="/morse-code"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{
                    color: "#fde68a",
                    background: "rgba(251,191,36,0.08)",
                    border: "1px solid rgba(251,191,36,0.2)",
                  }}
                >
                  📡 Morse Code
                </Link>
                <div
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl mt-1"
                  style={{
                    background: "rgba(0,200,100,0.08)",
                    border: "1px solid rgba(0,200,100,0.2)",
                    color: "#34d399",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  IBM Granite Offline
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
