"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface WelcomeVideoProps {
  onComplete: () => void;
  /** Called whenever the user first interacts — use to unblock audio autoplay */
  onInteract?: () => void;
}

export default function WelcomeVideo({ onComplete, onInteract }: WelcomeVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leaving, setLeaving] = useState(false);
  const interactedRef = useRef(false);

  const handleInteract = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    onInteract?.();
  }, [onInteract]);

  const finish = useCallback(() => {
    if (leaving) return;
    handleInteract();
    setLeaving(true);
    window.setTimeout(onComplete, 850);
  }, [leaving, onComplete, handleInteract]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => undefined);
    const fallback = window.setTimeout(finish, 20000);
    return () => window.clearTimeout(fallback);
  }, [finish]);

  return (
    <motion.section
      className="fixed left-0 top-0 z-[9998] m-0 overflow-hidden bg-[#01030a] p-0"
      style={{ width: "100vw", height: "100dvh" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1, scale: leaving ? 1.035 : 1 }}
      transition={{ duration: 0.85, ease: "easeInOut" }}
      aria-label="Welcome to Space"
    >
      <video
        ref={videoRef}
        className="absolute left-0 top-0 block min-h-full min-w-full max-w-none object-cover"
        style={{ width: "100vw", height: "100dvh", objectFit: "cover", objectPosition: "center" }}
        src="/video/space-welcome.mp4"
        autoPlay
        muted
        playsInline
        onEnded={finish}
        onError={finish}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,3,10,.18),rgba(1,3,10,.3)_55%,rgba(1,3,10,.8))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(1,3,10,.25)_60%,rgba(1,3,10,.72)_100%)]" />

      <div className="relative flex h-full w-full items-center justify-center overflow-hidden px-5 text-center">
        <div className="w-full max-w-6xl">
          <motion.p
            className="mb-5 text-[10px] font-medium uppercase tracking-[0.55em] text-cyan-100/75 sm:text-xs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.9 }}
          >
            Your journey begins
          </motion.p>
          <motion.h1
            className="welcome-title font-semibold uppercase leading-[1.05]"
            style={{ fontSize: "clamp(2.35rem, 7.5vw, 6.5rem)" }}
            initial={{ opacity: 0, letterSpacing: "0.2em", filter: "blur(14px)" }}
            animate={{ opacity: 1, letterSpacing: "clamp(0.02em, 0.7vw, 0.08em)", filter: "blur(0px)" }}
            transition={{ delay: 0.7, duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Welcome to Space
          </motion.h1>
          <motion.div
            className="mx-auto mt-7 h-px w-40 bg-gradient-to-r from-transparent via-cyan-200 to-transparent"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.8 }}
            transition={{ delay: 1.2, duration: 1.2 }}
          />
        </div>
      </div>

      <button
        onClick={finish}
        onPointerDown={handleInteract}
        className="absolute bottom-5 right-5 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-[9px] uppercase tracking-[0.22em] text-white/70 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10 hover:text-white sm:bottom-7 sm:right-7 sm:px-5 sm:text-[10px]"
      >
        Skip intro
      </button>
    </motion.section>
  );
}
