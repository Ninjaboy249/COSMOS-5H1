/**
 * COSMOS-5H1 — /api/mission-planner
 * POST — AI-powered space mission planning
 * Uses IBM Granite 3.3 via local Ollama backend; falls back to deterministic offline engine.
 * No API keys required.
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { MissionInput, MissionPlan } from "@/lib/mission-planner-types";

export type { MissionInput, MissionPlan };

// ── IBM Granite 3.3 via local Ollama backend ──────────────────────────────────

async function planWithGranite(input: MissionInput): Promise<MissionPlan> {
  const prompt = `Plan a ${input.missionType} mission to ${input.destination}.
Crew: ${input.crew} astronauts. Duration: ${input.duration} days.
Objectives: ${input.objectives.join(", ")}.${input.budget ? ` Budget: ${input.budget}.` : ""}

Return ONLY a JSON object (no markdown fences):
{
  "title": "Mission name",
  "launchWindow": {"date": "Month Year", "reason": "why optimal", "backupDate": "backup window"},
  "orbit": {"type": "orbit type", "altitude": "km", "inclination": "degrees", "period": "hours"},
  "spacecraft": {"name": "spacecraft name", "type": "type", "description": "brief description"},
  "fuel": {"total": "tonnes", "propellant": "type", "deltaV": "km/s", "stages": "description"},
  "crew": {"size": ${input.crew}, "roles": ["role1","role2"], "training": "duration and type"},
  "payload": {"primary": "primary payload", "secondary": "secondary", "totalMass": "kg"},
  "timeline": [{"phase": "phase name", "duration": "weeks/months", "description": "what happens"}],
  "risk": {"score": 7, "level": "High", "factors": ["risk1"], "mitigations": ["mitigation1"]},
  "cost": {"estimated": "$X billion", "breakdown": [{"item": "item", "cost": "$X billion"}]},
  "backup": {"plan": "backup approach", "contingencies": ["contingency1"]},
  "summary": "2-3 sentence executive summary"
}`;

  const res = await fetch(`${env.BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt, history: [] }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!res.ok) throw new Error(`Granite backend ${res.status}`);
  const data = await res.json();
  const content = (data.answer ?? "").trim();
  if (!content) throw new Error("Granite backend returned empty response");
  // Strip any markdown fences the model may wrap around JSON
  const json = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(json) as MissionPlan;
}


// ── Offline deterministic mission planner ────────────────────────────────────

const DEST_DATA: Record<string, {
  travelDays: number; distanceKm: string; deltaV: string; orbitAlt: string;
  launchMonth: string; backupMonth: string; orbitType: string; inclination: string; period: string;
}> = {
  moon:     { travelDays: 3,   distanceKm: "384,400 km",     deltaV: "3.1 km/s",  orbitAlt: "100 km",    launchMonth: "March 2026",   backupMonth: "June 2026",     orbitType: "Low Lunar Orbit",       inclination: "90°", period: "2 hrs" },
  mars:     { travelDays: 210, distanceKm: "225 million km",  deltaV: "5.7 km/s",  orbitAlt: "400 km",    launchMonth: "October 2026", backupMonth: "December 2028", orbitType: "Low Mars Orbit",        inclination: "93°", period: "1.9 hrs" },
  venus:    { travelDays: 110, distanceKm: "261 million km",  deltaV: "4.7 km/s",  orbitAlt: "300 km",    launchMonth: "August 2026",  backupMonth: "March 2028",    orbitType: "Low Venus Orbit",       inclination: "7°",  period: "1.6 hrs" },
  mercury:  { travelDays: 147, distanceKm: "155 million km",  deltaV: "10.3 km/s", orbitAlt: "400 km",    launchMonth: "May 2027",     backupMonth: "October 2027",  orbitType: "Polar Mercury Orbit",   inclination: "90°", period: "2.2 hrs" },
  jupiter:  { travelDays: 600, distanceKm: "778 million km",  deltaV: "9.2 km/s",  orbitAlt: "800,000 km",launchMonth: "July 2027",    backupMonth: "November 2028", orbitType: "Jupiter Orbit",         inclination: "3°",  period: "53 days" },
  saturn:   { travelDays: 1460,distanceKm: "1.4 billion km",  deltaV: "10.8 km/s", orbitAlt: "1.2M km",   launchMonth: "January 2028", backupMonth: "January 2031",  orbitType: "Saturn Orbit Insertion",inclination: "28°", period: "24 days" },
  europa:   { travelDays: 600, distanceKm: "780 million km",  deltaV: "9.4 km/s",  orbitAlt: "100 km",    launchMonth: "July 2027",    backupMonth: "November 2028", orbitType: "Low Europa Orbit",      inclination: "90°", period: "2.1 hrs" },
};

function offlinePlan(input: MissionInput): MissionPlan {
  const dest = input.destination.toLowerCase();
  const d = DEST_DATA[dest] ?? DEST_DATA["mars"];
  const isCrewed = input.missionType === "crewed";
  const riskBase = dest === "mars" ? 6 : dest === "moon" ? 4 : 8;
  const riskAdjusted = Math.min(10, riskBase + (input.duration > 500 ? 2 : 0) + (input.crew > 4 ? 1 : 0));

  const roles = ["Commander", "Pilot", "Flight Engineer", "Mission Specialist", "Science Officer", "Medical Officer", "Systems Engineer"].slice(0, input.crew);

  return {
    title: `COSMOS-${input.destination.toUpperCase().slice(0, 3)} ${new Date().getFullYear() + 2} — ${input.missionType.charAt(0).toUpperCase() + input.missionType.slice(1)} Mission`,
    launchWindow: {
      date: d.launchMonth,
      reason: `Optimal Hohmann transfer window to ${input.destination} — minimum ΔV requirement, shortest travel time of ${d.travelDays} days`,
      backupDate: d.backupMonth,
    },
    orbit: {
      type: d.orbitType,
      altitude: d.orbitAlt,
      inclination: d.inclination,
      period: d.period,
    },
    spacecraft: {
      name: isCrewed ? `Orion/SLS Block 2 + ${input.destination} Transfer Vehicle` : `Robotic Explorer — ${input.destination.slice(0,3).toUpperCase()}-Probe`,
      type: isCrewed ? "Crewed Deep Space Capsule" : "Autonomous Robotic Spacecraft",
      description: isCrewed
        ? `Multi-stage crewed vehicle with Orion capsule, service module, and dedicated ${input.destination} lander. Designed for ${input.duration}-day mission endurance.`
        : `Advanced robotic spacecraft with autonomous navigation, RTG power source, and full science instrument suite.`,
    },
    fuel: {
      total: `${Math.round(input.crew * 18 + input.duration * 0.4 + (isCrewed ? 80 : 20))} metric tonnes`,
      propellant: isCrewed ? "LH2/LOX (cryogenic bipropellant) + RCS hydrazine" : "Xenon (ion thruster) + hydrazine backup",
      deltaV: d.deltaV,
      stages: "Trans-injection burn → Mid-course correction → Orbital insertion → Descent/Ascent (crewed)",
    },
    crew: {
      size: input.crew,
      roles,
      training: `${Math.max(24, input.duration / 10)} months — EVA, ${input.destination} surface operations, emergency procedures, science protocols`,
    },
    payload: {
      primary: `Science instruments (mass spectrometer, ground-penetrating radar, cameras, sample return system)`,
      secondary: `Emergency supplies (${input.duration}-day reserves), communications relay, surface beacons`,
      totalMass: `${Math.round(input.crew * 800 + 2000)} kg`,
    },
    timeline: [
      { phase: "Pre-launch Integration", duration: "18 months", description: "Vehicle assembly, systems integration, crew training and mission rehearsal" },
      { phase: "Launch & Trans-Injection", duration: `${Math.ceil(d.travelDays / 30)} months`, description: `Falcon Heavy / SLS launch from KSC, ${d.deltaV} ΔV burn for ${input.destination} transit` },
      { phase: `${input.destination} Operations`, duration: `${Math.round(input.duration * 0.7)} days`, description: `Orbital insertion, surface operations, sample collection, science objectives` },
      { phase: "Return Transit", duration: `${Math.ceil(d.travelDays / 30)} months`, description: "Trans-Earth injection, mid-course corrections, Earth approach" },
      { phase: "Recovery & Analysis", duration: "6 months", description: "Splashdown recovery, crew medical evaluation, sample analysis" },
    ],
    risk: {
      score: riskAdjusted,
      level: riskAdjusted <= 3 ? "Low" : riskAdjusted <= 5 ? "Medium" : riskAdjusted <= 7 ? "High" : "Critical",
      factors: [
        `${d.travelDays}-day deep space radiation exposure`,
        "Microgravity physiological effects on crew",
        `${input.destination} landing/surface environment uncertainty`,
        "Communication delay " + (dest === "moon" ? "(2.6 sec)" : dest === "mars" ? "(3–22 min)" : "(variable)"),
        "Life support system reliability over extended duration",
      ],
      mitigations: [
        "Radiation shielding — water walls + polyethylene panels",
        "Daily exercise protocol + countermeasure pharmaceuticals",
        "Redundant life support with 72-hour emergency reserves",
        "Autonomous abort and emergency ascent capability",
        "AI-assisted fault detection and mission replanning",
      ],
    },
    cost: {
      estimated: `$${Math.round(input.crew * 1.2 + input.duration * 0.015 + (dest === "mars" ? 28 : dest === "moon" ? 12 : 40))} billion USD`,
      breakdown: [
        { item: "Launch Vehicle", cost: isCrewed ? "$2.5 billion" : "$0.6 billion" },
        { item: "Spacecraft Development", cost: `$${Math.round(input.crew * 0.8 + 4)} billion` },
        { item: "Mission Operations", cost: `$${Math.round(input.duration * 0.008)} billion` },
        { item: "Crew Training & Support", cost: `$${(input.crew * 0.12).toFixed(1)} billion` },
        { item: "Science & Instrumentation", cost: "$0.8 billion" },
      ],
    },
    backup: {
      plan: `Automated mission abort with crew safe return using pre-computed free-return trajectory. Backup launch window available ${d.backupMonth}.`,
      contingencies: [
        `Free-return trajectory abort — no propulsion needed to return to Earth`,
        `Emergency surface habitat deployment for ${Math.min(90, input.duration / 3)}-day survival`,
        `Communication blackout protocol — pre-programmed autonomous operations`,
        `Unmanned resupply mission pre-deployed 26 months before crewed departure`,
      ],
    },
    summary: `The ${input.destination} ${input.missionType} mission launches in ${d.launchMonth} with a crew of ${input.crew} for ${input.duration} days. Transit time is ${d.travelDays} days using a Hohmann transfer requiring ${d.deltaV} ΔV. Risk assessment score: ${riskAdjusted}/10 (${riskAdjusted <= 5 ? "manageable" : "high — mitigation protocols required"}). Mission objectives span ${input.objectives.join(", ").toLowerCase()}.`,
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const input = (await req.json()) as MissionInput;

    if (!input.destination) {
      return NextResponse.json({ error: "destination is required" }, { status: 400 });
    }

    let plan: MissionPlan;
    let source: string;

    try {
      plan = await planWithGranite(input);
      source = "granite";
    } catch (err) {
      console.warn("[Mission Planner] Granite backend unavailable, using offline engine:", err);
      plan = offlinePlan(input);
      source = "offline";
    }

    return NextResponse.json({ plan, source });
  } catch (err) {
    console.error("[Mission Planner] Error:", err);
    return NextResponse.json({ error: "Mission planning failed" }, { status: 500 });
  }
}
