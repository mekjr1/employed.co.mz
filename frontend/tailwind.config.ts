import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        surface: "#16213e",
        background: "#1a1a2e",
        foreground: "#e4e4e7",
        muted: "#a1a1aa",
        accent: "#4F46E5",
        featured: "#F59E0B",
        stroke: "#27272a"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(79, 70, 229, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
