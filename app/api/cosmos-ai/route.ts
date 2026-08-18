/**
 * COSMOS AI — Next.js API Route
 * POST /api/cosmos-ai
 *
 * Strategy:
 *  1. Greeting / navigation intents — answered instantly from local logic (no AI call).
 *  2. TF-IDF retrieves top knowledge-base context (always runs, feeds into AI).
 *  3. Try IBM Granite 3.3 via local Ollama backend (backend/main.py).
 *  4. Fallback → pure offline TF-IDF response generator (zero external calls).
 *
 * No API keys required. IBM Granite runs 100% locally via Ollama.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getEngine, matchGreeting } from "@/lib/cosmos-ai/knowledge-service";
import { detectIntent } from "@/lib/cosmos-ai/intent-service";
import {
  buildAnswer,
  buildComparisonResponse,
  buildNavigationResponse,
} from "@/lib/cosmos-ai/response-generator";

// ── IBM Granite 3.3 via local Ollama backend ──────────────────────────────────

async function askGranite(
  question: string,
  context: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const contextMsg = context
    ? `Knowledge Base Context:\n${context}\n\n---\n\n`
    : "";

  const res = await fetch(`${env.BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `${contextMsg}${question}`,
      history: history.slice(-6),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    throw new Error(`Granite backend ${res.status}`);
  }

  const data = await res.json();
  const answer = (data.answer ?? "").trim();
  if (!answer) throw new Error("Granite backend returned empty response");
  return answer;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = (await req.json()) as {
      message: string;
      history?: { role: string; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({
        answer: "Please ask me something about space! 🚀",
        intent: "unknown",
        entity: null,
      });
    }

    const query = message.trim();

    // ── 1. Greeting detection (instant, no AI) ─────────────────────────────
    const greetingResponse = matchGreeting(query);
    if (greetingResponse) {
      return NextResponse.json({
        answer: greetingResponse,
        intent: "greeting",
        entity: null,
        source: "local",
      });
    }

    // ── 2. Intent detection ────────────────────────────────────────────────
    const intent = detectIntent(query);

    // ── 3. Navigation intent — return immediately ──────────────────────────
    if (intent.intent === "navigation" && intent.entity && intent.navigateTo) {
      const answer = buildNavigationResponse(intent.entity, intent.navigateTo);
      return NextResponse.json({
        answer,
        intent: intent.intent,
        entity: intent.entity,
        navigateTo: intent.navigateTo,
        source: "local",
      });
    }

    // ── 4. TF-IDF search for context retrieval ─────────────────────────────
    const engine = getEngine();

    let enrichedQuery = query;
    if (history.length > 0 && intent.entity === null) {
      const recent = history.slice(-2).map((h) => h.content).join(" ");
      enrichedQuery = query + " " + recent;
    }
    if (intent.entity) enrichedQuery = query + " " + intent.entity;

    const results = engine.query(enrichedQuery, 8);

    const contextText = results
      .slice(0, 4)
      .map((r) => `[${r.doc.title}]: ${r.doc.text.slice(0, 350)}`)
      .join("\n\n");

    // ── 5. Try IBM Granite 3.3 via local backend ───────────────────────────
    try {
      const answer = await askGranite(query, contextText, history);
      if (answer) {
        return NextResponse.json({
          answer,
          intent: intent.intent,
          entity: intent.entity,
          confidence: intent.confidence,
          source: "granite",
        });
      }
    } catch (err) {
      console.warn("[COSMOS AI] Granite backend unavailable, using offline TF-IDF:", err);
    }

    // ── 6. Offline fallback — pure TF-IDF answer ───────────────────────────
    let answer: string;
    if (intent.intent === "comparison") {
      answer = buildComparisonResponse(query, results);
    } else {
      answer = buildAnswer(query, results, intent);
    }

    return NextResponse.json({
      answer,
      intent: intent.intent,
      entity: intent.entity,
      confidence: intent.confidence,
      sources: results.slice(0, 3).map((r) => r.doc.title),
      source: "offline",
    });
  } catch (err) {
    console.error("COSMOS AI error:", err);
    return NextResponse.json(
      {
        answer:
          "⚠️ COSMOS AI encountered an error. Please try again with a different question.",
        intent: "unknown",
        entity: null,
      },
      { status: 200 }
    );
  }
}
