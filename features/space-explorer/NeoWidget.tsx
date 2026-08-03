"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchNeoToday, type NeoObject } from "@/lib/nasa-api";

export default function NeoWidget({ accent }: { accent: string }) {
  const [neos, setNeos] = useState<NeoObject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNeoToday().then((n) => { setNeos(n); setLoading(false); });
  }, []);

  return (
    <motion.div className="api-widget" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="api-widget-header">
        <span className="api-widget-badge" style={{ borderColor: `${accent}44`, color: accent }}>
          ☄ Near Earth Objects — Today — NASA NeoWs
        </span>
        <span className="api-widget-credit">{neos.length} objects tracked today</span>
      </div>
      {loading ? (
        <div className="api-widget-skeleton" />
      ) : (
        <div className="neo-table">
          <div className="neo-table-head">
            <span>Name</span>
            <span>Diameter</span>
            <span>Miss Distance</span>
            <span>Speed (km/h)</span>
            <span>Hazardous</span>
          </div>
          {neos.map((n) => (
            <div key={n.id} className="neo-table-row">
              <span className="neo-name">{n.name}</span>
              <span>{n.estimated_diameter_km} km</span>
              <span>{Number(n.miss_distance_km.replace(/,/g,"")).toLocaleString()} km</span>
              <span>{n.relative_velocity_kmh}</span>
              <span>
                <span
                  className="neo-hazard-badge"
                  style={{
                    color: n.is_potentially_hazardous ? "#f87171" : "#34d399",
                    borderColor: n.is_potentially_hazardous ? "#f8717144" : "#34d39944",
                    background: n.is_potentially_hazardous ? "#f8717110" : "#34d39910",
                  }}
                >
                  {n.is_potentially_hazardous ? "⚠ Yes" : "✓ No"}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
