import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BAD6FF",
          300: "#7EB8FF",
          400: "#4A9EFF",
          500: "#2B7FED",
          600: "#1D6AD8",
        },
        lol: {
          dark: "#1B3A5C",
          darker: "#1F3F64",
          light: "#2A5280",
          surface: "#3A6498",
          blue: "#4A9EFF",
          accent: "#5EC4E6",
          muted: "#94B0CC",
        },
      },
    },
  },
  plugins: [],
};

export default config;
