/**
 * COSMOS-5H1 — SpaceX API Service
 * Uses the unofficial SpaceX REST API (r-spacex/SpaceX-API v4)
 * Always returns data — falls back to static data if API is unavailable.
 */

export interface SpaceXLaunch {
  id: string;
  name: string;
  date_utc: string;
  success: boolean | null;
  upcoming: boolean;
  details: string | null;
  links: {
    patch: { small: string | null; large: string | null };
    webcast: string | null;
    article: string | null;
    wikipedia: string | null;
  };
  rocket: string; // rocket id
  launchpad: string;
  flight_number: number;
  mission?: { name: string; description: string; type: string } | null;
}

export interface SpaceXRocket {
  id: string;
  name: string;
  description: string;
  height: { meters: number };
  diameter: { meters: number };
  mass: { kg: number };
  first_flight: string;
  success_rate_pct: number;
  active: boolean;
  flickr_images: string[];
  wikipedia: string;
  engines: { number: number; type: string; version: string };
  stages: number;
}

export interface SpaceXCapsule {
  id: string;
  serial: string;
  type: string;
  status: string;
  reuse_count: number;
  water_landings: number;
  land_landings: number;
  last_update: string | null;
}

// ── Fallback data ─────────────────────────────────────────────────────────────

const FALLBACK_LAUNCHES: SpaceXLaunch[] = [
  {
    id: "f1", name: "Starship IFT-4", date_utc: "2024-06-06T13:50:00Z",
    success: true, upcoming: false,
    details: "Fourth integrated flight test of Starship. Both stages successfully splashed down.",
    links: { patch: { small: null, large: null }, webcast: "https://www.youtube.com/watch?v=example", article: null, wikipedia: null },
    rocket: "falcon9", launchpad: "ksc_lc_39a", flight_number: 4,
  },
  {
    id: "f2", name: "Crew Dragon — Crew-9", date_utc: "2024-09-28T13:17:00Z",
    success: true, upcoming: false,
    details: "NASA Commercial Crew mission carrying Butch Wilmore and Suni Williams to the ISS.",
    links: { patch: { small: null, large: null }, webcast: null, article: null, wikipedia: null },
    rocket: "falcon9", launchpad: "ksc_lc_39a", flight_number: 9,
  },
];

const FALLBACK_ROCKETS: SpaceXRocket[] = [
  {
    id: "falcon9", name: "Falcon 9",
    description: "Falcon 9 is a two-stage rocket designed and manufactured by SpaceX for the reliable and safe transport of people and payloads into Earth orbit and beyond.",
    height: { meters: 70 }, diameter: { meters: 3.7 }, mass: { kg: 549054 },
    first_flight: "2010-06-04", success_rate_pct: 98, active: true,
    flickr_images: [], wikipedia: "https://en.wikipedia.org/wiki/Falcon_9",
    engines: { number: 9, type: "merlin", version: "1D+" }, stages: 2,
  },
  {
    id: "starship", name: "Starship",
    description: "Starship is SpaceX's fully reusable super heavy-lift launch vehicle under development, designed for long-duration spaceflight to the Moon, Mars, and beyond.",
    height: { meters: 120 }, diameter: { meters: 9 }, mass: { kg: 5000000 },
    first_flight: "2023-04-20", success_rate_pct: 40, active: true,
    flickr_images: [], wikipedia: "https://en.wikipedia.org/wiki/SpaceX_Starship",
    engines: { number: 33, type: "raptor", version: "2" }, stages: 2,
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

const BASE = "https://api.spacexdata.com/v4";

// ── Public API functions ──────────────────────────────────────────────────────

export async function fetchLatestLaunches(limit = 10): Promise<SpaceXLaunch[]> {
  const data = await safeFetch<SpaceXLaunch[]>(
    `${BASE}/launches/past?limit=${limit}&order=desc`,
    FALLBACK_LAUNCHES
  );
  return Array.isArray(data) ? data.slice(0, limit) : FALLBACK_LAUNCHES;
}

export async function fetchUpcomingLaunches(): Promise<SpaceXLaunch[]> {
  const data = await safeFetch<SpaceXLaunch[]>(
    `${BASE}/launches/upcoming`,
    []
  );
  return Array.isArray(data) ? data.slice(0, 8) : [];
}

export async function fetchRockets(): Promise<SpaceXRocket[]> {
  const data = await safeFetch<SpaceXRocket[]>(`${BASE}/rockets`, FALLBACK_ROCKETS);
  return Array.isArray(data) ? data : FALLBACK_ROCKETS;
}

export async function fetchNextLaunch(): Promise<SpaceXLaunch | null> {
  return safeFetch<SpaceXLaunch | null>(`${BASE}/launches/next`, null);
}
