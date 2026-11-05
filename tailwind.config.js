/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0c0c0e",
        basalt: "#16161a",
        chassis: "#1c1c21",
        hairline: "#26262b",
        etched: "#383840",
        ivory: "#f2f0ea",
        ash: "#8e8e96",
        signal: "#ff5500",
        amber: "#f59e0b",
        phosphor: "#10b981"
      },
      fontFamily: {
        sans: ["'Inter'", "'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        mono: ["'JetBrains Mono'", "'IBM Plex Mono'", "monospace"]
      },
      boxShadow: {
        tactile: "inset 0 1px 0 0 rgba(255,255,255,0.06), 0 2px 4px 0 rgba(0,0,0,0.65)",
        recessed: "inset 0 2px 5px 0 rgba(0,0,0,0.85), inset 0 0 0 1px #26262b"
      }
    }
  },
  plugins: []
};