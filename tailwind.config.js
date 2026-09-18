/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        main: "rgb(var(--color-main) / <alpha-value>)",
        sub: "rgb(var(--color-sub) / <alpha-value>)",
        text: "rgb(var(--color-text) / <alpha-value>)",
        error: "rgb(var(--color-error) / <alpha-value>)",
      },
      fontFamily: {
        mono: ["'Roboto Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
