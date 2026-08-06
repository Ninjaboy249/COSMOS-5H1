// ─────────────────────────────────────────────────────────────────────────────
// COSMOS-5H1 — Morse Code Engine
// International Morse Code standard (ITU-R M.1677-1)
// Timing: dot=1 unit, dash=3 units, symbol-gap=1 unit, letter-gap=3 units, word-gap=7 units
// ─────────────────────────────────────────────────────────────────────────────

export const MORSE_TABLE: Record<string, string> = {
  A: ".-",    B: "-...",  C: "-.-.",  D: "-..",   E: ".",
  F: "..-.",  G: "--.",   H: "....",  I: "..",    J: ".---",
  K: "-.-",   L: ".-..",  M: "--",    N: "-.",    O: "---",
  P: ".--.",  Q: "--.-",  R: ".-.",   S: "...",   T: "-",
  U: "..-",   V: "...-",  W: ".--",   X: "-..-",  Y: "-.--",
  Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--",
  "4": "....-", "5": ".....", "6": "-....", "7": "--...",
  "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.",
  "!": "-.-.--", "/": "-..-.",  "(": "-.--.",  ")": "-.--.-",
  "&": ".-...",  ":": "---...",  ";": "-.-.-.",  "=": "-...-",
  "+": ".-.-.",  "-": "-....-",  "_": "..--.-",  '"': ".-..-.",
  "$": "...-..-","@": ".--.-.","¿": "..-.-",  "¡": "--...-",
};

// Reverse lookup
export const MORSE_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE_TABLE).map(([k, v]) => [v, k])
);

/** Encode plain text → Morse string (e.g. "SOS" → "... --- ...") */
export function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((char) => {
      if (char === " ") return "/";
      return MORSE_TABLE[char] ?? "?";
    })
    .join(" ");
}

/** Decode Morse string → plain text (handles "/" as word-space) */
export function morseToText(morse: string): string {
  return morse
    .trim()
    .split(" / ")
    .map((word) =>
      word
        .split(" ")
        .map((sym) => MORSE_REVERSE[sym] ?? (sym === "/" ? " " : "?"))
        .join("")
    )
    .join(" ");
}

/** Validate Morse input — returns true if every token is valid Morse */
export function isValidMorse(input: string): boolean {
  const tokens = input.trim().split(/\s+/);
  return tokens.every((t) => t === "/" || MORSE_REVERSE[t] !== undefined);
}

// ── Timing helpers ────────────────────────────────────────────────────────────

/** Convert WPM to unit duration in milliseconds.
 *  Based on PARIS standard: 50 units per word → unit = 60000 / (50 * wpm) */
export function wpmToUnitMs(wpm: number): number {
  return Math.round(60000 / (50 * wpm));
}

export interface MorseSymbol {
  type: "dot" | "dash" | "sym-gap" | "letter-gap" | "word-gap";
  durationUnits: number;
}

/** Expand a Morse string into a flat sequence of timed symbols */
export function morseToSymbols(morse: string): MorseSymbol[] {
  const symbols: MorseSymbol[] = [];
  const words = morse.split(" / ");

  for (let wi = 0; wi < words.length; wi++) {
    const letters = words[wi].split(" ");
    for (let li = 0; li < letters.length; li++) {
      const letter = letters[li];
      for (let ci = 0; ci < letter.length; ci++) {
        const ch = letter[ci];
        if (ch === ".") {
          symbols.push({ type: "dot", durationUnits: 1 });
        } else if (ch === "-") {
          symbols.push({ type: "dash", durationUnits: 3 });
        }
        // symbol gap (between dots/dashes within a letter)
        if (ci < letter.length - 1) {
          symbols.push({ type: "sym-gap", durationUnits: 1 });
        }
      }
      // letter gap
      if (li < letters.length - 1) {
        symbols.push({ type: "letter-gap", durationUnits: 3 });
      }
    }
    // word gap
    if (wi < words.length - 1) {
      symbols.push({ type: "word-gap", durationUnits: 7 });
    }
  }

  return symbols;
}

/** Total duration in ms for a Morse string at the given WPM */
export function totalDurationMs(morse: string, wpm: number): number {
  const unit = wpmToUnitMs(wpm);
  return morseToSymbols(morse).reduce((acc, s) => acc + s.durationUnits * unit, 0);
}

// ── Practice words grouped by difficulty ─────────────────────────────────────
export const PRACTICE_WORDS = {
  beginner:     ["SOS", "CQ", "HI", "QSL", "73", "ES", "DE", "AR"],
  intermediate: ["MARS", "MOON", "ORBIT", "SIGNAL", "SPACE", "RADIO"],
  advanced:     ["COSMOS", "GRAVITY", "MISSION", "ASTEROID", "VOYAGER"],
  expert:       ["SCHWARZSCHILD", "ELECTROMAGNETIC", "INTERSTELLAR", "TRANSMISSION"],
};

// ── Lesson content ─────────────────────────────────────────────────────────────
export interface MorseLesson {
  id: string;
  title: string;
  icon: string;
  color: string;
  summary: string;
  content: string[];
  practice: string;
  unlockAfter?: string;
}

export const MORSE_LESSONS: MorseLesson[] = [
  {
    id: "history",
    title: "History of Morse Code",
    icon: "📡",
    color: "#93c5fd",
    summary: "From telegraph to space — how Morse shaped global communication.",
    content: [
      "Samuel F.B. Morse and Alfred Vail invented Morse code in the 1830s for electrical telegraph systems.",
      "The first Morse message was sent on May 24, 1844: \"What hath God wrought\" (Numbers 23:23).",
      "Morse code became the universal language of maritime distress, aviation, and wartime communication.",
      "The Titanic disaster (1912) highlighted the life-saving power of wireless Morse — operators sent CQD and SOS for hours.",
      "Amateur radio operators (\"hams\") still use Morse code today, maintaining the tradition across generations.",
      "NASA and early space programs used Morse code derivatives for telemetry and emergency communication protocols.",
    ],
    practice: "SOS",
  },
  {
    id: "standard",
    title: "International Morse Standard",
    icon: "📋",
    color: "#a78bfa",
    summary: "The ITU timing rules that make Morse universally understood.",
    content: [
      "A dot (·) = 1 unit of time. A dash (−) = 3 units.",
      "The gap between dots/dashes within a letter = 1 unit.",
      "The gap between letters = 3 units.",
      "The gap between words = 7 units.",
      "PARIS is the standard calibration word — it equals exactly 50 units, so WPM is measured by how many times PARIS can be sent per minute.",
      "At 20 WPM: 1 unit ≈ 60ms. At 5 WPM: 1 unit ≈ 240ms. At 40 WPM: 1 unit ≈ 30ms.",
    ],
    practice: "PARIS",
    unlockAfter: "history",
  },
  {
    id: "sos",
    title: "SOS — The Universal Distress Signal",
    icon: "🆘",
    color: "#f87171",
    summary: "... --- ... — three of the most important symbols in human history.",
    content: [
      "SOS (... --- ...) was adopted as the international distress signal in 1906 by the Berlin Radiotelegraphic Convention.",
      "It replaced CQD (Come Quick Danger) because SOS is harder to confuse — symmetrical and unmistakable.",
      "SOS does NOT stand for 'Save Our Ship' — it was chosen purely for its distinct rhythm.",
      "In aviation, the Mayday call (from French \"m'aidez\" = help me) is the voice equivalent of SOS.",
      "The International Space Station crew are trained in SOS signaling for emergency re-entry scenarios.",
      "Even today, SOS can be signaled with a mirror (3 short, 3 long, 3 short flashes) to overflying aircraft.",
    ],
    practice: "SOS",
    unlockAfter: "standard",
  },
  {
    id: "space",
    title: "Morse in Space Communication",
    icon: "🚀",
    color: "#34d399",
    summary: "How Morse code principles shaped the language of deep space.",
    content: [
      "Early NASA Mercury and Gemini missions used Morse-code-based telemetry in backup communication channels.",
      "The Voyager probes (launched 1977) transmitted scientific data using binary encoding — a direct descendant of Morse's on/off keying concept.",
      "Amateur radio operators tracked Sputnik (1957) by its beep-beep — a simple on/off carrier, pure Morse heritage.",
      "Deep Space Network (DSN) communicates with spacecraft using phase-shift keying, but the principle of timed signal pulses goes back to Morse.",
      "HAM radio operators on the International Space Station regularly contact Earth schools using Morse code.",
      "SETI researchers propose sending mathematical Morse-like sequences as universal first-contact signals.",
    ],
    practice: "DE ISS",
    unlockAfter: "sos",
  },
  {
    id: "emergency",
    title: "Emergency Signaling",
    icon: "⚠️",
    color: "#fbbf24",
    summary: "When electronics fail, Morse code can save your life.",
    content: [
      "The International Q Code (QRZ, QSL, QTH…) is a shorthand Morse system still used in aviation and maritime.",
      "Mirror signaling: reflect sunlight in 3-short, 3-long, 3-short flashes to signal SOS across miles.",
      "Whistle blast SOS: 3 short, 3 long, 3 short. Pause 1 minute and repeat.",
      "Flashlight SOS at night can be seen for 10+ km in darkness.",
      "Tapping SOS on a pipe (3-3-3) has saved trapped miners in multiple disasters.",
      "EPIRB (Emergency Position Indicating Radio Beacon) devices still use 406 MHz pulse coding derived from Morse principles.",
    ],
    practice: "SOS DE HELP",
    unlockAfter: "space",
  },
  {
    id: "amateur",
    title: "Amateur Radio Basics",
    icon: "📻",
    color: "#67e8f9",
    summary: "The global ham radio community keeping Morse alive.",
    content: [
      "Over 3 million licensed amateur radio operators worldwide use Morse code (CW — Continuous Wave).",
      "Common Q-codes: QRZ (Who is calling me?), QSL (I acknowledge receipt), QTH (My location is…), 73 (Best regards).",
      "Contest operators can send 40+ WPM in competition — equivalent to professional speed typists.",
      "CW QRP (low power) operators can communicate globally with just 5 watts — line-of-sight impossible, but HF bounces off ionosphere.",
      "The CW Skimmer software uses DSP to decode Morse from the radio spectrum in real time.",
      "Annual events: CW Jamboree, ARRL CW Sweepstakes, CQ World Wide CW Contest — millions of contacts logged.",
    ],
    practice: "CQ CQ DE COSMOS",
    unlockAfter: "emergency",
  },
];

// ── Challenge definitions ──────────────────────────────────────────────────────
export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  type: "decode" | "listen" | "flash" | "type";
  timeLimit: number; // seconds
  words: string[];
}

export const CHALLENGES: Challenge[] = [
  { id: "c1", title: "SOS Basics", description: "Decode these distress signals before time runs out!", difficulty: "beginner", type: "decode", timeLimit: 30, words: ["SOS", "CQ", "HI"] },
  { id: "c2", title: "Planet Names", description: "Decode planet names from their Morse code.", difficulty: "beginner", type: "decode", timeLimit: 45, words: ["MARS", "MOON", "SUN"] },
  { id: "c3", title: "Space Terms", description: "Decode space mission terms.", difficulty: "intermediate", type: "decode", timeLimit: 40, words: ["ORBIT", "SPACE", "SIGNAL"] },
  { id: "c4", title: "Speed Decode", description: "Faster words — can you keep up?", difficulty: "intermediate", type: "decode", timeLimit: 35, words: ["COSMOS", "ROCKET", "GRAVITY"] },
  { id: "c5", title: "Mission Names", description: "Famous space missions in Morse.", difficulty: "advanced", type: "decode", timeLimit: 30, words: ["APOLLO", "VOYAGER", "HUBBLE"] },
  { id: "c6", title: "Expert Decode", description: "Long words with minimal time.", difficulty: "expert", type: "decode", timeLimit: 25, words: ["SCHWARZSCHILD", "ELECTROMAGNETIC"] },
];
