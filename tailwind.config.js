/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#111827", // slate-900 (Professional dark background)
        card: "#1F2937", // slate-800
        primary: "#2563EB", // Royal Blue
        accentPurple: "#3B82F6", // Mapped to Blue to remove gamification
        accentPink: "#60A5FA", // Mapped to Light Blue
        accentBlue: "#2563EB",
        sosRed: "#DC2626", // Professional Emergency Red
      },
    },
  },
  plugins: [],
}
