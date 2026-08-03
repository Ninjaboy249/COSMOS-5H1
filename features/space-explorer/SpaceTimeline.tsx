"use client";

import { motion } from "framer-motion";

export interface TimelineItem {
  year: string;
  event: string;
  detail: string;
}

export default function SpaceTimeline({ items, accent }: { items: TimelineItem[]; accent: string }) {
  if (!items.length) return null;
  return (
    <div className="space-timeline">
      {items.map((item, i) => (
        <motion.div
          key={item.year + item.event}
          className="space-timeline-item"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.07 }}
        >
          <div className="space-timeline-dot" style={{ background: accent, boxShadow: `0 0 10px ${accent}88` }} />
          <div className="space-timeline-line" style={{ background: `linear-gradient(to bottom, ${accent}44, transparent)` }} />
          <div className="space-timeline-body">
            <span className="space-timeline-year" style={{ color: accent }}>{item.year}</span>
            <h4 className="space-timeline-event">{item.event}</h4>
            <p className="space-timeline-detail">{item.detail}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
