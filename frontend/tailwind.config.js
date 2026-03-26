/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: "#fdf8f0",
          100: "#f9eddb",
          200: "#f2d7b0",
          300: "#e9bb7c",
          400: "#df9a48",
          500: "#d4802a",
          600: "#b86520",
          700: "#994c1d",
          800: "#7c3e1e",
          900: "#66341c",
          950: "#38190d",
        },
      },
    },
  },
  plugins: [],
};
