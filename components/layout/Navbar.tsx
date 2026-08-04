"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";

interface NavbarProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onNavClick: (section: string) => void;
}

const NAV_ITEMS = ["Solar System", "Planets", "Missions", "Galaxy"] as const;

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
          background: scrolled || mobileOpen ? "rgba(2,7,20,0.95)" : "transparent",
          backdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled || mobileOpen ? "blur(20px)" : "none",
          borderBottom: scrolled || mobileOpen ? "1px solid rgba(80,140,255,0.12)" : "1px solid transparent",
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

          {/* Desktop Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => handleNavClick(item)}
                className="px-4 py-2 text-sm text-blue-300/55 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-200"
              >
                {item}
              </button>
            ))}
            <Link
              href="/space"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{ color: "#67e8f9", background: "rgba(103,232,249,0.08)", border: "1px solid rgba(103,232,249,0.2)" }}
            >
              🚀 Space Explorer
            </Link>
            <Link
              href="/compare"
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200"
              style={{ color: "#c4b5fd", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
            >
              🪐 Cosmic Compare
            </Link>
          </div>

          {/* Right side: status + music toggle + hamburger */}
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
                color: isMuted ? "rgba(147,197,253,0.35)" : "rgba(147,197,253,0.75)",
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
              style={{ border: "1px solid rgba(80,140,255,0.25)", color: "rgba(147,197,253,0.75)" }}
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

        {/* Mobile dropdown menu */}
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
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item}
                    onClick={() => handleNavClick(item)}
                    className="flex items-center w-full px-4 py-3 text-sm text-left text-blue-300/70 hover:text-white rounded-xl hover:bg-white/5 transition-all duration-200"
                  >
                    {item}
                  </button>
                ))}
                <Link
                  href="/space"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{ color: "#67e8f9", background: "rgba(103,232,249,0.08)", border: "1px solid rgba(103,232,249,0.2)" }}
                >
                  🚀 Space Explorer
                </Link>
                <Link
                  href="/compare"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-semibold rounded-xl mt-1 transition-all duration-200"
                  style={{ color: "#c4b5fd", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
                >
                  🪐 Cosmic Compare
                </Link>
                {/* AI Status on mobile */}
                <div
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl mt-1"
                  style={{ background: "rgba(0,200,100,0.08)", border: "1px solid rgba(0,200,100,0.2)", color: "#34d399" }}
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
