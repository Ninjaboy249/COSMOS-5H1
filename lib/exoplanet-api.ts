/**
 * COSMOS-5H1 — NASA Exoplanet Archive Service
 * Uses the NASA Exoplanet Archive TAP service (free, no key required).
 * Always returns data — falls back to a curated static list if unavailable.
 */

export interface Exoplanet {
  pl_name: string;        // Planet name
  hostname: string;       // Host star name
  pl_orbper: number | null;  // Orbital period (days)
  pl_rade: number | null;    // Planet radius (Earth radii)
  pl_masse: number | null;   // Planet mass (Earth masses)
  pl_eqt: number | null;     // Equilibrium temperature (K)
  st_dist: number | null;    // Distance to system (parsecs)
  disc_year: number | null;  // Discovery year
  discoverymethod: string;   // Detection method
  pl_bmasse: number | null;  // Planet mass * sin(i) (Earth masses)
  sy_snum: number | null;    // Number of stars in system
  sy_pnum: number | null;    // Number of planets in system
}

// ── Curated fallback list of notable exoplanets ───────────────────────────────

export const FALLBACK_EXOPLANETS: Exoplanet[] = [
  { pl_name: "Proxima Centauri b", hostname: "Proxima Centauri", pl_orbper: 11.2, pl_rade: 1.1, pl_masse: 1.17, pl_eqt: 234, st_dist: 1.3, disc_year: 2016, discoverymethod: "Radial Velocity", pl_bmasse: 1.17, sy_snum: 1, sy_pnum: 3 },
  { pl_name: "TRAPPIST-1e", hostname: "TRAPPIST-1", pl_orbper: 6.1, pl_rade: 0.92, pl_masse: 0.77, pl_eqt: 251, st_dist: 12.4, disc_year: 2017, discoverymethod: "Transit", pl_bmasse: 0.77, sy_snum: 1, sy_pnum: 7 },
  { pl_name: "Kepler-452b", hostname: "Kepler-452", pl_orbper: 384.8, pl_rade: 1.63, pl_masse: null, pl_eqt: 265, st_dist: 430, disc_year: 2015, discoverymethod: "Transit", pl_bmasse: null, sy_snum: 1, sy_pnum: 1 },
  { pl_name: "K2-18b", hostname: "K2-18", pl_orbper: 32.9, pl_rade: 2.71, pl_masse: 8.63, pl_eqt: 265, st_dist: 38.6, disc_year: 2015, discoverymethod: "Transit", pl_bmasse: 8.63, sy_snum: 1, sy_pnum: 2 },
  { pl_name: "55 Cnc e", hostname: "55 Cnc", pl_orbper: 0.74, pl_rade: 1.88, pl_masse: 7.99, pl_eqt: 2700, st_dist: 12.6, disc_year: 2004, discoverymethod: "Radial Velocity", pl_bmasse: 7.99, sy_snum: 2, sy_pnum: 5 },
  { pl_name: "GJ 1214 b", hostname: "GJ 1214", pl_orbper: 1.58, pl_rade: 2.68, pl_masse: 6.55, pl_eqt: 596, st_dist: 14.6, disc_year: 2009, discoverymethod: "Transit", pl_bmasse: 6.55, sy_snum: 1, sy_pnum: 1 },
  { pl_name: "HD 209458 b", hostname: "HD 209458", pl_orbper: 3.52, pl_rade: 15.1, pl_masse: 219, pl_eqt: 1459, st_dist: 47.4, disc_year: 1999, discoverymethod: "Transit", pl_bmasse: 219, sy_snum: 1, sy_pnum: 1 },
  { pl_name: "WASP-12b", hostname: "WASP-12", pl_orbper: 1.09, pl_rade: 19.8, pl_masse: 457, pl_eqt: 2580, st_dist: 427, disc_year: 2008, discoverymethod: "Transit", pl_bmasse: 457, sy_snum: 1, sy_pnum: 1 },
  { pl_name: "TOI-700d", hostname: "TOI-700", pl_orbper: 37.4, pl_rade: 1.14, pl_masse: 1.72, pl_eqt: 268, st_dist: 31.1, disc_year: 2020, discoverymethod: "Transit", pl_bmasse: 1.72, sy_snum: 1, sy_pnum: 4 },
  { pl_name: "LHS 1140 b", hostname: "LHS 1140", pl_orbper: 24.7, pl_rade: 1.73, pl_masse: 6.98, pl_eqt: 235, st_dist: 14.2, disc_year: 2017, discoverymethod: "Transit", pl_bmasse: 6.98, sy_snum: 1, sy_pnum: 2 },
];

// ── Fetch from NASA Exoplanet Archive TAP ─────────────────────────────────────

export async function fetchExoplanets(limit = 20): Promise<Exoplanet[]> {
  const cols = "pl_name,hostname,pl_orbper,pl_rade,pl_masse,pl_eqt,st_dist,disc_year,discoverymethod,pl_bmasse,sy_snum,sy_pnum";
  const query = encodeURIComponent(
    `SELECT TOP ${limit} ${cols} FROM ps WHERE default_flag=1 AND pl_rade IS NOT NULL ORDER BY disc_year DESC`
  );
  const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 }, // cache 24h
    } as RequestInit);
    if (!res.ok) return FALLBACK_EXOPLANETS;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_EXOPLANETS;
  } catch {
    return FALLBACK_EXOPLANETS;
  }
}

export async function fetchHabitableExoplanets(): Promise<Exoplanet[]> {
  // Filter to potentially habitable zone planets (eq temp 200–350K, radius < 2 Earth radii)
  const cols = "pl_name,hostname,pl_orbper,pl_rade,pl_masse,pl_eqt,st_dist,disc_year,discoverymethod,pl_bmasse,sy_snum,sy_pnum";
  const query = encodeURIComponent(
    `SELECT TOP 15 ${cols} FROM ps WHERE default_flag=1 AND pl_eqt BETWEEN 200 AND 350 AND pl_rade < 2 ORDER BY pl_rade ASC`
  );
  const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return FALLBACK_EXOPLANETS.filter((p) => p.pl_eqt && p.pl_eqt < 300);
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data : FALLBACK_EXOPLANETS;
  } catch {
    return FALLBACK_EXOPLANETS.filter((p) => p.pl_eqt && p.pl_eqt < 300);
  }
}
