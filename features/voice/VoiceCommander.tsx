"use client";
/**
 * COSMOS Voice — Simple push-to-talk widget
 *
 * Press "Speak" → mic records → COSMOS AI replies → Murf Rohan speaks.
 * Press the button again or "Stop" to interrupt.
 * No call state machine. No LiveKit. No autoplay race conditions.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useVoiceSpeech } from "@/hooks/useVoiceSpeech";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { routeVoiceCommand } from "@/lib/voice/command-router";
import { loadVoiceSettings, saveVoiceSettings, type VoiceSettings } from "@/lib/voice/voice-settings";

// ── Tour narration ─────────────────────────────────────────────────────────────

const TOUR_PLANETS = [
  { name: "Sun",     text: "Our Sun — a G-type main sequence star, 4.6 billion years old." },
  { name: "Mercury", text: "Mercury — the smallest planet, closest to the Sun." },
  { name: "Venus",   text: "Venus — Earth's toxic twin with a runaway greenhouse effect." },
  { name: "Earth",   text: "Earth — our pale blue dot. The only known planet with life." },
  { name: "Mars",    text: "Mars — the Red Planet with the tallest volcano, Olympus Mons." },
  { name: "Jupiter", text: "Jupiter — the gas giant king. Over 1,300 Earths fit inside." },
  { name: "Saturn",  text: "Saturn — the ringed wonder, rings made of ice and rock." },
  { name: "Uranus",  text: "Uranus — an ice giant that rotates on its side." },
  { name: "Neptune", text: "Neptune — the windiest planet, storms over 2,000 kilometres per hour." },
];

interface VoiceCommanderProps {
  onOpenAI?: (query?: string) => void;
  onScrollToSolar?: () => void;
}

type UIState = "idle" | "listening" | "thinking" | "speaking";

export default function VoiceCommander({ onOpenAI, onScrollToSolar }: VoiceCommanderProps) {
  const router = useRouter();

  // ── Settings ───────────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<VoiceSettings | null>(
    () => typeof window !== "undefined" ? loadVoiceSettings() : null
  );
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<VoiceSettings | null>(null);
  useEffect(() => { settingsRef.current = settings; });

  const updateSettings = useCallback((patch: Partial<VoiceSettings>) => {
    setSettings(prev => {
      const next = saveVoiceSettings({ ...(prev ?? {}), ...patch });
      return next;
    });
  }, []);

  // ── TTS + STT ──────────────────────────────────────────────────────────────
  const { speak, stop: stopSpeech, isSpeaking, initAudio } = useVoiceSpeech();
  const [uiState, setUiState] = useState<UIState>("idle");

  // ── Transcript + response display ─────────────────────────────────────────
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastResponse,   setLastResponse]   = useState("");
  const [showPanel,      setShowPanel]       = useState(false);

  // ── Tour ───────────────────────────────────────────────────────────────────
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex,  setTourIndex]  = useState(0);
  const tourCancelRef = useRef(false);

  // ── Keep uiState in sync with TTS state ───────────────────────────────────
  useEffect(() => {
    if (isSpeaking) setUiState("speaking");
    else if (uiState === "speaking") setUiState("idle");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  // ── Handle a recognised transcript ────────────────────────────────────────
  const handleTranscript = useCallback(async (transcript: string) => {
    const s = settingsRef.current;
    if (!s) return;

    setLastTranscript(transcript);
    setUiState("thinking");
    setShowPanel(true);

    const cmd = routeVoiceCommand(transcript);

    // Navigation / app shortcuts
    if (cmd.intent !== "AI_QUESTION" && cmd.intent !== "UNKNOWN" && cmd.intent !== "OPEN_AI") {
      if (cmd.intent === "START_TOUR") {
        setTourActive(true); setTourIndex(0); tourCancelRef.current = false;
        onScrollToSolar?.();
      } else if (cmd.intent === "STOP_TOUR") {
        tourCancelRef.current = true; setTourActive(false); stopSpeech();
      } else if (cmd.intent === "GO_BACK") {
        router.back();
      } else if (cmd.navigateTo) {
        setTimeout(() => router.push(cmd.navigateTo!), 400);
      }
      setLastResponse(cmd.confirmText);
      setUiState("speaking");
      await speak(cmd.confirmText, s);
      setUiState("idle");
      return;
    }

    // AI question
    try {
      const res = await fetch("/api/cosmos-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcript, history: [] }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json() as { answer: string; navigateTo?: string };
      const answer = data.answer ?? "I couldn't find an answer.";
      if (data.navigateTo) setTimeout(() => router.push(data.navigateTo!), 800);
      onOpenAI?.(transcript);
      setLastResponse(answer);
      const spoken = answer.replace(/\*\*/g, "").replace(/#{1,6} ?/g, "").slice(0, 400);
      setUiState("speaking");
      await speak(spoken, s);
    } catch {
      setLastResponse("I had trouble reaching COSMOS AI. Please try again.");
      await speak("I had trouble reaching COSMOS AI.", s);
    }
    setUiState("idle");
  }, [onOpenAI, onScrollToSolar, router, speak, stopSpeech]);

  // ── STT ────────────────────────────────────────────────────────────────────
  const { start: startSTT, stop: stopSTT, isSupported, isListening } = useVoiceRecognition({
    lang: settings?.locale ?? "en-IN",
    onResult: (t) => { stopSTT(); handleTranscript(t); },
    onError:  (m) => { setLastResponse(m); setUiState("idle"); },
  });

  // ── Tour loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tourActive || !settings) return;
    const item = TOUR_PLANETS[tourIndex];
    if (!item || tourCancelRef.current) { setTourActive(false); return; }
    let cancelled = false;
    (async () => {
      setLastResponse(`${item.name} — ${item.text}`);
      setShowPanel(true);
      setUiState("speaking");
      await speak(`${item.name}. ${item.text}`, settings);
      if (cancelled || tourCancelRef.current) return;
      if (tourIndex < TOUR_PLANETS.length - 1) {
        setTimeout(() => { if (!cancelled) setTourIndex(i => i + 1); }, 600);
      } else {
        setTourActive(false);
        setLastResponse("Solar System tour complete!");
        await speak("Solar System tour complete!", settings);
        setUiState("idle");
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourIndex]);

  // ── Main button click ──────────────────────────────────────────────────────
  const handleButtonClick = useCallback(() => {
    // Always init audio synchronously on click — this is the user gesture
    initAudio();

    if (uiState === "speaking") {
      stopSpeech();
      setUiState("idle");
      return;
    }
    if (uiState === "listening") {
      stopSTT();
      setUiState("idle");
      return;
    }
    if (uiState === "thinking") return; // wait for AI

    // Start listening
    if (!isSupported) {
      setLastResponse("Voice not supported. Use Chrome or Edge.");
      setShowPanel(true);
      return;
    }
    setUiState("listening");
    startSTT();
  }, [uiState, isSupported, initAudio, startSTT, stopSTT, stopSpeech]);

  // ── Alt+V shortcut ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyV") { e.preventDefault(); handleButtonClick(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [handleButtonClick]);

  if (settings === null) return null;

  // ── Button appearance ──────────────────────────────────────────────────────
  const btnIcon  = uiState === "listening" ? "🔴"
                 : uiState === "thinking"  ? "🧠"
                 : uiState === "speaking"  ? "🔊"
                 : "🎙️";
  const btnLabel = uiState === "listening" ? "Listening…"
                 : uiState === "thinking"  ? "Thinking…"
                 : uiState === "speaking"  ? "Stop"
                 : "Speak";
  const btnClass = `vc-call-btn ${uiState !== "idle" ? uiState : ""}`;

  return (
    <>
      {/* ── Response panel ── */}
      <AnimatePresence>
        {showPanel && (lastTranscript || lastResponse) && (
          <motion.div
            className="vc-banner"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0,  x: "-50%" }}
            exit={{ opacity: 0, y: 8, x: "-50%" }}
            transition={{ duration: 0.25 }}
          >
            {lastTranscript && (
              <p className="vc-banner-you">
                <span style={{ opacity: 0.5, fontSize: "0.7rem", marginRight: "0.4rem" }}>YOU</span>
                {lastTranscript}
              </p>
            )}
            {lastResponse && (
              <p className="vc-banner-text">{lastResponse}</p>
            )}
            <button className="vc-banner-close" onClick={() => setShowPanel(false)} aria-label="Close">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Widget ── */}
      <div className="vc-mic-wrap">
        {/* Settings gear */}
        <motion.button
          className={`vc-settings-btn ${showSettings ? "active" : ""}`}
          onClick={() => setShowSettings(v => !v)}
          title="Voice settings"
          whileTap={{ scale: 0.92 }}
        >⚙️</motion.button>

        {/* Main speak button */}
        <motion.button
          className={btnClass}
          onClick={handleButtonClick}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          title={`${btnLabel} (Alt+V)`}
        >
          {uiState === "listening" && (
            <motion.span
              className="vc-pulse-ring"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          <motion.span
            className="vc-mic-icon"
            key={uiState}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >{btnIcon}</motion.span>
          <span className="vc-call-label">{btnLabel}</span>
        </motion.button>
      </div>

      {/* ── Settings panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="vc-settings-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="vc-settings-header">
              <div className="flex items-center gap-2">
                <span>🎙</span>
                <span className="vc-settings-title">COSMOS Voice</span>
              </div>
              <button className="vc-settings-close" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            <div className="vc-settings-body">
              {/* Auto-speak */}
              <label className="vc-setting-row">
                <span className="vc-setting-label">Auto-speak Responses</span>
                <button
                  className={`vc-toggle ${settings.autoSpeak ? "on" : "off"}`}
                  onClick={() => updateSettings({ autoSpeak: !settings.autoSpeak })}
                >
                  <motion.span
                    className="vc-toggle-thumb"
                    animate={{ x: settings.autoSpeak ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </label>

              {/* Speed */}
              <div className="vc-setting-col">
                <div className="flex justify-between">
                  <span className="vc-setting-label">Speed</span>
                  <span className="vc-setting-value">{settings.rate.toFixed(1)}×</span>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.1"
                  value={settings.rate}
                  onChange={e => updateSettings({ rate: parseFloat(e.target.value) })}
                  className="vc-range" />
              </div>

              {/* Volume */}
              <div className="vc-setting-col">
                <div className="flex justify-between">
                  <span className="vc-setting-label">Volume</span>
                  <span className="vc-setting-value">{settings.volume}%</span>
                </div>
                <input type="range" min="0" max="100" step="5"
                  value={settings.volume}
                  onChange={e => updateSettings({ volume: parseInt(e.target.value) })}
                  className="vc-range" />
              </div>

              <div className="vc-setting-row" style={{ marginTop: "0.25rem" }}>
                <span className="vc-setting-label">Voice</span>
                <span className="vc-voice-badge">COSMOS-5H1 · Rohan</span>
              </div>
            </div>

            <div className="vc-settings-hints">
              <p className="vc-hints-label">Try saying…</p>
              <div className="vc-hints-chips">
                {["Show Mars","Open Jupiter","Compare Earth and Mars",
                  "Start Solar System tour","Explain black holes","Go home"
                ].map(h => <span key={h} className="vc-hint-chip">{h}</span>)}
              </div>
            </div>

            <div className="vc-settings-footer">
              Alt+V to speak · {isSupported ? "✅ Mic ready" : "❌ Use Chrome/Edge"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
