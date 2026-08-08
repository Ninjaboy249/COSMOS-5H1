/**
 * COSMOS Voice — Deepgram STT API Route
 * POST /api/voice/deepgram-stt
 *
 * Transcribes audio on the server using Deepgram Nova.
 * DEEPGRAM_API_KEY stays server-side — never sent to the client.
 *
 * Accepts:  multipart/form-data with field "audio" (Blob/File, audio/webm or audio/wav)
 *           OR application/json { fallbackRequested: true } to check availability
 * Returns:  { transcript } OR { fallback: true } when Deepgram is unavailable.
 *
 * Fallback: Returns { fallback: true } so the client uses browser Web Speech API.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

const DEEPGRAM_URL =
  "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en";

export async function POST(req: NextRequest) {
  // ── Availability check ────────────────────────────────────────────────────
  if (!env.hasDeepgram) {
    return NextResponse.json(
      { fallback: true, reason: "Deepgram API key not configured" },
      { status: 200 }
    );
  }

  // ── Parse audio from form data ────────────────────────────────────────────
  let audioBuffer: ArrayBuffer;
  let contentType = "audio/webm";

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json({ error: "audio field (Blob) is required" }, { status: 400 });
    }

    audioBuffer = await audioFile.arrayBuffer();
    contentType = audioFile.type || "audio/webm";
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!audioBuffer.byteLength) {
    return NextResponse.json({ error: "Empty audio" }, { status: 400 });
  }

  // ── Call Deepgram ─────────────────────────────────────────────────────────
  try {
    const dgRes = await fetch(DEEPGRAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "Content-Type": contentType,
      },
      body: audioBuffer,
      signal: AbortSignal.timeout(15_000),
    });

    if (!dgRes.ok) {
      const errText = await dgRes.text().catch(() => "");
      console.error("[Deepgram] API error", dgRes.status, errText.slice(0, 200));
      return NextResponse.json(
        { fallback: true, reason: `Deepgram error ${dgRes.status}` },
        { status: 200 }
      );
    }

    const data = await dgRes.json() as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };

    const transcript =
      data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[Deepgram] Unexpected error:", err);
    return NextResponse.json(
      { fallback: true, reason: "Network error reaching Deepgram" },
      { status: 200 }
    );
  }
}

/** HEAD / GET — quick availability probe used by the client */
export async function GET() {
  return NextResponse.json({ available: env.hasDeepgram });
}
