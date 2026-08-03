export interface CelestialBodyDetails {
  id: string;
  name: string;
  symbol: string;
  type: string;
  description: string;
  image: string;
  accent: string;
  stats: Record<string, string | number | boolean>;
  lists?: Record<string, string[]>;
}

export const CELESTIAL_DETAILS: Record<string, CelestialBodyDetails> = {
  sun: {
    id: "sun", name: "Sun", symbol: "🌞", type: "Star", image: "/images/planets/sun.png", accent: "#ffad42",
    description: "The Sun is a G-type main-sequence star and the gravitational center of the Solar System.",
    stats: { Order: 0, Galaxy: "Milky Way", System: "Solar System", Diameter: "1,392,700 km", Radius: "696,340 km", Mass: "1.989 × 10^30 kg", Gravity: "274 m/s²", "Surface temperature": "5,500 °C", "Core temperature": "15,000,000 °C", Age: "4.6 Billion Years", "Distance from Earth": "149.6 Million km", "Rotation period": "25–35 Days", Planets: 8, Moons: "290+" },
    lists: { Composition: ["Hydrogen 73%", "Helium 25%", "Others 2%"], "Known spacecraft": ["Parker Solar Probe", "Solar Orbiter", "SOHO"], "Interesting facts": ["Contains 99.86% of the Solar System's mass", "Produces energy through nuclear fusion", "Light reaches Earth in about 8 minutes 20 seconds"] },
  },
  mercury: {
    id: "mercury", name: "Mercury", symbol: "☿", type: "Terrestrial Planet", image: "/images/planets/mercury.png", accent: "#c8c8c8", description: "The smallest and closest planet to the Sun.",
    stats: { "Planet number": 1, Diameter: "4,879 km", Mass: "3.3011 × 10^23 kg", Gravity: "3.7 m/s²", "Distance from Sun": "57.9 Million km", "Orbital period": "88 Days", "Rotation period": "58.6 Days", Temperature: "-180°C to 430°C", Moons: 0, Rings: 0, Atmosphere: "Extremely Thin Exosphere", Surface: "Rocky" }, lists: { "Known missions": ["MESSENGER", "BepiColombo"] },
  },
  venus: {
    id: "venus", name: "Venus", symbol: "♀", type: "Terrestrial Planet", image: "/images/planets/venus.png", accent: "#f0d060", description: "The hottest planet due to an extreme greenhouse effect.",
    stats: { "Planet number": 2, Diameter: "12,104 km", Mass: "4.867 × 10^24 kg", Gravity: "8.87 m/s²", "Distance from Sun": "108.2 Million km", "Orbital period": "225 Days", "Rotation period": "243 Days (Retrograde)", Temperature: "464°C", Moons: 0, Rings: 0, Atmosphere: "CO₂", Surface: "Volcanic" }, lists: { "Known missions": ["Magellan", "Akatsuki"] },
  },
  earth: {
    id: "earth", name: "Earth", symbol: "🌍", type: "Terrestrial Planet", image: "/images/planets/earth.png", accent: "#55aaff", description: "The only known planet to support life.",
    stats: { "Planet number": 3, Diameter: "12,742 km", Mass: "5.972 × 10^24 kg", Gravity: "9.81 m/s²", "Distance from Sun": "149.6 Million km", "Orbital period": "365.25 Days", "Rotation period": "23h 56m", Temperature: "-88°C to 58°C", Moons: 1, Rings: 0, Life: true, "Water coverage": "71%" }, lists: { Atmosphere: ["Nitrogen", "Oxygen", "Argon"], "Known missions": ["ISS", "Landsat", "Sentinel", "Apollo"] },
  },
  mars: {
    id: "mars", name: "Mars", symbol: "🔴", type: "Terrestrial Planet", image: "/images/planets/mars.png", accent: "#e05020", description: "The Red Planet, home to the largest volcano and canyon in the Solar System.",
    stats: { "Planet number": 4, Diameter: "6,779 km", Gravity: "3.71 m/s²", "Distance from Sun": "227.9 Million km", "Orbital period": "687 Days", "Rotation period": "24.6 Hours", Temperature: "-63°C", Moons: 2, Rings: 0, "Largest volcano": "Olympus Mons", "Largest canyon": "Valles Marineris" }, lists: { "Known missions": ["Curiosity", "Perseverance", "Ingenuity", "MAVEN", "Hope"] },
  },
  jupiter: {
    id: "jupiter", name: "Jupiter", symbol: "🟠", type: "Gas Giant", image: "/images/planets/jupiter.png", accent: "#e0a050", description: "The largest planet, renowned for its immense Great Red Spot storm.",
    stats: { "Planet number": 5, Diameter: "139,820 km", Gravity: "24.79 m/s²", "Distance from Sun": "778.5 Million km", "Orbital period": "11.86 Years", "Rotation period": "9.9 Hours", Moons: 95, Rings: "Faint", "Largest storm": "Great Red Spot" }, lists: { "Known missions": ["Juno", "Galileo"] },
  },
  saturn: {
    id: "saturn", name: "Saturn", symbol: "🪐", type: "Gas Giant", image: "/images/planets/saturn.png", accent: "#f0e080", description: "A gas giant surrounded by the most spectacular ring system in our neighborhood.",
    stats: { "Planet number": 6, Diameter: "116,460 km", Gravity: "10.44 m/s²", "Distance from Sun": "1.43 Billion km", "Orbital period": "29.5 Years", "Rotation period": "10.7 Hours", Moons: 146, Rings: true, "Largest moon": "Titan" }, lists: { "Known missions": ["Cassini", "Huygens"] },
  },
  uranus: {
    id: "uranus", name: "Uranus", symbol: "🔵", type: "Ice Giant", image: "/images/planets/uranus.png", accent: "#9fffff", description: "An ice giant distinguished by its sideways rotation and pale blue atmosphere.",
    stats: { "Planet number": 7, Diameter: "50,724 km", Gravity: "8.69 m/s²", "Distance from Sun": "2.87 Billion km", "Orbital period": "84 Years", "Rotation period": "17 Hours", "Rotation direction": "Sideways", Moons: 28, Rings: 13 },
  },
  neptune: {
    id: "neptune", name: "Neptune", symbol: "🔷", type: "Ice Giant", image: "/images/planets/neptune.png", accent: "#7070ff", description: "The outermost major planet and home to the fastest winds in the Solar System.",
    stats: { "Planet number": 8, Diameter: "49,244 km", Gravity: "11.15 m/s²", "Distance from Sun": "4.50 Billion km", "Orbital period": "165 Years", "Rotation period": "16 Hours", Moons: 16, "Largest moon": "Triton", "Wind speed": "2,100 km/h" }, lists: { "Known missions": ["Voyager 2"] },
  },
};
