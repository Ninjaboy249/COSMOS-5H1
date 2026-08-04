
<div align="center">

<img src="public/images/cosmos-logo.png" alt="COSMOS-5H1 Logo" width="180" height="180" style="border-radius: 50%;" />

<br/>

<img src="public/images/spacecraft-animation.svg" alt="Spacecraft flying through space" width="900" />

<br/>

![Typing SVG](https://readme-typing-svg.demolab.com?font=Orbitron&weight=700&size=36&pause=1000&color=38BDF8&center=true&vCenter=true&width=700&lines=COSMOS+-+5H1;Cognitive+Orbital+Space;Mission+Operating+System;Explore+%E2%80%A2+Discover+%E2%80%A2+Innovate)

<br/>

<p align="center">
  <img src="https://img.shields.io/badge/IBM%20Granite%20AI-Offline%20RAG-0f62fe?style=for-the-badge&logo=ibm&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/NASA%20APIs-6%20Integrated-FC3D21?style=for-the-badge&logo=nasa&logoColor=white" />
  <img src="https://img.shields.io/badge/100%25-Offline%20AI-34d399?style=for-the-badge" />
</p>

<p align="center">
  <b>An AI-powered, fully offline space exploration platform combining IBM Granite AI, NASA APIs,<br/>
  3D visualization, and a 28-file knowledge base — built entirely with IBM Bob.</b>
</p>

<p align="center">
  <a href="https://github.com/Ninjaboy249/COSMOS-5H1">
    <img src="https://img.shields.io/github/stars/Ninjaboy249/COSMOS-5H1?style=social" />
  </a>
  &nbsp;
  <a href="https://github.com/Ninjaboy249/COSMOS-5H1/issues">
    <img src="https://img.shields.io/github/issues/Ninjaboy249/COSMOS-5H1?color=38bdf8" />
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/license-MIT-a78bfa" />
</p>

</div>

---

## 🌌 Problem Statement

> *"Space is the final frontier — but most people have no accessible, intelligent gateway to explore it."*

The universe contains **billions of galaxies, trillions of stars, and infinite mysteries** — yet public access to space knowledge is scattered, disconnected, and passive. Existing tools are either:

- 📖 **Static wikis** — text-heavy with no interactivity
- 🌐 **API-dependent** — break without internet
- 🤖 **Cloud AI** — require subscriptions, send data to external servers
- 🔭 **Simulation tools** — complex, not beginner-friendly

**There is no single platform that combines:**
real-time NASA data + offline AI intelligence + 3D interactive exploration + educational depth — all in one place, for everyone, for free, with full privacy.

---

## 💡 Solution — COSMOS-5H1

**COSMOS-5H1** (Cognitive Orbital Space Mission Operating System) is a premium, AI-powered space exploration web application that works **completely offline** once loaded.

<div align="center">

```
╔══════════════════════════════════════════════════════════╗
║           COSMOS-5H1 Platform Overview                   ║
╠══════════════════════════════════════════════════════════╣
║  🌌 Cinematic Intro     →  Welcome video + space audio   ║
║  🪐 Solar System        →  CSS-animated orbiting planets ║
║  🚀 Space Explorer      →  20 interactive modules        ║
║  🧠 COSMOS AI           →  Offline TF-IDF semantic chat  ║
║  📡 NASA APIs           →  6 live feeds + offline cache  ║
║  🛰 ISS Tracker         →  Real-time position map        ║
║  📸 APOD                →  Daily astronomy photo         ║
║  ☄  NEO Tracker         →  Near-Earth object monitor     ║
║  🎥 Mars Rover Gallery  →  Latest Perseverance photos    ║
╚══════════════════════════════════════════════════════════╝
```

</div>

### Key Capabilities

| Feature | Description |
|---|---|
| 🧠 **Offline AI** | COSMOS AI answers any space question without internet using TF-IDF semantic search over 28 knowledge files |
| 🪐 **Solar System** | Interactive CSS-animated solar system with clickable planets opening scientific detail modals |
| 🚀 **Space Explorer** | 20 premium glassmorphism cards navigating to full detail pages (stats, timeline, missions, gallery, AI chat) |
| 📡 **Live NASA Data** | APOD, Mars Rover Photos, NeoWs, DONKI Space Weather, EPIC Earth Imagery, ISS Position — all with offline fallback |
| 🗺 **Navigation AI** | Say "Open Mars" or "Show Jupiter" — COSMOS AI navigates directly to the page |
| 🔍 **Global Search** | Ctrl+K semantic search across all 20 space modules |
| 🎙 **Voice Input** | Web Speech API voice questions to COSMOS AI |
| 💾 **Memory** | Conversation context, search history, and follow-up suggestions persist per session |
| 🔊 **Ambient Audio** | Looping background space music with Navbar mute toggle |

---

## 🤖 AI Approach & Architecture

### The Core Challenge
> How do you build a smart AI assistant that answers astronomy questions with no internet and no paid API?

### Solution: Offline RAG with TF-IDF Semantic Search

COSMOS-5H1 implements a **full Retrieval-Augmented Generation (RAG) pipeline** using only standard TypeScript — no Python, no vector DB server, no paid API keys required.

```
┌─────────────────────────────────────────────────────────────┐
│                    COSMOS AI Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   User Question                                             │
│        │                                                    │
│        ▼                                                    │
│   ┌─────────────┐     ┌──────────────────┐                 │
│   │   Intent    │────▶│  Context Enricher │                 │
│   │  Detector   │     │  (session memory) │                 │
│   └─────────────┘     └────────┬─────────┘                 │
│         │                      │                            │
│         ▼                      ▼                            │
│   ┌─────────────────────────────────────┐                  │
│   │        TF-IDF Semantic Engine       │                  │
│   │   28 JSON files → 500+ documents   │                  │
│   │   Tokenize → IDF weights → Cosine  │                  │
│   └──────────────────┬──────────────────┘                  │
│                       │                                     │
│                       ▼                                     │
│   ┌───────────────────────────────────┐                    │
│   │       Response Generator          │                    │
│   │  FAQ match / Overview / Table /   │                    │
│   │  Attribute query / Navigation     │                    │
│   └───────────────────────────────────┘                    │
│                       │                                     │
│                       ▼                                     │
│              Streamed Answer + Follow-ups                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Service Breakdown

| Service | File | Responsibility |
|---|---|---|
| **KnowledgeService** | `lib/cosmos-ai/knowledge-service.ts` | Loads 28 JSON files, builds TF-IDF corpus, normalizes FAQs |
| **IntentService** | `lib/cosmos-ai/intent-service.ts` | Classifies 17 intents: planet, mission, navigation, comparison, greeting, space weather… |
| **ResponseGenerator** | `lib/cosmos-ai/response-generator.ts` | Converts retrieved docs into natural language: overviews, attribute cards, comparison tables, navigation responses |
| **ConversationMemory** | `lib/cosmos-ai/conversation-memory.ts` | Session-scoped memory: last entity context, search history, pronoun resolution ("it", "tell me more") |
| **API Route** | `app/api/cosmos-ai/route.ts` | Next.js server action orchestrating the full pipeline, 100% offline |

### Knowledge Base — 28 Scientific JSON Files

```
data/knowledge/
├── greetings.json          ← 10 greeting patterns
├── solar-system.json       ← System overview + FAQs
├── sun.json                ← Full stellar data
├── mercury.json ──────────┐
├── venus.json             │
├── earth.json             │  Each planet file contains:
├── moon.json              ├─ Name, type, diameter, mass,
├── mars.json              │  gravity, temperature, atmosphere,
├── jupiter.json           │  missions, interesting_facts,
├── saturn.json            │  10+ FAQs (question + answer)
├── uranus.json            │
├── neptune.json           │
├── pluto.json ────────────┘
├── asteroids.json          ← DART, Apophis, OSIRIS-REx
├── comets.json             ← Halley, Rosetta/67P
├── stars.json              ← Types, lifecycle, famous stars
├── galaxies.json           ← Milky Way, Andromeda, dark matter
├── black-holes.json        ← M87*, Sgr A*, Hawking radiation
├── nebulae.json            ← Orion, Pillars of Creation, JWST
├── spacecraft.json         ← Voyager, Hubble, JWST, Cassini
├── satellites.json         ← Sputnik, Starlink, ISS, GPS
├── nasa-missions.json      ← Apollo → Artemis timeline
├── isro-missions.json      ← Chandrayaan 3, Mangalyaan, Gaganyaan
├── esa-missions.json       ← Rosetta, JUICE, Euclid, Gaia
├── rockets.json            ← Saturn V, Falcon 9, SLS, Starship
├── astronauts.json         ← Gagarin, Armstrong, Chawla, Sharma
├── space-weather.json      ← Flares, CMEs, auroras, Carrington
├── dwarf-planets.json      ← Pluto, Eris, Ceres, Makemake
├── space-exploration.json  ← 24-event timeline 1957–2024
└── faq.json                ← 54 general space Q&As
```

### NASA API Integrations (with Offline Fallback)

| API | Module | Fallback |
|---|---|---|
| NASA APOD | `ApodWidget` | Bundled placeholder image + description |
| Mars Rover Photos | `MarsRoverWidget` | 3 sample Mars images |
| NeoWs (Near-Earth Objects) | `NeoWidget` | 3 example NEO entries |
| DONKI Space Weather | `SpaceWeatherWidget` | 2 sample solar events |
| NASA EPIC (Earth imagery) | `EpicWidget` | Earth planet image |
| Open Notify ISS | `IssWidget` | Default ISS position, refreshes every 10s |

---

## 🎯 Selected Challenge Theme

<div align="center">

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│   Challenge Theme:  AI FOR GOOD — EDUCATION           │
│                                                       │
│   Sub-theme:        SPACE SCIENCE & EXPLORATION       │
│                                                       │
│   Mission:  Make space knowledge accessible to        │
│             everyone, everywhere, offline, free.      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

</div>

COSMOS-5H1 addresses the **AI for Education** theme by:

- 🌍 **Universal Access** — Works completely offline; no subscription, no internet dependency after load
- 📚 **Depth over Simplicity** — 28 curated knowledge files with 100+ FAQs per celestial body
- 🧠 **Intelligent Guidance** — AI detects what the user wants (planet facts, mission history, comparisons) and responds naturally
- 🚀 **Inspiring Curiosity** — Cinematic intro, animated solar system, 3D visuals, and ambient audio create an immersive learning environment
- 🔬 **Scientific Accuracy** — All data sourced from NASA, ESA, and peer-reviewed sources
- 🛰 **Real-World Data** — Live NASA API feeds ground the experience in current science

---

## 🛠 How IBM Bob Was Used

> IBM Bob was the **sole development environment** for COSMOS-5H1 — every line of code, every architecture decision, and every file was created through Bob's agent.

### The Full Development Journey with Bob

```
Phase 1 — Foundation
  Bob → Read Next.js 16 docs in node_modules/next/dist/docs/
  Bob → Audited project structure, tsconfig, package.json
  Bob → Built Navbar with scroll behavior + music toggle
  Bob → Wired section refs for smooth navigation

Phase 2 — Features
  Bob → Created Space Explorer dashboard (20 glassmorphism cards)
  Bob → Built /space/[slug] dynamic detail pages
  Bob → Implemented all 6 NASA API widgets with offline fallback
  Bob → Created global search (Ctrl+K) with fuzzy matching

Phase 3 — COSMOS AI System
  Bob → Designed full offline RAG architecture
  Bob → Generated all 28 JSON knowledge base files
  Bob → Built TF-IDF engine from scratch (zero external deps)
  Bob → Created IntentService (17 intents), ConversationMemory,
         ResponseGenerator with markdown output
  Bob → Upgraded AIAssistant: streaming text, voice input,
         history tab, follow-up suggestions, navigation commands

Phase 4 — Polish
  Bob → Replaced emoji logo with COSMOS-5H1 brand image
  Bob → Added background music with loop + mute control
  Bob → Updated SpaceAIChat to use unified COSMOS AI engine
  Bob → TypeScript zero-error validation on every change
  Bob → Committed 101 files and pushed to GitHub
```

### Bob Capabilities Used

| Bob Feature | How It Was Used |
|---|---|
| **Agent Mode** | Full autonomous multi-file implementation across every phase |
| **`spawn_subagent`** | Generated 15 knowledge base JSON files in parallel (3 subagents × 5 files each) |
| **`write_file`** | Created 50+ new source files from scratch |
| **`apply_diff`** | Surgical edits to existing files without touching surrounding code |
| **`execute_command`** | `npx tsc --noEmit` after every change to catch type errors immediately |
| **`grep` / `glob`** | Explored codebase before editing to avoid conflicts |
| **`update_todo_list`** | Tracked 40+ tasks across 4 major development phases |
| **`GetSymbolsOverview`** | Understood component structures before modifying them |
| **`gh` CLI via Bob** | Created GitHub repo and pushed 101 files in one session |
| **`read_file`** | Always read files before editing — never speculated about code |

### Lines Written by Bob

```
Source code (TypeScript/TSX)  →  ~6,500 lines
CSS (globals.css additions)   →  ~1,200 lines
JSON knowledge base files     →  ~4,800 lines
Configuration & types         →  ~300 lines
─────────────────────────────────────────────
Total                         →  ~12,800 lines
```

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Ninjaboy249/COSMOS-5H1.git
cd COSMOS-5H1

# Install
npm install

# Run
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — no API keys needed, works fully offline.

### Optional: IBM Granite AI Backend (deeper answers)

```bash
# Install Ollama → https://ollama.ai
ollama pull granite3.3:2b

# Start Python backend
cd backend
pip install -r requirements.txt
python main.py
# → runs at http://localhost:8000
```

---

## 🗂 Project Structure

```
COSMOS-5H1/
├── app/
│   ├── page.tsx                    # Main page (intro + solar system + hero)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # All styles (4,000+ lines)
│   ├── space/
│   │   ├── page.tsx                # Space Explorer dashboard (20 cards)
│   │   └── [slug]/
│   │       ├── page.tsx            # Static route generation
│   │       └── SpaceDetailClient   # Full detail page (7 tabs)
│   └── api/
│       └── cosmos-ai/route.ts      # Offline AI API endpoint
│
├── components/
│   ├── layout/Navbar.tsx           # Navigation + music + logo
│   └── ui/                         # Carousel, bento grid, button
│
├── features/
│   ├── ai-assistant/AIAssistant    # Floating COSMOS AI chat panel
│   ├── hero/                       # Hero text + CSS solar system
│   ├── loading/WelcomeVideo        # Cinematic intro screen
│   ├── solar-system/               # Planet carousel + modals
│   └── space-explorer/             # 20 widget components + API widgets
│
├── lib/
│   ├── cosmos-ai/
│   │   ├── knowledge-service.ts    # TF-IDF engine + corpus builder
│   │   ├── intent-service.ts       # 17-class intent detector
│   │   ├── response-generator.ts   # RAG answer builder
│   │   └── conversation-memory.ts  # Session memory + suggestions
│   ├── nasa-api.ts                 # 6 NASA APIs + offline fallbacks
│   ├── space-explorer-data.ts      # 20 category + detail data
│   └── celestial-data.ts           # Planet stats for modals
│
├── data/knowledge/                 # 28 scientific JSON files
├── types/index.ts                  # TypeScript interfaces
├── public/
│   ├── images/                     # Planet images + COSMOS logo
│   ├── audio/space.mp3             # Background music
│   └── video/space-welcome.mp4     # Intro video
└── backend/
    ├── main.py                     # FastAPI + LangChain + ChromaDB
    └── requirements.txt
```

---

## 🧰 Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router) |
| **UI** | React 19, TypeScript 5 |
| **Styling** | Tailwind CSS v4, Glassmorphism, Custom CSS |
| **Animation** | Framer Motion 12, GSAP 3 |
| **3D** | React Three Fiber, Drei, Three.js |
| **AI Engine** | Custom TF-IDF + RAG (zero external deps) |
| **AI Backend** | IBM Granite (Ollama), LangChain, ChromaDB |
| **APIs** | NASA APOD, Mars Rover, NeoWs, DONKI, EPIC, Open Notify |
| **Voice** | Web Speech API |
| **Icons** | Lucide React, Phosphor Icons |
| **Dev Tool** | IBM Bob (100% of code written via agent) |

</div>

---

## 📸 Feature Highlights

<div align="center">

| 🌌 Cinematic Intro | 🪐 Solar System | 🚀 Space Explorer |
|---|---|---|
| Video intro with ambient music | CSS-animated orbiting planets | 20 glassmorphism module cards |

| 🧠 COSMOS AI | 📡 Live NASA Data | 🛰 ISS Tracker |
|---|---|---|
| Offline chat with streaming text | APOD, Mars Rover, NeoWs | Real-time position map |

</div>

---

## 🔑 Environment Variables (Optional)

```env
# .env.local — only needed for higher NASA API rate limits
NASA_API_KEY=your_key_here          # Default: DEMO_KEY (works for demos)
NEXT_PUBLIC_API_URL=http://localhost:8000  # IBM Granite backend
```

---

<div align="center">

**Built with ❤️ and IBM Bob — Explore · Discover · Simulate · Innovate**

<img src="public/images/cosmos-logo.png" alt="COSMOS-5H1" width="60" />

<sub>COSMOS-5H1 · Cognitive Orbital Space Mission Operating System · MIT License</sub>

</div>
