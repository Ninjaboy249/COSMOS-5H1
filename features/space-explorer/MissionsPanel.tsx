"use client";

import { motion } from "framer-motion";

export interface MissionItem {
  name: string;
  agency: string;
  status: string;
  year: string;
  description: string;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#34d399",
  Completed: "#60a5fa",
  Planned: "#f59e0b",
  Failed: "#f87171",
};

export default function MissionsPanel({ missions }: { missions: MissionItem[] }) {
  if (!missions.length) return null;
  return (
    <div className="missions-panel">
      {missions.map((m, i) => (
        <motion.div
          key={m.name}
          className="mission-row"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: i * 0.06 }}
        >
          <div className="mission-year">{m.year}</div>
          <div className="mission-body">
            <div className="mission-header">
              <h4 className="mission-name">{m.name}</h4>
              <span
                className="mission-status"
                style={{
                  color: STATUS_COLORS[m.status] ?? "#94a3b8",
                  borderColor: `${STATUS_COLORS[m.status] ?? "#94a3b8"}44`,
                  background: `${STATUS_COLORS[m.status] ?? "#94a3b8"}10`,
                }}
              >
                {m.status}
              </span>
            </div>
            <p className="mission-agency">{m.agency}</p>
            <p className="mission-desc">{m.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
