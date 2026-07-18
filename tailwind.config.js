/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "var(--navy-950)",
          900: "var(--navy-900)",
          800: "var(--navy-800)",
          700: "var(--navy-700)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          bright: "var(--gold-bright)",
          dark: "var(--gold-dark)",
        },
        pitch: {
          DEFAULT: "var(--pitch)",
          bright: "var(--pitch-bright)",
        },
        white: "var(--white)",
        dim: "var(--dim)",
        red: {
          DEFAULT: "var(--red)",
        },
      },
      fontFamily: {
        teko: ["Teko", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
