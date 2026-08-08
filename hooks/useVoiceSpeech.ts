"use client";
/**
 * COSMOS Voice — Simple TTS hook
 *
 * Strategy that actually works across all browsers:
 *   1. On first user click → create + store a persistent <audio> element.
 *      This creation happens synchronously in the gesture, permanently
 *      whitelisting it for autoplay.
 *   2. To speak: fetch Murf audio, set audio.src = objectURL, call play().
 *      Because the <audio> element was born from a gesture it can play
 *      freely forever, even after awaits.
 *   3. Fallback: browser speechSynthesis if Murf fails.
 */

import { useState, useRef, useCallback } from "react";
import type { VoiceSettings } from "@/lib/voice/voice-settings";

export type TTSState = "idle" | "fetching" | "speaking";

interface UseVoiceSpeechReturn {
  state: TTSState;
  /** Must be called synchronously inside a user gesture the very first time */
  initAudio: () => void;
  speak: (text: string, settings: VoiceSettings) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
}

export function useVoiceSpeech(): UseVoiceSpeechReturn {
  const [state, setState] = useState<TTSState>("idle");
  // Persistent <audio> element born from a user gesture — never blocked
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  /** Call this synchronously from a button click to create + unlock the audio element */
  const initAudio = useCallback(() => {
    if (audioElRef.current) return; // already initialised
    const el = document.createElement("audio");
    el.preload = "auto";
    // Play a silent data URI to whitelist the element for future autoplay
    el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    el.volume = 1;
    el.play().catch(() => {}); // may fail silently — that's fine, element is now unlocked
    audioElRef.current = el;
  }, []);

  const stop = useCallback(() => {
    const el = audioElRef.current;
    if (el) {
      el.pause();
      el.src = "";
    }
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setState("idle");
  }, []);

  const speakBrowser = useCallback((text: string, settings: VoiceSettings): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang   = settings.locale;
      utt.rate   = settings.rate;
      utt.volume = settings.volume / 100;
      utt.onend   = () => { setState("idle"); resolve(); };
      utt.onerror = () => { setState("idle"); resolve(); };
      setState("speaking");
      window.speechSynthesis.speak(utt);
    });
  }, []);

  const speak = useCallback(async (text: string, settings: VoiceSettings): Promise<void> => {
    if (!text.trim()) return;
    stop();
    setState("fetching");

    const clean = text.replace(/\*\*/g, "").replace(/#{1,6} ?/g, "").trim();

    // ── Try Murf ────────────────────────────────────────────────────────────
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text:         clean,
          voiceId:      settings.voiceId,
          style:        settings.style,
          modelVersion: settings.modelVersion,
          locale:       settings.locale,
          rate:         settings.rate,
          volume:       settings.volume,
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (res.ok && (res.headers.get("content-type") ?? "").includes("audio")) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        currentUrlRef.current = url;

        // Get or create audio element
        let el = audioElRef.current;
        if (!el) {
          // Fallback create — may be blocked if no prior gesture, but we try
          el = document.createElement("audio");
          audioElRef.current = el;
        }

        el.src    = url;
        el.volume = settings.volume / 100;

        setState("speaking");

        await new Promise<void>((resolve) => {
          el!.onended = () => {
            URL.revokeObjectURL(url);
            currentUrlRef.current = null;
            setState("idle");
            resolve();
          };
          el!.onerror = () => {
            URL.revokeObjectURL(url);
            currentUrlRef.current = null;
            setState("idle");
            resolve();
          };
          const playPromise = el!.play();
          if (playPromise) {
            playPromise.catch((err) => {
              console.error("[TTS] play() blocked:", err);
              // If still blocked, fall through to browser TTS
              URL.revokeObjectURL(url);
              currentUrlRef.current = null;
              setState("idle");
              resolve();
            });
          }
        });
        return;
      }
    } catch (err) {
      console.warn("[TTS] Murf failed:", err);
    }

    // ── Fallback: browser TTS ───────────────────────────────────────────────
    await speakBrowser(clean, settings);
  }, [stop, speakBrowser]);

  return { state, initAudio, speak, stop, isSpeaking: state === "speaking" };
}
