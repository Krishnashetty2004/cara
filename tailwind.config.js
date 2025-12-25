/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Light Blue Theme
        background: "#0F172A",      // Slate 900
        surface: "#1E293B",         // Slate 800
        card: "#334155",            // Slate 700
        primary: "#60A5FA",         // Light Blue 400
        "primary-dark": "#3B82F6",  // Blue 500
        "primary-light": "#93C5FD", // Light Blue 300
        success: "#4ADE80",         // Green
        warning: "#FBBF24",         // Yellow
        error: "#F87171",           // Red
        muted: "#475569",           // Slate 600
        "text-secondary": "#94A3B8", // Slate 400
        "text-muted": "#64748B",    // Slate 500
      },
    },
  },
  plugins: [],
};
