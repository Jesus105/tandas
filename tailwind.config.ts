import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f7f4",
          100: "#e0ebe4",
          200: "#c3d7cb",
          300: "#9abbaa",
          400: "#6f9986",
          500: "#517c6a",
          600: "#3e6354",
          700: "#335045",
          800: "#2b4139",
          900: "#1a2a24",
          950: "#0f1a16",
        },
        cream: {
          50: "#fdfbf7",
          100: "#f8f3ea",
          200: "#f0e6d4",
          300: "#e4d4b8",
        },
        gold: {
          400: "#d4a853",
          500: "#c4922e",
          600: "#a67824",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
