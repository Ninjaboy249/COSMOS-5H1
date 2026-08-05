/**
 * COSMOS-5H1 — /api/spacex
 * Returns SpaceX launch and rocket data.
 * GET /api/spacex?type=launches|upcoming|rockets|next
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchLatestLaunches, fetchUpcomingLaunches, fetchRockets, fetchNextLaunch } from "@/lib/spacex-api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "launches";

  try {
    let data;
    if (type === "rockets")        data = await fetchRockets();
    else if (type === "upcoming")  data = await fetchUpcomingLaunches();
    else if (type === "next")      data = await fetchNextLaunch();
    else                           data = await fetchLatestLaunches(10);

    return NextResponse.json({ data, type }, {
      headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json({ data: null, type, error: "SpaceX data temporarily unavailable" });
  }
}
