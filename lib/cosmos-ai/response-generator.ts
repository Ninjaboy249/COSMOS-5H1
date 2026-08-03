/**
 * COSMOS AI — Response Generator
 * Converts retrieved knowledge docs into natural language answers.
 * No external AI required — uses template + RAG pattern.
 */

import type { KnowledgeDoc, SearchResult } from "./knowledge-service";
import type { DetectedIntent } from "./intent-service";

interface KBSource {
  name?: string;
  description?: string;
  summary?: string;
  interesting_facts?: string[];
  faq?: { q: string; a: string }[];
  diameter?: string;
  gravity?: string;
  distance_from_sun?: string;
  distance_from_earth?: string;
  orbital_period?: string;
  rotation_period?: string;
  temperature_avg?: string;
  temperature_max?: string;
  temperature_min?: string;
  atmosphere?: string;
  moons?: number | string;
  rings?: number | string;
  mass?: string;
  age?: string;
  known_missions?: string | string[];
  current_missions?: string[];
  q?: string;
  a?: string;
  [key: string]: unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pickFacts(source: KBSource, count = 3): string {
  const facts = source.interesting_facts ?? [];
  if (!facts.length) return "";
  const picked = facts.slice(0, count);
  return "\n\n✦ **Interesting facts:**\n" + picked.map((f) => `  • ${f}`).join("\n");
}

function formatList(val: unknown): string {
  if (Array.isArray(val)) return val.slice(0, 6).join(", ");
  if (typeof val === "string") return val;
  return "";
}

// ── Planet / celestial body response ──────────────────────────────────────

function buildPlanetResponse(doc: KnowledgeDoc, query: string): string {
  const s = doc.source as KBSource;
  const q = query.toLowerCase();

  // If it's a FAQ doc, use the exact answer
  if (s.q && s.a) return `**Q: ${s.q}**\n\n${s.a}`;

  const name = s.name ?? doc.title;

  // Specific attribute queries
  if (q.includes("temperatur") || q.includes("hot") || q.includes("cold")) {
    const temp = [s.temperature_avg, s.temperature_max, s.temperature_min].filter(Boolean).join(" / ");
    return `🌡️ **${name} — Temperature**\n\n${temp || "Temperature data not available."}\n\n${s.atmosphere ? `Atmosphere: ${s.atmosphere}` : ""}`;
  }
  if (q.includes("gravity") || q.includes("weight")) {
    return `⚖️ **${name} — Gravity**\n\n${s.gravity || "N/A"}\n\n${s.escape_velocity ? `Escape velocity: ${s.escape_velocity}` : ""}`;
  }
  if (q.includes("moon") || q.includes("satellite")) {
    return `🌕 **${name} — Moons**\n\nMoons: ${s.moons ?? "Unknown"}\n${s.notable_moons ? `\nNotable moons: ${formatList(Object.keys(s.notable_moons as Record<string, string>))}` : ""}`;
  }
  if (q.includes("mission") || q.includes("spacecraft") || q.includes("probe") || q.includes("rover")) {
    const missions = formatList(s.known_missions);
    return `🚀 **${name} — Missions**\n\n${missions || "Mission data loading from knowledge base…"}`;
  }
  if (q.includes("size") || q.includes("big") || q.includes("diameter") || q.includes("large")) {
    return `📏 **${name} — Size**\n\nDiameter: ${s.diameter ?? "N/A"}\nMass: ${s.mass ?? "N/A"}\n${s.radius ? `Radius: ${s.radius}` : ""}`;
  }
  if (q.includes("distance") || q.includes("far") || q.includes("away")) {
    return `📍 **${name} — Distance**\n\nDistance from Sun: ${s.distance_from_sun ?? "N/A"}\nDistance from Earth: ${s.distance_from_earth ?? "N/A"}\nOrbital period: ${s.orbital_period ?? "N/A"}`;
  }
  if (q.includes("atmosphere") || q.includes("air") || q.includes("breath")) {
    return `🌬️ **${name} — Atmosphere**\n\n${s.atmosphere ?? "No significant atmosphere."}\n${s.temperature_avg ? `Average temperature: ${s.temperature_avg}` : ""}`;
  }

  // General overview
  const parts: string[] = [];
  parts.push(`## ${name}`);
  if (s.description) parts.push(s.description);
  if (s.summary) parts.push("\n" + s.summary);

  const statLines: string[] = [];
  if (s.diameter) statLines.push(`📏 Diameter: ${s.diameter}`);
  if (s.mass) statLines.push(`⚖️ Mass: ${s.mass}`);
  if (s.gravity) statLines.push(`🌍 Gravity: ${s.gravity}`);
  if (s.distance_from_sun) statLines.push(`☀️ Distance from Sun: ${s.distance_from_sun}`);
  if (s.temperature_avg) statLines.push(`🌡️ Avg Temperature: ${s.temperature_avg}`);
  if (s.orbital_period) statLines.push(`🔄 Orbital Period: ${s.orbital_period}`);
  if (typeof s.moons === "number") statLines.push(`🌕 Moons: ${s.moons}`);
  if (s.atmosphere) statLines.push(`🌬️ Atmosphere: ${s.atmosphere}`);

  if (statLines.length) parts.push("\n**Key Facts:**\n" + statLines.join("\n"));
  parts.push(pickFacts(s, 3));

  return parts.join("\n");
}

// ── Mission response ───────────────────────────────────────────────────────

function buildMissionResponse(doc: KnowledgeDoc, query: string): string {
  const s = doc.source as KBSource;
  if (s.q && s.a) return `**Q: ${s.q}**\n\n${s.a}`;

  const name = s.name ?? doc.title;
  const parts: string[] = [`## ${name}`];
  if (s.description) parts.push(s.description);
  if (s.summary) parts.push("\n" + s.summary);
  parts.push(pickFacts(s, 3));
  return parts.join("\n");
}

// ── Comparison response ────────────────────────────────────────────────────

export function buildComparisonResponse(query: string, results: SearchResult[]): string {
  const topTwo = results.slice(0, 2);
  if (topTwo.length < 2) return buildAnswer(query, results);

  const s1 = topTwo[0].doc.source as KBSource;
  const s2 = topTwo[1].doc.source as KBSource;
  const n1 = s1.name ?? topTwo[0].doc.title;
  const n2 = s2.name ?? topTwo[1].doc.title;

  const lines: string[] = [`## ⚖️ ${n1} vs ${n2}`, "", "| Property | " + n1 + " | " + n2 + " |", "|---|---|---|"];

  const props: [string, string][] = [
    ["Diameter", "diameter"], ["Mass", "mass"], ["Gravity", "gravity"],
    ["Distance from Sun", "distance_from_sun"], ["Orbital Period", "orbital_period"],
    ["Temperature", "temperature_avg"], ["Moons", "moons"], ["Atmosphere", "atmosphere"],
  ];

  for (const [label, key] of props) {
    const v1 = (s1[key] as string | number | undefined) ?? "—";
    const v2 = (s2[key] as string | number | undefined) ?? "—";
    if (v1 !== "—" || v2 !== "—") lines.push(`| ${label} | ${v1} | ${v2} |`);
  }

  return lines.join("\n");
}

// ── Navigation response ────────────────────────────────────────────────────

export function buildNavigationResponse(entity: string, navigateTo: string): string {
  const names: Record<string, string> = {
    mercury: "Mercury", venus: "Venus", earth: "Earth", moon: "Moon",
    mars: "Mars", jupiter: "Jupiter", saturn: "Saturn", uranus: "Uranus",
    neptune: "Neptune", pluto: "Pluto", sun: "Sun",
    "solar-system": "Solar System", "black-holes": "Black Holes",
    galaxies: "Galaxies", stars: "Stars", nebulae: "Nebulae",
    "nasa-missions": "NASA Missions", "isro-missions": "ISRO Missions",
    "esa-missions": "ESA Missions",
  };
  const name = names[entity] ?? entity;
  return `🚀 **Navigating to ${name}…**\n\nOpening the ${name} explorer page with 3D visualization, scientific data, mission history, and AI insights.`;
}

// ── Unknown / fallback ─────────────────────────────────────────────────────

function buildFallback(query: string): string {
  const suggestions = ["Tell me about Mars", "What is a black hole?", "How many moons does Jupiter have?", "Explain the Big Bang", "What is the ISS?", "Compare Earth and Venus"];
  const picked = suggestions.sort(() => Math.random() - 0.5).slice(0, 3);
  return `🌌 I couldn't find a precise match for **"${query}"** in my knowledge base.\n\nTry asking:\n${picked.map((s) => `  • ${s}`).join("\n")}\n\nOr rephrase your question — I know about planets, stars, missions, astronauts, black holes, and more!`;
}

// ── Main answer builder ────────────────────────────────────────────────────

export function buildAnswer(query: string, results: SearchResult[], intent?: DetectedIntent): string {
  if (!results.length) return buildFallback(query);

  const topResult = results[0];
  const { doc } = topResult;

  // Comparison intent
  if (intent?.intent === "comparison") return buildComparisonResponse(query, results);

  // Navigation intent
  if (intent?.intent === "navigation" && intent.entity && intent.navigateTo) {
    return buildNavigationResponse(intent.entity, intent.navigateTo);
  }

  // Check if the best match is a FAQ entry
  if (doc.source && typeof (doc.source as KBSource).q === "string") {
    const src = doc.source as KBSource;
    // Find the best-matching FAQ among top results
    const faqMatches = results
      .filter((r) => typeof (r.doc.source as KBSource).q === "string")
      .sort((a, b) => b.score - a.score);

    if (faqMatches.length > 0 && faqMatches[0].score > topResult.score * 0.7) {
      const best = (faqMatches[0].doc.source as KBSource);
      return `${best.a ?? ""}`;
    }
    return `${src.a ?? buildPlanetResponse(doc, query)}`;
  }

  // Route by topic
  const topic = doc.topic;
  const missionTopics = ["nasa-missions", "isro-missions", "esa-missions", "spacecraft", "rockets"];
  if (missionTopics.includes(topic)) return buildMissionResponse(doc, query);
  if (topic === "astronauts") return buildMissionResponse(doc, query);

  // Default: planet/celestial body response
  return buildPlanetResponse(doc, query);
}
