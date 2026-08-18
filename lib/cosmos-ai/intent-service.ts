/**
 * COSMOS AI — Intent Detection Service
 * Classifies user queries into intents without any external AI.
 */

export type Intent =
  | "greeting"
  | "planet_question"
  | "moon_question"
  | "mission_question"
  | "astronaut_question"
  | "spacecraft_question"
  | "rocket_question"
  | "star_question"
  | "galaxy_question"
  | "nebula_question"
  | "black_hole_question"
  | "space_weather_question"
  | "comparison"
  | "navigation"
  | "general_astronomy"
  | "unknown";

export interface DetectedIntent {
  intent: Intent;
  entity: string | null;
  confidence: number;
  navigateTo?: string;
}

import { findBundled3DObject, get3DViewerRoute } from "@/lib/cosmic-compare-data";

// ── Keyword maps ───────────────────────────────────────────────────────────

const PLANET_KEYWORDS: Record<string, string> = {
  mercury: "mercury", "the swift planet": "mercury",
  venus: "venus", "morning star": "venus", "evening star": "venus", "earth's twin": "venus",
  earth: "earth", "blue marble": "earth", "our planet": "earth", terra: "earth",
  moon: "moon", luna: "moon", "earth's moon": "moon",
  mars: "mars", "red planet": "mars", "fourth planet": "mars",
  jupiter: "jupiter", "king of planets": "jupiter", "great red spot": "jupiter",
  saturn: "saturn", "ringed planet": "saturn", "titan": "saturn",
  uranus: "uranus", "ice giant": "uranus",
  neptune: "neptune", "eighth planet": "neptune",
  pluto: "pluto", "dwarf planet": "pluto",
};

const MISSION_KEYWORDS: string[] = [
  "apollo", "artemis", "voyager", "cassini", "juno", "galileo", "pioneer",
  "perseverance", "curiosity", "ingenuity", "opportunity", "spirit",
  "chandrayaan", "mangalyaan", "gaganyaan", "aditya",
  "rosetta", "bepi colombo", "juice", "euclid",
  "hubble", "james webb", "jwst", "parker solar probe",
  "new horizons", "messenger", "maven",
  "mission", "missions", "program", "launch",
];

const ASTRONAUT_KEYWORDS: string[] = [
  "astronaut", "cosmonaut", "taikonaut", "spacewalk", "eva",
  "armstrong", "aldrin", "gagarin", "tereshkova", "shepard",
  "chawla", "sharma", "hadfield", "kelly",
];

const SPACECRAFT_KEYWORDS: string[] = [
  "spacecraft", "probe", "satellite", "telescope", "rover",
  "voyager", "cassini", "hubble", "jwst", "webb",
  "perseverance", "curiosity", "ingenuity",
];

const ROCKET_KEYWORDS: string[] = [
  "rocket", "launch vehicle", "saturn v", "falcon", "sls", "starship",
  "pslv", "gslv", "ariane", "soyuz", "atlas", "delta",
];

const STAR_KEYWORDS: string[] = [
  "star", "sun", "stellar", "supernova", "neutron star", "pulsar",
  "sirius", "betelgeuse", "rigel", "proxima", "main sequence",
  "white dwarf", "red giant", "yellow dwarf",
];

const GALAXY_KEYWORDS: string[] = [
  "galaxy", "galaxies", "milky way", "andromeda", "spiral", "elliptical",
  "universe", "dark matter", "dark energy",
];

const NEBULA_KEYWORDS: string[] = [
  "nebula", "nebulae", "orion nebula", "pillars of creation",
  "crab nebula", "star forming", "stellar nursery",
];

const BLACK_HOLE_KEYWORDS: string[] = [
  "black hole", "black holes", "event horizon", "singularity", "hawking",
  "sagittarius a", "m87", "gravitational waves", "spaghettification",
];

const SPACE_WEATHER_KEYWORDS: string[] = [
  "solar flare", "cme", "coronal mass ejection", "aurora", "northern lights",
  "geomagnetic", "solar wind", "space weather", "sunspot",
];

const GREETING_KEYWORDS: string[] = [
  "hi", "hello", "hey", "howdy", "hiya", "good morning", "good evening",
  "good afternoon", "good night", "how are you", "who are you", "what can you do",
  "thank you", "thanks", "bye", "goodbye", "ok", "okay", "cool",
];

const NAVIGATION_PATTERNS: { patterns: string[]; destination: string }[] = [
  { patterns: ["show", "open", "go to", "navigate", "display", "take me to", "show me"], destination: "navigate" },
];

const COMPARISON_PATTERNS: string[] = ["compare", "difference", "vs", "versus", "better", "bigger", "larger", "smaller", "hotter", "colder", "heavier"];

// ── Detector ───────────────────────────────────────────────────────────────

export function detectIntent(query: string): DetectedIntent {
  const q = query.toLowerCase().trim();

  // Greeting
  if (GREETING_KEYWORDS.some((k) => q === k || q.startsWith(k + " ") || q.endsWith(" " + k))) {
    return { intent: "greeting", entity: null, confidence: 0.95 };
  }

  // Navigation
  if (NAVIGATION_PATTERNS[0].patterns.some((p) => q.startsWith(p + " ") || q.includes(p + " "))) {
    // Try to find which planet/object
    const entity = findPlanetEntity(q) ?? findBundled3DObject(q);
    if (entity) {
      return {
        intent: "navigation",
        entity,
        confidence: 0.9,
        navigateTo: get3DViewerRoute(entity) ?? `/space/${entity}`,
      };
    }
  }

  // Comparison
  if (COMPARISON_PATTERNS.some((p) => q.includes(p))) {
    return { intent: "comparison", entity: findPlanetEntity(q), confidence: 0.85 };
  }

  // Planet
  const planetEntity = findPlanetEntity(q);
  if (planetEntity) {
    if (planetEntity === "moon") return { intent: "moon_question", entity: "moon", confidence: 0.9 };
    return { intent: "planet_question", entity: planetEntity, confidence: 0.9 };
  }

  // Mission
  if (MISSION_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "mission_question", entity: findMissionEntity(q), confidence: 0.85 };
  }

  // Astronaut
  if (ASTRONAUT_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "astronaut_question", entity: null, confidence: 0.85 };
  }

  // Spacecraft
  if (SPACECRAFT_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "spacecraft_question", entity: null, confidence: 0.8 };
  }

  // Rocket
  if (ROCKET_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "rocket_question", entity: null, confidence: 0.8 };
  }

  // Black hole
  if (BLACK_HOLE_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "black_hole_question", entity: "black-holes", confidence: 0.9 };
  }

  // Nebula
  if (NEBULA_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "nebula_question", entity: "nebulae", confidence: 0.85 };
  }

  // Galaxy
  if (GALAXY_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "galaxy_question", entity: "galaxies", confidence: 0.85 };
  }

  // Star
  if (STAR_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "star_question", entity: "stars", confidence: 0.8 };
  }

  // Space weather
  if (SPACE_WEATHER_KEYWORDS.some((k) => q.includes(k))) {
    return { intent: "space_weather_question", entity: "space-weather", confidence: 0.85 };
  }

  // General astronomy
  const astronomyWords = ["space", "cosmos", "universe", "orbit", "planet", "solar", "gravity", "nasa", "isro", "esa", "asteroid", "comet", "exoplanet", "telescope", "launch", "satellite"];
  if (astronomyWords.some((k) => q.includes(k))) {
    return { intent: "general_astronomy", entity: null, confidence: 0.7 };
  }

  return { intent: "unknown", entity: null, confidence: 0.3 };
}

function findPlanetEntity(q: string): string | null {
  for (const [keyword, entityId] of Object.entries(PLANET_KEYWORDS)) {
    if (q.includes(keyword)) return entityId;
  }
  return null;
}

function findMissionEntity(q: string): string | null {
  if (q.includes("apollo") || q.includes("artemis") || q.includes("nasa")) return "nasa-missions";
  if (q.includes("chandrayaan") || q.includes("mangalyaan") || q.includes("isro") || q.includes("gaganyaan")) return "isro-missions";
  if (q.includes("rosetta") || q.includes("esa") || q.includes("juice") || q.includes("euclid")) return "esa-missions";
  return "nasa-missions";
}
