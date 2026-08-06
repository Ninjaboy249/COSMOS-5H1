"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ChallengeMode — Morse code mini-games
// Decode before time runs out, 4 difficulty levels, score tracking
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CHALLENGES, textToMorse, type Challenge } from "@/lib/morse-code";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "#34d399",
  intermediate: "#93c5fd",
  advanced:     "#a78bfa",
  expert:       "#f87171",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner:     "🟢 Beginner",
  intermediate: "🔵 Intermediate",
  advanced:     "🟣 Advanced",
  expert:       "🔴 Expert",
};

interface ChallengeSession {
  challenge: Challenge;
  wordIndex: number;
  score: number;
  streak: number;
  bestStreak: number;
  totalAttempts: number;
  correct: number;
}

export default function ChallengeMode({ onPlay }: { onPlay?: (morse: string) => void }) {
  const [filter, setFilter] = useState<string>("all");
  const [session, setSession] = useState<ChallengeSession | null>(null);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showMorse, setShowMorse] = useState(true);
  const [highScores, setHighScores] = useState<Record<string, number>>({});
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startChallenge = useCallback((challenge: Challenge) => {
    stopTimer();
    setSession({
      challenge,
      wordIndex: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      totalAttempts: 0,
      correct: 0,
    });
    setUserInput("");
    setFeedback(null);
    setTimeLeft(challenge.timeLimit);
    setGameOver(false);
    setShowMorse(true);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setGameOver(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer]);

  const endChallenge = useCallback(() => {
    stopTimer();
    setSession((s) => {
      if (s) {
        setHighScores((h) => ({ ...h, [s.challenge.id]: Math.max(h[s.challenge.id] ?? 0, s.score) }));
      }
      return s;
    });
    setGameOver(true);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const checkAnswer = useCallback(() => {
    if (!session || gameOver) return;
    const word = session.challenge.words[session.wordIndex % session.challenge.words.length];
    const correct = userInput.trim().toUpperCase() === word.toUpperCase();

    setFeedback(correct ? "correct" : "wrong");

    if (correct) {
      const bonus = Math.ceil(timeLeft / 5);
      setSession((s) => s ? {
        ...s,
        score: s.score + 10 + bonus,
        streak: s.streak + 1,
        bestStreak: Math.max(s.bestStreak, s.streak + 1),
        totalAttempts: s.totalAttempts + 1,
        correct: s.correct + 1,
        wordIndex: s.wordIndex + 1,
      } : null);
      setTimeLeft((t) => Math.min(t + 5, session.challenge.timeLimit)); // +5 sec bonus
    } else {
      setSession((s) => s ? {
        ...s,
        streak: 0,
        totalAttempts: s.totalAttempts + 1,
        wordIndex: s.wordIndex + 1,
      } : null);
    }

    setUserInput("");
    setTimeout(() => {
      setFeedback(null);
      setShowMorse(true);
    }, 800);
  }, [session, gameOver, timeLeft]);

  const currentWord = session
    ? session.challenge.words[session.wordIndex % session.challenge.words.length]
    : null;
  const currentMorse = currentWord ? textToMorse(currentWord) : "";

  const filteredChallenges = filter === "all"
    ? CHALLENGES
    : CHALLENGES.filter((c) => c.difficulty === filter);

  if (session && !gameOver) {
    const pct = (timeLeft / session.challenge.timeLimit) * 100;
    const timerColor = pct > 50 ? "#34d399" : pct > 25 ? "#fbbf24" : "#f87171";

    return (
      <div className="mc-panel">
        <div className="mc-panel-header">
          <span className="text-xl">⚔️</span>
          <h2 className="mc-panel-title">{session.challenge.title}</h2>
          <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: `${DIFFICULTY_COLORS[session.challenge.difficulty]}18`, color: DIFFICULTY_COLORS[session.challenge.difficulty], border: `1px solid ${DIFFICULTY_COLORS[session.challenge.difficulty]}44` }}>
            {DIFFICULTY_LABELS[session.challenge.difficulty]}
          </span>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Score + timer row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(147,197,253,0.06)", border: "1px solid rgba(147,197,253,0.12)" }}>
              <div className="text-xl font-bold text-white">{session.score}</div>
              <div className="text-[10px]" style={{ color: "rgba(147,197,253,0.6)" }}>Score</div>
            </div>
            <div className="rounded-xl p-3 text-center relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${timerColor}44` }}>
              <motion.div
                className="absolute bottom-0 left-0 h-1 rounded-b-xl"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.3 }}
                style={{ background: timerColor, boxShadow: `0 0 8px ${timerColor}88` }}
              />
              <div className="text-xl font-bold" style={{ color: timerColor, textShadow: `0 0 12px ${timerColor}88` }}>{timeLeft}s</div>
              <div className="text-[10px]" style={{ color: "rgba(147,197,253,0.6)" }}>Time Left</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.12)" }}>
              <div className="text-xl font-bold" style={{ color: "#a78bfa" }}>🔥{session.streak}</div>
              <div className="text-[10px]" style={{ color: "rgba(167,139,250,0.6)" }}>Streak</div>
            </div>
          </div>

          {/* Morse display */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWord}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl px-5 py-6 text-center relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(10,22,51,0.8), rgba(2,7,20,0.7))",
                border: "1px solid rgba(147,197,253,0.2)",
                minHeight: "80px",
              }}
            >
              <p className="mc-label mb-2">Decode this Morse code:</p>
              <p
                className="text-2xl font-mono font-bold"
                style={{ color: "#93c5fd", letterSpacing: "0.12em", textShadow: "0 0 14px rgba(147,197,253,0.5)" }}
              >
                {showMorse ? currentMorse : "???"}
              </p>
              <div className="flex justify-center gap-3 mt-3">
                <button
                  onClick={() => setShowMorse((v) => !v)}
                  className="mc-chip text-[10px]"
                >
                  {showMorse ? "Hide" : "Show"} Morse
                </button>
                {onPlay && (
                  <button
                    onClick={() => onPlay(currentMorse)}
                    className="mc-chip text-[10px]"
                  >
                    ▶ Hear it
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Answer input */}
          <div className="flex gap-2">
            <input
              className="mc-input flex-1 text-base uppercase font-bold tracking-widest"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === "Enter") checkAnswer(); }}
              placeholder="Type the decoded word…"
              autoFocus
            />
            <button onClick={checkAnswer} className="mc-btn-primary px-5">
              Submit
            </button>
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center text-lg font-bold py-2 rounded-xl"
                style={{
                  background: feedback === "correct" ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                  color: feedback === "correct" ? "#34d399" : "#f87171",
                  border: `1px solid ${feedback === "correct" ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}
              >
                {feedback === "correct" ? "✓ Correct! +10" : `✗ Answer: ${currentWord}`}
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={endChallenge} className="mc-btn-secondary text-xs mx-auto">
            End Challenge
          </button>
        </div>
      </div>
    );
  }

  if (gameOver && session) {
    const accuracy = session.totalAttempts > 0
      ? Math.round((session.correct / session.totalAttempts) * 100)
      : 0;
    const isHighScore = session.score >= (highScores[session.challenge.id] ?? 0);

    return (
      <div className="mc-panel">
        <div className="mc-panel-header">
          <span className="text-xl">🏆</span>
          <h2 className="mc-panel-title">Challenge Complete!</h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {isHighScore && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-2 rounded-xl text-sm font-bold"
              style={{ background: "rgba(251,191,36,0.12)", color: "#fde68a", border: "1px solid rgba(251,191,36,0.3)" }}
            >
              🌟 New High Score!
            </motion.div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Score", value: session.score, color: "#93c5fd" },
              { label: "Accuracy", value: `${accuracy}%`, color: "#34d399" },
              { label: "Best Streak", value: `🔥${session.bestStreak}`, color: "#a78bfa" },
              { label: "Decoded", value: `${session.correct}/${session.totalAttempts}`, color: "#fbbf24" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl p-4 text-center"
                style={{ background: `${stat.color}0e`, border: `1px solid ${stat.color}33` }}
              >
                <div className="text-2xl font-bold" style={{ color: stat.color, textShadow: `0 0 12px ${stat.color}66` }}>{stat.value}</div>
                <div className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => startChallenge(session.challenge)} className="mc-btn-primary">↺ Retry</button>
            <button onClick={() => { setSession(null); setGameOver(false); }} className="mc-btn-secondary">← All Challenges</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mc-panel">
      <div className="mc-panel-header">
        <span className="text-xl">⚔️</span>
        <h2 className="mc-panel-title">Challenge Mode</h2>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["all", "beginner", "intermediate", "advanced", "expert"].map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all duration-200"
              style={{
                background: filter === d ? `${DIFFICULTY_COLORS[d] ?? "#93c5fd"}18` : "rgba(255,255,255,0.05)",
                border: filter === d ? `1px solid ${DIFFICULTY_COLORS[d] ?? "#93c5fd"}55` : "1px solid rgba(255,255,255,0.1)",
                color: filter === d ? (DIFFICULTY_COLORS[d] ?? "#93c5fd") : "rgba(255,255,255,0.5)",
              }}
            >
              {d === "all" ? "All" : DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>

        {/* Challenge cards */}
        <div className="flex flex-col gap-3">
          {filteredChallenges.map((challenge) => {
            const color = DIFFICULTY_COLORS[challenge.difficulty];
            const hs = highScores[challenge.id];
            return (
              <motion.button
                key={challenge.id}
                onClick={() => startChallenge(challenge)}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="text-left rounded-2xl p-4 transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, rgba(10,22,51,0.7), rgba(2,7,20,0.6))",
                  border: `1px solid ${color}33`,
                  backdropFilter: "blur(12px)",
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-sm font-bold text-white">{challenge.title}</span>
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, color, border: `1px solid ${color}44` }}>
                      {DIFFICULTY_LABELS[challenge.difficulty]}
                    </span>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: "rgba(147,197,253,0.5)" }}>⏱ {challenge.timeLimit}s</span>
                </div>
                <p className="text-xs mb-2" style={{ color: "rgba(191,219,254,0.65)" }}>{challenge.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {challenge.words.slice(0, 3).map((w) => (
                      <span key={w} className="text-[10px] px-1.5 py-0.5 rounded-md font-mono" style={{ background: "rgba(147,197,253,0.08)", color: "#93c5fd", border: "1px solid rgba(147,197,253,0.15)" }}>{w}</span>
                    ))}
                    {challenge.words.length > 3 && <span className="text-[10px]" style={{ color: "rgba(147,197,253,0.4)" }}>+{challenge.words.length - 3}</span>}
                  </div>
                  {hs !== undefined && (
                    <span className="text-[10px]" style={{ color: "#fde68a" }}>🏆 Best: {hs}</span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
