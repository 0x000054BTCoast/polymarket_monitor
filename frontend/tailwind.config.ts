import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#111827",
        panel2: "#1f2937",
        text: "#e5e7eb",
        muted: "#9ca3af"
      }
    }
  },
  plugins: []
};

export default config;
