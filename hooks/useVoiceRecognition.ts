"use client";
/**
 * COSMOS Voice — Speech-to-Text hook
 * Uses the browser's native Web Speech API (SpeechRecognition).
 * Falls back gracefully when the API is unavailable.
 *
 * Returns helpers to start/stop listening plus state flags.
 */

import { useState, useRef, useCallback } from "react";

export type STTState = "idle" | "listening" | "processing" | "error" | "unsupported";

interface UseVoiceRecognitionOptions {
  lang?: string;
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
}

export interface UseVoiceRecognitionReturn {
  state: STTState;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  errorMessage: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAPI = any;

function detectSpeechSupport(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(((window as any).SpeechRecognition) || ((window as any).webkitSpeechRecognition));
}

// Detect support synchronously once (not during render of a component)
const _isSupportedInitial = detectSpeechSupport();
const _stateInitial: STTState = _isSupportedInitial ? "idle" : "unsupported";

export function useVoiceRecognition({
  lang = "en-US",
  onResult,
  onError,
}: UseVoiceRecognitionOptions): UseVoiceRecognitionReturn {
  const [state, setState] = useState<STTState>(_stateInitial);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionAPI>(null);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch { /* ignore */ }
    setState("idle");
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;

    const SR =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;

    if (!SR) {
      const msg =
        "Voice recognition is not supported in this browser. Please use Chrome or Edge.";
      setErrorMessage(msg);
      setState("unsupported");
      onError?.(msg);
      return;
    }

    // Stop any in-progress recognition
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }

    const recognition = new SR() as SpeechRecognitionAPI;
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setState("listening");
      setErrorMessage(null);
    };

    recognition.onresult = (event: SpeechRecognitionAPI) => {
      const transcript: string = event.results[0][0].transcript;
      setState("processing");
      onResult(transcript);
    };

    recognition.onerror = (event: SpeechRecognitionAPI) => {
      let msg = "Voice recognition error.";
      if (event.error === "not-allowed" || event.error === "permission-denied") {
        msg = "Microphone permission is required for voice commands.";
      } else if (event.error === "no-speech") {
        msg = "No speech detected. Please try again.";
      } else if (event.error === "audio-capture") {
        msg = "No microphone found. Please connect a microphone.";
      } else if (event.error === "network") {
        msg = "Network error during voice recognition.";
      }
      setErrorMessage(msg);
      setState("error");
      onError?.(msg);
    };

    recognition.onend = () => {
      if (state === "listening") {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setState("error");
      setErrorMessage("Could not start voice recognition.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, onResult, onError]);

  return {
    state,
    isListening: state === "listening",
    isSupported: _isSupportedInitial,
    start,
    stop,
    errorMessage,
  };
}
