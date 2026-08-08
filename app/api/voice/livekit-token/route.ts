/**
 * COSMOS Voice — LiveKit Token API Route
 * POST /api/voice/livekit-token
 *
 * Generates a short-lived LiveKit access token on the server.
 * The LIVEKIT_API_SECRET is NEVER sent to the client.
 *
 * Accepts:  { roomName, participantName }
 * Returns:  { token, url } OR { fallback: true } when LiveKit is not configured.
 *
 * Fallback: Returns { fallback: true } when LiveKit credentials are absent,
 *           so the client can use the existing non-LiveKit voice implementation.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

interface TokenRequest {
  roomName?: string;
  participantName?: string;
}

export async function POST(req: NextRequest) {
  // ── Graceful fallback when LiveKit is not configured ──────────────────────
  if (!env.hasLiveKit) {
    return NextResponse.json(
      { fallback: true, reason: "LiveKit credentials not configured" },
      { status: 200 }
    );
  }

  let body: TokenRequest = {};
  try {
    body = (await req.json()) as TokenRequest;
  } catch {
    // empty body is fine — we use defaults
  }

  const roomName = (body.roomName ?? "cosmos-voice").slice(0, 64);
  const participantName = (body.participantName ?? `user-${Date.now()}`).slice(0, 64);

  // ── Build LiveKit JWT without an external SDK ─────────────────────────────
  // LiveKit access tokens are standard JWT HS256 tokens with a specific claim set.
  try {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1-hour TTL

    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      iss: env.LIVEKIT_API_KEY,
      sub: participantName,
      iat: now,
      nbf: now,
      exp,
      video: {
        room: roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      metadata: "",
    };

    const b64url = (obj: object) =>
      Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    const headerB64 = b64url(header);
    const payloadB64 = b64url(payload);
    const signingInput = `${headerB64}.${payloadB64}`;

    // HMAC-SHA256 using Node.js crypto (available in all Next.js runtimes)
    const { createHmac } = await import("crypto");
    const signature = createHmac("sha256", env.LIVEKIT_API_SECRET!)
      .update(signingInput)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    const token = `${signingInput}.${signature}`;

    return NextResponse.json({ token, url: env.LIVEKIT_URL });
  } catch (err) {
    console.error("[LiveKit] Token generation error:", err);
    return NextResponse.json(
      { fallback: true, reason: "Token generation failed" },
      { status: 200 }
    );
  }
}
