/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blackboxz-primary': '#FF6B00',      // International Orange (aviation standard)
        'blackboxz-secondary': '#E55A00',    // Darker orange for hover states
        'blackboxz-accent': '#FF8533',       // Lighter orange for accents
        'blackboxz-dark': '#1A1A1A',        // Deep black for contrast
        'blackboxz-gray': '#2D2D2D',        // Dark gray for secondary elements
      }
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        blackboxz: {
          "primary": "#FF6B00",      // International Orange
          "secondary": "#E55A00",    // Darker Orange
          "accent": "#FF8533",       // Light Orange
          "neutral": "#2D2D2D",      // Dark Gray
          "base-100": "#ffffff",     // White background
          "base-200": "#f8f8f8",     // Light gray
          "base-300": "#e5e5e5",     // Medium gray
          "info": "#0ea5e9",
          "success": "#22c55e",
          "warning": "#f59e0b",
          "error": "#ef4444",
        },
      },
    ],
  },
}