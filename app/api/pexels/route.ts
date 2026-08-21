/**
 * COSMOS-5H1 — /api/pexels
 * Proxies Pexels image search server-side to keep the API key secret.
 * GET /api/pexels?query=<search term>&per_page=12
 */

import { NextRequest, NextResponse } from "next/server";

const PEXELS_KEY = process.env.PEXELS_API_KEY ?? "";

export interface PexelsPhoto {
  id: number;
  alt: string;
  url: string; // Pexels page URL
  src: {
    large: string;
    medium: string;
    small: string;
  };
  photographer: string;
  photographer_url: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim();
  const perPage = Math.min(parseInt(searchParams.get("per_page") ?? "12"), 24);

  if (!query) {
    return NextResponse.json({ photos: [], error: "Missing query" }, { status: 400 });
  }

  if (!PEXELS_KEY) {
    return NextResponse.json({ photos: [], error: "No Pexels API key configured" }, { status: 200 });
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape`,
      {
        headers: { Authorization: PEXELS_KEY },
        signal: AbortSignal.timeout(6000),
        // Cache for 1 hour at the edge
        next: { revalidate: 3600 },
      } as RequestInit,
    );

    if (!res.ok) {
      return NextResponse.json({ photos: [], error: `Pexels API error: ${res.status}` }, { status: 200 });
    }

    const data = await res.json() as { photos: PexelsPhoto[] };
    return NextResponse.json(
      { photos: data.photos ?? [] },
      { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ photos: [], error: "Failed to fetch from Pexels" }, { status: 200 });
  }
}
