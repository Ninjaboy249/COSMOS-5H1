/**
 * COSMOS AI — Cosmic Compare endpoint
 * POST /api/cosmos-ai/compare
 *
 * Generates a rich AI comparison between two celestial objects.
 * Uses IBM Granite 3.3 via local Ollama backend; falls back to structured offline template.
 * No API keys required.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

interface CompareBody {
  objA: {
    name: string; diameter: string; gravity: string; surfaceTemp: string;
    mass: string; moons: number; atmosphere: string; habitability: string;
    age?: string; waterPresence?: string; escapeVelocity?: string;
    distanceFromSun?: string; orbitalPeriod?: string; lifePossibility?: string;
  };
  objB: {
    name: string; diameter: string; gravity: string; surfaceTemp: string;
    mass: string; moons: number; atmosphere: string; habitability: string;
    age?: string; waterPresence?: string; escapeVelocity?: string;
    distanceFromSun?: string; orbitalPeriod?: string; lifePossibility?: string;
  };
}

// ── IBM Granite 3.3 via local Ollama backend ──────────────────────────────────

async function compareWithGranite(body: CompareBody): Promise<string> {
  const { objA: a, objB: b } = body;

  const prompt = `Compare ${a.name} and ${b.name} scientifically.

${a.name}: diameter ${a.diameter}, mass ${a.mass}, gravity ${a.gravity}, surface temp ${a.surfaceTemp}, moons ${a.moons}, atmosphere: ${a.atmosphere}, habitability: ${a.habitability}${a.escapeVelocity ? `, escape velocity ${a.escapeVelocity}` : ""}${a.distanceFromSun ? `, distance from Sun ${a.distanceFromSun}` : ""}${a.waterPresence ? `, water: ${a.waterPresence}` : ""}

${b.name}: diameter ${b.diameter}, mass ${b.mass}, gravity ${b.gravity}, surface temp ${b.surfaceTemp}, moons ${b.moons}, atmosphere: ${b.atmosphere}, habitability: ${b.habitability}${b.escapeVelocity ? `, escape velocity ${b.escapeVelocity}` : ""}${b.distanceFromSun ? `, distance from Sun ${b.distanceFromSun}` : ""}${b.waterPresence ? `, water: ${b.waterPresence}` : ""}

Write a comparison with these sections in markdown:
## Key Differences
• [2–4 bullet points on the most striking physical differences]

## Interesting Similarities
• [2–3 bullet points on surprising similarities]

## Habitability & Exploration
• [2–3 bullet points on potential for life / human exploration]

## Fun Facts
• [2–3 fascinating or surprising facts]

Be concise and scientifically accurate. Total response under 380 words.`;

  const res = await fetch(`${env.BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt, history: [] }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`Granite backend ${res.status}`);
  const data = await res.json();
  const answer = (data.answer ?? "").trim();
  if (!answer) throw new Error("Granite backend returned empty response");
  return answer;
}

// ── Offline structured fallback ──────────────────────────────────────────────

function offlineComparison(body: CompareBody): string {
  const { objA: a, objB: b } = body;

  const lines: string[] = [
    `## Key Differences`,
    `• **Size:** ${a.name} (${a.diameter}) vs ${b.name} (${b.diameter}).`,
    `• **Gravity:** ${a.name} has ${a.gravity} compared to ${b.name}'s ${b.gravity}.`,
    `• **Temperature:** ${a.name} averages ${a.surfaceTemp} vs ${b.name} at ${b.surfaceTemp}.`,
    `• **Moons:** ${a.name} has ${a.moons} moon(s), ${b.name} has ${b.moons}.`,
    ``,
    `## Interesting Similarities`,
    `• Both are objects in our solar system shaped by billions of years of cosmic evolution.`,
    `• Both have been studied by Earth-based observatories and space probes.`,
    a.atmosphere && b.atmosphere
      ? `• Both have notable atmospheres: ${a.name} (${a.atmosphere.slice(0, 60)}) and ${b.name} (${b.atmosphere.slice(0, 60)}).`
      : `• Both offer valuable scientific insights into planetary formation.`,
    ``,
    `## Habitability & Exploration`,
    `• **${a.name}:** ${a.habitability}${a.lifePossibility ? ` — ${a.lifePossibility}` : ""}.`,
    `• **${b.name}:** ${b.habitability}${b.lifePossibility ? ` — ${b.lifePossibility}` : ""}.`,
    a.waterPresence || b.waterPresence
      ? `• Water presence — ${a.name}: ${a.waterPresence ?? "unknown"}; ${b.name}: ${b.waterPresence ?? "unknown"}.`
      : "",
    ``,
    `## Fun Facts`,
    a.escapeVelocity && b.escapeVelocity
      ? `• Escape velocity: ${a.name} ${a.escapeVelocity} vs ${b.name} ${b.escapeVelocity}.`
      : `• Mass comparison: ${a.name} (${a.mass}) vs ${b.name} (${b.mass}).`,
    a.distanceFromSun && b.distanceFromSun
      ? `• Distance from Sun: ${a.name} ${a.distanceFromSun} vs ${b.name} ${b.distanceFromSun}.`
      : `• Both have been targeted by human and robotic exploration missions.`,
    `• Studying these two bodies side-by-side reveals the extraordinary diversity of our solar system.`,
  ];

  return lines.filter((l) => l !== "").join("\n");
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CompareBody;

    if (!body?.objA?.name || !body?.objB?.name) {
      return NextResponse.json({ error: "objA and objB are required" }, { status: 400 });
    }

    let comparison: string;
    let source: string;

    try {
      comparison = await compareWithGranite(body);
      source = "granite";
    } catch (err) {
      console.warn("[Compare] Granite backend unavailable, using offline fallback:", err);
      comparison = offlineComparison(body);
      source = "offline";
    }

    return NextResponse.json({ comparison, source });
  } catch (err) {
    console.error("[Compare] Error:", err);
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
