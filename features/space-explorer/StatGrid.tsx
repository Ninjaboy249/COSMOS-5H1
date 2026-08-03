"use client";

import { motion } from "framer-motion";

export interface StatItem {
  label: string;
  value: string;
  unit?: string;
}

export default function StatGrid({ stats, accent }: { stats: StatItem[]; accent: string }) {
  if (!stats.length) return null;
  return (
    <div className="stat-grid">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="stat-card"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.06 }}
        >
          <span className="stat-label">{stat.label}</span>
          <span className="stat-value" style={{ color: accent }}>{stat.value}</span>
          {stat.unit && <span className="stat-unit">{stat.unit}</span>}
        </motion.div>
      ))}
    </div>
  );
}
