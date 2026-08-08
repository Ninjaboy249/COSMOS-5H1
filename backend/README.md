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

### Run

```bash
# Development mode (auto-reconnects, verbose logs)
python agent.py dev

# Production mode
python agent.py start
```

### Voice configuration

| Setting | Value |
|---|---|
| Voice | Abhinav (en-IN) |
| Style | Conversational |
| Model | Murf Falcon (GEN2) |
| STT | Deepgram Nova-3 (multilingual) |
| LLM | Gemini 2.0 Flash Lite |

To change the voice, edit `agent.py` and update the `murf.TTS(voice=..., style=...)` call.
