"use client";

import { motion } from "framer-motion";
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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(2,7,20,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(80,140,255,0.12)" : "1px solid transparent",
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-8 md:px-12 h-16">
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

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => onNavClick(item)}
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
        </div>

        {/* Right side: status + music toggle */}
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
              /* muted icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              /* sound-on icon */
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536A5 5 0 005 12a5 5 0 003.464 4.536M12 6l-4.293 4.293A1 1 0 017 11H5a1 1 0 00-1 1v2a1 1 0 001 1h2a1 1 0 01.707.293L12 18V6z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
