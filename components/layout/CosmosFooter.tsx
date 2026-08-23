"use client";

import React from "react";
import { StaggeredGrid } from "@/components/ui/staggered-grid";
import { FaGithub } from "react-icons/fa";

// ── Static code stats ───────────────────────────────────────────────────────
// Lines of code / files written in this project (counted from workspace)
const CODE_STATS = {
  lines: "26,974",
  files: 110,
  languages: ["TypeScript", "TSX", "CSS"],
};

// ── Bento items: GitHub · IBM Bob · Portfolio ───────────────────────────────
const BENTO_ITEMS = [
  {
    id: "github",
    title: "GitHub",
    subtitle: "Source Code",
    description: "View the full open-source repository for COSMOS-5H1.",
    icon: (
      <a
        href="https://github.com/Ninjaboy249/COSMOS-5H1"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        onClick={(e) => e.stopPropagation()}
        title="Open GitHub repository"
      >
        <FaGithub className="w-5 h-5 text-white" />
      </a>
    ),
    image: "/images/space-explorer/SolarSystemSpaceExplorer.png",
  },
  {
    id: "bob",
    title: "IBM BoB",
    subtitle: `${CODE_STATS.lines} lines · ${CODE_STATS.files} files`,
    description: `Built entirely with IBM BoB AI assistant — ${CODE_STATS.lines} lines of ${CODE_STATS.languages.join(", ")} code across ${CODE_STATS.files} files. Every feature, animation, and API integration written with BoB.`,
    icon: (
      <div className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/bob-icon.png" alt="IBM BoB" className="w-7 h-7 object-contain" />
      </div>
    ),
    image: "/images/bob-icon.png",
  },
  {
    id: "portfolio",
    title: "Shivam · Portfolio",
    subtitle: "Build · Learn · Grow",
    description: "Visit Shivam's developer portfolio — projects, skills, and more.",
    icon: (
      <a
        href="https://myportfolio-eight-xi-18.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-purple-400/40 hover:border-purple-300/70 transition-colors"
        onClick={(e) => e.stopPropagation()}
        title="Open Shivam's portfolio"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/portfolio-icon.png" alt="Shivam Portfolio" className="w-9 h-9 object-cover" />
      </a>
    ),
    image: "/images/portfolio-icon.png",
  },
];

// ── Space imagery for the staggered grid background ────────────────────────
const GRID_IMAGES = [
  "/images/space-explorer/SolarSystemSpaceExplorer.png",
  "/images/space-explorer/BlackHole.png",
  "/images/space-explorer/Nebulae.png",
  "/images/space-explorer/Galaxies.png",
  "/images/space-explorer/Stars.png",
  "/images/space-explorer/MarsRover.png",
  "/images/space-explorer/ExoPlanet.png",
  "/images/space-explorer/NASA.png",
  "/images/space-explorer/ISSTracker.png",
  "/images/space-explorer/SpaceCraft.png",
  "/images/space-explorer/SpaceWeather.png",
  "/images/space-explorer/Asteroid.png",
  "/images/space-explorer/Comet.png",
  "/images/space-explorer/DwarfPlanets.png",
  "/images/space-explorer/NearEarthObject.png",
  "/images/space-explorer/Satellite.png",
  "/images/planets/earth.png",
  "/images/planets/mars.png",
  "/images/planets/jupiter.png",
  "/images/planets/saturn.png",
  "/images/planets/neptune.png",
];

export default function CosmosFooter() {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ background: "rgba(2,7,20,0.98)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
    >
      <StaggeredGrid
        images={GRID_IMAGES}
        bentoItems={BENTO_ITEMS}
        centerText="COSMOS-5H1"
        showFooter={true}
        credits={{
          madeBy: {
            text: "Built with IBM BoB",
            href: "https://github.com/Ninjaboy249/COSMOS-5H1",
          },
          moreDemos: {
            text: "View Portfolio →",
            href: "https://myportfolio-eight-xi-18.vercel.app/",
          },
        }}
        className="dark"
      />
    </div>
  );
}
