/**
 * COSMOS Voice — Diagnostics endpoint
 * GET /api/voice/diagnose
 *
 * Tests the full voice pipeline and returns a detailed status report.
 * REMOVE or PROTECT this route before production — it reveals config state.
 */

import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const report: Record<string, unknown> = {};

  // ── 1. Env var presence ───────────────────────────────────────────────────
  report.env = {
    MURF_API_KEY:        env.MURF_API_KEY ? `set (${env.MURF_API_KEY.slice(0,8)}…)` : "MISSING",
    OPENAI_API_KEY:      env.OPENAI_API_KEY ? `set (${env.OPENAI_API_KEY.slice(0,8)}…)` : "MISSING",
    LIVEKIT_API_KEY:     env.LIVEKIT_API_KEY ? `set (${env.LIVEKIT_API_KEY.slice(0,8)}…)` : "MISSING",
    LIVEKIT_API_SECRET:  env.LIVEKIT_API_SECRET ? "set" : "MISSING",
    LIVEKIT_URL:         env.LIVEKIT_URL ?? "MISSING",
    DEEPGRAM_API_KEY:    env.DEEPGRAM_API_KEY ? `set (${env.DEEPGRAM_API_KEY.slice(0,8)}…)` : "MISSING",
    hasMurf:             env.hasMurf,
    hasOpenAI:           env.hasOpenAI,
    hasLiveKit:          env.hasLiveKit,
    hasDeepgram:         env.hasDeepgram,
  };

  // ── 2. Live Murf API test ─────────────────────────────────────────────────
  if (env.hasMurf) {
    try {
      const payload = {
        voiceId:      "en-IN-abhinav",
        style:        "Conversation",
        modelVersion: "GEN2",
        text:         "Test.",
        rate:         0,
        volume:       80,
        audioDuration: 0,
        encodeAsBase64: false,
        variation:    1,
        sampleRate:   24000,
        format:       "MP3",
        channelType:  "MONO",
      };

      const res = await fetch("https://api.murf.ai/v1/speech/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": env.MURF_API_KEY!,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      const body = await res.text();
      report.murf = {
        status:       res.status,
        ok:           res.ok,
        contentType:  res.headers.get("content-type"),
        bodyPreview:  body.slice(0, 400),
        requestPayload: payload,
      };
    } catch (err) {
      report.murf = { error: String(err) };
    }
  } else {
    report.murf = { skipped: "MURF_API_KEY not set" };
  }

  // ── 3. OpenAI reachability ────────────────────────────────────────────────
  if (env.hasOpenAI) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5_000),
      });
      report.openai = { status: res.status, ok: res.ok };
    } catch (err) {
      report.openai = { error: String(err) };
    }
  } else {
    report.openai = { skipped: "OPENAI_API_KEY not set" };
  }

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
