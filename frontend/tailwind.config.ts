import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          300: "#F0D6A0",
          400: "#D4A84B",
          500: "#C8AA6E",
          600: "#A07A2F",
        },
        lol: {
          dark: "#1A2332",
          darker: "#212D3B",
          light: "#2A3A4E",
          surface: "#314559",
          blue: "#1B98D5",
          accent: "#21D4C4",
          muted: "#8694A5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
