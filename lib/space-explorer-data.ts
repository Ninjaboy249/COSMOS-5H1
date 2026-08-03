export interface SpaceCategory {
  slug: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  glow: string;
  status: string;
  statusColor: string;
  image: string;
  tags: string[];
}

export interface SpaceDetailData {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  heroImage: string;
  accent: string;
  overview: string;
  stats: { label: string; value: string; unit?: string }[];
  facts: string[];
  timeline: { year: string; event: string; detail: string }[];
  missions: { name: string; agency: string; status: string; year: string; description: string }[];
  gallery: { src: string; caption: string }[];
  relatedSlugs: string[];
  aiPrompts: string[];
  apiSource?: string;
}

export const SPACE_CATEGORIES: SpaceCategory[] = [
  {
    slug: "solar-system",
    icon: "🪐",
    title: "Solar System",
    subtitle: "Our Cosmic Home",
    description: "Eight planets, hundreds of moons, millions of asteroids orbiting our star.",
    accent: "#f59e0b",
    glow: "rgba(245,158,11,0.35)",
    status: "8 Planets",
    statusColor: "#f59e0b",
    image: "/images/planets/saturn.png",
    tags: ["Planets", "Moons", "Orbits"],
  },
  {
    slug: "dwarf-planets",
    icon: "🌠",
    title: "Dwarf Planets",
    subtitle: "Beyond Neptune",
    description: "Pluto, Eris, Makemake and the fascinating worlds of the outer solar system.",
    accent: "#a78bfa",
    glow: "rgba(167,139,250,0.35)",
    status: "5 Classified",
    statusColor: "#a78bfa",
    image: "/images/planets/pluto.png",
    tags: ["Pluto", "Kuiper Belt", "Trans-Neptunian"],
  },
  {
    slug: "asteroids",
    icon: "☄",
    title: "Asteroids",
    subtitle: "Rocky Remnants",
    description: "Rocky leftovers from solar system formation, spanning from dust to hundreds of km wide.",
    accent: "#94a3b8",
    glow: "rgba(148,163,184,0.35)",
    status: "1M+ Known",
    statusColor: "#94a3b8",
    image: "/images/planets/mercury.png",
    tags: ["NEO", "Asteroid Belt", "Impact"],
  },
  {
    slug: "comets",
    icon: "☄",
    title: "Comets",
    subtitle: "Icy Wanderers",
    description: "Icy bodies from the outer solar system that display glowing tails as they approach the Sun.",
    accent: "#67e8f9",
    glow: "rgba(103,232,249,0.35)",
    status: "Active Tracking",
    statusColor: "#67e8f9",
    image: "/images/planets/neptune.png",
    tags: ["Comet", "Halley", "Oort Cloud"],
  },
  {
    slug: "satellites",
    icon: "🛰",
    title: "Satellites",
    subtitle: "Orbital Observers",
    description: "Thousands of artificial satellites monitor Earth, relay communications, and explore space.",
    accent: "#34d399",
    glow: "rgba(52,211,153,0.35)",
    status: "~8,800 Active",
    statusColor: "#34d399",
    image: "/images/planets/earth.png",
    tags: ["LEO", "GPS", "Communication"],
  },
  {
    slug: "spacecraft",
    icon: "🚀",
    title: "Spacecraft",
    subtitle: "Humanity's Reach",
    description: "Voyager, Hubble, JWST — the machines that extended our senses across the cosmos.",
    accent: "#60a5fa",
    glow: "rgba(96,165,250,0.35)",
    status: "Active Missions",
    statusColor: "#60a5fa",
    image: "/images/planets/earth.png",
    tags: ["Voyager", "JWST", "Probes"],
  },
  {
    slug: "earth-observation",
    icon: "🌍",
    title: "Earth Observation",
    subtitle: "Our Living Planet",
    description: "Satellite imagery, climate monitoring, and real-time data of our changing world.",
    accent: "#22c55e",
    glow: "rgba(34,197,94,0.35)",
    status: "Live Data",
    statusColor: "#22c55e",
    image: "/images/planets/earth.png",
    tags: ["Climate", "Landsat", "EPIC"],
  },
  {
    slug: "space-weather",
    icon: "☀",
    title: "Space Weather",
    subtitle: "Solar Dynamics",
    description: "Solar flares, coronal mass ejections, and geomagnetic storms from our active Sun.",
    accent: "#fb923c",
    glow: "rgba(251,146,60,0.35)",
    status: "Real-time",
    statusColor: "#fb923c",
    image: "/images/planets/sun.png",
    tags: ["Solar Flares", "CME", "Aurora"],
  },
  {
    slug: "exoplanets",
    icon: "🌠",
    title: "Exoplanets",
    subtitle: "Worlds Beyond",
    description: "Over 5,700 confirmed worlds orbiting other stars — some potentially habitable.",
    accent: "#e879f9",
    glow: "rgba(232,121,249,0.35)",
    status: "5,700+ Confirmed",
    statusColor: "#e879f9",
    image: "/images/planets/neptune.png",
    tags: ["Kepler", "TESS", "Habitable Zone"],
  },
  {
    slug: "stars",
    icon: "⭐",
    title: "Stars",
    subtitle: "Cosmic Furnaces",
    description: "From red dwarfs to blue supergiants — the nuclear furnaces powering the universe.",
    accent: "#fde68a",
    glow: "rgba(253,230,138,0.35)",
    status: "200B+ in Milky Way",
    statusColor: "#fde68a",
    image: "/images/planets/sun.png",
    tags: ["Main Sequence", "Supernovae", "Neutron Stars"],
  },
  {
    slug: "galaxies",
    icon: "🌌",
    title: "Galaxies",
    subtitle: "Island Universes",
    description: "Trillions of galaxies populate the observable universe, each containing billions of stars.",
    accent: "#818cf8",
    glow: "rgba(129,140,248,0.35)",
    status: "2T+ Estimated",
    statusColor: "#818cf8",
    image: "/images/planets/neptune.png",
    tags: ["Milky Way", "Andromeda", "Clusters"],
  },
  {
    slug: "nebulae",
    icon: "🌌",
    title: "Nebulae",
    subtitle: "Stellar Nurseries",
    description: "Vast clouds of gas and dust — the birthplace and graveyard of stars.",
    accent: "#f472b6",
    glow: "rgba(244,114,182,0.35)",
    status: "Thousands Mapped",
    statusColor: "#f472b6",
    image: "/images/planets/uranus.png",
    tags: ["Orion", "Pillars of Creation", "Planetary"],
  },
  {
    slug: "black-holes",
    icon: "⚫",
    title: "Black Holes",
    subtitle: "Gravity's Extreme",
    description: "Regions of spacetime where gravity is so intense that nothing — not even light — escapes.",
    accent: "#6366f1",
    glow: "rgba(99,102,241,0.35)",
    status: "M87* Imaged 2019",
    statusColor: "#6366f1",
    image: "/images/planets/neptune.png",
    tags: ["Singularity", "Event Horizon", "Hawking"],
  },
  {
    slug: "astronomy-research",
    icon: "🧬",
    title: "Astronomy Research",
    subtitle: "Frontier Science",
    description: "Dark matter, gravitational waves, and the cosmic microwave background — the universe's deepest mysteries.",
    accent: "#2dd4bf",
    glow: "rgba(45,212,191,0.35)",
    status: "Active Research",
    statusColor: "#2dd4bf",
    image: "/images/planets/uranus.png",
    tags: ["Dark Matter", "LIGO", "CMB"],
  },
  {
    slug: "nasa-missions",
    icon: "🚀",
    title: "NASA Missions",
    subtitle: "Exploration Legacy",
    description: "Apollo to Artemis — decades of missions defining humanity's presence in space.",
    accent: "#3b82f6",
    glow: "rgba(59,130,246,0.35)",
    status: "Active Programs",
    statusColor: "#3b82f6",
    image: "/images/planets/earth.png",
    tags: ["Apollo", "Artemis", "Mars 2020"],
  },
  {
    slug: "iss-tracker",
    icon: "🛰",
    title: "ISS Tracker",
    subtitle: "Live Position",
    description: "Track the International Space Station live as it orbits Earth every 90 minutes.",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,0.35)",
    status: "Orbiting Now",
    statusColor: "#38bdf8",
    image: "/images/planets/earth.png",
    tags: ["Live", "ISS", "Orbit"],
  },
  {
    slug: "earth-live",
    icon: "🌎",
    title: "Earth Live",
    subtitle: "Blue Marble",
    description: "Real-time NASA EPIC imagery of Earth's full disc from the DSCOVR satellite.",
    accent: "#4ade80",
    glow: "rgba(74,222,128,0.35)",
    status: "NASA EPIC",
    statusColor: "#4ade80",
    image: "/images/planets/earth.png",
    tags: ["EPIC", "DSCOVR", "Real-time"],
  },
  {
    slug: "apod",
    icon: "📸",
    title: "Astronomy Picture of the Day",
    subtitle: "NASA APOD",
    description: "Each day a different image or photograph of our universe, explained by astronomers.",
    accent: "#c084fc",
    glow: "rgba(192,132,252,0.35)",
    status: "Daily Updated",
    statusColor: "#c084fc",
    image: "/images/planets/jupiter.png",
    tags: ["APOD", "Photography", "NASA"],
  },
  {
    slug: "mars-rover",
    icon: "🎥",
    title: "Mars Rover Gallery",
    subtitle: "Perseverance & Curiosity",
    description: "Latest photos beamed back from NASA's rovers exploring the Martian surface.",
    accent: "#f87171",
    glow: "rgba(248,113,113,0.35)",
    status: "Live Photos",
    statusColor: "#f87171",
    image: "/images/planets/mars.png",
    tags: ["Perseverance", "Curiosity", "Jezero"],
  },
  {
    slug: "neo",
    icon: "☄",
    title: "Near Earth Objects",
    subtitle: "Planetary Defense",
    description: "Asteroids and comets whose orbits bring them close to Earth — tracked daily by NASA.",
    accent: "#fb7185",
    glow: "rgba(251,113,133,0.35)",
    status: "Live NeoWs",
    statusColor: "#fb7185",
    image: "/images/planets/mercury.png",
    tags: ["NEO", "Hazardous", "DART"],
  },
];

export const SPACE_DETAIL: Record<string, SpaceDetailData> = {
  "solar-system": {
    slug: "solar-system",
    title: "Solar System",
    subtitle: "Our Cosmic Home",
    icon: "🪐",
    heroImage: "/images/planets/saturn.png",
    accent: "#f59e0b",
    overview:
      "Our Solar System formed approximately 4.6 billion years ago from a giant molecular cloud. The Sun contains 99.86% of all mass, while eight planets, 290+ moons, millions of asteroids, and billions of comets orbit within its gravitational influence. From the scorched rocky worlds of the inner system to the icy giants beyond the asteroid belt, each body tells a unique story of planetary formation.",
    stats: [
      { label: "Age", value: "4.6 Billion", unit: "Years" },
      { label: "Planets", value: "8" },
      { label: "Known Moons", value: "290+" },
      { label: "Diameter", value: "287.46 Billion", unit: "km" },
      { label: "Distance to Edge", value: "2 Light Years" },
      { label: "Speed Through Galaxy", value: "828,000", unit: "km/h" },
    ],
    facts: [
      "The Sun contains 99.86% of all the mass in the Solar System",
      "Jupiter is more than twice as massive as all other planets combined",
      "A day on Venus is longer than a year on Venus",
      "Saturn's rings are only about 10 meters thick on average",
      "Neptune's winds are the fastest in the solar system at 2,100 km/h",
      "There are more moons than planets — 290+ confirmed",
    ],
    timeline: [
      { year: "4.6 Byr ago", event: "Solar System Formation", detail: "Molecular cloud collapses to form the Sun and protoplanetary disk" },
      { year: "4.5 Byr ago", event: "Planet Formation", detail: "Rocky planets form through accretion in the inner system" },
      { year: "3.9 Byr ago", event: "Late Heavy Bombardment", detail: "Period of intense asteroid impacts on inner planets" },
      { year: "1610", event: "Galileo's Moons", detail: "Galileo discovers Jupiter's four largest moons" },
      { year: "1846", event: "Neptune Discovered", detail: "Neptune found through mathematical prediction" },
      { year: "2006", event: "Pluto Reclassified", detail: "IAU reclassifies Pluto as a dwarf planet" },
    ],
    missions: [
      { name: "Voyager 1", agency: "NASA", status: "Active", year: "1977", description: "Now in interstellar space, still transmitting data" },
      { name: "New Horizons", agency: "NASA", status: "Active", year: "2006", description: "Explored Pluto and Arrokoth in the Kuiper Belt" },
      { name: "Cassini-Huygens", agency: "NASA/ESA", status: "Completed", year: "1997", description: "13 years orbiting Saturn, revolutionizing our understanding" },
      { name: "Juno", agency: "NASA", status: "Active", year: "2011", description: "Currently orbiting Jupiter, studying its atmosphere and interior" },
    ],
    gallery: [
      { src: "/images/planets/saturn.png", caption: "Saturn with its majestic ring system" },
      { src: "/images/planets/jupiter.png", caption: "Jupiter's banded atmosphere" },
      { src: "/images/planets/mars.png", caption: "Mars, the Red Planet" },
      { src: "/images/planets/earth.png", caption: "Earth, our pale blue dot" },
    ],
    relatedSlugs: ["dwarf-planets", "asteroids", "comets", "nasa-missions"],
    aiPrompts: [
      "How did the Solar System form?",
      "What is the most massive planet?",
      "Could life exist elsewhere in our solar system?",
      "What lies beyond Neptune?",
    ],
    apiSource: "NASA Solar System Exploration",
  },
  "earth": {
    slug: "earth",
    title: "Earth",
    subtitle: "The Blue Marble",
    icon: "🌍",
    heroImage: "/images/planets/earth.png",
    accent: "#55aaff",
    overview: "Earth is the third planet from the Sun and the only known astronomical object to harbour life. With liquid water covering 71% of its surface, a protective magnetic field, and a nitrogen-oxygen atmosphere, Earth is uniquely suited for life. Our planet is tectonically active, with continuously moving plates that shape continents and drive volcanism.",
    stats: [
      { label: "Diameter", value: "12,742", unit: "km" },
      { label: "Mass", value: "5.972 × 10²⁴", unit: "kg" },
      { label: "Gravity", value: "9.81", unit: "m/s²" },
      { label: "Distance from Sun", value: "149.6 Million", unit: "km" },
      { label: "Day Length", value: "23h 56m" },
      { label: "Moons", value: "1" },
      { label: "Water Coverage", value: "71", unit: "%" },
      { label: "Atmosphere", value: "78% N₂, 21% O₂" },
    ],
    facts: [
      "Earth is the densest planet in the Solar System",
      "The Moon is slowly drifting away from Earth at 3.8 cm per year",
      "Earth's inner core is as hot as the surface of the Sun (~5,700°C)",
      "Only planet where plate tectonics have been confirmed",
      "The Amazon rainforest produces 20% of the world's oxygen",
      "Earth's magnetic field protects us from harmful solar radiation",
    ],
    timeline: [
      { year: "4.54 Byr ago", event: "Earth Forms", detail: "Accretion from the protoplanetary disk" },
      { year: "4.5 Byr ago", event: "Moon Formation", detail: "Giant impact creates the Moon" },
      { year: "3.8 Byr ago", event: "First Life", detail: "Earliest microbial life appears in oceans" },
      { year: "541 Myr ago", event: "Cambrian Explosion", detail: "Rapid diversification of multicellular life" },
      { year: "1957", event: "Space Age Begins", detail: "Sputnik 1 becomes first artificial satellite" },
      { year: "1972", event: "Blue Marble Photo", detail: "Apollo 17 captures iconic Earth photograph" },
    ],
    missions: [
      { name: "ISS", agency: "NASA/Roscosmos/ESA/JAXA/CSA", status: "Active", year: "1998", description: "Continuously crewed orbital laboratory since 2000" },
      { name: "Landsat 9", agency: "NASA/USGS", status: "Active", year: "2021", description: "Earth observation for land-use change detection" },
      { name: "Sentinel-6", agency: "ESA/NASA", status: "Active", year: "2020", description: "Sea level monitoring with millimetre precision" },
      { name: "DSCOVR", agency: "NOAA/NASA", status: "Active", year: "2015", description: "Full-disc Earth imagery and space weather monitoring" },
    ],
    gallery: [
      { src: "/images/planets/earth.png", caption: "Earth from space" },
    ],
    relatedSlugs: ["earth-observation", "satellites", "iss-tracker", "earth-live"],
    aiPrompts: [
      "Why is Earth the only known planet with life?",
      "How does Earth's magnetic field work?",
      "What would happen if Earth stopped rotating?",
      "How are humans changing Earth's climate?",
    ],
    apiSource: "NASA EPIC API",
  },
  "mars": {
    slug: "mars",
    title: "Mars",
    subtitle: "The Red Planet",
    icon: "🔴",
    heroImage: "/images/planets/mars.png",
    accent: "#e05020",
    overview: "Mars is the fourth planet from the Sun and the second-smallest in the Solar System. Its reddish appearance comes from iron oxide (rust) on its surface. Mars hosts the tallest volcano in the solar system — Olympus Mons at 21 km — and the longest canyon — Valles Marineris at 4,000 km. Evidence of ancient river valleys and lake beds suggests Mars once had liquid water.",
    stats: [
      { label: "Diameter", value: "6,779", unit: "km" },
      { label: "Gravity", value: "3.71", unit: "m/s²" },
      { label: "Distance from Sun", value: "227.9 Million", unit: "km" },
      { label: "Day Length", value: "24h 37m" },
      { label: "Year Length", value: "687", unit: "Earth Days" },
      { label: "Moons", value: "2 (Phobos & Deimos)" },
      { label: "Temp", value: "-63°C", unit: "Average" },
      { label: "Atmosphere", value: "95% CO₂" },
    ],
    facts: [
      "Olympus Mons is 3× the height of Mount Everest",
      "Valles Marineris is as long as the continental US",
      "Mars has the largest dust storms in the solar system",
      "A Martian day (sol) is 24 hours and 37 minutes",
      "Mars has two small moons, Phobos and Deimos",
      "Perseverance rover has produced oxygen from Martian CO₂",
    ],
    timeline: [
      { year: "1877", event: "Moons Discovered", detail: "Asaph Hall discovers Phobos and Deimos" },
      { year: "1965", event: "Mariner 4", detail: "First close-up images of Mars from NASA flyby" },
      { year: "1976", event: "Viking Landers", detail: "First successful Mars surface missions" },
      { year: "1997", event: "Mars Pathfinder", detail: "Sojourner rover operates on Mars surface" },
      { year: "2004", event: "Spirit & Opportunity", detail: "Twin rovers land, Opportunity lasts 15 years" },
      { year: "2021", event: "Perseverance Lands", detail: "Most sophisticated rover lands in Jezero Crater" },
    ],
    missions: [
      { name: "Perseverance", agency: "NASA", status: "Active", year: "2021", description: "Collecting rock samples for future return to Earth" },
      { name: "Curiosity", agency: "NASA", status: "Active", year: "2012", description: "Exploring Gale Crater for signs of ancient habitability" },
      { name: "Ingenuity", agency: "NASA", status: "Completed", year: "2021", description: "First powered flight on another planet — 72 flights total" },
      { name: "Mars Reconnaissance Orbiter", agency: "NASA", status: "Active", year: "2006", description: "High-resolution imaging from orbit" },
    ],
    gallery: [
      { src: "/images/planets/mars.png", caption: "Mars from orbit" },
    ],
    relatedSlugs: ["mars-rover", "nasa-missions", "spacecraft", "asteroids"],
    aiPrompts: [
      "Can humans live on Mars?",
      "What is Olympus Mons?",
      "What did Perseverance discover?",
      "Why is Mars red?",
    ],
    apiSource: "NASA Mars Rover Photos API",
  },
};

// Fill in remaining slugs with generated data
const REMAINING_SLUGS = [
  "dwarf-planets", "asteroids", "comets", "satellites", "spacecraft",
  "earth-observation", "space-weather", "exoplanets", "stars", "galaxies",
  "nebulae", "black-holes", "astronomy-research", "nasa-missions",
  "iss-tracker", "earth-live", "apod", "mars-rover", "neo",
];

REMAINING_SLUGS.forEach((slug) => {
  if (!SPACE_DETAIL[slug]) {
    const cat = SPACE_CATEGORIES.find((c) => c.slug === slug)!;
    SPACE_DETAIL[slug] = {
      slug,
      title: cat.title,
      subtitle: cat.subtitle,
      icon: cat.icon,
      heroImage: cat.image,
      accent: cat.accent,
      overview: cat.description,
      stats: [],
      facts: [],
      timeline: [],
      missions: [],
      gallery: [{ src: cat.image, caption: cat.title }],
      relatedSlugs: [],
      aiPrompts: [`Tell me about ${cat.title}`, `What is interesting about ${cat.title}?`],
    };
  }
});

// Inject rich data for key slugs
Object.assign(SPACE_DETAIL["spacecraft"], {
  overview: "From the first artificial satellite Sputnik 1 to the distant Voyager probes sailing in interstellar space, spacecraft have become humanity's eyes and hands across the cosmos. Modern spacecraft like the James Webb Space Telescope peer back to the first light after the Big Bang.",
  stats: [
    { label: "Voyager 1 Distance", value: "23.5 Billion", unit: "km" },
    { label: "JWST Mirror", value: "6.5", unit: "m diameter" },
    { label: "Hubble Observations", value: "1.5 Million+" },
    { label: "Active Missions", value: "60+", unit: "NASA" },
  ],
  facts: [
    "Voyager 1 is the most distant human-made object ever",
    "The ISS is as large as an American football field",
    "James Webb can see galaxies 13.6 billion light-years away",
    "The Parker Solar Probe is the fastest human-made object at 635,000 km/h",
    "Cassini collected data for 13 years around Saturn",
    "New Horizons gave us our first clear look at Pluto in 2015",
  ],
  timeline: [
    { year: "1957", event: "Sputnik 1", detail: "First artificial satellite, USSR" },
    { year: "1969", event: "Apollo 11", detail: "First crewed lunar landing" },
    { year: "1977", event: "Voyager Launch", detail: "Both Voyagers launch on grand tour" },
    { year: "1990", event: "Hubble Launch", detail: "Space Telescope transforms astronomy" },
    { year: "2021", event: "James Webb Launch", detail: "Next-generation space telescope deployed" },
    { year: "2024", event: "Europa Clipper", detail: "Mission to Jupiter's moon Europa" },
  ],
  missions: [
    { name: "James Webb Space Telescope", agency: "NASA/ESA/CSA", status: "Active", year: "2021", description: "Infrared telescope at L2, observing early universe" },
    { name: "Hubble Space Telescope", agency: "NASA/ESA", status: "Active", year: "1990", description: "34+ years of transformative astronomical observations" },
    { name: "Voyager 1", agency: "NASA", status: "Active", year: "1977", description: "In interstellar space, 23+ billion km from Earth" },
    { name: "Parker Solar Probe", agency: "NASA", status: "Active", year: "2018", description: "Closest spacecraft ever to the Sun" },
    { name: "Cassini", agency: "NASA/ESA", status: "Completed", year: "1997", description: "Studied Saturn system for 13 years" },
    { name: "New Horizons", agency: "NASA", status: "Active", year: "2006", description: "Explored Pluto and Kuiper Belt" },
  ],
  aiPrompts: [
    "How far away is Voyager 1?",
    "What can James Webb see that Hubble can't?",
    "Which spacecraft has travelled farthest?",
    "What will the Europa Clipper find?",
  ],
});

Object.assign(SPACE_DETAIL["apod"], {
  overview: "NASA's Astronomy Picture of the Day (APOD) has been publishing a new astronomical image every single day since June 16, 1995. Each image is accompanied by a brief explanation written by a professional astronomer. APOD is one of NASA's most popular websites, visited by millions worldwide.",
  stats: [
    { label: "Archive Start", value: "June 16, 1995" },
    { label: "Images Published", value: "10,000+" },
    { label: "Daily Visitors", value: "1 Million+" },
    { label: "Languages", value: "21" },
  ],
  facts: [
    "APOD has been published every day since 1995 without interruption",
    "It is one of NASA's most-accessed websites",
    "Images are selected from telescopes, spacecraft, and citizen astronomers",
    "Each image is explained by professional astronomers",
    "The archive contains over 10,000 unique images",
  ],
  aiPrompts: [
    "What is today's APOD image?",
    "How does NASA select APOD images?",
    "What has been the most popular APOD?",
    "Can I submit a photo to APOD?",
  ],
});

Object.assign(SPACE_DETAIL["black-holes"], {
  overview: "Black holes are regions of spacetime where gravity is so intense that nothing — not even electromagnetic radiation — can escape once past the event horizon. They form when massive stars collapse at the end of their lives, or through other extreme processes. In 2019, the Event Horizon Telescope produced the first image of a black hole's shadow: M87*, a supermassive black hole 6.5 billion times the mass of our Sun.",
  stats: [
    { label: "M87* Mass", value: "6.5 Billion", unit: "× Sun" },
    { label: "Sagittarius A* Mass", value: "4 Million", unit: "× Sun" },
    { label: "Event Horizon Image", value: "April 10, 2019" },
    { label: "Closest BH to Earth", value: "~1,500", unit: "light-years" },
  ],
  facts: [
    "Sagittarius A* is the supermassive black hole at the Milky Way's center",
    "Black holes don't suck — they only affect things that come too close",
    "Time passes slower near a black hole (gravitational time dilation)",
    "The first black hole ever photographed is M87* in 2019",
    "Stephen Hawking proposed that black holes slowly evaporate via Hawking radiation",
    "Supermassive black holes exist at the center of nearly all large galaxies",
  ],
  timeline: [
    { year: "1916", event: "Schwarzschild Solution", detail: "Karl Schwarzschild derives first black hole solution" },
    { year: "1967", event: "Term 'Black Hole' Coined", detail: "John Wheeler popularizes the term" },
    { year: "1974", event: "Hawking Radiation", detail: "Hawking predicts black holes slowly evaporate" },
    { year: "2015", event: "Gravitational Waves", detail: "LIGO detects waves from black hole merger" },
    { year: "2019", event: "First Image", detail: "EHT photographs M87* event horizon shadow" },
    { year: "2022", event: "Milky Way BH Imaged", detail: "EHT images Sagittarius A* for the first time" },
  ],
  aiPrompts: [
    "What happens if you fall into a black hole?",
    "How are black holes detected?",
    "What is Hawking radiation?",
    "Is there a black hole in the Milky Way?",
  ],
});

export function getCategoryBySlug(slug: string): SpaceCategory | undefined {
  return SPACE_CATEGORIES.find((c) => c.slug === slug);
}

export function getDetailBySlug(slug: string): SpaceDetailData | undefined {
  return SPACE_DETAIL[slug];
}
