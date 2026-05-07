/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f7f9",
        panel: "#ffffff",
        "panel-muted": "#eef3f5",
        ink: "#172026",
        quiet: "#66747d",
        line: "#dce4e8",
        brand: "#087f8c",
        "brand-strong": "#065f69",
        "brand-soft": "#dff3f4",
        risk: "#b3261e",
        "risk-soft": "#fce8e6",
        warning: "#8a5a00",
        "warning-soft": "#fff2cc",
        good: "#137333",
      },
    },
  },
  plugins: [],
};

