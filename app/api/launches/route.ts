/**
 * COSMOS-5H1 — /api/launches
 * Returns upcoming rocket launches from Launch Library 2.
 * GET /api/launches?type=upcoming|recent&limit=8
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchUpcomingLaunches, fetchRecentLaunches } from "@/lib/launch-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "upcoming";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "8"), 20);

  try {
    const launches =
      type === "recent"
        ? await fetchRecentLaunches(limit)
        : await fetchUpcomingLaunches(limit);
    return NextResponse.json({ launches, type }, { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ launches: [], type, error: "Launch data temporarily unavailable" });
  }
}
