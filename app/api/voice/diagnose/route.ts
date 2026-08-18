/**
 * COSMOS Voice — Diagnostics endpoint
 * GET /api/voice/diagnose
 *
 * Tests multiple Murf payload variants to find exactly what works.
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

async function testMurf(payload: Record<string, unknown>) {
  const res = await fetch("https://api.murf.ai/v1/speech/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": env.MURF_API_KEY!,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let parsed: unknown = null;
  try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  return { status: res.status, ok: res.ok, body: parsed, payload };
}

export async function GET() {
  const report: Record<string, unknown> = {};

  // ── Env vars ──────────────────────────────────────────────────────────────
  report.env = {
    MURF_API_KEY:    env.MURF_API_KEY ? `set (${env.MURF_API_KEY.slice(0,8)}…)` : "MISSING",
    hasMurf:         env.hasMurf,
    hasGranite:      env.hasGranite,
    hasLiveKit:      env.hasLiveKit,
  };

  if (!env.hasMurf) {
    report.murf = { skipped: "MURF_API_KEY not set" };
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  }

  // ── Test A: minimal payload (voiceId + text only) ─────────────────────────
  // ── Test B: with style ────────────────────────────────────────────────────
  // ── Test C: full payload without modelVersion ─────────────────────────────
  // ── Test D: full payload with modelVersion GEN2 ───────────────────────────
  const [a, b, c, d] = await Promise.all([
    testMurf({ voiceId: "en-IN-rohan", text: "Hi." }),
    testMurf({ voiceId: "en-IN-rohan", style: "Conversational", text: "Hi." }),
    testMurf({ voiceId: "en-IN-rohan", style: "Conversational", text: "Hi.",
               rate: 0, volume: 80, format: "MP3", channelType: "MONO",
               sampleRate: 24000, encodeAsBase64: false }),
    testMurf({ voiceId: "en-IN-rohan", style: "Conversational", modelVersion: "GEN2",
               text: "Hi.", rate: 0, volume: 80, format: "MP3", channelType: "MONO",
               sampleRate: 24000, encodeAsBase64: false }),
  ]);

  report.murf = { testA_minimal: a, testB_withStyle: b, testC_noModelVersion: c, testD_withModelVersion: d };

  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
