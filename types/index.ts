export interface Planet {
  id: string;
  name: string;
  radius: number;
  distance: number; // AU from sun
  orbitalPeriod: number; // Earth years
  rotationPeriod: number; // Earth days
  texture: string;
  bumpMap?: string;
  specularMap?: string;
  color: string;
  glowColor: string;
  tilt: number; // axial tilt degrees
  hasMoon?: boolean;
  hasRings?: boolean;
  ringColor?: string;
  description: string;
  distanceSun: string;
  diameter: string;
  gravity: string;
  temperature: string;
  atmosphere: string;
  funFacts: string[];
  moons: number;
  type: "terrestrial" | "gas-giant" | "ice-giant" | "dwarf";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  planet?: string;
}

export interface AIResponse {
  answer: string;
  sources: string[];
  model: string;
}

export interface LoadingState {
  progress: number;
  message: string;
  complete: boolean;
}

export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface PlanetHoverState {
  planet: Planet | null;
  position: { x: number; y: number };
}

export interface KnowledgeBaseDocument {
  id: string;
  title: string;
  content: string;
  source: string;
  metadata: Record<string, string>;
}

export interface SpaceQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface AstroFact {
  title: string;
  fact: string;
  category: "planet" | "star" | "galaxy" | "mission" | "physics";
}

export interface BackendStatus {
  status: "online" | "offline" | "loading";
  model: string;
  vectorDb: string;
  documentsIndexed: number;
}
