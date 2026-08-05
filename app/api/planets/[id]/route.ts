/**
 * COSMOS-5H1 — /api/planets/[id]
 * Returns AI-generated or static summary for any celestial body.
 * Checks Python backend first, falls back to offline knowledge base.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEngine } from "@/lib/cosmos-ai/knowledge-service";
import { env } from "@/lib/env";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planetId = id.toLowerCase().trim();

  // ── 1. Try Python backend (IBM Granite via Ollama) ────────────────────────
  if (env.BACKEND_URL) {
    try {
      const res = await fetch(`${env.BACKEND_URL}/api/planets/${planetId}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ ...data, source: "ibm-granite" });
      }
    } catch {
      // backend offline — fall through
    }
  }

  // ── 2. Offline TF-IDF search ──────────────────────────────────────────────
  try {
    const engine = getEngine();
    const results = engine.query(planetId, 5);
    if (results.length > 0) {
      const top = results[0];
      return NextResponse.json({
        id: planetId,
        name: top.doc.title,
        summary: top.doc.text.slice(0, 600) + (top.doc.text.length > 600 ? "…" : ""),
        source: "offline-rag",
        facts: results.slice(1, 4).map((r) => r.doc.text.slice(0, 200)),
      });
    }
  } catch {
    // knowledge engine error — fall through
  }

  return NextResponse.json(
    { error: `No data found for "${planetId}"` },
    { status: 404 }
  );
}
