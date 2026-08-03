"""
Space Explorer — IBM Granite AI Backend
FastAPI + LangChain + ChromaDB + IBM Granite (via Ollama)
100% offline operation
"""
from __future__ import annotations

import os
import logging
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("space-explorer")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Space Explorer AI API",
    description="IBM Granite + LangChain + ChromaDB offline RAG API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent
KNOWLEDGE_DIR = BASE_DIR / "knowledge"
CHROMA_DIR = BASE_DIR / "chroma_db"
KNOWLEDGE_DIR.mkdir(exist_ok=True)
CHROMA_DIR.mkdir(exist_ok=True)

# ── State ──────────────────────────────────────────────────────────────────────
chain: Optional[object] = None
vectorstore: Optional[object] = None
docs_indexed: int = 0
model_name: str = os.getenv("GRANITE_MODEL", "granite3.3:2b")

# ── Models ─────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    planet: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: list[str] = []
    model: str
    latency_ms: int

class StatusResponse(BaseModel):
    status: str
    model: str
    vectorDb: str
    documentsIndexed: int
    chroma_dir: str


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global chain, vectorstore, docs_indexed
    try:
        from langchain_ollama import OllamaLLM
        from langchain_community.embeddings import OllamaEmbeddings
        from langchain_community.vectorstores import Chroma
        from langchain.chains import ConversationalRetrievalChain
        from langchain.memory import ConversationBufferWindowMemory
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        from langchain_community.document_loaders import (
            PyPDFLoader,
            TextLoader,
            DirectoryLoader,
        )

        logger.info(f"Loading IBM Granite model: {model_name}")

        llm = OllamaLLM(
            model=model_name,
            temperature=0.3,
            num_predict=1024,
        )

        embeddings = OllamaEmbeddings(model=model_name)

        # Load knowledge base documents
        docs = []
        if KNOWLEDGE_DIR.exists():
            for pdf in KNOWLEDGE_DIR.glob("**/*.pdf"):
                try:
                    loader = PyPDFLoader(str(pdf))
                    docs.extend(loader.load())
                    logger.info(f"Loaded PDF: {pdf.name}")
                except Exception as e:
                    logger.warning(f"Could not load {pdf.name}: {e}")

            for txt in KNOWLEDGE_DIR.glob("**/*.txt"):
                try:
                    loader = TextLoader(str(txt))
                    docs.extend(loader.load())
                    logger.info(f"Loaded TXT: {txt.name}")
                except Exception as e:
                    logger.warning(f"Could not load {txt.name}: {e}")

        # Always add built-in astronomy knowledge
        from langchain.schema import Document
        builtin = _get_builtin_knowledge()
        docs.extend(builtin)

        # Split documents
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " "],
        )
        chunks = splitter.split_documents(docs)
        docs_indexed = len(chunks)
        logger.info(f"Total chunks to index: {docs_indexed}")

        # Build / load vectorstore
        vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
            persist_directory=str(CHROMA_DIR),
            collection_name="space_explorer",
        )

        retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 5, "fetch_k": 15},
        )

        memory = ConversationBufferWindowMemory(
            memory_key="chat_history",
            return_messages=True,
            k=6,
        )

        chain = ConversationalRetrievalChain.from_llm(
            llm=llm,
            retriever=retriever,
            memory=memory,
            verbose=False,
            return_source_documents=True,
        )

        logger.info("✅ IBM Granite AI + LangChain + ChromaDB ready!")

    except ImportError as e:
        logger.warning(f"LangChain/Ollama not installed: {e}. Running in basic mode.")
    except Exception as e:
        logger.error(f"Startup error: {e}. API will operate in fallback mode.")


def _get_builtin_knowledge() -> list:
    """Built-in astronomy knowledge base — no external files required."""
    from langchain.schema import Document

    texts = [
        ("Mercury", """Mercury is the smallest planet and closest to the Sun, orbiting at 57.9 million km.
        It has a diameter of 4,879 km and a density second only to Earth. Mercury has virtually no atmosphere,
        causing extreme temperature swings from -180°C at night to 430°C during the day. Its year lasts only 88 Earth days.
        Mercury's large iron core takes up 85% of the planet's radius. The MESSENGER spacecraft orbited Mercury 2011-2015.
        BepiColombo is the current joint ESA/JAXA mission studying Mercury."""),
        ("Venus", """Venus is Earth's twin in size with a diameter of 12,104 km, orbiting at 108.2 million km.
        It has a thick CO2 atmosphere creating a greenhouse effect that makes it the hottest planet at 462°C.
        Venus rotates backwards and a Venusian day is longer than its year. The Magellan spacecraft mapped Venus with radar.
        The Soviet Venera probes landed on Venus in the 1970s and 1980s. Venus has no moons."""),
        ("Earth", """Earth is the only known planet to harbor life, located 149.6 million km from the Sun.
        Diameter is 12,742 km. Earth has one large Moon that stabilizes our axial tilt. The atmosphere is 78% nitrogen
        and 21% oxygen, perfect for life. Earth has plate tectonics, a global water cycle, and a protective magnetic field.
        Earth's oceans cover 70% of the surface and regulate climate. Average temperature is 15°C."""),
        ("Mars", """Mars is the fourth planet at 227.9 million km from the Sun. Diameter is 6,779 km.
        Mars has Olympus Mons, the solar system's tallest volcano at 21 km. Valles Marineris canyon is 4,000 km long.
        Mars has two tiny moons: Phobos and Deimos. Current missions include NASA's Perseverance rover (since 2021)
        and Ingenuity helicopter. Mars has evidence of ancient liquid water and possibly ancient life.
        Mars atmosphere is 95% CO2 and very thin at 0.6% Earth's pressure."""),
        ("Jupiter", """Jupiter is the largest planet with diameter 139,820 km, 318 times Earth's mass.
        Located 778.5 million km from Sun. Jupiter's Great Red Spot is a storm larger than Earth, raging 400+ years.
        Jupiter has 95 known moons. Europa may have a liquid water ocean beneath its ice. Ganymede is the largest moon
        in the solar system. Io has the most volcanic activity of any body. Jupiter rotates in just 10 hours.
        Juno spacecraft has been orbiting Jupiter since 2016."""),
        ("Saturn", """Saturn is the second largest planet, diameter 116,460 km. Located 1.43 billion km from Sun.
        Saturn's ring system spans 282,000 km made of ice and rock. The rings are only 10-100 meters thick.
        Saturn has 146 known moons. Titan has a thick nitrogen atmosphere and methane lakes — possibly habitable.
        Enceladus sprays water geysers into space. Saturn is least dense planet — it could float on water.
        The Cassini spacecraft orbited Saturn from 2004 to 2017."""),
        ("Uranus", """Uranus is an ice giant with diameter 50,724 km, located 2.87 billion km from Sun.
        Uranus has an axial tilt of 97.8 degrees, essentially rolling on its side due to ancient collision.
        Has 13 rings and 27 known moons named after Shakespeare characters. Miranda has extreme cliffs.
        Minimum temperature is -224°C, the coldest planetary temperature in the solar system.
        Uranus was discovered by William Herschel in 1781. Voyager 2 flew by in 1986."""),
        ("Neptune", """Neptune is the outermost major planet, diameter 49,244 km, 4.5 billion km from Sun.
        Has the strongest winds in the solar system at 2,100 km/h. Has 16 moons; largest is Triton which orbits backwards.
        Neptune was discovered mathematically before observation in 1846. One year = 165 Earth years.
        Voyager 2 is the only spacecraft to visit Neptune (1989). Has a Great Dark Spot storm system.
        Neptune's blue color comes from methane in the atmosphere."""),
        ("Black Holes", """A black hole is a region of spacetime with gravity so strong nothing, not even light, can escape.
        The boundary is called the event horizon. Stellar black holes form when massive stars (>20 solar masses) collapse.
        Supermassive black holes at galaxy centers can contain billions of solar masses. Sagittarius A* at the Milky Way
        center is 4 million solar masses. The Event Horizon Telescope captured the first image in 2019 (M87*).
        Stephen Hawking predicted black holes emit thermal radiation (Hawking radiation). Time dilation near black holes
        means time passes slower in strong gravitational fields (gravitational time dilation)."""),
        ("Dark Matter", """Dark matter makes up 27% of the universe but cannot be directly observed.
        Evidence comes from galaxy rotation curves, gravitational lensing, and cosmic structure.
        Dark matter doesn't emit, absorb, or reflect light. Leading candidates include WIMPs and axions.
        The Bullet Cluster collision provides strong evidence for dark matter. Dark energy (68%) drives the
        universe's accelerating expansion. Together, dark matter and dark energy constitute 95% of the cosmos.
        Normal matter is only 5% of the universe's energy content."""),
        ("Space Missions", """Key space missions: Apollo 11 (1969) — first humans on Moon, Neil Armstrong and Buzz Aldrin.
        Voyager 1 and 2 (1977) — now in interstellar space, farthest human-made objects.
        Hubble Space Telescope (1990) — transformed astronomy with deep field images.
        International Space Station (1998) — continuous human presence in space since 2000.
        Mars rovers: Spirit, Opportunity, Curiosity, Perseverance. James Webb Space Telescope (2021) —
        observes earliest galaxies 13.6 billion light-years away. Artemis program aims to return humans to Moon."""),
        ("Exoplanets", """Over 5,500 exoplanets have been confirmed beyond our solar system.
        Kepler Space Telescope discovered thousands of exoplanets using transit photometry.
        TRAPPIST-1 system has 7 Earth-sized planets, 3 in habitable zone, 39 light-years away.
        Proxima Centauri b is the nearest exoplanet at 4.2 light-years. Hot Jupiters are gas giants
        orbiting very close to their stars. Super-Earths are common but have no solar system equivalent.
        The habitable zone (Goldilocks zone) is where liquid water can exist on a planet's surface."""),
    ]

    docs = []
    for title, text in texts:
        docs.append(Document(
            page_content=text,
            metadata={"source": "built-in", "topic": title, "type": "astronomy"},
        ))
    return docs


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/status", response_model=StatusResponse)
async def get_status():
    return StatusResponse(
        status="online",
        model=model_name,
        vectorDb="ChromaDB",
        documentsIndexed=docs_indexed,
        chroma_dir=str(CHROMA_DIR),
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    start = time.monotonic()
    query = request.message.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Add planet context to the query
    if request.planet:
        query = f"[Context: User is looking at {request.planet}] {query}"

    try:
        if chain is not None:
            result = chain.invoke({"question": query})
            answer = result.get("answer", "I could not generate an answer.")
            sources = []
            for doc in result.get("source_documents", [])[:3]:
                src = doc.metadata.get("source", "knowledge base")
                topic = doc.metadata.get("topic", "")
                label = f"{src}" + (f" [{topic}]" if topic else "")
                if label not in sources:
                    sources.append(label)
        else:
            # Fallback if chain not loaded
            answer = _fallback_answer(query)
            sources = ["built-in knowledge base"]

        latency = int((time.monotonic() - start) * 1000)
        return ChatResponse(
            answer=answer,
            sources=sources,
            model=model_name,
            latency_ms=latency,
        )
    except Exception as e:
        logger.error(f"Chat error: {e}")
        latency = int((time.monotonic() - start) * 1000)
        return ChatResponse(
            answer=f"I encountered an error processing your question. Please check that Ollama is running with the '{model_name}' model (`ollama pull {model_name}`).",
            sources=[],
            model=model_name,
            latency_ms=latency,
        )


def _fallback_answer(query: str) -> str:
    q = query.lower()
    if any(w in q for w in ["mars", "red planet"]):
        return "Mars is the fourth planet from the Sun, nicknamed the Red Planet due to iron oxide on its surface. It has the tallest volcano (Olympus Mons, 21km) and the longest canyon (Valles Marineris) in the solar system. The Perseverance rover is currently exploring Jezero Crater."
    if "jupiter" in q:
        return "Jupiter is the largest planet in our solar system. Its Great Red Spot is a storm larger than Earth. Jupiter has 95 known moons including Europa, which may harbor a subsurface ocean with potential for life."
    if "black hole" in q:
        return "A black hole is a region where gravity is so intense that nothing, not even light, can escape. They form when massive stars collapse. The Event Horizon Telescope captured the first image of a black hole in 2019."
    if any(w in q for w in ["saturn", "ring"]):
        return "Saturn's iconic ring system is made of billions of ice particles and rocks, spanning 282,000 km but only meters thick. Saturn has 146 moons; Titan has a thick atmosphere and liquid methane lakes."
    return "This is an excellent astronomy question! Start the IBM Granite backend with Ollama to get detailed AI-powered answers from our space knowledge base."


@app.get("/api/planets/{planet_id}")
async def get_planet_info(planet_id: str):
    """Return AI summary for a specific planet."""
    if chain is None:
        return {"summary": f"Connect the IBM Granite backend (ollama + python main.py) for AI-powered {planet_id} information."}
    try:
        result = chain.invoke({"question": f"Give me a comprehensive scientific summary of {planet_id} including key facts, unique features, and recent missions."})
        return {"summary": result.get("answer", ""), "planet": planet_id}
    except Exception as e:
        logger.error(f"Planet info error: {e}")
        return {"summary": "Error generating AI summary.", "planet": planet_id}


@app.post("/api/index")
async def index_documents():
    """Re-index the knowledge base documents."""
    return {"status": "indexing", "message": "Restart the server to re-index documents."}


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
