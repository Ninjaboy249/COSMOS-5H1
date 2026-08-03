"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PerspectiveCarousel } from "@/components/ui/perspective-carousel";
import { CELESTIAL_DETAILS } from "@/lib/celestial-data";

export default function PlanetList({ onSelect }: { onSelect: (id: string) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const bodies = useMemo(() => ["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"].map((id) => CELESTIAL_DETAILS[id]), []);
  const active = bodies[activeIndex];

  return (
    <div className="planet-explorer-section">
      <motion.div className="planet-explorer-heading" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .8 }}>
        <div><p>Celestial directory</p><h2>Choose your destination.</h2></div>
        <span>Move through the orbital collection. Select the centered world to reveal its complete scientific profile.</span>
      </motion.div>

      <div className="destination-carousel-shell">
        <PerspectiveCarousel
          items={bodies.map((body) => ({ src: body.image, title: body.name, alt: body.name }))}
          activeIndex={activeIndex}
          onActiveIndexChange={setActiveIndex}
          onItemClick={(index) => onSelect(bodies[index].id)}
          loop
          slideWidth={220}
          rotationStep={48}
          inactiveScale={.78}
          className="destination-carousel"
          viewportClassName="destination-carousel-viewport"
          slideClassName="destination-carousel-slide"
          imageClassName="destination-carousel-image"
          labelClassName="destination-carousel-label"
          controlsClassName="destination-carousel-controls"
        />
        <motion.div key={active.id} className="destination-active-copy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span>{active.symbol} {active.type}</span>
          <h3>{active.name}</h3>
          <p>{active.description}</p>
          <button onClick={() => onSelect(active.id)}>View scientific profile <b>↗</b></button>
        </motion.div>
      </div>
    </div>
  );
}
