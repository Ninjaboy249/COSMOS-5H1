# COSMOS-5H1 — IBM Granite AI Space Application

A world-class, futuristic AI-powered Space Exploration web application built with Next.js 15, React Three Fiber, IBM Granite AI, and a Python FastAPI backend.

## Features

- 🌌 **Cinematic Loading Screen** — Rocket launch with stars, nebula, and progress animation
- 🪐 **Interactive 3D Solar System** — All 9 planets with realistic orbits, textures, and physics
- 🧠 **IBM Granite AI Assistant** — Offline AI via Ollama + LangChain + ChromaDB RAG
- 🔭 **Planet Detail Modals** — Scientific data, fun facts, and AI insights per planet
- 🎬 **GSAP + Framer Motion** — Cinematic scroll animations and transitions
- 📱 **Responsive Design** — Desktop, tablet, and mobile optimized

## Quick Start

### Frontend

```bash
cd space-explorer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend (IBM Granite AI)

```bash
# 1. Install Ollama — https://ollama.ai
# 2. Pull IBM Granite model
ollama pull granite3.3:2b

# 3. Install Python dependencies
cd backend
pip install -r requirements.txt

# 4. Start API server
python main.py
```

Backend runs at [http://localhost:8000](http://localhost:8000)

## Folder Structure

```
space-explorer/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main application page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/
│   └── layout/            # Navbar, Footer
├── features/
│   ├── loading/           # Loading screen
│   ├── hero/              # Hero section + Space background
│   ├── solar-system/      # 3D Solar System + Planet list
│   ├── planet-modal/      # Planet detail modal
│   └── ai-assistant/      # IBM Granite AI chat panel
├── lib/
│   ├── planets-data.ts    # Complete solar system data
│   └── utils.ts           # Utility functions
├── types/
│   └── index.ts           # TypeScript type definitions
├── public/
│   ├── textures/          # Planet texture maps
│   └── gifs/              # rocket.gif loading animation
└── backend/               # Python FastAPI + LangChain
    ├── main.py            # FastAPI server
    ├── requirements.txt   # Python dependencies
    └── knowledge/         # PDF knowledge base folder
```

## Planet Textures

Place NASA texture maps in `public/textures/`:
- `mercury.jpg`
- `venus.jpg`
- `earth_daymap.jpg`
- `earth_normal.jpg`
- `earth_specular.jpg`
- `mars.jpg`
- `jupiter.jpg`
- `saturn.jpg`
- `uranus.jpg`
- `neptune.jpg`
- `pluto.jpg`

Free textures available at [NASA Solar System Exploration](https://solarsystem.nasa.gov/resources/all/?order=pub_date+desc&per_page=50&page=0&search=&fs=&fc=&ft=maps&dp=&category=)

## Loading Rocket GIF

Place your rocket animation at `public/gifs/rocket.gif`. The loading screen includes a built-in SVG fallback if the GIF is not found.

## Environment Variables

Create `.env.local` in the root:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Glassmorphism |
| 3D | React Three Fiber, Drei, Three.js |
| Animation | Framer Motion, GSAP |
| AI Model | IBM Granite via Ollama |
| AI Framework | LangChain |
| Vector DB | ChromaDB |
| Backend | Python FastAPI |
| RAG | LangChain + ChromaDB + PDF indexing |
