/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--color-canvas) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        "panel-muted": "rgb(var(--color-panel-muted) / <alpha-value>)",
        "panel-subtle": "rgb(var(--color-panel-subtle) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        inverse: "rgb(var(--color-inverse) / <alpha-value>)",
        "inverse-ink": "rgb(var(--color-inverse-ink) / <alpha-value>)",
        "inverse-action": "rgb(var(--color-inverse-action) / <alpha-value>)",
        "inverse-action-ink": "rgb(var(--color-inverse-action-ink) / <alpha-value>)",
        quiet: "rgb(var(--color-quiet) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        "brand-strong": "rgb(var(--color-brand-strong) / <alpha-value>)",
        "brand-soft": "rgb(var(--color-brand-soft) / <alpha-value>)",
        risk: "rgb(var(--color-risk) / <alpha-value>)",
        "risk-soft": "rgb(var(--color-risk-soft) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        "warning-soft": "rgb(var(--color-warning-soft) / <alpha-value>)",
        good: "rgb(var(--color-good) / <alpha-value>)",
        "good-soft": "rgb(var(--color-good-soft) / <alpha-value>)",
      },
    },
  },
  plugins: [],
};
