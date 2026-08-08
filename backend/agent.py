"""
COSMOS-5H1 — LiveKit Voice Agent
Real-time voice AI pipeline:
  STT  → Deepgram Nova-3 (multilingual)
  LLM  → Google Gemini (via livekit-agents[google])
  TTS  → Murf Falcon 2 · voice: Abhinav · style: Conversation
  VAD  → Silero
  Turn → LiveKit MultilingualModel
  NC   → BVC noise cancellation

Credential loading (in priority order):
  1. Environment variables already set (Render / any cloud host)
  2. ../.env.local  — local development alongside the Next.js app
  3. .env.local     — local development from inside backend/

Run locally:  python agent.py dev
Deploy:       set env vars in Render dashboard, start cmd: python agent.py start
"""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    cli,
    tokenize,
    room_io,
)
from livekit.plugins import murf, silero, google, deepgram, noise_cancellation
from livekit.plugins.turn_detector.multilingual import MultilingualModel

logger = logging.getLogger("cosmos-agent")

# Load credentials — only fills in vars that are NOT already set in the
# environment (so Render's injected env vars always win over any .env file).
# Try project root first, then backend-local, then skip silently.
if not os.environ.get("LIVEKIT_URL"):
    load_dotenv("../.env.local")   # running from backend/ locally
    load_dotenv(".env.local")      # fallback: running from project root

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are COSMOS AI, an expert space science voice assistant for the COSMOS-5H1 platform.
You help users explore planets, stars, space missions, black holes, and all things astronomy.
Be concise, accurate, and engaging. Speak in a natural conversational tone suitable for voice.
Keep responses short — two to four sentences unless the user asks for more detail.
Do not use markdown, bullet points, emojis, or symbols in your spoken responses.
If you don't know something, say so honestly."""

FIRST_TURN_GREETING = (
    "Hello! I'm COSMOS-5H1, your space science assistant. "
    "Ask me anything about the universe, or say a planet name to explore it."
)

# ── Agent ─────────────────────────────────────────────────────────────────────

class CosmosAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions=SYSTEM_PROMPT)


# ── Server setup ──────────────────────────────────────────────────────────────

server = AgentServer()


def prewarm(proc: JobProcess):
    """Load VAD model once per worker process to avoid reloading on each job."""
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name="cosmos-agent")
async def cosmos_agent(ctx: JobContext):
    ctx.log_context_fields = {"room": ctx.room.name}

    session = AgentSession(
        # ── STT — Deepgram Nova-3 ─────────────────────────────────────────────
        # Falls back to browser Web Speech API when DEEPGRAM_API_KEY is absent.
        stt=deepgram.STT(model="nova-3", language="multi"),

        # ── LLM — Google Gemini ───────────────────────────────────────────────
        # Requires GOOGLE_API_KEY in .env.local.
        llm=google.LLM(model="gemini-2.0-flash-lite"),

        # ── TTS — Murf Falcon 2 · Abhinav ────────────────────────────────────
        # Requires MURF_API_KEY in .env.local.
        # model: falcon-2, voice: Rohan (en-IN), style: Conversational
        tts=murf.TTS(
            model="falcon-2",
            voice="Rohan",
            style="Conversational",
            tokenizer=tokenize.basic.SentenceTokenizer(min_sentence_len=2),
            text_pacing=True,
        ),

        # ── Turn detection & VAD ──────────────────────────────────────────────
        turn_detection=MultilingualModel(),
        vad=ctx.proc.userdata["vad"],

        # Allow the LLM to start generating while waiting for end-of-turn
        preemptive_generation=True,
    )

    await session.start(
        agent=CosmosAssistant(),
        room=ctx.room,
        room_options=room_io.RoomOptions(
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=lambda params: (
                    # Use telephony-optimised NC for SIP participants
                    noise_cancellation.BVCTelephony()
                    if params.participant.kind
                    == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                    else noise_cancellation.BVC()
                ),
            ),
        ),
    )

    await ctx.connect()

    # Greet the user as soon as the session is live
    await session.say(FIRST_TURN_GREETING, allow_interruptions=True)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(server)
