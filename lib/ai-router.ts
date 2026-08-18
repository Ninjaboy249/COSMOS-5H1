/**
 * COSMOS-5H1 — AI Abstraction Layer
 * Routes requests to IBM Granite 3.3 via local Ollama backend,
 * falling back to the offline TF-IDF RAG engine when unavailable.
 * No API keys required.
 */

import { env } from "@/lib/env";

export type AIMode = "granite" | "offline";

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIRouterResponse {
  answer: string;
  mode: AIMode;
  model: string;
}

// ── IBM Granite 3.3 via local Ollama backend ──────────────────────────────────
async function callGranite(
  message: string,
  history: AIMessage[]
): Promise<string> {
  const res = await fetch(`${env.BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: history.slice(-6) }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Granite backend ${res.status}`);
  const data = await res.json();
  const answer = (data.answer ?? "").trim();
  if (!answer) throw new Error("Granite backend returned empty response");
  return answer;
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
  // Try IBM Granite local backend first
  try {
    const answer = await callGranite(message, history);
    return { answer, mode: "granite", model: "granite3.3:2b" };
  } catch (err) {
    console.warn("[AI Router] Granite backend unavailable, falling back to offline RAG:", err);
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

/** Returns which AI mode is currently active (optimistic — assumes backend running) */
export function getAIMode(): AIMode {
  return "granite";
}
