/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        pokemon: {
          red: "#CC0000",
          yellow: "#FFCB05",
          blue: "#3B4CCA",
          dark: "#1a1a2e",
          card: "#16213e",
          border: "#0f3460",
        },
      },
    },
  },
  plugins: [],
};

