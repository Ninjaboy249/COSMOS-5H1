/**
 * COSMOS-5H1 — Environment variable accessor
 * Safe, typed access to env vars. Never throws — returns null for missing keys.
 * All optional: the app degrades gracefully when keys are absent.
 *
 * ALL secret keys are read server-side only (no NEXT_PUBLIC_ prefix).
 * Never import this module in client components — use API routes instead.
 */

export const env = {
  // ── NASA ──────────────────────────────────────────────────────────────────
  /** NASA API key — falls back to DEMO_KEY (rate-limited but functional) */
  NASA_API_KEY: process.env.NASA_API_KEY ?? "DEMO_KEY",

  // ── IBM Granite local backend ─────────────────────────────────────────────
  /**
   * URL of the local IBM Granite backend (backend/main.py via Ollama).
   * Defaults to http://localhost:8000. When the backend is unreachable the
   * app falls back to the offline TF-IDF RAG engine automatically.
   */
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",

  // ── Optional voice-feature keys ───────────────────────────────────────────
  /** Murf TTS API key — null when not set (browser speechSynthesis fallback) */
  MURF_API_KEY: process.env.MURF_API_KEY ?? null,

  /** Deepgram STT API key — null when not set (browser Web Speech API fallback) */
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ?? null,

  /** LiveKit API key */
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? null,

  /** LiveKit API secret */
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? null,

  /** LiveKit server URL */
  LIVEKIT_URL: process.env.LIVEKIT_URL ?? null,

  // ── Derived capability flags ───────────────────────────────────────────────
  /**
   * IBM Granite is always "available" — we attempt the local backend and fall
   * back gracefully if it is not running. No API key needed.
   */
  get hasGranite(): boolean {
    return true;
  },

  /** Whether LiveKit real-time voice is available */
  get hasLiveKit(): boolean {
    return !!this.LIVEKIT_API_KEY && !!this.LIVEKIT_API_SECRET && !!this.LIVEKIT_URL;
  },

  /** Whether Murf TTS is available */
  get hasMurf(): boolean {
    return !!this.MURF_API_KEY;
  },

  /** Whether Deepgram STT is available */
  get hasDeepgram(): boolean {
    return !!this.DEEPGRAM_API_KEY;
  },
};
