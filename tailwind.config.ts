import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF7EC",
        oat: "#F2DEC7",
        berry: "#A53D62",
        persimmon: "#E9774D",
        moss: "#4B7B5A",
        ink: "#2B2528",
      },
      boxShadow: {
        soft: "0 18px 55px rgba(62, 44, 38, 0.12)",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
