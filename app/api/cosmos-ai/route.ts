/**
 * COSMOS AI — Next.js API Route
 * POST /api/cosmos-ai
 * Fully offline — uses TF-IDF semantic search over knowledge base JSON files.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEngine, matchGreeting } from "@/lib/cosmos-ai/knowledge-service";
import { detectIntent } from "@/lib/cosmos-ai/intent-service";
import { buildAnswer, buildComparisonResponse, buildNavigationResponse } from "@/lib/cosmos-ai/response-generator";

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json() as {
      message: string;
      history?: { role: string; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ answer: "Please ask me something about space! 🚀", intent: "unknown", entity: null });
    }

    const query = message.trim();

    // ── 1. Greeting detection ──────────────────────────────────────────────
    const greetingResponse = matchGreeting(query);
    if (greetingResponse) {
      return NextResponse.json({ answer: greetingResponse, intent: "greeting", entity: null });
    }

    // ── 2. Intent detection ────────────────────────────────────────────────
    const intent = detectIntent(query);

    // ── 3. Navigation intent — return immediately ──────────────────────────
    if (intent.intent === "navigation" && intent.entity && intent.navigateTo) {
      const answer = buildNavigationResponse(intent.entity, intent.navigateTo);
      return NextResponse.json({ answer, intent: intent.intent, entity: intent.entity, navigateTo: intent.navigateTo });
    }

    // ── 4. Semantic search ─────────────────────────────────────────────────
    const engine = getEngine();

    // Augment query with context from conversation history
    let enrichedQuery = query;
    if (history.length > 0 && intent.entity === null) {
      const recent = history.slice(-2).map((h) => h.content).join(" ");
      enrichedQuery = query + " " + recent;
    }
    // Also try entity from intent
    if (intent.entity) enrichedQuery = query + " " + intent.entity;

    const results = engine.query(enrichedQuery, 8);

    // ── 5. For comparison, also search both entities separately ───────────
    if (intent.intent === "comparison") {
      const answer = buildComparisonResponse(query, results);
      return NextResponse.json({ answer, intent: intent.intent, entity: intent.entity });
    }

    // ── 6. Generate answer ─────────────────────────────────────────────────
    const answer = buildAnswer(query, results, intent);

    return NextResponse.json({
      answer,
      intent: intent.intent,
      entity: intent.entity,
      confidence: intent.confidence,
      sources: results.slice(0, 3).map((r) => r.doc.title),
    });

  } catch (err) {
    console.error("COSMOS AI error:", err);
    return NextResponse.json({
      answer: "⚠️ COSMOS AI encountered an error. Please try again with a different question.",
      intent: "unknown",
      entity: null,
    }, { status: 200 }); // Always 200 — never show broken page
  }
}
