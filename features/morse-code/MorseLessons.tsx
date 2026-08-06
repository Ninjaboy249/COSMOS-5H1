"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MorseLessons — 6 progressive interactive lessons
// History, Standard, SOS, Space Communication, Emergency, Amateur Radio
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MORSE_LESSONS, textToMorse, type MorseLesson } from "@/lib/morse-code";

interface LessonCardProps {
  lesson: MorseLesson;
  isUnlocked: boolean;
  isCompleted: boolean;
  onOpen: () => void;
}

function LessonCard({ lesson, isUnlocked, isCompleted, onOpen }: LessonCardProps) {
  return (
    <motion.button
      onClick={isUnlocked ? onOpen : undefined}
      whileHover={isUnlocked ? { scale: 1.02 } : {}}
      whileTap={isUnlocked ? { scale: 0.98 } : {}}
      className="text-left rounded-2xl p-4 transition-all duration-200 relative overflow-hidden w-full"
      style={{
        background: isUnlocked
          ? "linear-gradient(135deg, rgba(10,22,51,0.7), rgba(2,7,20,0.6))"
          : "rgba(5,10,25,0.5)",
        border: isUnlocked
          ? `1px solid ${lesson.color}44`
          : "1px solid rgba(255,255,255,0.06)",
        opacity: isUnlocked ? 1 : 0.45,
        cursor: isUnlocked ? "pointer" : "not-allowed",
        backdropFilter: "blur(12px)",
      }}
    >
      {isCompleted && (
        <span
          className="absolute top-2.5 right-2.5 text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(52,211,153,0.18)", color: "#34d399", border: "1px solid rgba(52,211,153,0.3)" }}
        >
          ✓ Done
        </span>
      )}
      {!isUnlocked && (
        <span className="absolute top-2.5 right-2.5 text-sm">🔒</span>
      )}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{lesson.icon}</span>
        <div>
          <h3 className="text-sm font-bold mb-0.5" style={{ color: isUnlocked ? "#fff" : "rgba(255,255,255,0.4)" }}>
            {lesson.title}
          </h3>
          <p className="text-xs leading-relaxed" style={{ color: isUnlocked ? "rgba(191,219,254,0.75)" : "rgba(191,219,254,0.3)" }}>
            {lesson.summary}
          </p>
          {isUnlocked && (
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: lesson.color }}>
              {isCompleted ? "Review" : "Start Lesson"} →
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

interface LessonViewProps {
  lesson: MorseLesson;
  onComplete: () => void;
  onBack: () => void;
  onPlay?: (morse: string) => void;
}

function LessonView({ lesson, onComplete, onBack, onPlay }: LessonViewProps) {
  const [step, setStep] = useState(0);
  const [practiceInput, setPracticeInput] = useState("");
  const [practiceResult, setPracticeResult] = useState<"correct" | "wrong" | null>(null);
  const total = lesson.content.length;
  const isLastContent = step >= total;

  const checkPractice = () => {
    const expected = textToMorse(lesson.practice);
    const correct = practiceInput.trim().replace(/\s+/g, " ") === expected.replace(/\s+/g, " ");
    setPracticeResult(correct ? "correct" : "wrong");
    if (correct) setTimeout(onComplete, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      className="flex flex-col gap-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="mc-chip">← Back</button>
        <span className="text-xl">{lesson.icon}</span>
        <h3 className="text-base font-bold" style={{ color: "#fff" }}>{lesson.title}</h3>
        <div className="ml-auto flex items-center gap-1.5">
          {lesson.content.map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full transition-all duration-300"
              style={{ background: i <= step ? lesson.color : "rgba(255,255,255,0.15)" }}
            />
          ))}
          <div className="w-2 h-2 rounded-full" style={{ background: isLastContent ? lesson.color : "rgba(255,255,255,0.15)" }} />
        </div>
      </div>

      {/* Content card */}
      <AnimatePresence mode="wait">
        {!isLastContent ? (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, rgba(10,22,51,0.7), rgba(2,7,20,0.6))",
              border: `1px solid ${lesson.color}33`,
              backdropFilter: "blur(14px)",
            }}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                style={{ background: `${lesson.color}22`, border: `1px solid ${lesson.color}55`, color: lesson.color }}
              >
                {step + 1}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>
                {lesson.content[step]}
              </p>
            </div>
            <div className="flex gap-3">
              {step > 0 && (
                <button onClick={() => setStep((s) => s - 1)} className="mc-btn-secondary">← Prev</button>
              )}
              <button
                onClick={() => setStep((s) => s + 1)}
                className="mc-btn-primary"
                style={{ marginLeft: "auto" }}
              >
                {step < total - 1 ? "Next →" : "Practice →"}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="practice"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={{
              background: `linear-gradient(135deg, ${lesson.color}18, rgba(2,7,20,0.6))`,
              border: `1px solid ${lesson.color}44`,
              backdropFilter: "blur(14px)",
            }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: lesson.color }}>Practice Time!</p>
            <p className="text-xs mb-3" style={{ color: "rgba(191,219,254,0.7)" }}>
              Translate this to Morse code: <span className="font-bold text-white">&ldquo;{lesson.practice}&rdquo;</span>
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <input
                  className="mc-input flex-1"
                  value={practiceInput}
                  onChange={(e) => { setPracticeInput(e.target.value); setPracticeResult(null); }}
                  placeholder="Enter Morse code…"
                  spellCheck={false}
                />
                {onPlay && (
                  <button onClick={() => onPlay(textToMorse(lesson.practice))} className="mc-btn-secondary text-xs">
                    ▶ Hear it
                  </button>
                )}
              </div>

              <div
                className="rounded-xl px-3 py-2 text-xs font-mono"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(147,197,253,0.5)", border: "1px solid rgba(147,197,253,0.1)" }}
              >
                Answer: <span className="blur-sm hover:blur-none transition-all cursor-pointer">{textToMorse(lesson.practice)}</span>
              </div>

              <AnimatePresence>
                {practiceResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-semibold px-3 py-2 rounded-xl"
                    style={{
                      background: practiceResult === "correct" ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                      color: practiceResult === "correct" ? "#34d399" : "#f87171",
                      border: `1px solid ${practiceResult === "correct" ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                  >
                    {practiceResult === "correct" ? "✓ Correct! Lesson complete!" : `✗ Not quite. Expected: ${textToMorse(lesson.practice)}`}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3">
                <button onClick={() => setStep((s) => s - 1)} className="mc-btn-secondary">← Review</button>
                <button onClick={checkPractice} className="mc-btn-primary">Check Answer</button>
                <button onClick={onComplete} className="mc-btn-secondary" style={{ marginLeft: "auto" }}>Skip →</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MorseLessons({ onPlay }: { onPlay?: (morse: string) => void }) {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);

  const isUnlocked = (lesson: MorseLesson) => {
    if (!lesson.unlockAfter) return true;
    return completed.has(lesson.unlockAfter);
  };

  const handleComplete = (id: string) => {
    setCompleted((prev) => new Set([...prev, id]));
    setActive(null);
  };

  const activeLesson = MORSE_LESSONS.find((l) => l.id === active);

  return (
    <div className="mc-panel">
      <div className="mc-panel-header">
        <span className="text-xl">📚</span>
        <h2 className="mc-panel-title">Interactive Lessons</h2>
        <span className="ml-auto text-xs" style={{ color: "rgba(147,197,253,0.6)" }}>
          {completed.size}/{MORSE_LESSONS.length} complete
        </span>
      </div>

      <div className="p-5">
        <AnimatePresence mode="wait">
          {activeLesson ? (
            <LessonView
              key={activeLesson.id}
              lesson={activeLesson}
              onComplete={() => handleComplete(activeLesson.id)}
              onBack={() => setActive(null)}
              onPlay={onPlay}
            />
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3"
            >
              {MORSE_LESSONS.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  isUnlocked={isUnlocked(lesson)}
                  isCompleted={completed.has(lesson.id)}
                  onOpen={() => setActive(lesson.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
