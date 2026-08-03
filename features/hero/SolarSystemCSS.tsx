"use client";

const ORBITS = [
  { name: "Mercury", image: "mercury.png", size: 22, orbit: 16, duration: 9 },
  { name: "Venus", image: "venus.png", size: 28, orbit: 23, duration: 14 },
  { name: "Earth", image: "earth.png", size: 38, orbit: 31, duration: 20 },
  { name: "Mars", image: "mars.png", size: 30, orbit: 39, duration: 27 },
  { name: "Jupiter", image: "jupiter.png", size: 58, orbit: 50, duration: 38 },
  { name: "Saturn", image: "saturn.png", size: 66, orbit: 62, duration: 49 },
  { name: "Uranus", image: "uranus.png", size: 42, orbit: 74, duration: 61 },
  { name: "Neptune", image: "neptune.png", size: 42, orbit: 86, duration: 75 },
];

export default function SolarSystemCSS({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="cosmos-system">
      <div className="cosmos-aura" />
      <button className="cosmos-sun cosmos-target" onClick={() => onSelect("sun")} aria-label="View Sun details">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/planets/sun.png" alt="" />
      </button>
      {ORBITS.map((planet, index) => (
        <div
          className="cosmos-orbit"
          key={planet.name}
          style={{
            width: `${planet.orbit}%`,
            height: `${planet.orbit}%`,
            animationDuration: `${planet.duration}s`,
            animationDelay: `${-index * 3.4}s`,
          }}
        >
          <button className="cosmos-planet cosmos-target" style={{ width: planet.size, height: planet.size }} onClick={() => onSelect(planet.name.toLowerCase())} aria-label={`View ${planet.name} details`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/planets/${planet.image}`} alt="" />
          </button>
        </div>
      ))}
    </div>
  );
}
