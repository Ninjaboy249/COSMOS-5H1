"use client";
/**
 * COSMOS Voice — Text-to-Speech hook
 *
 * Pipeline:
 *   1. Try Murf AI via /api/voice/speak (server-side, secure)
 *   2. If Murf returns { fallback: true } or fails → browser speechSynthesis
 *   3. If browser speechSynthesis unavailable → silently skip TTS
 *
 * Autoplay fix: uses a shared AudioContext unlocked on first user gesture,
 * then decodes the Murf MP3 through it to bypass browser autoplay policy.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { VoiceSettings } from "@/lib/voice/voice-settings";

export type TTSState = "idle" | "fetching" | "speaking" | "error";

interface UseVoiceSpeechReturn {
  state: TTSState;
  speak: (text: string, settings: VoiceSettings) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
}

// ── Shared AudioContext — unlocked once on any user gesture ───────────────────
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContext();
  }
  return sharedAudioCtx;
}

/** Call once from a click handler to pre-unlock audio on iOS/Safari/Chrome */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // Play a silent buffer — this is the standard iOS unlock trick
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore — not all browsers support AudioContext */ }
}

export function useVoiceSpeech(): UseVoiceSpeechReturn {
  const [state, setState] = useState<TTSState>("idle");
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const utteranceRef  = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Unlock audio on mount via a silent user-interaction listener ───────────
  useEffect(() => {
    const unlock = () => { unlockAudio(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const stop = useCallback(() => {
    try {
      sourceNodeRef.current?.stop();
      sourceNodeRef.current?.disconnect();
    } catch { /* already stopped */ }
    sourceNodeRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }, []);

  /** Browser speech synthesis fallback */
  const speakBrowser = useCallback(
    (text: string, settings: VoiceSettings): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !window.speechSynthesis) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang   = settings.locale;
        utterance.rate   = settings.rate;
        utterance.volume = settings.volume / 100;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) => v.lang.startsWith(settings.locale.split("-")[0]) && !v.localService === false
        );
        if (preferred) utterance.voice = preferred;
        utteranceRef.current = utterance;
        utterance.onstart = () => setState("speaking");
        utterance.onend   = () => { setState("idle"); resolve(); };
        utterance.onerror = () => { setState("idle"); resolve(); };
        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  /** Play ArrayBuffer audio through AudioContext (bypasses autoplay policy) */
  const playViaAudioContext = useCallback(
    (audioData: ArrayBuffer, settings: VoiceSettings): Promise<void> => {
      return new Promise(async (resolve) => {
        try {
          const ctx = getAudioContext();
          // Resume if suspended (required after page load on some browsers)
          if (ctx.state === "suspended") await ctx.resume();

          const decoded = await ctx.decodeAudioData(audioData);
          const source  = ctx.createBufferSource();
          source.buffer = decoded;
          // Apply playback rate from settings (0.5–2.0)
          source.playbackRate.value = settings.rate;

          // Volume via GainNode
          const gain = ctx.createGain();
          gain.gain.value = settings.volume / 100;
          source.connect(gain);
          gain.connect(ctx.destination);

          sourceNodeRef.current = source;
          setState("speaking");

          source.onended = () => {
            setState("idle");
            resolve();
          };
          source.start(0);
        } catch (err) {
          console.error("[TTS/AudioContext] playback failed:", err);
          setState("idle");
          resolve();
        }
      });
    },
    []
  );

  const speak = useCallback(
    async (text: string, settings: VoiceSettings): Promise<void> => {
      if (!text.trim() || !settings.enabled) return;

      stop();
      setState("fetching");

      const trimmed = text.replace(/\*\*/g, "").replace(/#{1,3} /g, "").trim();

      // ── Try Murf via /api/voice/speak ─────────────────────────────────────
      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text:         trimmed,
            voiceId:      settings.voiceId,
            style:        settings.style,
            modelVersion: settings.modelVersion,
            locale:       settings.locale,
            rate:         settings.rate,
            volume:       settings.volume,
          }),
          signal: AbortSignal.timeout(20_000),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (res.ok && contentType.includes("audio")) {
          // Use AudioContext to play — bypasses browser autoplay block
          const arrayBuf = await res.arrayBuffer();
          await playViaAudioContext(arrayBuf, settings);
          return;
        }

        // Murf returned fallback JSON — use browser TTS
        if (res.ok) {
          await speakBrowser(trimmed, settings);
          return;
        }
      } catch (err) {
        console.warn("[TTS/Murf] fetch failed, using browser TTS:", err);
      }

      // ── Browser TTS fallback ───────────────────────────────────────────────
      try {
        await speakBrowser(trimmed, settings);
      } catch {
        setState("idle");
      }
    },
    [stop, speakBrowser, playViaAudioContext]
  );

  return { state, speak, stop, isSpeaking: state === "speaking" };
}
