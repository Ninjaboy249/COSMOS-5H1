"use client";
/**
 * COSMOS Voice — Text-to-Speech hook
 *
 * Pipeline:
 *   1. Try Murf AI via /api/voice/speak (server-side, secure)
 *   2. If Murf returns { fallback: true } or fails → browser speechSynthesis
 *   3. If browser speechSynthesis unavailable → silently skip TTS
 *
 * Never crashes the application if speech is unavailable.
 */

import { useState, useRef, useCallback } from "react";
import type { VoiceSettings } from "@/lib/voice/voice-settings";

export type TTSState = "idle" | "fetching" | "speaking" | "error";

interface UseVoiceSpeechReturn {
  state: TTSState;
  speak: (text: string, settings: VoiceSettings) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
}

export function useVoiceSpeech(): UseVoiceSpeechReturn {
  const [state, setState] = useState<TTSState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    // Stop HTML audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    // Stop browser TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }, []);

  /** Browser speech synthesis fallback */
  const speakBrowser = useCallback(
    (text: string, settings: VoiceSettings): Promise<void> => {
      return new Promise((resolve) => {
        if (
          typeof window === "undefined" ||
          !window.speechSynthesis
        ) {
          resolve();
          return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = settings.locale;
        utterance.rate = settings.rate;
        utterance.volume = settings.volume / 100;

        // Try to pick a matching voice
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) => v.lang.startsWith(settings.locale.split("-")[0]) && !v.localService === false
        );
        if (preferred) utterance.voice = preferred;

        utteranceRef.current = utterance;

        utterance.onstart = () => setState("speaking");
        utterance.onend = () => { setState("idle"); resolve(); };
        utterance.onerror = () => { setState("idle"); resolve(); };

        window.speechSynthesis.speak(utterance);
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

      // ── Try Murf via /api/voice/speak ────────────────────────────────────
      try {
        const res = await fetch("/api/voice/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: trimmed,
            voiceId: settings.voiceId,
            style: settings.style,
            modelVersion: settings.modelVersion,
            locale: settings.locale,
            rate: settings.rate,
            volume: settings.volume,
          }),
          signal: AbortSignal.timeout(15_000),
        });

        // Check if Murf returned audio binary
        const contentType = res.headers.get("content-type") ?? "";
        if (res.ok && contentType.includes("audio")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audioRef.current = audio;

          audio.volume = settings.volume / 100;
          audio.playbackRate = settings.rate;

          setState("speaking");

          await new Promise<void>((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(url);
              setState("idle");
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              setState("idle");
              resolve();
            };
            audio.play().catch(() => {
              URL.revokeObjectURL(url);
              setState("idle");
              resolve();
            });
          });
          return;
        }

        // Murf returned fallback JSON — use browser TTS
        if (res.ok) {
          await speakBrowser(trimmed, settings);
          return;
        }
      } catch {
        // Network / timeout error — fall through to browser TTS
      }

      // ── Browser TTS fallback ─────────────────────────────────────────────
      try {
        await speakBrowser(trimmed, settings);
      } catch {
        setState("idle");
      }
    },
    [stop, speakBrowser]
  );

  return {
    state,
    speak,
    stop,
    isSpeaking: state === "speaking",
  };
}
