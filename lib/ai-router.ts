/**
 * COSMOS-5H1 — AI Abstraction Layer
 * Automatically routes between:
 *   Offline: Local TF-IDF RAG (always available, zero cost)
 *   Online:  OpenAI API (when OPENAI_API_KEY is set)
 *
 * The caller never needs to know which mode is active.
 */

import { env } from "@/lib/env";

export type AIMode = "offline" | "openai";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIRouterResponse {
  answer: string;
  mode: AIMode;
  model: string;
}

// ── System prompt for OpenAI (space-domain context) ──────────────────────────
const SYSTEM_PROMPT = `You are COSMOS AI, an expert space science assistant for the COSMOS-5H1 platform.
You have deep knowledge of:
- All planets, moons, asteroids, comets, and dwarf planets in our solar system
- Stars, galaxies, nebulae, black holes, and deep space objects
- NASA, ESA, ISRO, SpaceX, and other space agency missions
- Space history, astronauts, rockets, and spacecraft
- Astrophysics, orbital mechanics, and space weather
- Exoplanets and the search for extraterrestrial life

Guidelines:
- Answer concisely and accurately with scientific detail
- Use markdown formatting for structure (bold, lists, headers)
- Always include interesting facts when discussing objects
- For navigation requests, mention the relevant section of COSMOS-5H1
- Never fabricate data — if unsure, say so
- Keep responses under 400 words unless asked for detail`;

// ── OpenAI chat completion ────────────────────────────────────────────────────
async function callOpenAI(messages: AIMessage[]): Promise<string> {
  if (!env.OPENAI_API_KEY) throw new Error("No OpenAI key");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 600,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "I couldn't generate a response.";
}

// ── Offline RAG call (internal Next.js API route) ─────────────────────────────
async function callOfflineRAG(
  message: string,
  history: AIMessage[]
): Promise<string> {
  const res = await fetch("/api/cosmos-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error("Offline RAG failed");
  const data = await res.json();
  return data.answer;
}

// ── Public router function ────────────────────────────────────────────────────
export async function routeAI(
  message: string,
  history: AIMessage[] = []
): Promise<AIRouterResponse> {
  // Try OpenAI first if key is available
  if (env.hasOpenAI) {
    try {
      const answer = await callOpenAI([
        ...history,
        { role: "user", content: message },
      ]);
      return { answer, mode: "openai", model: env.OPENAI_MODEL };
    } catch (err) {
      console.warn("[AI Router] OpenAI failed, falling back to offline RAG:", err);
    }
  }

  // Always-available offline fallback
  try {
    const answer = await callOfflineRAG(message, history);
    return { answer, mode: "offline", model: "TF-IDF RAG" };
  } catch {
    return {
      answer: "⚠️ COSMOS AI is temporarily unavailable. Please try again.",
      mode: "offline",
      model: "fallback",
    };
  }
}

/** Returns which AI mode is currently active */
export function getAIMode(): AIMode {
  return env.hasOpenAI ? "openai" : "offline";
}
