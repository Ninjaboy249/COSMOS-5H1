"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import type { ChatMessage, BackendStatus } from "@/types";
import { addTurn, clearMemory, getSuggestedFollowups, getContextClue } from "@/lib/cosmos-ai/conversation-memory";
import { detectIntent } from "@/lib/cosmos-ai/intent-service";

// ── Types & constants ──────────────────────────────────────────────────────

interface AIAssistantProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const INITIAL_MSG: ChatMessage = {
  id: "1",
  role: "assistant",
  content: "Hello! I'm **COSMOS AI** 🧠 — your intelligent offline space assistant.\n\nI can answer questions about any planet, star, mission, black hole, or space phenomenon — no internet needed!\n\nWhat would you like to explore today? 🚀",
  timestamp: new Date(),
};

// ── Streaming text component ───────────────────────────────────────────────

function StreamingText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    // Faster streaming for longer texts
    const chunkSize = text.length > 400 ? 4 : 2;
    const delay = text.length > 400 ? 10 : 18;
    const timer = setInterval(() => {
      i += chunkSize;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(timer);
        setDisplayed(text);
        setDone(true);
        onDone?.();
      }
    }, delay);
    return () => clearInterval(timer);
  }, [text, onDone]);

  return <span className="whitespace-pre-wrap">{done ? text : displayed}{!done && <span className="cosmos-ai-cursor">|</span>}</span>;
}

// ── Markdown-lite renderer ─────────────────────────────────────────────────

function RenderMessage({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("## ")) {
      elements.push(<div key={i} className="cosmos-msg-h2">{line.slice(3)}</div>);
    } else if (line.startsWith("# ")) {
      elements.push(<div key={i} className="cosmos-msg-h1">{line.slice(2)}</div>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<div key={i} className="cosmos-msg-bold">{line.slice(2, -2)}</div>);
    } else if (line.startsWith("  • ") || line.startsWith("• ")) {
      elements.push(
        <div key={i} className="cosmos-msg-bullet">
          <span className="cosmos-msg-bullet-dot">•</span>
          <span>{line.replace(/^  ?•\s*/, "")}</span>
        </div>
      );
    } else if (line.startsWith("|")) {
      // Table row
      const cells = line.split("|").filter(Boolean);
      const isHeader = lines[i + 1]?.startsWith("|---");
      if (!line.includes("---")) {
        elements.push(
          <div key={i} className={`cosmos-msg-table-row ${isHeader ? "header" : ""}`}>
            {cells.map((c, j) => <span key={j} className="cosmos-msg-table-cell">{c.trim()}</span>)}
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="cosmos-msg-spacer" />);
    } else {
      // Inline bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      elements.push(
        <div key={i} className="cosmos-msg-text">
          {parts.map((p, j) =>
            p.startsWith("**") && p.endsWith("**")
              ? <strong key={j}>{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          )}
        </div>
      );
    }
  });

  return <>{elements}</>;
}

// ── Main AIAssistant ───────────────────────────────────────────────────────

export default function AIAssistant({ isOpen: isOpenProp, onOpenChange }: AIAssistantProps = {}) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────
  const [isOpenInternal, setIsOpenInternal] = useState(false);
  const isOpen = isOpenProp !== undefined ? isOpenProp : isOpenInternal;
  const setIsOpen = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === "function" ? v(isOpen) : v;
    if (onOpenChange) onOpenChange(next);
    else setIsOpenInternal(next);
  }, [isOpen, onOpenChange]);

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>(getSuggestedFollowups(null));
  const [isListening, setIsListening] = useState(false);
  const [aiSource, setAiSource] = useState<"granite" | "offline" | "local">("offline");
  const [backendStatus] = useState<BackendStatus>({
    status: "offline",
    model: "COSMOS AI",
    vectorDb: "TF-IDF",
    documentsIndexed: 28,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [messages, isOpen]);

  // Auto-focus
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Load history from session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("cosmos-ai-memory");
      if (stored) {
        try {
          const mem = JSON.parse(stored);
          setHistory(mem.searchHistory ?? []);
        } catch { /* ignore */ }
      }
    }
  }, [isOpen]);

  // ── Voice input ────────────────────────────────────────────────────────
  const startVoice = () => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Voice input not supported in this browser."); return; }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: { results: { [x: string]: { [x: string]: { transcript: string } } } }) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // ── Send message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading) return;

    // Context enrichment
    const contextClue = getContextClue(messageText);
    const enrichedQuery = contextClue && messageText.split(" ").length <= 3
      ? `${messageText} ${contextClue}` : messageText;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Check for navigation intent client-side for immediate response
    const intent = detectIntent(messageText);
    if (intent.intent === "navigation" && intent.entity && intent.navigateTo) {
      const navMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `🚀 **Navigating to ${intent.entity.replace(/-/g, " ")}…**\n\nOpening the ${intent.entity.replace(/-/g, " ")} explorer with 3D visualization and AI insights.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, navMsg]);
      setIsLoading(false);
      setTimeout(() => router.push(intent.navigateTo!), 800);
      return;
    }

    try {
      const res = await fetch("/api/cosmos-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: enrichedQuery,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await res.json() as { answer: string; entity: string | null; intent: string; navigateTo?: string; source?: string };
      const newId = (Date.now() + 1).toString();

      const aiMsg: ChatMessage = {
        id: newId,
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setStreamingId(newId);
      if (data.source === "granite") setAiSource("granite");
      else if (data.source === "local") setAiSource("local");
      else setAiSource("offline");

      // Save to memory
      addTurn(messageText, data.answer, data.intent, data.entity);
      setHistory((prev) => [messageText, ...prev.filter((h) => h !== messageText)].slice(0, 20));
      setSuggestions(getSuggestedFollowups(data.entity));

      // Navigation from AI response
      if (data.navigateTo) {
        setTimeout(() => router.push(data.navigateTo!), 1200);
      }

    } catch {
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "⚠️ Couldn't reach the COSMOS AI service. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, router]);

  // Keyboard shortcut to open: Alt+Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.code === "Space") { e.preventDefault(); setIsOpen((v) => !v); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setIsOpen]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating button ── */}
      <motion.button
        className="fixed bottom-8 right-8 z-[200] w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: "rgba(4,10,32,0.92)",
          border: "1px solid rgba(103,232,249,0.4)",
          boxShadow: "0 0 28px rgba(103,232,249,0.2), inset 0 1px 0 rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
        whileHover={{ scale: 1.08, boxShadow: "0 0 38px rgba(103,232,249,0.4)" }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen((v) => !v)}
        title="COSMOS AI (Alt+Space)"
      >
        <motion.span
          className="text-xl"
          animate={{ rotate: isOpen ? 0 : [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
        >
          {isOpen ? "✕" : "🧠"}
        </motion.span>
        <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400"
          style={{ boxShadow: "0 0 8px #34d399", animation: "pulse 2s infinite" }} />
      </motion.button>

      {/* ── Chat panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-28 right-8 z-[199] flex flex-col rounded-2xl overflow-hidden cosmos-ai-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="cosmos-ai-header">
              <div className="flex items-center gap-2.5">
                <div className="cosmos-ai-logo">🧠</div>
                <div>
                  <div className="cosmos-ai-name">COSMOS AI</div>
                  <div className="cosmos-ai-status-row">
                        <span className="cosmos-ai-status-dot" />
                        <span className="cosmos-ai-status-text">
                          {aiSource === "granite"
                            ? "🔷 IBM Granite 3.3 · Local"
                            : `Offline · ${backendStatus.documentsIndexed} knowledge files · TF-IDF`}
                        </span>
                      </div>
                </div>
              </div>
              <div className="flex gap-1">
                {/* Tab: Chat */}
                <button
                  className={`cosmos-ai-tab ${activeTab === "chat" ? "active" : ""}`}
                  onClick={() => setActiveTab("chat")}
                  title="Chat"
                >💬</button>
                {/* Tab: History */}
                <button
                  className={`cosmos-ai-tab ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                  title="History"
                >🕐</button>
                {/* Clear */}
                <button
                  className="cosmos-ai-tab"
                  onClick={() => { setMessages([INITIAL_MSG]); clearMemory(); setHistory([]); setSuggestions(getSuggestedFollowups(null)); }}
                  title="Clear chat"
                >🗑</button>
                {/* Close */}
                <button className="cosmos-ai-tab" onClick={() => setIsOpen(false)} title="Close">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ── Chat tab ── */}
            {activeTab === "chat" && (
              <>
                {/* Messages */}
                <div className="cosmos-ai-messages">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      className={`cosmos-ai-msg-row ${msg.role}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {msg.role === "assistant" && (
                        <div className="cosmos-ai-avatar-sm">🧠</div>
                      )}
                      <div className={`cosmos-ai-bubble ${msg.role}`}>
                        {msg.role === "assistant" && msg.id === streamingId && streamingId !== INITIAL_MSG.id ? (
                          <StreamingText text={msg.content} onDone={() => setStreamingId(null)} />
                        ) : (
                          <RenderMessage content={msg.content} />
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {/* Loading dots */}
                  <AnimatePresence>
                    {isLoading && (
                      <motion.div className="cosmos-ai-msg-row assistant" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="cosmos-ai-avatar-sm">🧠</div>
                        <div className="cosmos-ai-bubble assistant cosmos-ai-thinking">
                          {[0, 0.15, 0.3].map((d, i) => (
                            <motion.span key={i} className="cosmos-ai-dot"
                              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                              transition={{ duration: 0.6, repeat: Infinity, delay: d }} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions */}
                {messages.length <= 2 && (
                  <div className="cosmos-ai-suggestions">
                    <p className="cosmos-ai-suggestions-label">Try asking</p>
                    <div className="cosmos-ai-chips">
                      {suggestions.slice(0, 4).map((s) => (
                        <button key={s} className="cosmos-ai-chip" onClick={() => sendMessage(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── History tab ── */}
            {activeTab === "history" && (
              <div className="cosmos-ai-history">
                <p className="cosmos-ai-suggestions-label">Recent searches</p>
                {history.length === 0 ? (
                  <p className="cosmos-ai-history-empty">No history yet — start asking questions!</p>
                ) : (
                  history.map((h, i) => (
                    <button key={i} className="cosmos-ai-history-item"
                      onClick={() => { setActiveTab("chat"); sendMessage(h); }}>
                      <span className="cosmos-ai-history-icon">🔍</span>
                      <span>{h}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Input */}
            <form
              className="cosmos-ai-input-area"
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
            >
              <div className="cosmos-ai-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about space…"
                  className="cosmos-ai-input"
                  disabled={isLoading}
                />
                {/* Voice button */}
                <button
                  type="button"
                  className={`cosmos-ai-voice-btn ${isListening ? "listening" : ""}`}
                  onClick={startVoice}
                  title="Voice input"
                >
                  {isListening ? (
                    <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>🎙</motion.span>
                  ) : "🎤"}
                </button>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="cosmos-ai-send-btn"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>

            {/* Footer hint */}
            <div className="cosmos-ai-footer-hint">
              Alt+Space to toggle · Say “Open Mars” for its 3D view · offline fallback available
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
