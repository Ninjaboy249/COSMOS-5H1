/**
 * COSMOS AI — Next.js API Route
 * POST /api/cosmos-ai
 *
 * Strategy:
 *  1. Greeting / navigation intents — answered instantly from local logic (no AI call).
 *  2. TF-IDF retrieves top knowledge-base context (always runs, feeds into AI tiers).
 *  3. If GROQ_API_KEY is set → IBM Granite 3.3 via Groq cloud (primary AI).
 *  4. Else if OPENAI_API_KEY is set → OpenAI GPT-4o-mini (secondary AI).
 *  5. Fallback → pure offline TF-IDF response generator (zero external calls).
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

const SYSTEM_PROMPT = `You are COSMOS AI, an expert space science assistant for the COSMOS-5H1 platform.
Answer questions about astronomy, planets, stars, missions, and space phenomena.
Use the provided knowledge context when relevant. Be accurate, engaging, and concise.
Format answers with markdown: use ## for sections, bullet points with •, and **bold** for key terms.
Keep responses under 400 words unless a detailed comparison is requested.`;

// ── IBM Granite 3.3 via Groq (primary AI) ─────────────────────────────────────

async function askGranite(
  question: string,
  context: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const contextBlock = context
    ? `\n\n## Knowledge Base Context\n${context}\n\n---\n`
    : "";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: `${contextBlock}Question: ${question}` },
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.65,
    }),
    signal: AbortSignal.timeout(18_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq/Granite ${res.status}: ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// ── OpenAI call with RAG context (secondary AI) ───────────────────────────────

async function askOpenAI(
  question: string,
  context: string,
  history: { role: string; content: string }[]
): Promise<string> {
  const contextBlock = context
    ? `\n\n## Knowledge Base Context\n${context}\n\n---\n`
    : "";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-6).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: `${contextBlock}Question: ${question}` },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.65,
    }),
    signal: AbortSignal.timeout(18_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
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

    // Build a concise context string from top knowledge results
    const contextText = results
      .slice(0, 4)
      .map((r) => `[${r.doc.title}]: ${r.doc.text.slice(0, 350)}`)
      .join("\n\n");

    // ── 5a. Try IBM Granite 3.3 via Groq (primary AI) ─────────────────────
    if (env.hasGranite) {
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
        console.warn("[COSMOS AI] Granite/Groq failed, trying OpenAI:", err);
      }
    }

    // ── 5b. Try OpenAI (secondary AI, with local KB context injected) ──────
    if (env.hasOpenAI) {
      try {
        const answer = await askOpenAI(query, contextText, history);
        if (answer) {
          return NextResponse.json({
            answer,
            intent: intent.intent,
            entity: intent.entity,
            confidence: intent.confidence,
            source: "openai",
          });
        }
      } catch (err) {
        console.warn("[COSMOS AI] OpenAI failed, falling back to offline:", err);
      }
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
