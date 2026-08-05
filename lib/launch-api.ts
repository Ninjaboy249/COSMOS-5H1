/**
 * COSMOS-5H1 — Launch Library 2 API Service
 * https://ll.thespacedevs.com/2.2.0/
 * Free tier: 15 requests/hour. Always falls back to static data.
 */

export interface RocketLaunch {
  id: string;
  name: string;
  net: string; // Net launch time (ISO)
  status: { name: string; abbrev: string };
  mission: { name: string; description: string; type: string } | null;
  rocket: { configuration: { name: string; family: string } };
  launch_service_provider: { name: string; type: string };
  pad: { name: string; location: { name: string; country_code: string } };
  image: string | null;
  webcast_live: boolean;
  url: string;
}

// ── Fallback ──────────────────────────────────────────────────────────────────

const FALLBACK_LAUNCHES: RocketLaunch[] = [
  {
    id: "1", name: "Falcon 9 | Starlink Group 6-60",
    net: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: { name: "Go for Launch", abbrev: "Go" },
    mission: { name: "Starlink Group 6-60", description: "A batch of Starlink broadband satellites for SpaceX's constellation.", type: "Communications" },
    rocket: { configuration: { name: "Falcon 9 Block 5", family: "Falcon" } },
    launch_service_provider: { name: "SpaceX", type: "Commercial" },
    pad: { name: "Space Launch Complex 40", location: { name: "Cape Canaveral, FL, USA", country_code: "USA" } },
    image: null, webcast_live: false, url: "",
  },
  {
    id: "2", name: "PSLV-C60 | SpaDeX",
    net: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: { name: "TBC", abbrev: "TBC" },
    mission: { name: "Space Docking Experiment", description: "ISRO's Space Docking Experiment to demonstrate in-space docking technology.", type: "Technology" },
    rocket: { configuration: { name: "PSLV-XL", family: "PSLV" } },
    launch_service_provider: { name: "ISRO", type: "Government" },
    pad: { name: "Satish Dhawan Space Centre", location: { name: "Sriharikota, India", country_code: "IND" } },
    image: null, webcast_live: false, url: "",
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 3600 },
    } as RequestInit);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

const BASE = "https://ll.thespacedevs.com/2.2.0";

// ── Public API functions ──────────────────────────────────────────────────────

export async function fetchUpcomingLaunches(limit = 8): Promise<RocketLaunch[]> {
  interface Resp { results: RocketLaunch[] }
  const data = await safeFetch<Resp>(`${BASE}/launch/upcoming/?limit=${limit}&format=json`, { results: FALLBACK_LAUNCHES });
  return data.results ?? FALLBACK_LAUNCHES;
}

export async function fetchRecentLaunches(limit = 6): Promise<RocketLaunch[]> {
  interface Resp { results: RocketLaunch[] }
  const data = await safeFetch<Resp>(`${BASE}/launch/previous/?limit=${limit}&format=json`, { results: [] });
  return data.results ?? [];
}
