"use client";
/**
 * COSMOS Voice Commander — Call-model UI
 *
 * Flow (LiveKit / Render agent available):
 *  1. "Call COSMOS-5H1" → fetches token from /api/voice/livekit-token
 *  2. Joins LiveKit room — Render agent handles STT → Gemini → Murf Abhinav
 *  3. Browser publishes mic audio; plays back agent audio automatically
 *  4. agentState badge shows: Listening / Thinking / Speaking
 *  5. "End Call" disconnects from the room
 *
 * Fallback (LiveKit not configured):
 *  Same as before — browser STT → /api/cosmos-ai → /api/voice/speak (Murf TTS)
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useVoiceSpeech } from "@/hooks/useVoiceSpeech";
import { useLiveKitVoice } from "@/hooks/useLiveKitVoice";
import { routeVoiceCommand, type VoiceCommand } from "@/lib/voice/command-router";
import { loadVoiceSettings, saveVoiceSettings, type VoiceSettings } from "@/lib/voice/voice-settings";

// ── Call state machine ─────────────────────────────────────────────────────────

type CallState = "disconnected" | "connecting" | "listening" | "processing" | "speaking" | "error";

// ── mode tracks whether we are in LiveKit-room mode or fallback mode ──────────
type VoiceMode = "livekit" | "fallback";

const CALL_LABELS: Record<CallState, string> = {
  disconnected: "Call COSMOS-5H1",
  connecting:   "Connecting…",
  listening:    "Listening…",
  processing:   "Processing…",
  speaking:     "Speaking…",
  error:        "Reconnecting…",
};

// ── Tour narration ─────────────────────────────────────────────────────────────

const TOUR_PLANETS = [
  { name: "Sun",     text: "Our Sun — a G-type main sequence star, 4.6 billion years old." },
  { name: "Mercury", text: "Mercury — the smallest planet and closest to the Sun. Extreme temperature swings." },
  { name: "Venus",   text: "Venus — Earth's toxic twin with a runaway greenhouse effect at 462 degrees." },
  { name: "Earth",   text: "Earth — our pale blue dot. The only known planet with life." },
  { name: "Mars",    text: "Mars — the Red Planet with the tallest volcano in the solar system: Olympus Mons." },
  { name: "Jupiter", text: "Jupiter — the gas giant king, over 1,300 Earths would fit inside." },
  { name: "Saturn",  text: "Saturn — the ringed wonder, its rings made of ice and rock." },
  { name: "Uranus",  text: "Uranus — an ice giant that rotates on its side." },
  { name: "Neptune", text: "Neptune — the windiest planet with storms exceeding 2,000 kilometres per hour." },
];

// ── Props ──────────────────────────────────────────────────────────────────────

interface VoiceCommanderProps {
  onOpenAI?: (query?: string) => void;
  onScrollToSolar?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function VoiceCommander({ onOpenAI, onScrollToSolar }: VoiceCommanderProps) {
  const router = useRouter();

  // ── LiveKit ────────────────────────────────────────────────────────────────
  const livekit = useLiveKitVoice();
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("fallback");

  // ── Settings ───────────────────────────────────────────────────────────────
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

  // ── Call state ─────────────────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>("disconnected");
  const callActiveRef = useRef(false); // tracks call without triggering re-renders

  // ── Conversation UI ────────────────────────────────────────────────────────
  const [transcript, setTranscript] = useState<string | null>(null);
  const [response, setResponse]     = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Tour ───────────────────────────────────────────────────────────────────
  const [tourActive, setTourActive] = useState(false);
  const [tourIndex, setTourIndex]   = useState(0);
  const tourTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── TTS ────────────────────────────────────────────────────────────────────
  const { speak, stop: stopSpeech, isSpeaking } = useVoiceSpeech();

  // ── Settings ref (stable across callbacks) ─────────────────────────────────
  const settingsRef = useRef<VoiceSettings | null>(null);
  useEffect(() => { settingsRef.current = settings; });

  // ── Banner ─────────────────────────────────────────────────────────────────
  const showMessage = useCallback((text: string, duration = 6000) => {
    setResponse(text);
    setShowBanner(true);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => setShowBanner(false), duration);
  }, []);

  // ── Speak and then restart listening (the call loop) ──────────────────────
  const speakThenListen = useCallback(
    async (text: string, s: VoiceSettings, restartSTT: () => void) => {
      if (!callActiveRef.current) return;
      setCallState("speaking");
      if (s.enabled && s.autoSpeak && text.trim()) {
        await speak(text, s);
      }
      if (!callActiveRef.current) return; // call ended during speak
      setCallState("listening");
      restartSTT();
    },
    [speak]
  );

  // ── Execute a voice command ────────────────────────────────────────────────
  const executeCommand = useCallback(
    async (cmd: VoiceCommand, s: VoiceSettings, restartSTT: () => void) => {
      if (!callActiveRef.current) return;
      setCallState("processing");
      setTranscript(cmd.transcript);

      // ── AI question ───────────────────────────────────────────────────────
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
          if (data.navigateTo) setTimeout(() => router.push(data.navigateTo!), 800);
        } catch {
          aiAnswer = "I had trouble reaching COSMOS AI. Please try again.";
        }
        onOpenAI?.(cmd.transcript);
        const spoken = aiAnswer.replace(/\*\*/g, "").replace(/#{1,6} /g, "").slice(0, 400);
        showMessage(aiAnswer.slice(0, 500));
        await speakThenListen(spoken, s, restartSTT);
        return;
      }

      // ── Open AI ───────────────────────────────────────────────────────────
      if (cmd.intent === "OPEN_AI") {
        onOpenAI?.();
        showMessage(cmd.confirmText);
        await speakThenListen(cmd.confirmText, s, restartSTT);
        return;
      }

      // ── Unknown → AI ──────────────────────────────────────────────────────
      if (cmd.intent === "UNKNOWN") {
        onOpenAI?.(cmd.transcript);
        showMessage("Let me ask COSMOS AI about that.");
        await speakThenListen("Let me ask COSMOS AI about that.", s, restartSTT);
        return;
      }

      // ── Tour start ────────────────────────────────────────────────────────
      if (cmd.intent === "START_TOUR") {
        setTourActive(true);
        setTourIndex(0);
        onScrollToSolar?.();
        showMessage("Starting Solar System tour…");
        await speakThenListen(cmd.confirmText, s, restartSTT);
        return;
      }

      // ── Tour stop ─────────────────────────────────────────────────────────
      if (cmd.intent === "STOP_TOUR") {
        setTourActive(false);
        if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
        stopSpeech();
        showMessage("Tour stopped.");
        await speakThenListen("Tour stopped.", s, restartSTT);
        return;
      }

      // ── Go back ───────────────────────────────────────────────────────────
      if (cmd.intent === "GO_BACK") {
        showMessage(cmd.confirmText);
        await speak(cmd.confirmText, s);
        router.back();
        if (callActiveRef.current) { setCallState("listening"); restartSTT(); }
        return;
      }

      // ── Navigate ──────────────────────────────────────────────────────────
      if (cmd.navigateTo) {
        showMessage(cmd.confirmText);
        await speak(cmd.confirmText, s);
        setTimeout(() => router.push(cmd.navigateTo!), 400);
        if (callActiveRef.current) { setCallState("listening"); restartSTT(); }
        return;
      }

      // ── Fallback ──────────────────────────────────────────────────────────
      showMessage(cmd.confirmText);
      await speakThenListen(cmd.confirmText, s, restartSTT);
    },
    [onOpenAI, onScrollToSolar, router, showMessage, speak, speakThenListen, stopSpeech]
  );

  // ── STT callbacks ──────────────────────────────────────────────────────────
  // We need to reference startSTT before it's created, so we use a stable ref.
  const startSTTRef = useRef<() => void>(() => {});

  const handleResult = useCallback(
    (text: string) => {
      const s = settingsRef.current;
      if (s && callActiveRef.current) {
        executeCommand(routeVoiceCommand(text), s, () => startSTTRef.current());
      }
    },
    [executeCommand]
  );

  const handleError = useCallback(
    (msg: string) => {
      if (!callActiveRef.current) return;
      setCallState("error");
      showMessage(msg, 3000);
      // Auto-retry after 3 seconds
      setTimeout(() => {
        if (callActiveRef.current) {
          setCallState("listening");
          startSTTRef.current();
        }
      }, 3000);
    },
    [showMessage]
  );

  const { start: startSTT, stop: stopSTT, isSupported } = useVoiceRecognition({
    lang: "en-IN",
    onResult: handleResult,
    onError: handleError,
  });

  // Keep the ref current
  useEffect(() => { startSTTRef.current = startSTT; }, [startSTT]);

  // ── Start call ─────────────────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    const s = settingsRef.current;
    if (!s) return;
    callActiveRef.current = true;
    setCallState("connecting");
    setTranscript(null);
    setResponse(null);
    setShowBanner(false);

    // ── Try LiveKit only if the token endpoint says it's configured ───────────
    // Do a lightweight probe first so we don't wait 5–10s to fail.
    let livekitReady = false;
    try {
      const probe = await fetch("/api/voice/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName: "cosmos-voice", participantName: `probe-${Date.now()}` }),
        signal: AbortSignal.timeout(4_000),
      });
      const data = await probe.json() as { fallback?: boolean; token?: string };
      livekitReady = !data.fallback && !!data.token;
    } catch {
      livekitReady = false;
    }

    if (livekitReady) {
      // Re-use the already-fetched token by connecting now
      const lkResult = await livekit.connect("cosmos-voice");
      if (lkResult.ok) {
        setVoiceMode("livekit");
        setCallState("listening");
        showMessage("Connected to COSMOS-5H1 via LiveKit. Start speaking!");
        return;
      }
    }

    // ── Fallback: browser STT + Murf TTS (always works) ──────────────────────
    if (!isSupported) {
      setCallState("error");
      showMessage("Microphone not supported in this browser. Use Chrome or Edge.");
      callActiveRef.current = false;
      return;
    }

    setVoiceMode("fallback");
    const greeting = "Hello! I'm COSMOS-5H1, your space assistant. Ask me anything about the universe, or say a planet name to explore it.";
    showMessage(greeting);
    setCallState("speaking");
    await speak(greeting, s);
    if (!callActiveRef.current) return;
    setCallState("listening");
    startSTT();
  }, [isSupported, livekit, showMessage, speak, startSTT]);

  // ── End call ───────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    callActiveRef.current = false;
    // Disconnect LiveKit room if we were in LiveKit mode
    if (voiceMode === "livekit") livekit.disconnect();
    stopSTT();
    stopSpeech();
    setTourActive(false);
    if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setCallState("disconnected");
    setVoiceMode("fallback");
    setTranscript(null);
    setShowBanner(false);
  }, [livekit, stopSpeech, stopSTT, voiceMode]);

  // ── Keyboard shortcut: Alt+V ───────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "KeyV") {
        e.preventDefault();
        if (callActiveRef.current) endCall(); else startCall();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [startCall, endCall]);

  // ── Tour loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tourActive || !settings) return;
    const item = TOUR_PLANETS[tourIndex];
    if (!item) { setTimeout(() => setTourActive(false), 0); return; }

    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      showMessage(`🪐 ${item.name} — ${item.text}`);
      if (settings.enabled && settings.autoSpeak) {
        await speak(`${item.name}. ${item.text}`, settings);
      }
      if (cancelled) return;
      if (tourIndex < TOUR_PLANETS.length - 1) {
        tourTimerRef.current = setTimeout(() => {
          if (!cancelled) setTourIndex((i) => i + 1);
        }, 800);
      } else {
        setTimeout(() => {
          setTourActive(false);
          showMessage("Solar System tour complete! 🚀");
        }, 0);
        if (settings.enabled && settings.autoSpeak) {
          await speak("Solar System tour complete!", settings);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      if (tourTimerRef.current) clearTimeout(tourTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, tourIndex]);

  // Don't render during SSR
  if (settings === null) return null;

  const callActive = callState !== "disconnected";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Response banner ── */}
      <AnimatePresence>
        {showBanner && response && (
          <motion.div
            className="vc-banner"
            initial={{ opacity: 0, y: 16, x: "-50%" }}
            animate={{ opacity: 1, y: 0,  x: "-50%" }}
            exit={  { opacity: 0, y: 8,   x: "-50%" }}
            transition={{ duration: 0.25 }}
          >
            <span className="vc-banner-icon">
              {callState === "speaking" ? "🔊" : callState === "listening" ? "👂" : "🧠"}
            </span>
            <span className="vc-banner-text">{response}</span>
            <button className="vc-banner-close" onClick={() => setShowBanner(false)} aria-label="Dismiss">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transcript pill ── */}
      <AnimatePresence>
        {transcript && (callState === "processing") && (
          <motion.div
            className="vc-transcript"
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0,  x: "-50%" }}
            exit={  { opacity: 0, y: 6,   x: "-50%" }}
            transition={{ duration: 0.2 }}
          >
            <span className="vc-transcript-quote">&ldquo;</span>
            {transcript}
            <span className="vc-transcript-quote">&rdquo;</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Call button area ── */}
      <div className="vc-mic-wrap">

        {/* Settings gear */}
        <motion.button
          className={`vc-settings-btn ${showSettings ? "active" : ""}`}
          onClick={() => setShowSettings((v) => !v)}
          title="Voice settings"
          aria-label="Voice settings"
          whileTap={{ scale: 0.92 }}
        >
          ⚙️
        </motion.button>

        {!callActive ? (
          /* ── Start call button ── */
          <motion.button
            className="vc-call-btn"
            onClick={startCall}
            aria-label="Call COSMOS-5H1"
            title="Call COSMOS-5H1 (Alt+V)"
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.93 }}
          >
            <span className="vc-call-icon">📞</span>
            <span className="vc-call-label">Call COSMOS-5H1</span>
          </motion.button>
        ) : (
          /* ── Active call (state indicator + end-call) ── */
          <div className="vc-active-call">
            {/* Mode badge */}
            {voiceMode === "livekit" && (
              <span className="vc-livekit-badge">⚡ LiveKit</span>
            )}

            {/* Status indicator — in LiveKit mode show agent state */}
            <div className={`vc-status-btn ${
              voiceMode === "livekit"
                ? livekit.agentState   // "listening" | "thinking" | "speaking" | "idle"
                : callState
            }`}>
              {/* Pulse ring while listening */}
              {(voiceMode === "livekit"
                  ? livekit.agentState === "listening"
                  : callState === "listening") && (
                <motion.span
                  className="vc-pulse-ring"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
              <motion.span
                className="vc-mic-icon"
                key={voiceMode === "livekit" ? livekit.agentState : callState}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                {(voiceMode === "livekit" ? livekit.agentState : callState) === "listening"  ? "👂" :
                 (voiceMode === "livekit" ? livekit.agentState : callState) === "thinking"   ? "🧠" :
                 (voiceMode === "livekit" ? livekit.agentState : callState) === "processing" ? "🧠" :
                 (voiceMode === "livekit" ? livekit.agentState : callState) === "speaking"   ? "🔊" :
                 callState === "connecting" ? "⏳" : "⚡"}
              </motion.span>
              <span className="vc-mic-label">
                {voiceMode === "livekit"
                  ? livekit.agentState.charAt(0).toUpperCase() + livekit.agentState.slice(1) + "…"
                  : CALL_LABELS[callState]}
              </span>
            </div>

            {/* End call */}
            <motion.button
              className="vc-end-call-btn"
              onClick={endCall}
              aria-label="End call"
              title="End call (Alt+V)"
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.93 }}
            >
              <span className="vc-call-icon">📵</span>
              <span className="vc-call-label">End Call</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Settings panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="vc-settings-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={  { opacity: 0, y: 8,   scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="vc-settings-header">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎙</span>
                <span className="vc-settings-title">Abhinav · Voice Settings</span>
              </div>
              <button className="vc-settings-close" onClick={() => setShowSettings(false)} aria-label="Close">✕</button>
            </div>

            {/* Body */}
            <div className="vc-settings-body">
              {/* Auto-speak toggle */}
              <label className="vc-setting-row">
                <span className="vc-setting-label">Auto-speak Responses</span>
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

              {/* Speed */}
              <div className="vc-setting-col">
                <div className="flex justify-between">
                  <span className="vc-setting-label">Speaking Speed</span>
                  <span className="vc-setting-value">{settings.rate.toFixed(1)}×</span>
                </div>
                <input
                  type="range" min="0.5" max="2.0" step="0.1"
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
                  type="range" min="0" max="100" step="5"
                  value={settings.volume}
                  onChange={(e) => updateSettings({ volume: parseInt(e.target.value) })}
                  className="vc-range"
                />
              </div>

              {/* Voice info (read-only badge) */}
              <div className="vc-setting-row" style={{ marginTop: "0.25rem" }}>
                <span className="vc-setting-label">Voice</span>
                <span className="vc-voice-badge">COSMOS-5H1</span>
              </div>
            </div>

            {/* Example commands */}
            <div className="vc-settings-hints">
              <p className="vc-hints-label">Example Commands</p>
              <div className="vc-hints-chips">
                {["Show Mars", "Open Jupiter", "Compare Earth and Mars",
                  "Start Solar System tour", "Show space weather",
                  "Open Mission Control", "Explain black holes", "Go home",
                ].map((h) => (
                  <span key={h} className="vc-hint-chip">{h}</span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="vc-settings-footer">
              <span>Alt+V to call / end call &middot; {isSupported ? "✅ Mic ready" : "❌ Mic not supported"}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
