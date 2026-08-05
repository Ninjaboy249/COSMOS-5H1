/**
 * COSMOS-5H1 — /api/exoplanets
 * Returns exoplanet data from NASA Exoplanet Archive.
 * GET /api/exoplanets?type=all|habitable&limit=20
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchExoplanets, fetchHabitableExoplanets } from "@/lib/exoplanet-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "all";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  try {
    const planets =
      type === "habitable"
        ? await fetchHabitableExoplanets()
        : await fetchExoplanets(limit);

    return NextResponse.json({ planets, total: planets.length, type }, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=604800" },
    });
  } catch {
    return NextResponse.json({ planets: [], total: 0, type, error: "Exoplanet data temporarily unavailable" });
  }
}
