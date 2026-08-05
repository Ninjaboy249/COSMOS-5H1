/**
 * Shared types for the Mission Planner feature.
 * Imported by both the API route and the UI page.
 */

export interface MissionInput {
  destination: string;      // e.g. "Mars", "Moon", "Jupiter"
  crew: number;             // number of astronauts (0 for robotic)
  duration: number;         // mission duration in days
  missionType: string;      // "crewed" | "robotic" | "cargo"
  objectives: string[];     // science goals
  budget?: string;          // optional budget hint
}

export interface MissionPlan {
  title: string;
  launchWindow: { date: string; reason: string; backupDate: string };
  orbit: { type: string; altitude: string; inclination: string; period: string };
  spacecraft: { name: string; type: string; description: string };
  fuel: { total: string; propellant: string; deltaV: string; stages: string };
  crew: { size: number; roles: string[]; training: string };
  payload: { primary: string; secondary: string; totalMass: string };
  timeline: { phase: string; duration: string; description: string }[];
  risk: { score: number; level: string; factors: string[]; mitigations: string[] };
  cost: { estimated: string; breakdown: { item: string; cost: string }[] };
  backup: { plan: string; contingencies: string[] };
  summary: string;
}
