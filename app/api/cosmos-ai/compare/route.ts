/**
 * COSMOS AI — Cosmic Compare endpoint
 * POST /api/cosmos-ai/compare
 *
 * Generates a rich AI comparison between two celestial objects.
 * Priority: IBM Granite 3.3 (Groq) → OpenAI → offline structured template.
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

// ── Shared prompt builder ─────────────────────────────────────────────────────

function buildComparePrompt(a: CompareBody["objA"], b: CompareBody["objB"]): string {
  return `You are COSMOS AI, an expert space scientist. Write an engaging, scientifically accurate comparison between ${a.name} and ${b.name}.

Known data:
${a.name}: diameter ${a.diameter}, mass ${a.mass}, gravity ${a.gravity}, surface temp ${a.surfaceTemp}, moons ${a.moons}, atmosphere: ${a.atmosphere}, habitability: ${a.habitability}${a.escapeVelocity ? `, escape velocity ${a.escapeVelocity}` : ""}${a.distanceFromSun ? `, distance from Sun ${a.distanceFromSun}` : ""}${a.waterPresence ? `, water: ${a.waterPresence}` : ""}

${b.name}: diameter ${b.diameter}, mass ${b.mass}, gravity ${b.gravity}, surface temp ${b.surfaceTemp}, moons ${b.moons}, atmosphere: ${b.atmosphere}, habitability: ${b.habitability}${b.escapeVelocity ? `, escape velocity ${b.escapeVelocity}` : ""}${b.distanceFromSun ? `, distance from Sun ${b.distanceFromSun}` : ""}${b.waterPresence ? `, water: ${b.waterPresence}` : ""}

Write the response in this exact format using markdown:
## Key Differences
• [2–4 bullet points on the most striking physical differences]

## Interesting Similarities
• [2–3 bullet points on surprising similarities]

## Habitability & Exploration
• [2–3 bullet points on potential for life / human exploration]

## Fun Facts
• [2–3 fascinating or surprising facts]

Be concise, scientifically accurate, and highlight the most surprising contrasts. Total response under 380 words.`;
}

// ── IBM Granite 3.3 via watsonx.ai (primary AI) ──────────────────────────────

async function compareWithGranite(body: CompareBody): Promise<string> {
  const { objA: a, objB: b } = body;
  const prompt = buildComparePrompt(a, b);
  const systemNote = "You are COSMOS AI, a space science expert. Always respond in markdown with bullet points.";

  const url = `https://${env.WATSONX_REGION}.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${env.WATSONX_API_KEY}`,
    },
    body: JSON.stringify({
      model_id: env.WATSONX_MODEL,
      project_id: env.WATSONX_PROJECT_ID,
      input: `${systemNote}\n\n${prompt}\n\nAssistant:`,
      parameters: { max_new_tokens: 700, temperature: 0.7, decoding_method: "sample", repetition_penalty: 1.1 },
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`watsonx.ai ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.results?.[0]?.generated_text ?? "";
  if (!text) throw new Error("watsonx.ai returned empty response");
  return text.trim();
}

// ── Groq cloud inference (secondary AI) ──────────────────────────────────────

async function compareWithGroq(body: CompareBody): Promise<string> {
  const { objA: a, objB: b } = body;
  const prompt = buildComparePrompt(a, b);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      messages: [
        { role: "system", content: "You are COSMOS AI, a space science expert. Always respond in markdown with bullet points." },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 120)}`);
  }
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// ── OpenAI comparison (tertiary AI) ──────────────────────────────────────────

async function compareWithOpenAI(body: CompareBody): Promise<string> {
  const { objA: a, objB: b } = body;
  const prompt = buildComparePrompt(a, b);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: [
        { role: "system", content: "You are COSMOS AI, a space science expert. Always respond in markdown with bullet points." },
        { role: "user", content: prompt },
      ],
      max_tokens: 700,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 120)}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
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

    if (env.hasGranite) {
      try {
        comparison = await compareWithGranite(body);
        source = "granite";
      } catch (err) {
        console.warn("[Compare] watsonx.ai/Granite failed, trying Groq:", err);
        if (env.hasGroq) {
          try { comparison = await compareWithGroq(body); source = "groq"; }
          catch { comparison = offlineComparison(body); source = "offline"; }
        } else if (env.hasOpenAI) {
          try { comparison = await compareWithOpenAI(body); source = "openai"; }
          catch { comparison = offlineComparison(body); source = "offline"; }
        } else {
          comparison = offlineComparison(body);
          source = "offline";
        }
      }
    } else if (env.hasGroq) {
      try {
        comparison = await compareWithGroq(body);
        source = "groq";
      } catch (err) {
        console.warn("[Compare] Groq failed, trying OpenAI:", err);
        if (env.hasOpenAI) {
          try { comparison = await compareWithOpenAI(body); source = "openai"; }
          catch { comparison = offlineComparison(body); source = "offline"; }
        } else {
          comparison = offlineComparison(body);
          source = "offline";
        }
      }
    } else if (env.hasOpenAI) {
      try {
        comparison = await compareWithOpenAI(body);
        source = "openai";
      } catch (err) {
        console.warn("[Compare] OpenAI failed, using offline fallback:", err);
        comparison = offlineComparison(body);
        source = "offline";
      }
    } else {
      comparison = offlineComparison(body);
      source = "offline";
    }

    return NextResponse.json({ comparison, source });
  } catch (err) {
    console.error("[Compare] Error:", err);
    return NextResponse.json({ error: "Comparison failed" }, { status: 500 });
  }
}
