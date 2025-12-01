import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        matcha: {
          primary: "#2d5016",
          secondary: "#4a7c2a",
          accent: "#6b9e3d",
          light: "#e8f5e0",
          dark: "#1a3009",
        },
      },
    },
  },
  plugins: [],
};
export default config;

