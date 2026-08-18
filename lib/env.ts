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

  // ── OpenAI ────────────────────────────────────────────────────────────────
  /** OpenAI API key — null when not set (triggers offline TF-IDF mode) */
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? null,

  /** OpenAI model — defaults to gpt-4o-mini */
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  // ── IBM Granite (Groq) ─────────────────────────────────────────────────────
  /** Groq API key — enables IBM Granite 3.3 via Groq cloud inference */
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? null,

  /** Groq model — IBM Granite 3.3 8B Instruct */
  GROQ_MODEL: process.env.GROQ_MODEL ?? "ibm-granite/granite-3.3-8b-instruct",

  // ── Murf TTS ──────────────────────────────────────────────────────────────
  /** Murf AI API key — null when not set (browser speechSynthesis fallback) */
  MURF_API_KEY: process.env.MURF_API_KEY ?? null,

  // ── Deepgram STT ──────────────────────────────────────────────────────────
  /** Deepgram API key — null when not set (browser Web Speech API fallback) */
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ?? null,

  // ── LiveKit ───────────────────────────────────────────────────────────────
  /** LiveKit API key — null when not set (non-LiveKit voice used instead) */
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ?? null,

  /**
   * LiveKit API secret — null when not set.
   * MUST stay server-side. Never send to the client.
   * Use /api/voice/livekit-token to issue short-lived client tokens.
   */
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET ?? null,

  /** LiveKit server URL — null when not set */
  LIVEKIT_URL: process.env.LIVEKIT_URL ?? null,

  // ── Backend ───────────────────────────────────────────────────────────────
  /**
   * Python backend URL for IBM Granite via Ollama.
   * Uses NEXT_PUBLIC_ because the server-side route handler reads it at
   * build time; it is a URL, not a secret.
   */
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",

  // ── Derived capability flags ───────────────────────────────────────────────
  /** Whether IBM Granite via Groq cloud is available */
  get hasGranite(): boolean {
    return !!this.GROQ_API_KEY;
  },

  /** Whether OpenAI is available */
  get hasOpenAI(): boolean {
    return !!this.OPENAI_API_KEY && this.OPENAI_API_KEY.startsWith("sk-");
  },

  /** Whether Murf TTS is available */
  get hasMurf(): boolean {
    return !!this.MURF_API_KEY;
  },

  /** Whether Deepgram STT is available */
  get hasDeepgram(): boolean {
    return !!this.DEEPGRAM_API_KEY;
  },

  /** Whether LiveKit real-time voice is available */
  get hasLiveKit(): boolean {
    return !!this.LIVEKIT_API_KEY && !!this.LIVEKIT_API_SECRET && !!this.LIVEKIT_URL;
  },
};
