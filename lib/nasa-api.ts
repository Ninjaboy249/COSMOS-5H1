/**
 * NASA API service with automatic offline JSON fallback.
 * Every function returns data — never throws to the UI.
 */

import { env } from "@/lib/env";

/** NASA API key — falls back to DEMO_KEY (rate-limited but functional) */
const NASA_KEY = env.NASA_API_KEY;

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApodData {
  title: string;
  explanation: string;
  url: string;
  hdurl?: string;
  date: string;
  media_type: "image" | "video";
  copyright?: string;
}

export interface MarsPhoto {
  id: number;
  sol: number;
  img_src: string;
  earth_date: string;
  rover: { name: string; status: string };
  camera: { full_name: string };
}

export interface NeoObject {
  id: string;
  name: string;
  estimated_diameter_km: string;
  is_potentially_hazardous: boolean;
  close_approach_date: string;
  relative_velocity_kmh: string;
  miss_distance_km: string;
}

export interface SpaceWeatherEvent {
  activityID: string;
  startTime: string;
  note: string;
  type: string;
}

export interface IssPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  altitude?: number;
  velocity?: number;
}

// ── Offline fallbacks ──────────────────────────────────────────────────────

const FALLBACK_APOD: ApodData = {
  title: "The Pillars of Creation",
  explanation:
    "The Eagle Nebula's famous Pillars of Creation, captured in stunning detail by the James Webb Space Telescope in 2022. These towering columns of gas and dust are stellar nurseries where new stars are forming within interstellar gas and dust.",
  url: "/images/planets/neptune.png",
  date: new Date().toISOString().split("T")[0],
  media_type: "image",
  copyright: "NASA, ESA, CSA, STScI",
};

const FALLBACK_MARS_PHOTOS: MarsPhoto[] = [
  { id: 1, sol: 1000, img_src: "/images/planets/mars.png", earth_date: "2023-05-17", rover: { name: "Perseverance", status: "active" }, camera: { full_name: "Front Hazard Avoidance Camera" } },
  { id: 2, sol: 999, img_src: "/images/planets/mars.png", earth_date: "2023-05-16", rover: { name: "Curiosity", status: "active" }, camera: { full_name: "Mast Camera" } },
  { id: 3, sol: 998, img_src: "/images/planets/mars.png", earth_date: "2023-05-15", rover: { name: "Perseverance", status: "active" }, camera: { full_name: "Navigation Camera" } },
];

const FALLBACK_NEOS: NeoObject[] = [
  { id: "1", name: "2024 BX1", estimated_diameter_km: "0.04–0.09", is_potentially_hazardous: false, close_approach_date: new Date().toISOString().split("T")[0], relative_velocity_kmh: "36,720", miss_distance_km: "3,420,000" },
  { id: "2", name: "2024 YD4", estimated_diameter_km: "0.12–0.27", is_potentially_hazardous: true, close_approach_date: new Date().toISOString().split("T")[0], relative_velocity_kmh: "55,200", miss_distance_km: "1,890,000" },
  { id: "3", name: "2023 MU2", estimated_diameter_km: "0.02–0.05", is_potentially_hazardous: false, close_approach_date: new Date().toISOString().split("T")[0], relative_velocity_kmh: "28,440", miss_distance_km: "5,760,000" },
];

const FALLBACK_SPACE_WEATHER: SpaceWeatherEvent[] = [
  { activityID: "2024-001", startTime: new Date().toISOString(), note: "M-class solar flare detected on the eastern limb. Minor radio blackout (R1) observed.", type: "FLR" },
  { activityID: "2024-002", startTime: new Date(Date.now() - 3600000 * 6).toISOString(), note: "Coronal Mass Ejection (CME) observed. Expected to cause minor geomagnetic storm (G1).", type: "CME" },
];

const FALLBACK_ISS: IssPosition = {
  latitude: 51.5074,
  longitude: -0.1278,
  timestamp: Date.now(),
  altitude: 408,
  velocity: 27600,
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function safeFetch<T>(url: string, fallback: T, timeoutMs = 5000): Promise<T> {
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } } as RequestInit);
    clearTimeout(id);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

// ── Public API functions ───────────────────────────────────────────────────

export async function fetchApod(date?: string): Promise<ApodData> {
  const dateParam = date ? `&date=${date}` : "";
  const url = `https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}${dateParam}`;
  return safeFetch<ApodData>(url, FALLBACK_APOD);
}

export async function fetchMarsPhotos(rover: "perseverance" | "curiosity" = "perseverance", sol = 1000): Promise<MarsPhoto[]> {
  const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/photos?sol=${sol}&api_key=${NASA_KEY}`;
  interface MarsApiResp { photos: MarsPhoto[] }
  const data = await safeFetch<MarsApiResp>(url, { photos: FALLBACK_MARS_PHOTOS });
  return data.photos?.slice(0, 12) ?? FALLBACK_MARS_PHOTOS;
}

export async function fetchLatestMarsPhotos(rover: "perseverance" | "curiosity"): Promise<MarsPhoto[]> {
  const url = `https://api.nasa.gov/mars-photos/api/v1/rovers/${rover}/latest_photos?api_key=${NASA_KEY}`;
  interface LatestApiResp { latest_photos: MarsPhoto[] }
  const data = await safeFetch<LatestApiResp>(url, { latest_photos: FALLBACK_MARS_PHOTOS });
  return data.latest_photos?.slice(0, 12) ?? FALLBACK_MARS_PHOTOS;
}

export async function fetchNeoToday(): Promise<NeoObject[]> {
  const today = new Date().toISOString().split("T")[0];
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`;
  try {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal, next: { revalidate: 3600 } } as RequestInit);
    clearTimeout(id);
    if (!res.ok) return FALLBACK_NEOS;
    const data = await res.json();
    const allNeos = Object.values(data.near_earth_objects ?? {}).flat() as Record<string, unknown>[];
    return allNeos.slice(0, 10).map((n) => ({
      id: String(n.id),
      name: String(n.name),
      estimated_diameter_km: `${((n.estimated_diameter as Record<string, Record<string, number>>)?.kilometers?.estimated_diameter_min ?? 0).toFixed(3)}–${((n.estimated_diameter as Record<string, Record<string, number>>)?.kilometers?.estimated_diameter_max ?? 0).toFixed(3)}`,
      is_potentially_hazardous: Boolean(n.is_potentially_hazardous_asteroid),
      close_approach_date: String((n.close_approach_data as Record<string, unknown>[])?.[0]?.close_approach_date ?? today),
      relative_velocity_kmh: Number(((n.close_approach_data as Record<string, unknown>[])?.[0]?.relative_velocity as Record<string, string>)?.kilometers_per_hour ?? 0).toLocaleString(),
      miss_distance_km: Number(((n.close_approach_data as Record<string, unknown>[])?.[0]?.miss_distance as Record<string, string>)?.kilometers ?? 0).toLocaleString(),
    }));
  } catch {
    return FALLBACK_NEOS;
  }
}

export async function fetchSpaceWeather(): Promise<SpaceWeatherEvent[]> {
  const end = new Date().toISOString().split("T")[0];
  const start = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split("T")[0];
  const url = `https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${NASA_KEY}`;
  const data = await safeFetch<SpaceWeatherEvent[]>(url, FALLBACK_SPACE_WEATHER);
  return Array.isArray(data) && data.length > 0 ? data.slice(0, 6) : FALLBACK_SPACE_WEATHER;
}

export async function fetchIssPosition(): Promise<IssPosition> {
  interface OpenNotify { iss_position: { latitude: string; longitude: string }; timestamp: number }
  const data = await safeFetch<OpenNotify>(
    "https://api.open-notify.org/iss-now.json",
    { iss_position: { latitude: String(FALLBACK_ISS.latitude), longitude: String(FALLBACK_ISS.longitude) }, timestamp: FALLBACK_ISS.timestamp }
  );
  return {
    latitude: parseFloat(data.iss_position.latitude),
    longitude: parseFloat(data.iss_position.longitude),
    timestamp: data.timestamp,
    altitude: 408,
    velocity: 27600,
  };
}

export async function fetchEpicImages(): Promise<{ identifier: string; caption: string; date: string; url: string }[]> {
  interface EpicItem { identifier: string; caption: string; date: string }
  const url = `https://api.nasa.gov/EPIC/api/natural?api_key=${NASA_KEY}`;
  const data = await safeFetch<EpicItem[]>(url, []);
  if (!data.length) {
    return [{ identifier: "fallback", caption: "Earth from DSCOVR satellite", date: new Date().toISOString().split("T")[0], url: "/images/planets/earth.png" }];
  }
  return data.slice(0, 6).map((img) => {
    const d = img.date.split(" ")[0].replace(/-/g, "/");
    return {
      identifier: img.identifier,
      caption: img.caption,
      date: img.date,
      url: `https://api.nasa.gov/EPIC/archive/natural/${d}/png/${img.identifier}.png?api_key=${NASA_KEY}`,
    };
  });
}
