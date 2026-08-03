"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchSpaceWeather, type SpaceWeatherEvent } from "@/lib/nasa-api";

const TYPE_LABELS: Record<string, string> = {
  FLR: "Solar Flare",
  CME: "Coronal Mass Ejection",
  GST: "Geomagnetic Storm",
  SEP: "Solar Energetic Particle",
  MPC: "Magnetopause Crossing",
  RBE: "Radiation Belt Enhancement",
  IPS: "Interplanetary Shock",
};

export default function SpaceWeatherWidget({ accent }: { accent: string }) {
  const [events, setEvents] = useState<SpaceWeatherEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpaceWeather().then((e) => { setEvents(e); setLoading(false); });
  }, []);

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>
          ☀ Space Weather Events — NASA DONKI — Last 7 Days
        </span>
      </div>
      {loading ? (
        <div className="api-widget-skeleton" />
      ) : events.length === 0 ? (
        <p className="api-widget-text opacity-50">No significant space weather events in the last 7 days.</p>
      ) : (
        <div className="space-weather-list">
          {events.map((ev) => (
            <div key={ev.activityID} className="sw-event-row">
              <div className="sw-event-type" style={{ background: `${accent}18`, borderColor: `${accent}44`, color: accent }}>
                {TYPE_LABELS[ev.type] ?? ev.type}
              </div>
              <div className="sw-event-body">
                <div className="sw-event-time">
                  {new Date(ev.startTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <p className="sw-event-note">{ev.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
