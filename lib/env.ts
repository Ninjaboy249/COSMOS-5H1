/**
 * COSMOS-5H1 — Environment variable accessor
 * Safe, typed access to env vars. Never throws — returns null for missing keys.
 * All optional: the app degrades gracefully when keys are absent.
 */

export const env = {
  /** NASA API key — falls back to DEMO_KEY (rate-limited but functional) */
  NASA_API_KEY: process.env.NASA_API_KEY ?? "DEMO_KEY",

  /** OpenAI API key — undefined when not set (triggers offline mode) */
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? null,

  /** OpenAI model — defaults to gpt-4o-mini */
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  /** Python backend URL for IBM Granite via Ollama */
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000",

  /** Whether OpenAI is available */
  get hasOpenAI(): boolean {
    return !!this.OPENAI_API_KEY && this.OPENAI_API_KEY.startsWith("sk-");
  },
};
