"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Planet } from "@/types";

interface PlanetTooltipProps {
  planet: Planet | null;
  mousePos: { x: number; y: number };
}

export default function PlanetTooltip({ planet, mousePos }: PlanetTooltipProps) {
  return (
    <AnimatePresence>
      {planet && (
        <motion.div
          className="fixed z-40 pointer-events-none"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y - 10,
          }}
          initial={{ opacity: 0, scale: 0.9, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 5 }}
          transition={{ duration: 0.15 }}
        >
          <div
            className="rounded-xl px-4 py-3 text-sm max-w-[200px]"
            style={{
              background: "rgba(5,15,40,0.88)",
              border: "1px solid rgba(100,180,255,0.3)",
              backdropFilter: "blur(12px)",
              boxShadow: `0 0 20px ${planet.glowColor}33`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: planet.color, boxShadow: `0 0 6px ${planet.glowColor}` }}
              />
              <span className="text-white font-semibold tracking-wide">{planet.name}</span>
            </div>
            <p className="text-blue-300/70 text-xs leading-relaxed">{planet.description}</p>
            <div className="mt-2 pt-2 border-t border-white/10 text-xs text-blue-400/60">
              Click for full details
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
