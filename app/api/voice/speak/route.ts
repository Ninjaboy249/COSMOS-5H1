/**
 * COSMOS Voice — Murf AI Text-to-Speech API Route
 * POST /api/voice/speak
 *
 * Accepts:  { text, voiceId?, locale?, style? }
 * Returns:  audio/mpeg binary OR JSON { error }
 *
 * Security: MURF_API_KEY stays server-side — never sent to the client.
 * Fallback: Returns { fallback: true, text } when Murf is unavailable,
 *           so the client can use browser speechSynthesis gracefully.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

// Murf v1 REST speech API endpoint
const MURF_API_URL = "https://api.murf.ai/v1/speech/generate";

// Default voice used when caller doesn't specify one
const DEFAULT_VOICE_ID = "en-IN-abhinav"; // Murf Falcon (GEN2) voice

interface SpeakRequest {
  text: string;
  voiceId?: string;
  locale?: string;
  style?: string;
  modelVersion?: string; // "GEN1" | "GEN2" (Falcon)
  rate?: number; // 1.0 = normal; 0.5 = slow; 2.0 = fast
  volume?: number; // 0–100
}

export async function POST(req: NextRequest) {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: SpeakRequest;
  try {
    body = (await req.json()) as SpeakRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Truncate extremely long text to keep TTS latency reasonable
  const truncated = text.slice(0, 800);

  // ── Murf unavailable — graceful fallback ──────────────────────────────────
  if (!env.hasMurf) {
    return NextResponse.json(
      { fallback: true, text: truncated, reason: "Murf API key not configured" },
      { status: 200 }
    );
  }

  const voiceId = body.voiceId ?? DEFAULT_VOICE_ID;
  const style = body.style ?? "Conversation";
  const modelVersion = body.modelVersion ?? "GEN2";
  // Murf rate is a signed integer percentage: 0 = normal, -50 = slowest, +50 = fastest.
  // Our UI stores rate as a float multiplier (0.5–2.0), so convert: (uiRate - 1) * 100.
  const uiRate = typeof body.rate === "number" ? body.rate : 1.0;
  const murfRate = Math.round(Math.max(-50, Math.min(50, (uiRate - 1.0) * 100)));
  const volume = typeof body.volume === "number" ? Math.max(0, Math.min(100, body.volume)) : 80;

  // ── Call Murf AI ──────────────────────────────────────────────────────────
  try {
    const murfRes = await fetch(MURF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": env.MURF_API_KEY!,
      },
      body: JSON.stringify({
        voiceId,
        style,
        modelVersion,
        text: truncated,
        rate: murfRate,
        volume,
        audioDuration: 0,
        encodeAsBase64: false,
        variation: 1,
        sampleRate: 24000,
        format: "MP3",
        channelType: "MONO",
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!murfRes.ok) {
      const errText = await murfRes.text().catch(() => "");
      console.error("[Voice/Murf] API error", murfRes.status, errText.slice(0, 400));
      console.error("[Voice/Murf] Request payload:", JSON.stringify({ voiceId, style, modelVersion, murfRate, volume }));
      // Fall back gracefully — don't crash the app
      return NextResponse.json(
        { fallback: true, text: truncated, reason: `Murf error ${murfRes.status}` },
        { status: 200 }
      );
    }

    const murfData = await murfRes.json() as { audioFile?: string; error?: string };

    if (!murfData.audioFile) {
      return NextResponse.json(
        { fallback: true, text: truncated, reason: "Murf returned no audio URL" },
        { status: 200 }
      );
    }

    // Proxy the audio file from Murf so the client never needs the API key
    const audioRes = await fetch(murfData.audioFile, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!audioRes.ok) {
      return NextResponse.json(
        { fallback: true, text: truncated, reason: "Could not fetch Murf audio" },
        { status: 200 }
      );
    }

    const audioBuffer = await audioRes.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[Voice/Murf] Unexpected error:", err);
    return NextResponse.json(
      { fallback: true, text: truncated, reason: "Network error reaching Murf" },
      { status: 200 }
    );
  }
}
