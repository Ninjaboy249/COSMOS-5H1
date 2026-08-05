"use client";
// ─────────────────────────────────────────────────────────────────────────────
// COSMOS-5H1 — 404 Not Found page
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-center px-6"
      style={{ background: "#00030a url('/images/milkyway-bg.jpg') center/cover no-repeat fixed" }}
    >
      {/* Stars overlay */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {Array.from({ length: 60 }, (_, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${(i * 1.7) % 100}%`,
              top: `${(i * 2.3) % 100}%`,
              width: `${1 + (i % 2)}px`,
              height: `${1 + (i % 2)}px`,
              opacity: 0.15 + (i % 5) * 0.07,
              animation: `pulse ${3 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.13) % 5}s`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 max-w-xl"
      >
        {/* Giant 404 */}
        <div
          className="text-[9rem] font-black leading-none mb-2 select-none"
          style={{
            background: "linear-gradient(135deg, #93c5fd 0%, #a78bfa 50%, #f0abfc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 40px rgba(167,139,250,0.5))",
          }}
        >
          404
        </div>

        <p
          className="text-xs uppercase tracking-[0.35em] mb-4 font-semibold"
          style={{ color: "rgba(103,232,249,0.9)", textShadow: "0 0 14px rgba(103,232,249,0.6)" }}
        >
          ● Lost in Deep Space
        </p>

        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: "#f0f8ff", textShadow: "0 0 30px rgba(147,197,253,0.3), 0 2px 6px rgba(0,0,0,0.8)" }}
        >
          This sector of the universe doesn't exist.
        </h1>

        <p
          className="text-sm leading-relaxed mb-8"
          style={{ color: "rgba(191,219,254,0.8)", textShadow: "0 0 16px rgba(147,197,253,0.25)" }}
        >
          The page you're looking for has drifted beyond the observable universe.
          Recalibrate your trajectory and return to a known coordinate.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(139,92,246,0.7) 100%)",
              border: "1px solid rgba(167,139,250,0.5)",
              color: "#f0f8ff",
              boxShadow: "0 0 20px rgba(139,92,246,0.3)",
            }}
          >
            🏠 Mission Control (Home)
          </Link>
          <Link
            href="/space"
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(147,197,253,0.3)",
              color: "rgba(191,219,254,0.9)",
            }}
          >
            🔭 Space Explorer
          </Link>
          <Link
            href="/compare"
            className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(147,197,253,0.3)",
              color: "rgba(191,219,254,0.9)",
            }}
          >
            🪐 Cosmic Compare
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
