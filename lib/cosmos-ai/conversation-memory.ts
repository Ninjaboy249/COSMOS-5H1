/**
 * COSMOS AI — Conversation Memory Service
 * Persists conversation context in memory (per session).
 * No external storage required.
 */

export interface ConversationTurn {
  id: string;
  query: string;
  answer: string;
  intent: string;
  entity: string | null;
  timestamp: number;
}

export interface ConversationMemory {
  sessionId: string;
  turns: ConversationTurn[];
  lastEntity: string | null;
  lastIntent: string | null;
  recentEntities: string[];
  favorites: string[];
  searchHistory: string[];
}

// ── In-memory store (client-side) ─────────────────────────────────────────

const DEFAULT_MEMORY: ConversationMemory = {
  sessionId: "default",
  turns: [],
  lastEntity: null,
  lastIntent: null,
  recentEntities: [],
  favorites: [],
  searchHistory: [],
};

let _memory: ConversationMemory = { ...DEFAULT_MEMORY };

export function getMemory(): ConversationMemory {
  // Try to restore from sessionStorage
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("cosmos-ai-memory");
    if (stored) {
      try {
        _memory = JSON.parse(stored);
      } catch {
        _memory = { ...DEFAULT_MEMORY };
      }
    }
  }
  return _memory;
}

export function persistMemory(mem: ConversationMemory): void {
  _memory = mem;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("cosmos-ai-memory", JSON.stringify(mem));
  }
}

export function addTurn(query: string, answer: string, intent: string, entity: string | null): void {
  const mem = getMemory();
  const turn: ConversationTurn = {
    id: Date.now().toString(),
    query,
    answer,
    intent,
    entity,
    timestamp: Date.now(),
  };

  mem.turns = [...mem.turns.slice(-19), turn]; // Keep last 20 turns
  mem.lastIntent = intent;

  if (entity) {
    mem.lastEntity = entity;
    mem.recentEntities = [entity, ...mem.recentEntities.filter((e) => e !== entity)].slice(0, 10);
  }

  mem.searchHistory = [query, ...mem.searchHistory.filter((q) => q !== query)].slice(0, 20);

  persistMemory(mem);
}

export function clearMemory(): void {
  _memory = { ...DEFAULT_MEMORY, sessionId: "default" };
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("cosmos-ai-memory");
  }
}

export function getContextClue(currentQuery: string): string | null {
  const mem = getMemory();
  if (!mem.turns.length) return null;

  // If query is very short and we have context, inject last entity
  const q = currentQuery.toLowerCase().trim();
  const shortQuery = q.split(" ").length <= 3;
  const pronounRefs = ["it", "its", "that", "there", "this", "same", "tell me more", "explain more", "what else"];

  if (shortQuery && pronounRefs.some((p) => q.includes(p)) && mem.lastEntity) {
    return mem.lastEntity;
  }

  return null;
}

export function getSuggestedFollowups(entity: string | null): string[] {
  const suggestions: Record<string, string[]> = {
    mars: ["Can humans live on Mars?", "What missions are on Mars?", "How far is Mars from Earth?", "What is Olympus Mons?"],
    earth: ["How old is Earth?", "Does Earth have a magnetic field?", "How many moons does Earth have?"],
    moon: ["Who walked on the Moon?", "Does the Moon have water?", "How far is the Moon?"],
    jupiter: ["What is the Great Red Spot?", "How many moons does Jupiter have?", "Could life exist on Europa?"],
    saturn: ["What are Saturn's rings made of?", "Tell me about Titan", "What is the Cassini mission?"],
    "black-holes": ["What happens inside a black hole?", "How are black holes detected?", "What is Hawking radiation?"],
    "nasa-missions": ["Tell me about the Apollo program", "What is the Artemis mission?", "When will humans go to Mars?"],
    "isro-missions": ["Tell me about Chandrayaan-3", "What is Mangalyaan?", "When is Gaganyaan?"],
    sun: ["What is a solar flare?", "How hot is the Sun's core?", "How does the Sun produce energy?"],
    galaxies: ["What is the Milky Way?", "When will Andromeda collide with us?", "How many galaxies exist?"],
    stars: ["What is a neutron star?", "How do stars die?", "What is the nearest star?"],
  };

  if (entity && suggestions[entity]) return suggestions[entity];

  return [
    "Tell me about Mars",
    "What is a black hole?",
    "Explain the Solar System",
    "How many moons does Jupiter have?",
    "What missions are on the Moon?",
    "Tell me about the James Webb Telescope",
  ];
}
