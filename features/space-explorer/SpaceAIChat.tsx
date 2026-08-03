"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { addTurn, getSuggestedFollowups } from "@/lib/cosmos-ai/conversation-memory";

interface SpaceAIChatProps {
  topic: string;
  accent: string;
  prompts?: string[];
}

interface Msg {
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
}

function RenderText({ text }: { text: string }) {
  return (
    <span className="whitespace-pre-wrap">
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export default function SpaceAIChat({ topic, accent, prompts = [] }: SpaceAIChatProps) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: `Hello! I'm **COSMOS AI** — your intelligent space guide for **${topic}**.\n\nAsk me anything about ${topic} — its history, science, missions, or cosmic mysteries! 🚀` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions] = useState<string[]>(prompts.length > 0 ? prompts : getSuggestedFollowups(topic.toLowerCase()));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const q = text ?? input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/cosmos-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `${q} ${topic}`, history: [] }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json() as { answer: string; entity: string | null; intent: string };
        setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
        addTurn(q, data.answer, data.intent, data.entity);
        setLoading(false);
        return;
      }
    } catch { /* fall through */ }

    await new Promise((r) => setTimeout(r, 500));
    setMessages((m) => [...m, { role: "assistant", text: `I'm analyzing information about **${topic}**.\n\nThis celestial object has fascinating scientific properties — from its formation billions of years ago to the missions that have explored it. For detailed answers, the COSMOS AI knowledge base contains comprehensive data about ${topic} including statistics, mission history, and interesting facts.` }]);
    setLoading(false);
  };

  return (
    <div className="space-ai-chat">
      <div className="space-ai-header">
        <div className="space-ai-avatar" style={{ background: `linear-gradient(135deg, #1e3a8a, ${accent})` }}>🧠</div>
        <div>
          <div className="space-ai-title">COSMOS AI — {topic}</div>
          <div className="space-ai-status">
            <span className="space-ai-dot" style={{ background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
            <span>Offline · TF-IDF knowledge search · 28 data files</span>
          </div>
        </div>
      </div>

      <div className="space-ai-messages">
        {messages.map((m, i) => (
          <motion.div key={i} className={`space-ai-msg ${m.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="space-ai-bubble" style={m.role === "user" ? { background: `linear-gradient(135deg, #1e3a8a, #1e40af)` } : undefined}>
              <RenderText text={m.text} />
            </div>
          </motion.div>
        ))}
        <AnimatePresence>
          {loading && (
            <motion.div className="space-ai-msg assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="space-ai-bubble">
                <span className="flex gap-1 items-center h-4">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400/70 inline-block"
                      animate={{ y: [0, -4, 0] }} transition={{ duration: 0.55, repeat: Infinity, delay: d }} />
                  ))}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && suggestions.length > 0 && (
        <div className="space-ai-prompts">
          {suggestions.slice(0, 4).map((p) => (
            <button key={p} className="space-ai-prompt-btn" onClick={() => send(p)}>{p}</button>
          ))}
        </div>
      )}

      <form className="space-ai-input-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          className="space-ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${topic}…`}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="space-ai-send"
          style={{ background: `linear-gradient(135deg, #2563eb, ${accent})` }}
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
