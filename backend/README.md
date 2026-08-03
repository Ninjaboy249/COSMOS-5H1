# Space Explorer — IBM Granite AI Backend

Python FastAPI backend with LangChain, ChromaDB, and IBM Granite.

## Requirements

- Python 3.11+
- [Ollama](https://ollama.ai) installed and running

## Setup

```bash
# 1. Pull IBM Granite model via Ollama
ollama pull granite3.3:2b

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. (Optional) Add PDF documents to the knowledge base
mkdir knowledge
# Copy your NASA PDFs, astronomy books etc. into the knowledge/ folder

# 4. Start the server
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/status` | GET | Server + model status |
| `/api/chat` | POST | Chat with IBM Granite AI |
| `/api/planets/{id}` | GET | AI summary for a planet |
| `/health` | GET | Health check |

## Chat Request

```json
{
  "message": "What makes Mars unique?",
  "history": [],
  "planet": "mars"
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GRANITE_MODEL` | `granite3.3:2b` | Ollama model name |

## Knowledge Base

Place PDF documents in the `knowledge/` directory. Supported formats:
- `.pdf` — NASA articles, astronomy books, research papers
- `.txt` — Plain text documents

Documents are automatically chunked and indexed into ChromaDB on startup.

## Models Tested

- `granite3.3:2b` — IBM Granite 3.3 2B (recommended, lightweight)
- `granite3.3:8b` — IBM Granite 3.3 8B (higher quality, needs more RAM)
- `llama3.2:3b` — Meta Llama 3.2 3B (fallback alternative)
