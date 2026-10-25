/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "panel-dim": "#080c14",
        panel: "#0f1624",
        "panel-soft": "#141c2c",
        "panel-deep": "#0a0f18",
        "panel-high": "#1c263a",
        "panel-highest": "#25324c",
        accent: "#f59e0b",
        "accent-bright": "#fbbf24",
        "accent-soft": "#fde68a",
        muted: "#94a3b8",
        outline: "rgba(255, 255, 255, 0.08)",
        "on-surface": "#f1f5f9",
        card: "#0d131f",
        bubble: "#111827",
        "input-bg": "#0a0f18",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(0, 0, 0, 0.6)",
        glow: "0 0 20px rgba(245, 158, 11, 0.25)",
        "glow-cyan": "0 0 20px rgba(6, 182, 212, 0.3)",
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.3)",
        card: "0 4px 20px rgba(0, 0, 0, 0.4)",
        "card-hover": "0 14px 36px rgba(0, 0, 0, 0.5)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
      },
      fontFamily: {
        sans: ["Vazirmatn", "Peyda", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        title: ["20px", "1.6"],
        body: ["15px", "1.7"],
        small: ["13px", "1.5"],
      },
      borderRadius: {
        DEFAULT: "0.375rem",
        lg: "0.625rem",
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      spacing: {
        4.5: "18px",
        5.5: "22px",
        6.5: "26px",
        25: "100px",
        26: "104px",
        30: "120px",
        35: "140px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
