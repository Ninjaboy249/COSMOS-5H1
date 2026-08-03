"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CelestialBodyDetails } from "@/lib/celestial-data";

export default function CelestialDetails({ body, onClose }: { body: CelestialBodyDetails | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {body && (
        <motion.div className="celestial-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.article
            className="celestial-panel"
            initial={{ opacity: 0, y: 35, scale: .97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 25, scale: .98 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            onClick={(event) => event.stopPropagation()}
          >
            <button className="celestial-close" onClick={onClose} aria-label="Close details">×</button>
            <header className="celestial-header">
              <div className="celestial-image" style={{ filter: `drop-shadow(0 0 28px ${body.accent}88)` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}<img src={body.image} alt={body.name} />
              </div>
              <div><span>{body.symbol} {body.type}</span><h2>{body.name}</h2><p>{body.description}</p></div>
            </header>
            <div className="celestial-stats">
              {Object.entries(body.stats).map(([label, value]) => <div key={label}><span>{label}</span><strong>{typeof value === "boolean" ? (value ? "Yes" : "No") : value}</strong></div>)}
            </div>
            {body.lists && <div className="celestial-lists">{Object.entries(body.lists).map(([label, values]) => <section key={label}><h3>{label}</h3><div>{values.map((value) => <span key={value}>{value}</span>)}</div></section>)}</div>}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
