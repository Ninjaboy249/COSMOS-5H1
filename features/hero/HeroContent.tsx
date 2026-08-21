"use client";

import { motion } from "framer-motion";
import { AsciiGlitchRipple } from "@/components/ui/ascii-glitch-ripple";

interface HeroContentProps {
  onStartExploring: () => void;
  onOpenCosmos: () => void;
}

const reveal = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

export default function HeroContent({ onStartExploring, onOpenCosmos }: HeroContentProps) {
  return (
    <motion.div
      className="hero-copy relative max-w-xl"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.16, delayChildren: 0.18 } } }}
    >
      <motion.div className="mb-5 sm:mb-7" variants={reveal} transition={{ duration: 0.75 }}>
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-4 py-2 text-xs uppercase tracking-[0.2em] text-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
          <AsciiGlitchRipple as="span" dur={700} spread={0.9} chars="·-~+:;*░▒▓01">COSMOS AI · Offline RAG</AsciiGlitchRipple>
        </span>
      </motion.div>

      <motion.h1
        className="luxury-hero-title mb-5 text-[2.7rem] font-semibold leading-[0.98] sm:mb-6 sm:text-6xl lg:text-[5.2rem]"
        variants={{ hidden: { opacity: 0, y: 34, filter: "blur(10px)" }, visible: { opacity: 1, y: 0, filter: "blur(0px)" } }}
        transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
      >
        <span>Explore the</span>
        <span className="luxury-hero-accent"> extraordinary.</span>
      </motion.h1>

      <motion.p
        className="mb-8 max-w-md text-base leading-relaxed text-blue-100/90 sm:mb-10 sm:text-lg"
        style={{ textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}
        variants={reveal}
        transition={{ duration: 0.85 }}
      >
        <AsciiGlitchRipple as="span" dur={800} spread={1.0} chars="·-~+:;=*░▒▓█▄▀■!?&#$@">Discover distant worlds, uncover planetary science, and journey through the universe with a private AI companion built for exploration.</AsciiGlitchRipple>
      </motion.p>

      <motion.div className="luxury-actions" variants={reveal} transition={{ duration: 0.85 }}>
        <motion.button
          onClick={onStartExploring}
          className="luxury-button luxury-button-primary"
          whileHover={{ y: -3 }}
          whileTap={{ y: 0, scale: 0.98 }}
        >
          <span>Begin exploration</span>
          <span aria-hidden="true" className="luxury-button-arrow">↗</span>
        </motion.button>

        <motion.button
          onClick={onOpenCosmos}
          className="luxury-button luxury-button-secondary"
          whileHover={{ y: -3 }}
          whileTap={{ y: 0, scale: 0.98 }}
        >
          <span>Ask COSMOS AI</span>
          <span className="luxury-ai-dot" aria-hidden="true" />
        </motion.button>
      </motion.div>

      <motion.div className="mt-9 flex gap-7 sm:mt-12 sm:gap-10" variants={reveal} transition={{ duration: 0.75 }}>
        {[
          { val: "09", label: "Worlds" },
          { val: "∞", label: "Stars" },
          { val: "100%", label: "Private AI" },
        ].map(({ val, label }) => (
          <div key={label}>
            <div className="text-xl font-semibold text-white sm:text-2xl">{val}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-blue-300/85 font-semibold">{label}</div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
