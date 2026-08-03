import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./three/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        space: {
          950: "#010510",
          900: "#020714",
          800: "#040d20",
          700: "#06152e",
          600: "#091e42",
        },
        nebula: {
          blue: "#3b82f6",
          purple: "#7c3aed",
          cyan: "#06b6d4",
          pink: "#ec4899",
          orange: "#f97316",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "spin-slow": "spin 20s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        orbit: "orbit 10s linear infinite",
        twinkle: "twinkle 2s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.3)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      backgroundImage: {
        "space-gradient": "radial-gradient(ellipse at center, #050a1e 0%, #020714 50%, #000005 100%)",
        "nebula-gradient": "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(6,182,212,0.1))",
        "hero-glow": "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(99,102,241,0.3), transparent)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(100, 150, 255, 0.4)",
        "glow-lg": "0 0 40px rgba(100, 150, 255, 0.5)",
        "glow-purple": "0 0 20px rgba(124, 58, 237, 0.4)",
        "glow-cyan": "0 0 20px rgba(34, 211, 238, 0.4)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
