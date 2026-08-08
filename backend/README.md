# COSMOS-5H1 — Python Backend

Two services live in this directory:

| File | Purpose |
|---|---|
| `main.py` | FastAPI + IBM Granite RAG (offline, Ollama) |
| `agent.py` | LiveKit real-time voice agent (Deepgram → Gemini → Murf Abhinav) |

---

## 1 · IBM Granite AI Backend (`main.py`)

### Requirements
- Python 3.11+
- [Ollama](https://ollama.ai) installed and running

### Setup

```bash
# Pull IBM Granite model
ollama pull granite3.3:2b

# Install dependencies
pip install -r requirements.txt

# (Optional) add PDFs/TXTs to knowledge/
mkdir knowledge

# Start
python main.py
```

API available at `http://localhost:8000`

### Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/status` | GET | Server + model status |
| `/api/chat` | POST | Chat with IBM Granite AI |
| `/api/planets/{id}` | GET | AI summary for a planet |
| `/health` | GET | Health check |

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GRANITE_MODEL` | `granite3.3:2b` | Ollama model name |

---

## 2 · LiveKit Voice Agent (`agent.py`)

Real-time voice pipeline:

```
Microphone → Deepgram Nova-3 (STT) → Gemini 2.0 Flash (LLM) → Murf Abhinav/Conversational (TTS) → Speaker
```

### Requirements
- Python 3.11+
- A LiveKit Cloud project (free at [livekit.io](https://livekit.io))
- API keys for Deepgram, Google Gemini, and Murf

### Credentials

The agent reads from `../.env.local` (the project root `.env.local`).
Make sure these are set:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxxxxx
LIVEKIT_API_SECRET=your-secret
DEEPGRAM_API_KEY=your-deepgram-key
GOOGLE_API_KEY=your-gemini-key
MURF_API_KEY=your-murf-key
```

### Setup

```bash
# Install dependencies (from backend/)
pip install -r requirements.txt

# Download the Silero VAD model (one-time)
python -c "from livekit.plugins import silero; silero.VAD.load()"
```

### Run locally

```bash
# Development mode (auto-reconnects, verbose logs)
python agent.py dev
```

### Deploy to Render

1. Push this repo to GitHub (already done)
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo — Render finds `render.yaml` automatically
4. In the Render dashboard for the service, add these **Environment Variables**:

| Variable | Where to get it |
|---|---|
| `LIVEKIT_URL` | LiveKit Cloud project → Settings |
| `LIVEKIT_API_KEY` | LiveKit Cloud project → Keys |
| `LIVEKIT_API_SECRET` | LiveKit Cloud project → Keys |
| `DEEPGRAM_API_KEY` | console.deepgram.com |
| `GOOGLE_API_KEY` | aistudio.google.com |
| `MURF_API_KEY` | murf.ai → API |

5. Click **Deploy** — Render installs `requirements-agent.txt` and runs `python agent.py start`

> **Note:** Render's free **Starter** worker plan works. The agent connects outbound to LiveKit Cloud — no inbound HTTP port is needed.

### Voice configuration

| Setting | Value |
|---|---|
| Voice | Abhinav (en-IN) |
| Style | Conversation |
| Model | Murf Falcon 2 |
| STT | Deepgram Nova-3 (multilingual) |
| LLM | Gemini 2.0 Flash Lite |

---

## ⚡ Already working on Vercel — no backend needed

All voice features run entirely through **Next.js serverless routes on Vercel**:

| Feature | Route | Key used |
|---|---|---|
| Text-to-speech (Abhinav) | `/api/voice/speak` | `MURF_API_KEY` |
| Speech-to-text | `/api/voice/deepgram-stt` | `DEEPGRAM_API_KEY` |
| LiveKit room token | `/api/voice/livekit-token` | `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` |
| COSMOS AI chat | `/api/cosmos-ai` | `OPENAI_API_KEY` (falls back to offline RAG) |

The Python `agent.py` on Render adds a **server-side LiveKit room agent** on top of this — it is optional and only needed if you want the agent to join LiveKit rooms directly (e.g. for future avatar or phone call features).
