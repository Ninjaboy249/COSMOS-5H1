"use client";
/**
 * COSMOS Voice Commander — Main overlay component
 *
 * Renders a floating mic button (bottom-left).
 * Connects to the existing COSMOS AI pipeline for knowledge questions.
 * Uses the voice command router for navigation/actions.
 *
 * Does NOT recreate or duplicate the existing AIAssistant — it feeds INTO it.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useVoiceSpeech } from "@/hooks/useVoiceSpeech";
import { routeVoiceCommand, type VoiceCommand } from "@/lib/voice/command-router";
import { loadVoiceSettings, saveVoiceSettings, MURF_VOICE_OPTIONS, type VoiceSettings } from "@/lib/voice/voice-settings";

// ── Voice pipeline states ──────────────────────────────────────────────────────

type VCState =
  | "idle"
  | "listening"
  | "processing"
  | "executing"
  | "speaking"
  | "error"
  | "unsupported";

const STATE_LABELS: Record<VCState, string> = {
  idle: "Ready",
  listening: "Listening…",
  processing: "Processing…",
  executing: "Executing…",
  speaking: "Speaking…",
  error: "Error",
  unsupported: "Not supported",
};

const STATE_ICONS: Record<VCState, string> = {
  idle: "🎤",
  listening: "🔴",
  processing: "🧠",
  executing: "⚡",
  speaking: "🔊",
  error: "❌",
  unsupported: "❌",
};

// ── Tour narration ─────────────────────────────────────────────────────────────

const TOUR_PLANETS = [
  { name: "Sun", text: "Our Sun — a G-type main sequence star, 4.6 billion years old." },
  { name: "Mercury", text: "Mercury — the smallest planet and closest to the Sun. Extreme temperature swings." },
  { name: "Venus", text: "Venus — Earth's toxic twin with a runaway greenhouse effect at 462 degrees." },
  { name: "Earth", text: "Earth — our pale blue dot. The only known planet with life." },
  { name: "Mars", text: "Mars — the Red Planet with the tallest volcano in the solar system: Olympus Mons." },
  { name: "Jupiter", text: "Jupiter — the gas giant king, over 1,300 Earths would fit inside." },
  { name: "Saturn", text: "Saturn — the ringed wonder, its rings made of ice and rock." },
  { name: "Uranus", text: "Uranus — an ice giant that rotates on its side." },
  { name: "Neptune", text: "Neptune — the windiest planet with storms exceeding 2,000 kilometers per hour." },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface VoiceCommanderProps {
  /** Called when voice opens the AI assistant panel */
  onOpenAI?: (query?: string) => void;
  /** Called to scroll to the solar system section (for tour) */
  onScrollToSolar?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VoiceCommander({ onOpenAI, onScrollToSolar }: VoiceCommanderProps) {
  const router = useRouter();

  // ── Settings (loaded client-side to avoid SSR mismatch) ───────────────────
  // Lazy initializer — runs only on client, avoids SSR mismatch
  const [settings, setSettings] = useState<VoiceSettings | null>(
    () => (typeof window !== "undefined" ? loadVoiceSettings() : null)
  );
  const [showSettings, setShowSettings] = useState(false);

  const updateSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings((prev) => {
      const next = saveVoiceSettings({ ...(prev ?? {}), ...patch });
      return next;
    });
  }, []);

  // ── Voice pipeline state ───────────────────────────────────────────────────
  const [vcState, setVcState] = useState<VCState>("idle");
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tour ───────────────────────────────────────────────────────────────────
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const { speak, stop: stopSpeech, isSpeaking } = useVoiceSpeech();

  // ── Banner helper ──────────────────────────────────────────────────────────
  const showMessage = useCallback((text: string, duration = 5000) => {
    setLastResponse(text);
    setShowBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setShowBanner(false), duration);
  }, []);

  // ── Voice speak helper ─────────────────────────────────────────────────────
  const voiceSpeak = useCallback(
    async (text: string, currentSettings: VoiceSettings) => {
      if (!currentSettings.enabled || !currentSettings.autoSpeak || !text.trim()) return;
      await speak(text, currentSettings);
    },
    [speak]
  );

  // ── Execute a voice command ────────────────────────────────────────────────
  const executeCommand = useCallback(
    async (cmd: VoiceCommand, currentSettings: VoiceSettings) => {
      setVcState("executing");
      setLastTranscript(cmd.transcript);

      // ── AI question: call COSMOS AI API ──────────────────────────────────
      if (cmd.askAI && cmd.intent === "AI_QUESTION") {
        let aiAnswer = "";
        try {
          const res = await fetch("/api/cosmos-ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: cmd.transcript, history: [] }),
            signal: AbortSignal.timeout(15_000),
          });
          const data = await res.json() as { answer: string; navigateTo?: string };
          aiAnswer = data.answer ?? "";
          if (data.navigateTo) {
            setTimeout(() => router.push(data.navigateTo!), 1000);
          }
        } catch {
          aiAnswer = "I had trouble reaching COSMOS AI. Please try again.";
        }

        onOpenAI?.(cmd.transcript);
        const spokenAnswer = aiAnswer.replace(/\*\*/g, "").replace(/#{1,3} /g, "").slice(0, 300);
        showMessage(aiAnswer.slice(0, 400));
        await voiceSpeak(spokenAnswer, currentSettings);
        setVcState("idle");
        return;
      }

      // ── Open AI assistant ─────────────────────────────────────────────────
      if (cmd.intent === "OPEN_AI") {
        onOpenAI?.();
        showMessage(cmd.confirmText);
        await voiceSpeak(cmd.confirmText, currentSettings);
        setVcState("idle");
        return;
      }

      // ── Unknown → open AI with transcript ────────────────────────────────
      if (cmd.intent === "UNKNOWN") {
        onOpenAI?.(cmd.transcript);
        showMessage("Let me ask COSMOS AI about that.");
        await voiceSpeak("Let me ask COSMOS AI about that.", currentSettings);
        setVcState("idle");
        return;
      }

      // ── Tour ──────────────────────────────────────────────────────────────
      if (cmd.intent === "START_TOUR") {
        setTourActive(true);
        setTourIndex(0);
        onScrollToSolar?.();
        showMessage("Starting Solar System tour…");
        await voiceSpeak(cmd.confirmText, currentSettings);
        setVcState("idle");
        return;
      }

      if (cmd.intent === "STOP_TOUR") {
        setTourActive(false);
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        stopSpeech();
        showMessage("Tour stopped.");
        setVcState("idle");
        return;
      }

      // ── Go back ───────────────────────────────────────────────────────────
      if (cmd.intent === "GO_BACK") {
        showMessage(cmd.confirmText);
        await voiceSpeak(cmd.confirmText, currentSettings);
        router.back();
        setVcState("idle");
        return;
      }

      // ── Navigate ──────────────────────────────────────────────────────────
      if (cmd.navigateTo) {
        showMessage(cmd.confirmText);
        await voiceSpeak(cmd.confirmText, currentSettings);
        setTimeout(() => router.push(cmd.navigateTo!), 400);
        setVcState("idle");
        return;
      }

      showMessage(cmd.confirmText);
      await voiceSpeak(cmd.confirmText, currentSettings);
      setVcState("idle");
    },
    [onOpenAI, onScrollToSolar, router, showMessage, voiceSpeak, stopSpeech]
  );

  // ── Tour playback loop ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!tourActive || !settings) return;
    const item = TOUR_PLANETS[tourIndex];
    if (!item) {
      // End of tour — use setTimeout so we don't setState synchronously in effect
      const t = setTimeout(() => setTourActive(false), 0);
      return () => clearTimeout(t);
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      if (cancelled) return;
      showMessage(`🪐 ${item.name} — ${item.text}`);
      if (settings.enabled && settings.autoSpeak) {
        await speak(`${item.name}. ${item.text}`, settings);
      }
      if (cancelled) return;
      if (tourIndex < TOUR_PLANETS.length - 1) {
        timer = setTimeout(() => {
          if (!cancelled) setTourIndex((i) => i + 1);
        }, 800);
      } else {
        // Use setTimeout so setState doesn't fire synchronously in async callback
        timer = setTimeout(() => {
          setTourActive(false);
          showMessage("Solar System tour complete! 🚀");
        }, 0);
        if (settings.enabled && settings.autoSpeak) {
          await speak("Solar System tour complete!", settings);
        }
      }
    };
    run();

    const tourTimerCurrent = tourTimerRef.current;
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (tourTimerCurrent) clearTimeout(tourTimerCurrent);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourIndex]);

  // ── STT handlers — store settings in a ref so callbacks stay stable ───────
  const settingsRef = useRef<VoiceSettings | null>(null);
  // Update the ref inside useEffect so it doesn't fire during render
  useEffect(() => {
    settingsRef.current = settings;
  });

  const handleResult = useCallback(
    (transcript: string) => {
      setVcState("processing");
      const cmd = routeVoiceCommand(transcript);
      const s = settingsRef.current;
      if (s) executeCommand(cmd, s);
    },
    [executeCommand]
  );

  const handleError = useCallback(
    (msg: string) => {
      setVcState("error");
      showMessage(msg, 4000);
      setTimeout(() => setVcState("idle"), 4000);
    },
    [showMessage]
  );

  const { state: sttState, start: startSTT, stop: stopSTT, isSupported } = useVoiceRecognition({
    lang: settings?.locale ?? "en-US",
    onResult: handleResult,
    onError: handleError,
  });

  // Derive vcState from sttState + isSpeaking
  const effectiveVcState: VCState =
    isSpeaking ? "speaking" :
    sttState === "listening" ? "listening" :
    sttState === "processing" ? "processing" :
    sttState === "unsupported" ? "unsupported" :
    vcState;

  // ── Mic click handler ──────────────────────────────────────────────────────
  const handleMicClick = useCallback(() => {
    if (!settings?.enabled) {
      showMessage("Voice is disabled. Enable it in voice settings.");
      return;
    }
    if (effectiveVcState === "listening") {
      stopSTT();
      stopSpeech();
      setVcState("idle");
      return;
    }
    if (effectiveVcState === "speaking") {
      stopSpeech();
      return;
    }
    if (effectiveVcState === "idle" || effectiveVcState === "error") {
      setVcState("idle");
      startSTT();
    }
  }, [settings, effectiveVcState, startSTT, stopSTT, stopSpeech, showMessage]);

  // ── Keyboard shortcut: Alt+V ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyV") {
        e.preventDefault();
        handleMicClick();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleMicClick]);

  // Don't render during SSR
  if (settings === null) return null;

  const micLabel = effectiveVcState === "listening"
    ? "Stop listening"
    : effectiveVcState === "speaking"
    ? "Stop speaking"
    : "Activate COSMOS voice command";

  // ── Unsupported browser ────────────────────────────────────────────────────
  if (effectiveVcState === "unsupported") {
    return (
      <div className="vc-unsupported-pill">
        ❌ Voice not supported — use Chrome or Edge
      </div>
    );
  }

  return (
    <>
      {/* ── Response banner ── */}
      <AnimatePresence>
        {showBanner && lastResponse && (
          <motion.div
            className="vc-banner"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            transition={{ duration: 0.25 }}
          >
            <span className="vc-banner-icon">{STATE_ICONS[effectiveVcState]}</span>
            <span className="vc-banner-text">{lastResponse}</span>
            <button className="vc-banner-close" onClick={() => setShowBanner(false)} aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transcript pill (shown while processing) ── */}
      <AnimatePresence>
        {lastTranscript && (effectiveVcState === "processing" || effectiveVcState === "executing") && (
          <motion.div
            className="vc-transcript"
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 6, x: "-50%" }}
            transition={{ duration: 0.2 }}
          >
            <span className="vc-transcript-quote">&ldquo;</span>
            {lastTranscript}
            <span className="vc-transcript-quote">&rdquo;</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mic button ── */}
      <div className="vc-mic-wrap">
        {/* Settings button */}
        <motion.button
          className={`vc-settings-btn ${showSettings ? "active" : ""}`}
          onClick={() => setShowSettings((v) => !v)}
          title="Voice settings"
          aria-label="Voice settings"
          whileTap={{ scale: 0.92 }}
        >
          ⚙️
        </motion.button>

        {/* Main mic */}
        <motion.button
          className={`vc-mic-btn ${effectiveVcState}`}
          onClick={handleMicClick}
          aria-label={micLabel}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          title={`${STATE_LABELS[effectiveVcState]} (Alt+V)`}
        >
          {/* Pulse ring while listening */}
          {effectiveVcState === "listening" && (
            <motion.span
              className="vc-pulse-ring"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}

          {/* State icon */}
          <motion.span
            className="vc-mic-icon"
            key={effectiveVcState}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {STATE_ICONS[effectiveVcState]}
          </motion.span>

          {/* State label */}
          <span className="vc-mic-label">{STATE_LABELS[effectiveVcState]}</span>
        </motion.button>
      </div>

      {/* ── Voice Settings panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="vc-settings-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="vc-settings-header">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎙</span>
                <span className="vc-settings-title">COSMOS Voice</span>
              </div>
              <button className="vc-settings-close" onClick={() => setShowSettings(false)} aria-label="Close settings">✕</button>
            </div>

            {/* Body */}
            <div className="vc-settings-body">
              {/* Enabled toggle */}
              <label className="vc-setting-row">
                <span className="vc-setting-label">Voice Assistant</span>
                <button
                  className={`vc-toggle ${settings.enabled ? "on" : "off"}`}
                  onClick={() => updateSettings({ enabled: !settings.enabled })}
                  aria-label={settings.enabled ? "Disable voice" : "Enable voice"}
                >
                  <motion.span
                    className="vc-toggle-thumb"
                    animate={{ x: settings.enabled ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </label>

              {/* Auto-speak toggle */}
              <label className="vc-setting-row">
                <span className="vc-setting-label">Auto-speak AI Responses</span>
                <button
                  className={`vc-toggle ${settings.autoSpeak ? "on" : "off"}`}
                  onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
                  aria-label={settings.autoSpeak ? "Disable auto-speak" : "Enable auto-speak"}
                >
                  <motion.span
                    className="vc-toggle-thumb"
                    animate={{ x: settings.autoSpeak ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </label>

              {/* Voice selector */}
              <div className="vc-setting-col">
                <span className="vc-setting-label">Voice</span>
                <select
                  className="vc-select"
                  value={settings.voiceId}
                  onChange={(e) => updateSettings({ voiceId: e.target.value })}
                >
                  {MURF_VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </div>

              {/* Language selector */}
              <div className="vc-setting-col">
                <span className="vc-setting-label">Language</span>
                <select
                  className="vc-select"
                  value={settings.locale}
                  onChange={(e) => updateSettings({ locale: e.target.value })}
                >
                  <option value="en-IN">English (IN)</option>
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-AU">English (AU)</option>
                </select>
              </div>

              {/* Speed */}
              <div className="vc-setting-col">
                <div className="flex justify-between">
                  <span className="vc-setting-label">Speaking Speed</span>
                  <span className="vc-setting-value">{settings.rate.toFixed(1)}×</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={settings.rate}
                  onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
                  className="vc-range"
                />
              </div>

              {/* Volume */}
              <div className="vc-setting-col">
                <div className="flex justify-between">
                  <span className="vc-setting-label">Volume</span>
                  <span className="vc-setting-value">{settings.volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                  className="vc-range"
                />
              </div>
            </div>

            {/* Quick commands hint */}
            <div className="vc-settings-hints">
              <p className="vc-hints-label">Example Commands</p>
              <div className="vc-hints-chips">
                {[
                  "Show Mars",
                  "Open Jupiter",
                  "Compare Earth and Mars",
                  "Start Solar System tour",
                  "Show space weather",
                  "Open Mission Control",
                  "Explain black holes",
                  "Go home",
                ].map((h) => (
                  <span key={h} className="vc-hint-chip">{h}</span>
                ))}
              </div>
            </div>

            {/* Keyboard shortcut */}
            <div className="vc-settings-footer">
              <span>Alt+V to toggle voice &middot; {isSupported ? "✅ Browser STT ready" : "❌ STT not supported"}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
