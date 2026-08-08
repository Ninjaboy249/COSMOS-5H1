"use client";
/**
 * COSMOS Voice — LiveKit room hook
 *
 * Connects the browser to a LiveKit room where the Render-hosted agent
 * (backend/agent.py) is listening. The agent handles all STT → LLM → TTS
 * server-side; the browser just sends mic audio and plays back agent audio.
 *
 * Usage:
 *   const lk = useLiveKitVoice();
 *   await lk.connect(roomName);   // joins the room, agent speaks first
 *   lk.disconnect();              // leaves and cleans up
 *
 * Returns { connected, agentState, connect, disconnect, isAvailable }
 *   agentState: "idle" | "listening" | "thinking" | "speaking"
 *   isAvailable: false when LIVEKIT_* env vars are not configured
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  createLocalAudioTrack,
  ConnectionState,
} from "livekit-client";

export type AgentState = "idle" | "listening" | "thinking" | "speaking";

interface UseLiveKitVoiceReturn {
  /** True once successfully joined the room */
  connected: boolean;
  /** What the server-side agent is currently doing */
  agentState: AgentState;
  /** Join a LiveKit room. Fetches token from /api/voice/livekit-token first. */
  connect: (roomName?: string) => Promise<{ ok: boolean; fallback?: boolean }>;
  /** Leave the room and release mic/audio. */
  disconnect: () => void;
  /** False when LIVEKIT_* env vars are absent — caller should use fallback TTS. */
  isAvailable: boolean;
}

export function useLiveKitVoice(): UseLiveKitVoiceReturn {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [isAvailable, setIsAvailable] = useState(false); // determined on first connect attempt

  // ── Clean up on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async (
    roomName = "cosmos-voice"
  ): Promise<{ ok: boolean; fallback?: boolean }> => {
    // 1. Fetch a short-lived token from our Vercel API route (keeps secret server-side)
    let token: string;
    let url: string;
    try {
      const res = await fetch("/api/voice/livekit-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomName,
          participantName: `user-${Date.now()}`,
        }),
      });
      const data = await res.json() as { token?: string; url?: string; fallback?: boolean };

      if (data.fallback || !data.token || !data.url) {
        setIsAvailable(false);
        return { ok: false, fallback: true };
      }

      token = data.token;
      url   = data.url;
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
      return { ok: false, fallback: true };
    }

    // 2. Create a Room and wire up events
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    // Track agent speaking state via participant attributes / data messages
    room.on(RoomEvent.ParticipantAttributesChanged, (
      changed: Record<string, string>,
      participant: RemoteParticipant | LocalParticipant
    ) => {
      if (participant.isAgent) {
        const state = (changed["agent_state"] ?? participant.attributes["agent_state"] ?? "") as string;
        if (state === "listening")  setAgentState("listening");
        else if (state === "thinking") setAgentState("thinking");
        else if (state === "speaking") setAgentState("speaking");
        else if (state === "idle")  setAgentState("idle");
      }
    });

    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        // Attach remote audio (agent voice) to a hidden <audio> element
        const el = track.attach();
        el.style.display = "none";
        document.body.appendChild(el);
      }
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
    });

    room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
      if (state === ConnectionState.Disconnected) {
        setConnected(false);
        setAgentState("idle");
      }
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnected(false);
      setAgentState("idle");
    });

    // 3. Connect to the LiveKit room
    try {
      await room.connect(url, token);
    } catch (err) {
      console.error("[LiveKit] Room connect failed:", err);
      setIsAvailable(false);
      return { ok: false, fallback: true };
    }

    // 4. Publish microphone audio so the agent can hear the user
    try {
      const micTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
      await room.localParticipant.publishTrack(micTrack);
    } catch (err) {
      console.error("[LiveKit] Mic publish failed:", err);
      // Non-fatal — agent is connected, just can't hear user yet
    }

    setConnected(true);
    setAgentState("listening");
    return { ok: true };
  }, []);

  // ── Disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setConnected(false);
    setAgentState("idle");
  }, []);

  return { connected, agentState, connect, disconnect, isAvailable };
}
