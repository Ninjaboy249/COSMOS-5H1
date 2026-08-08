/**
 * COSMOS Voice — Command Router
 * Converts raw STT transcript into a structured VoiceCommand.
 * Reuses the existing COSMOS intent-detection system and extends it
 * with voice-specific intents (NAVIGATE, COMPARE, TOUR, etc.)
 */

// ── Voice intents (superset of the text-chat intents) ────────────────────────

export type VoiceIntent =
  | "NAVIGATE"
  | "SHOW_PLANET"
  | "SHOW_SUN"
  | "SHOW_MOON"
  | "SHOW_SPACECRAFT"
  | "SHOW_SATELLITE"
  | "COMPARE_OBJECTS"
  | "START_TOUR"
  | "STOP_TOUR"
  | "MISSION_CONTROL"
  | "SPACE_WEATHER"
  | "EARTH_OBSERVATION"
  | "ASTRONOMY"
  | "SEARCH"
  | "AI_QUESTION"
  | "GO_BACK"
  | "GO_HOME"
  | "OPEN_AI"
  | "OPEN_COMPARE"
  | "OPEN_PHYSICS"
  | "OPEN_MORSE"
  | "OPEN_MISSIONS"
  | "UNKNOWN";

export interface VoiceCommand {
  intent: VoiceIntent;
  /** Primary entity (planet name, slug, etc.) */
  entity: string | null;
  /** Secondary entity for COMPARE_OBJECTS */
  entity2: string | null;
  /** The raw transcript */
  transcript: string;
  /** Route to navigate to, when applicable */
  navigateTo?: string;
  /** Short confirmation text for COSMOS to speak back */
  confirmText: string;
  /** Whether this should open the AI assistant with the transcript as query */
  askAI?: boolean;
}

// ── Keyword maps ──────────────────────────────────────────────────────────────

const PLANET_MAP: Record<string, string> = {
  mercury: "mercury",
  venus: "venus",
  earth: "earth",
  "blue marble": "earth",
  "our planet": "earth",
  mars: "mars",
  "red planet": "mars",
  jupiter: "jupiter",
  "king of planets": "jupiter",
  "great red spot": "jupiter",
  "biggest planet": "jupiter",
  "largest planet": "jupiter",
  saturn: "saturn",
  "ringed planet": "saturn",
  uranus: "uranus",
  neptune: "neptune",
  pluto: "pluto",
  "dwarf planet": "pluto",
  moon: "moon",
  luna: "moon",
  sun: "sun",
  sol: "sun",
  "our star": "sun",
  // Descriptive resolutions
  "closest to the sun": "mercury",
  "closest planet to the sun": "mercury",
  "planet closest to the sun": "mercury",
  "first planet": "mercury",
  "second planet": "venus",
  "third planet": "earth",
  "fourth planet": "mars",
  "fifth planet": "jupiter",
  "sixth planet": "saturn",
  "seventh planet": "uranus",
  "eighth planet": "neptune",
  "hottest planet": "venus",
  "coldest planet": "neptune",
  "smallest planet": "mercury",
};

// Slug mapping: planet entity → /space/[slug] route
const PLANET_SLUG: Record<string, string> = {
  mercury: "mercury",
  venus: "venus",
  earth: "earth",
  mars: "mars",
  jupiter: "jupiter",
  saturn: "saturn",
  uranus: "uranus",
  neptune: "neptune",
  pluto: "dwarf-planets",
  moon: "moon",
  sun: "solar-system",
};

// Space Explorer slugs for navigation
const SPACE_CATEGORY_SLUGS: Record<string, string> = {
  "solar system": "solar-system",
  asteroids: "asteroids",
  comets: "comets",
  satellites: "satellites",
  spacecraft: "spacecraft",
  "earth observation": "earth-observation",
  "space weather": "space-weather",
  exoplanets: "exoplanets",
  stars: "stars",
  galaxies: "galaxies",
  nebulae: "nebulae",
  "nebula": "nebulae",
  "black holes": "black-holes",
  "black hole": "black-holes",
  "nasa missions": "nasa-missions",
  "isro missions": "isro-missions",
  "esa missions": "esa-missions",
  rockets: "rockets",
  astronauts: "astronauts",
  "iss": "iss-tracker",
  "iss tracker": "iss-tracker",
  "space station": "iss-tracker",
  "international space station": "iss-tracker",
  "apod": "apod",
  "astronomy photo": "apod",
  "mars rover": "mars-rover",
  "perseverance": "mars-rover",
  "curiosity": "mars-rover",
  neo: "neo",
  "near earth objects": "neo",
  "earth live": "earth-live",
  launches: "launches",
  spacex: "spacex",
  "astronomy research": "astronomy-research",
};

// Tour keywords
const TOUR_START = ["start tour", "begin tour", "start solar system tour", "take a tour", "tour the solar system", "show me the solar system", "solar system tour", "start the tour", "begin the tour", "start a tour"];
const TOUR_STOP = ["stop tour", "end tour", "stop the tour", "cancel tour", "end the tour", "pause tour"];

// Navigation keywords
const NAV_VERBS = ["show", "open", "go to", "navigate", "display", "take me to", "show me", "visit", "explore", "fly to", "jump to", "head to", "launch", "load"];

// Back / home
const GO_BACK_PHRASES = ["go back", "back", "previous", "return", "navigate back"];
const GO_HOME_PHRASES = ["go home", "home", "main page", "homepage", "home page", "back to home", "back home"];

// App page shortcuts
const PAGE_SHORTCUTS: { phrases: string[]; intent: VoiceIntent; route: string; confirm: string }[] = [
  {
    phrases: ["mission control", "mission planner", "open missions", "show missions", "missions"],
    intent: "MISSION_CONTROL",
    route: "/mission-planner",
    confirm: "Opening Mission Planner.",
  },
  {
    phrases: ["compare", "comparison", "cosmic compare", "open compare"],
    intent: "OPEN_COMPARE",
    route: "/compare",
    confirm: "Opening Cosmic Compare.",
  },
  {
    phrases: ["physics", "physics lab", "open physics", "show physics"],
    intent: "OPEN_PHYSICS",
    route: "/physics-lab",
    confirm: "Opening Physics Lab.",
  },
  {
    phrases: ["morse", "morse code", "open morse"],
    intent: "OPEN_MORSE",
    route: "/morse-code",
    confirm: "Opening Morse Code.",
  },
  {
    phrases: ["space explorer", "explore space", "space categories", "all modules"],
    intent: "NAVIGATE",
    route: "/space",
    confirm: "Opening Space Explorer.",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function q(transcript: string) {
  return transcript.toLowerCase().trim().replace(/[.,!?;:]+$/g, "");
}

function findPlanet(text: string): string | null {
  for (const [keyword, planet] of Object.entries(PLANET_MAP)) {
    if (text.includes(keyword)) return planet;
  }
  return null;
}

function findSpaceCategory(text: string): string | null {
  for (const [keyword, slug] of Object.entries(SPACE_CATEGORY_SLUGS)) {
    if (text.includes(keyword)) return slug;
  }
  return null;
}

/** Extract two planet entities for COMPARE_OBJECTS */
function findTwoPlanets(text: string): [string | null, string | null] {
  const found: string[] = [];
  for (const [keyword, planet] of Object.entries(PLANET_MAP)) {
    if (text.includes(keyword) && !found.includes(planet)) {
      found.push(planet);
    }
    if (found.length >= 2) break;
  }
  return [found[0] ?? null, found[1] ?? null];
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
}

// ── Main router ────────────────────────────────────────────────────────────────

export function routeVoiceCommand(transcript: string): VoiceCommand {
  const text = q(transcript);

  // ── Go home ───────────────────────────────────────────────────────────────
  if (GO_HOME_PHRASES.some((p) => text === p || text.startsWith(p + " ") || text.endsWith(" " + p))) {
    return {
      intent: "GO_HOME",
      entity: null,
      entity2: null,
      transcript,
      navigateTo: "/",
      confirmText: "Going home.",
    };
  }

  // ── Go back ───────────────────────────────────────────────────────────────
  if (GO_BACK_PHRASES.some((p) => text === p || text.startsWith(p + " ") || text.endsWith(" " + p))) {
    return {
      intent: "GO_BACK",
      entity: null,
      entity2: null,
      transcript,
      confirmText: "Going back.",
    };
  }

  // ── Tour ──────────────────────────────────────────────────────────────────
  if (TOUR_START.some((p) => text.includes(p))) {
    return {
      intent: "START_TOUR",
      entity: null,
      entity2: null,
      transcript,
      confirmText: "Starting the Solar System tour. I'll guide you through each planet.",
    };
  }

  if (TOUR_STOP.some((p) => text.includes(p))) {
    return {
      intent: "STOP_TOUR",
      entity: null,
      entity2: null,
      transcript,
      confirmText: "Tour stopped.",
    };
  }

  // ── App page shortcuts (mission control, compare, physics…) ──────────────
  for (const shortcut of PAGE_SHORTCUTS) {
    if (shortcut.phrases.some((p) => text.includes(p))) {
      return {
        intent: shortcut.intent,
        entity: null,
        entity2: null,
        transcript,
        navigateTo: shortcut.route,
        confirmText: shortcut.confirm,
      };
    }
  }

  // ── Space weather ─────────────────────────────────────────────────────────
  if (
    text.includes("space weather") ||
    text.includes("solar flare") ||
    text.includes("aurora") ||
    text.includes("geomagnetic") ||
    text.includes("sunspot")
  ) {
    return {
      intent: "SPACE_WEATHER",
      entity: "space-weather",
      entity2: null,
      transcript,
      navigateTo: "/space/space-weather",
      confirmText: "Opening Space Weather.",
    };
  }

  // ── Earth observation ─────────────────────────────────────────────────────
  if (
    text.includes("earth observation") ||
    text.includes("satellite imagery") ||
    text.includes("earth live") ||
    text.includes("epic camera") ||
    text.includes("show earth")
  ) {
    return {
      intent: "EARTH_OBSERVATION",
      entity: "earth-observation",
      entity2: null,
      transcript,
      navigateTo: "/space/earth-observation",
      confirmText: "Opening Earth Observation.",
    };
  }

  // ── Satellites ────────────────────────────────────────────────────────────
  if (
    text.includes("satellites near") ||
    text.includes("show satellites") ||
    text.includes("active satellites") ||
    text.includes("orbital satellites") ||
    text.includes("iss tracker") ||
    text.includes("space station tracker")
  ) {
    const isISS =
      text.includes("iss") ||
      text.includes("space station") ||
      text.includes("international space station");
    return {
      intent: "SHOW_SATELLITE",
      entity: isISS ? "iss-tracker" : "satellites",
      entity2: null,
      transcript,
      navigateTo: isISS ? "/space/iss-tracker" : "/space/satellites",
      confirmText: isISS ? "Opening ISS Tracker." : "Showing satellites.",
    };
  }

  // ── Spacecraft ────────────────────────────────────────────────────────────
  if (
    text.includes("spacecraft") ||
    text.includes("voyager") ||
    text.includes("james webb") ||
    text.includes("jwst") ||
    text.includes("hubble") ||
    text.includes("cassini") ||
    text.includes("new horizons") ||
    text.includes("parker solar")
  ) {
    return {
      intent: "SHOW_SPACECRAFT",
      entity: "spacecraft",
      entity2: null,
      transcript,
      navigateTo: "/space/spacecraft",
      confirmText: "Opening spacecraft information.",
    };
  }

  // ── Compare ───────────────────────────────────────────────────────────────
  const COMPARE_WORDS = ["compare", "versus", " vs ", " vs.", "difference between", "which is bigger", "which is hotter", "which is heavier"];
  if (COMPARE_WORDS.some((c) => text.includes(c))) {
    const [p1, p2] = findTwoPlanets(text);
    let confirmText = "Opening Cosmic Compare.";
    const route = "/compare";
    if (p1 && p2) {
      confirmText = `Comparing ${capitalize(p1)} and ${capitalize(p2)}.`;
    } else if (p1) {
      confirmText = `Comparing ${capitalize(p1)} with another object.`;
    }
    return {
      intent: "COMPARE_OBJECTS",
      entity: p1,
      entity2: p2,
      transcript,
      navigateTo: route,
      confirmText,
    };
  }

  // ── Show / navigate to planet or space category ───────────────────────────
  const hasNavVerb = NAV_VERBS.some((v) => text.startsWith(v + " ") || text.includes(" " + v + " "));

  const planet = findPlanet(text);
  if (planet) {
    const isSun = planet === "sun";
    const isMoon = planet === "moon";
    const slug = PLANET_SLUG[planet] ?? planet;
    const route = `/space/${slug}`;
    const intent: VoiceIntent = isSun ? "SHOW_SUN" : isMoon ? "SHOW_MOON" : "SHOW_PLANET";
    return {
      intent,
      entity: planet,
      entity2: null,
      transcript,
      navigateTo: route,
      confirmText: `Opening ${capitalize(planet)}.`,
    };
  }

  if (hasNavVerb) {
    const category = findSpaceCategory(text);
    if (category) {
      return {
        intent: "NAVIGATE",
        entity: category,
        entity2: null,
        transcript,
        navigateTo: `/space/${category}`,
        confirmText: `Opening ${capitalize(category)}.`,
      };
    }
  }

  // ── Direct space category navigation without verb ─────────────────────────
  const category = findSpaceCategory(text);
  if (category) {
    return {
      intent: "NAVIGATE",
      entity: category,
      entity2: null,
      transcript,
      navigateTo: `/space/${category}`,
      confirmText: `Opening ${capitalize(category)}.`,
    };
  }

  // ── Open AI / greeting ────────────────────────────────────────────────────
  const AI_TRIGGERS = ["hi cosmos", "hello cosmos", "hey cosmos", "cosmos", "ask cosmos", "cosmos ai", "open ai", "ai assistant"];
  if (AI_TRIGGERS.some((t) => text.includes(t))) {
    return {
      intent: "OPEN_AI",
      entity: null,
      entity2: null,
      transcript,
      confirmText: "Hello! I'm COSMOS AI. How can I help you explore the universe?",
      askAI: true,
    };
  }

  // ── Astronomy / knowledge question → send to AI ───────────────────────────
  const QUESTION_WORDS = ["what", "why", "how", "when", "where", "who", "explain", "tell me", "describe", "is it", "are there", "can you", "does"];
  const SPACE_WORDS = ["space", "planet", "star", "galaxy", "universe", "orbit", "gravity", "nasa", "black hole", "asteroid", "comet", "rocket", "astronaut", "telescope", "cosmos", "solar", "nebula", "quasar", "dark matter"];
  const isQuestion = QUESTION_WORDS.some((w) => text.startsWith(w + " ") || text.startsWith(w));
  const hasSpaceWord = SPACE_WORDS.some((w) => text.includes(w));

  if (isQuestion || hasSpaceWord) {
    return {
      intent: "AI_QUESTION",
      entity: null,
      entity2: null,
      transcript,
      confirmText: "",
      askAI: true,
    };
  }

  // ── Unknown ───────────────────────────────────────────────────────────────
  return {
    intent: "UNKNOWN",
    entity: null,
    entity2: null,
    transcript,
    confirmText: "I didn't understand that command. Try saying 'Show Mars' or 'Open Jupiter'.",
    askAI: true, // Fall through to AI for best-effort answer
  };
}
