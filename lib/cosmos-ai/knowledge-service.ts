/**
 * COSMOS AI — Offline Knowledge Service
 * Loads all JSON knowledge base files and builds a searchable corpus.
 * Pure TypeScript, zero external dependencies.
 */

import greetings from "@/data/knowledge/greetings.json";
import solarSystem from "@/data/knowledge/solar-system.json";
import sun from "@/data/knowledge/sun.json";
import mercury from "@/data/knowledge/mercury.json";
import venus from "@/data/knowledge/venus.json";
import earth from "@/data/knowledge/earth.json";
import moon from "@/data/knowledge/moon.json";
import mars from "@/data/knowledge/mars.json";
import jupiter from "@/data/knowledge/jupiter.json";
import saturn from "@/data/knowledge/saturn.json";
import uranus from "@/data/knowledge/uranus.json";
import neptune from "@/data/knowledge/neptune.json";
import pluto from "@/data/knowledge/pluto.json";
import asteroids from "@/data/knowledge/asteroids.json";
import comets from "@/data/knowledge/comets.json";
import stars from "@/data/knowledge/stars.json";
import galaxies from "@/data/knowledge/galaxies.json";
import blackHoles from "@/data/knowledge/black-holes.json";
import nebulae from "@/data/knowledge/nebulae.json";
import spacecraft from "@/data/knowledge/spacecraft.json";
import satellites from "@/data/knowledge/satellites.json";
import nasaMissions from "@/data/knowledge/nasa-missions.json";
import isroMissions from "@/data/knowledge/isro-missions.json";
import esaMissions from "@/data/knowledge/esa-missions.json";
import rockets from "@/data/knowledge/rockets.json";
import astronauts from "@/data/knowledge/astronauts.json";
import scientists from "@/data/knowledge/scientists.json";
import spaceWeather from "@/data/knowledge/space-weather.json";
import faq from "@/data/knowledge/faq.json";

// ── Types ──────────────────────────────────────────────────────────────────

export interface KnowledgeDoc {
  id: string;
  topic: string;
  title: string;
  text: string;
  source: Record<string, unknown>;
  weight: number; // importance weight for ranking
}

export interface SearchResult {
  doc: KnowledgeDoc;
  score: number;
  matchedFaq?: { q: string; a: string };
}

// ── Text utilities ─────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text: string): string[] {
  const stopWords = new Set(["a","an","the","is","it","in","on","of","to","for","and","or","not","at","by","as","be","do","was","are","this","that","with","from","has","have","had","but","what","who","how","why","when","where","can","will","would","should","could","may","might","about","which","they","them","their","there","so","if","its","into"]);
  return normalize(text).split(" ").filter((w) => w.length > 2 && !stopWords.has(w));
}

function extractText(obj: unknown, depth = 0): string {
  if (depth > 4) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "number") return String(obj);
  if (Array.isArray(obj)) return obj.map((i) => extractText(i, depth + 1)).join(" ");
  if (obj && typeof obj === "object") {
    return Object.values(obj as Record<string, unknown>)
      .map((v) => extractText(v, depth + 1))
      .join(" ");
  }
  return "";
}

// ── TF-IDF Vectorizer ──────────────────────────────────────────────────────

class TfidfEngine {
  private docs: KnowledgeDoc[] = [];
  private idf: Map<string, number> = new Map();
  private tfVectors: Map<string, Map<string, number>> = new Map();

  fit(docs: KnowledgeDoc[]) {
    this.docs = docs;
    const N = docs.length;
    const df: Map<string, number> = new Map();

    // Build TF vectors + document frequencies
    for (const doc of docs) {
      const tokens = tokenize(doc.text);
      const tf: Map<string, number> = new Map();
      for (const token of tokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
      }
      // Normalize TF
      const maxFreq = Math.max(...tf.values(), 1);
      const normalizedTf: Map<string, number> = new Map();
      for (const [t, count] of tf) {
        normalizedTf.set(t, count / maxFreq);
        df.set(t, (df.get(t) ?? 0) + 1);
      }
      this.tfVectors.set(doc.id, normalizedTf);
    }

    // Compute IDF
    for (const [term, docFreq] of df) {
      this.idf.set(term, Math.log((N + 1) / (docFreq + 1)) + 1);
    }
  }

  query(queryText: string, topK = 5): SearchResult[] {
    const queryTokens = tokenize(queryText);
    if (!queryTokens.length) return [];

    const scores: { id: string; score: number }[] = [];

    for (const doc of this.docs) {
      const tfVec = this.tfVectors.get(doc.id);
      if (!tfVec) continue;

      let score = 0;
      for (const token of queryTokens) {
        const tf = tfVec.get(token) ?? 0;
        const idf = this.idf.get(token) ?? 0;
        score += tf * idf;
      }

      // Boost exact title/topic matches
      const docNorm = normalize(doc.title + " " + doc.topic);
      const queryNorm = normalize(queryText);
      for (const token of queryTokens) {
        if (docNorm.includes(token)) score += 2.5;
      }
      if (docNorm.includes(queryNorm)) score += 5;

      // Apply document weight
      score *= doc.weight;
      scores.push({ id: doc.id, score });
    }

    scores.sort((a, b) => b.score - a.score);

    const results: SearchResult[] = [];
    for (const { id, score } of scores.slice(0, topK)) {
      if (score <= 0) continue;
      const doc = this.docs.find((d) => d.id === id)!;
      results.push({ doc, score });
    }
    return results;
  }
}

// ── Knowledge Builder ─────────────────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function normalizeFaq(raw: unknown): { q: string; a: string }[] {
  if (!Array.isArray(raw)) return [];
  return (raw as AnyRecord[]).map((item) => ({
    q: String(item.q ?? item.question ?? ""),
    a: String(item.a ?? item.answer ?? ""),
  }));
}

function buildDocs(raw: unknown, topicId: string, title: string, weight = 1): KnowledgeDoc[] {
  const item = raw as AnyRecord;
  const docs: KnowledgeDoc[] = [];
  const faqNormalized = normalizeFaq(item.faq);

  const mainText = [
    String(item.name ?? title),
    String(item.description ?? ""),
    String(item.summary ?? ""),
    ...((item.interesting_facts as string[] | undefined) ?? []),
    extractText(item.known_missions ?? ""),
    extractText(item.notable_missions ?? ""),
    faqNormalized.map((f) => `${f.q} ${f.a}`).join(" "),
  ].join(" ");

  docs.push({
    id: `${topicId}-main`,
    topic: topicId,
    title,
    text: mainText,
    source: item,
    weight,
  });

  // Separate FAQ docs for high-precision QA
  for (let i = 0; i < faqNormalized.length; i++) {
    const { q, a } = faqNormalized[i];
    if (!q) continue;
    docs.push({
      id: `${topicId}-faq-${i}`,
      topic: topicId,
      title: `${title} FAQ`,
      text: `${q} ${a}`,
      source: { q, a },
      weight: weight * 1.4,
    });
  }

  return docs;
}

// ── Build corpus ───────────────────────────────────────────────────────────

export function buildCorpus(): KnowledgeDoc[] {
  const docs: KnowledgeDoc[] = [
    ...buildDocs(solarSystem, "solar-system", "Solar System", 1.2),
    ...buildDocs(sun, "sun", "Sun", 1.3),
    ...buildDocs(mercury, "mercury", "Mercury", 1.2),
    ...buildDocs(venus, "venus", "Venus", 1.2),
    ...buildDocs(earth, "earth", "Earth", 1.3),
    ...buildDocs(moon, "moon", "Moon", 1.3),
    ...buildDocs(mars, "mars", "Mars", 1.3),
    ...buildDocs(jupiter, "jupiter", "Jupiter", 1.2),
    ...buildDocs(saturn, "saturn", "Saturn", 1.2),
    ...buildDocs(uranus, "uranus", "Uranus", 1.1),
    ...buildDocs(neptune, "neptune", "Neptune", 1.1),
    ...buildDocs(pluto, "pluto", "Pluto", 1.1),
    ...buildDocs(asteroids, "asteroids", "Asteroids", 1.1),
    ...buildDocs(comets, "comets", "Comets", 1.1),
    ...buildDocs(stars, "stars", "Stars", 1.1),
    ...buildDocs(galaxies, "galaxies", "Galaxies", 1.1),
    ...buildDocs(blackHoles, "black-holes", "Black Holes", 1.2),
    ...buildDocs(nebulae, "nebulae", "Nebulae", 1.0),
    ...buildDocs(spacecraft, "spacecraft", "Spacecraft", 1.1),
    ...buildDocs(satellites, "satellites", "Satellites", 1.0),
    ...buildDocs(nasaMissions, "nasa-missions", "NASA Missions", 1.2),
    ...buildDocs(isroMissions, "isro-missions", "ISRO Missions", 1.2),
    ...buildDocs(esaMissions, "esa-missions", "ESA Missions", 1.1),
    ...buildDocs(rockets, "rockets", "Rockets", 1.0),
    ...buildDocs(astronauts, "astronauts", "Astronauts", 1.3),
    ...buildDocs(scientists, "scientists", "Space Scientists", 1.3),
    ...buildDocs(spaceWeather, "space-weather", "Space Weather", 1.0),
  ];

  // Add general FAQ docs
  const rawFaq = faq as AnyRecord;
  const generalFaq = normalizeFaq(rawFaq.general_faq as unknown[]);
  for (let i = 0; i < generalFaq.length; i++) {
    const { q, a } = generalFaq[i];
    docs.push({
      id: `faq-general-${i}`,
      topic: "general",
      title: "Space FAQ",
      text: `${q} ${a}`,
      source: { q, a },
      weight: 1.0,
    });
  }

  return docs;
}

// ── Singleton engine ───────────────────────────────────────────────────────

let _engine: TfidfEngine | null = null;
let _corpus: KnowledgeDoc[] | null = null;

export function getEngine(): TfidfEngine {
  if (!_engine) {
    _corpus = buildCorpus();
    _engine = new TfidfEngine();
    _engine.fit(_corpus);
  }
  return _engine;
}

export function getCorpus(): KnowledgeDoc[] {
  if (!_corpus) buildCorpus();
  return _corpus!;
}

// ── Greeting matcher ───────────────────────────────────────────────────────

export function matchGreeting(query: string): string | null {
  const q = query.toLowerCase().trim();
  for (const g of (greetings as { greetings: { triggers: string[]; response: string }[] }).greetings) {
    if (g.triggers.some((t) => q === t || q.startsWith(t + " ") || q.endsWith(" " + t) || q.includes(t))) {
      return g.response;
    }
  }
  return null;
}

export { TfidfEngine, extractText, tokenize };
