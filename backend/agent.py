"""
COSMOS-5H1 — LiveKit Voice Agent
Real-time voice AI pipeline:
  STT  → Deepgram Nova-3 (multilingual)
  LLM  → Google Gemini (via livekit-agents[google])
  TTS  → Murf Falcon · voice: Abhinav · style: Conversational
  VAD  → Silero
  Turn → LiveKit MultilingualModel
  NC   → BVC noise cancellation

Reads credentials from .env.local (same file as the Next.js app).
Run:  python agent.py dev
"""
from __future__ import annotations

import logging

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

# Load secrets from ../.env.local (project root) so this agent
# shares the same credential file as the Next.js app.
load_dotenv("../.env.local")

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are COSMOS AI, an expert space science voice assistant for the COSMOS-5H1 platform.
You help users explore planets, stars, space missions, black holes, and all things astronomy.
Be concise, accurate, and engaging. Speak in a natural conversational tone suitable for voice.
Keep responses short — two to four sentences unless the user asks for more detail.
Do not use markdown, bullet points, emojis, or symbols in your spoken responses.
If you don't know something, say so honestly."""

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

        # ── TTS — Murf Falcon · Abhinav ───────────────────────────────────────
        # Requires MURF_API_KEY in .env.local.
        # voice: Abhinav (en-IN), style: Conversational, model: Falcon (GEN2)
        tts=murf.TTS(
            voice="Abhinav",
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


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli.run_app(server)
