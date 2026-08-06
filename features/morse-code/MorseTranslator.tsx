"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MorseTranslator — bidirectional text ↔ Morse code translator
// Copy, Download, Share. Supports alphabet, numbers, punctuation.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { textToMorse, morseToText, MORSE_TABLE } from "@/lib/morse-code";

type Direction = "text-to-morse" | "morse-to-text";

// Morse character reference table
const CHAR_GROUPS = [
  { label: "A–M", chars: ["A","B","C","D","E","F","G","H","I","J","K","L","M"] },
  { label: "N–Z", chars: ["N","O","P","Q","R","S","T","U","V","W","X","Y","Z"] },
  { label: "0–9", chars: ["0","1","2","3","4","5","6","7","8","9"] },
  { label: "Punctuation", chars: [".",",","?","!","/","@","=","+","-","(",")",":","&","'","\"","$"] },
];

export default function MorseTranslator({
  onPlay,
}: {
  onPlay?: (morse: string) => void;
}) {
  const [direction, setDirection] = useState<Direction>("text-to-morse");
  const [input, setInput] = useState("SOS");
  const [copied, setCopied] = useState(false);
  const [showReference, setShowReference] = useState(false);

  const output = useCallback(() => {
    if (!input.trim()) return "";
    if (direction === "text-to-morse") return textToMorse(input);
    return morseToText(input);
  }, [input, direction])();

  const handleSwap = () => {
    setDirection((d) => d === "text-to-morse" ? "morse-to-text" : "text-to-morse");
    setInput(output || "");
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!output) return;
    const content = `Input: ${input}\nOutput: ${output}\n\nEncoded with COSMOS-5H1 Morse Code Center`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "morse-code.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const text = `${input} = ${output} (encoded with COSMOS-5H1)`;
    if (navigator.share) {
      await navigator.share({ title: "Morse Code", text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const isTextToMorse = direction === "text-to-morse";

  return (
    <div className="mc-panel">
      {/* Panel header */}
      <div className="mc-panel-header">
        <span className="text-xl">⟷</span>
        <h2 className="mc-panel-title">Morse Translator</h2>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowReference((v) => !v)}
            className="mc-chip"
            style={{ color: showReference ? "#93c5fd" : "rgba(147,197,253,0.6)" }}
          >
            {showReference ? "Hide" : "Show"} Reference
          </button>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Direction selector */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(147,197,253,0.12)" }}>
          {(["text-to-morse", "morse-to-text"] as const).map((d) => (
            <button
              key={d}
              onClick={() => { setDirection(d); setInput(""); }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: direction === d ? "rgba(147,197,253,0.14)" : "transparent",
                color: direction === d ? "#bfdbfe" : "rgba(147,197,253,0.55)",
                border: direction === d ? "1px solid rgba(147,197,253,0.28)" : "1px solid transparent",
                textShadow: direction === d ? "0 0 10px rgba(147,197,253,0.4)" : "none",
              }}
            >
              {d === "text-to-morse" ? "✏️ Text → Morse" : "📡 Morse → Text"}
            </button>
          ))}
        </div>

        {/* Input / Output grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {/* Input */}
          <div className="flex flex-col gap-2">
            <label className="mc-label">
              {isTextToMorse ? "Enter text" : "Enter Morse code"}
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isTextToMorse ? "Type anything…" : "... --- ... (use spaces between symbols, / between words)"}
              rows={4}
              className="mc-textarea"
              spellCheck={false}
            />
            {!isTextToMorse && (
              <p className="text-[11px]" style={{ color: "rgba(147,197,253,0.6)" }}>
                Tip: · - · (space) · - · use spaces between symbols, "/" between words
              </p>
            )}
          </div>

          {/* Swap + Output */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="mc-label">
                {isTextToMorse ? "Morse code" : "Decoded text"}
              </label>
              <button
                onClick={handleSwap}
                title="Swap direction"
                className="px-2 py-1 rounded-lg text-xs transition-all hover:bg-white/10"
                style={{ color: "#93c5fd", border: "1px solid rgba(147,197,253,0.2)" }}
              >
                ⇆ Swap
              </button>
            </div>
            <div
              className="mc-output"
              style={{ minHeight: "6rem", fontFamily: isTextToMorse ? "'Courier New', monospace" : "inherit" }}
            >
              {output || <span style={{ color: "rgba(147,197,253,0.3)" }}>Output will appear here…</span>}
            </div>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button onClick={handleCopy} className="mc-action-btn">
            {copied ? "✓ Copied!" : "📋 Copy"}
          </button>
          <button onClick={handleDownload} className="mc-action-btn">
            💾 Download
          </button>
          <button onClick={handleShare} className="mc-action-btn">
            🔗 Share
          </button>
          {onPlay && output && isTextToMorse && (
            <button
              onClick={() => onPlay(output)}
              className="mc-action-btn mc-action-btn-accent"
            >
              ▶ Play Audio
            </button>
          )}
        </div>

        {/* Character reference */}
        <AnimatePresence>
          {showReference && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-3 border-t" style={{ borderColor: "rgba(147,197,253,0.1)" }}>
                <p className="mc-label mb-3">International Morse Code Reference</p>
                <div className="flex flex-col gap-3">
                  {CHAR_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(147,197,253,0.5)" }}>{group.label}</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                        {group.chars.map((char) => (
                          <button
                            key={char}
                            onClick={() => isTextToMorse && setInput((v) => v + char)}
                            className="flex flex-col items-center gap-0.5 px-1.5 py-2 rounded-lg transition-all hover:bg-white/10"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(147,197,253,0.12)" }}
                            title={`${char} = ${MORSE_TABLE[char]}`}
                          >
                            <span className="text-sm font-bold text-white">{char}</span>
                            <span className="text-[9px] font-mono" style={{ color: "#93c5fd" }}>
                              {MORSE_TABLE[char] ?? "?"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
