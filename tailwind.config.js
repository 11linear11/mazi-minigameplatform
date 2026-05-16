/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "panel-dim": "#10141a",
        panel: "#1c2026",
        "panel-soft": "#181c22",
        "panel-deep": "#0a0e14",
        "panel-high": "#262a31",
        "panel-highest": "#31353c",
        accent: "#e9c400",
        "accent-bright": "#ffd700",
        "accent-soft": "#FFD54F",
        muted: "#d0c6ab",
        outline: "#4d4732",
        "on-surface": "#dfe2eb",
        card: "#0D1117",
        bubble: "#10151C",
        "input-bg": "#0F141B",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(0, 0, 0, 0.5)",
        glow: "0 0 15px rgba(255, 215, 0, 0.15)",
        card: "0 4px 16px rgba(0, 0, 0, 0.3)",
        "card-hover": "0 14px 36px rgba(0, 0, 0, 0.4)",
      },
      fontFamily: {
        sans: ["Peyda", "Vazirmatn", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      fontSize: {
        title: ["20px", "1.6"],
        body: ["15px", "1.7"],
        small: ["13px", "1.5"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
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
