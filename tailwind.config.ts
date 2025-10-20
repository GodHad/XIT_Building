import type { Config } from "tailwindcss";
import { staatliches } from "./app/fonts";
import { lexendDeca } from './app/fonts';

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        outfit: ['var(--font-outfit)', 'sans-serif'],
        alfa: ['var(--font-staatliches)', 'serif'],
        corndog: ['var(--font-lexendDeca)', 'sans-serif']
      }
    },
  },
  plugins: [],
} satisfies Config;
