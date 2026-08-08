/**
 * COSMOS Voice — Settings store
 * Persists voice preferences to localStorage.
 * Pure TypeScript — no React imports.
 */

export interface VoiceSettings {
  enabled: boolean;
  voiceId: string;
  style: string;    // e.g. "Conversational", "Promo", "Narration"
  modelVersion: string; // Murf model: "GEN1" | "GEN2" (Falcon)
  locale: string;
  rate: number;     // 0.5–2.0
  volume: number;   // 0–100
  autoSpeak: boolean; // auto-speak AI responses
}

const DEFAULT_SETTINGS: VoiceSettings = {
  enabled: true,
  voiceId: "en-IN-abhinav",
  style: "Conversation",   // Murf API exact value — NOT "Conversational"
  modelVersion: "GEN2",
  locale: "en-IN",
  rate: 1.0,
  volume: 80,
  autoSpeak: true,
};

const STORAGE_KEY = "cosmos-voice-settings";

export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const stored = JSON.parse(raw) as Partial<VoiceSettings>;
    // Migrate: reset if pre-dates style/modelVersion, or if style is the
    // old incorrect value "Conversational" (Murf rejects it).
    if (!stored.style || !stored.modelVersion || stored.style === "Conversational") {
      localStorage.removeItem(STORAGE_KEY);
      return { ...DEFAULT_SETTINGS };
    }
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveVoiceSettings(settings: Partial<VoiceSettings>): VoiceSettings {
  const current = loadVoiceSettings();
  const next = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* storage full — ignore */ }
  return next;
}

/** Available Murf voice options shown in the settings UI */
export const MURF_VOICE_OPTIONS = [
  { id: "en-IN-abhinav", label: "Abhinav (IN)" },
  { id: "en-US-natalie", label: "Natalie (US)" },
  { id: "en-US-terrell", label: "Terrell (US)" },
  { id: "en-US-miles", label: "Miles (US)" },
  { id: "en-GB-hazel", label: "Hazel (UK)" },
  { id: "en-GB-george", label: "George (UK)" },
  { id: "en-AU-evander", label: "Evander (AU)" },
] as const;
