/**
 * COSMOS-5H1 — /api/epic-proxy
 * Proxies NASA EPIC PNG images to avoid CORS restrictions.
 * GET /api/epic-proxy?id=<identifier>&date=<YYYY-MM-DD>
 */

import { NextRequest, NextResponse } from "next/server";

const NASA_KEY = process.env.NASA_API_KEY ?? "DEMO_KEY";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const identifier = searchParams.get("id");
  const date = searchParams.get("date"); // format: YYYY-MM-DD

  if (!identifier || !date) {
    return new NextResponse("Missing id or date", { status: 400 });
  }

  const datePath = date.replace(/-/g, "/");
  const url = `https://api.nasa.gov/EPIC/archive/natural/${datePath}/png/${identifier}.png?api_key=${NASA_KEY}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return new NextResponse("Image not found", { status: 404 });
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Failed to fetch image", { status: 502 });
  }
}
