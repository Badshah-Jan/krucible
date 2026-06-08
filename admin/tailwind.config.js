/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4F46E5",
        "primary-dark": "#4338CA",
        dark: "#111827",
        darker: "#030712",
        card: "#1F2937",
        border: "#374151"
      }
    },
  },
  plugins: [],
}
