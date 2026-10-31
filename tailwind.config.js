/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    /* ── Colors ─────────────────────────────────────────────────
       Replaces ALL defaults so unlisted colors fail loudly.    */
    colors: {
      transparent: "transparent",
      current: "currentColor",

      white: "#FFFFFF",
      canvas: "#F6F9F7",

      brand: "#059669",
      action: "#047857",
      "action-pressed": "#065F46",
      ink: "#064E3B",

      emerald: {
        50: "#ECFDF5",
        100: "#D1FAE5",
        200: "#A7F3D0",
        300: "#6EE7B7",
        500: "#10B981",
      },

      fg: "#022C22",
      "fg-secondary": "#4B5F57",
      "fg-muted": "#5F746C",

      line: "#DCE7E1",

      danger: "#DC2626",
      warning: "#B45309",
    },

    /* ── Typography ─────────────────────────────────────────── */
    fontFamily: {
      "display-xl": ["PlusJakartaSans_800ExtraBold"],
      display: ["PlusJakartaSans_700Bold"],
      heading: ["PlusJakartaSans_600SemiBold"],
      body: ["Inter_400Regular"],
      "body-medium": ["Inter_500Medium"],
      "body-semibold": ["Inter_600SemiBold"],
    },

    fontSize: {
      display: ["32px", { lineHeight: "40px" }],
      h1: ["28px", { lineHeight: "36px" }],
      h2: ["22px", { lineHeight: "30px" }],
      title: ["18px", { lineHeight: "26px" }],
      body: ["16px", { lineHeight: "24px" }],
      small: ["14px", { lineHeight: "20px" }],
      caption: ["12px", { lineHeight: "16px" }],
    },

    /* ── Shape & Space ──────────────────────────────────────── */
    borderRadius: {
      none: "0px",
      control: "12px",
      card: "16px",
      full: "9999px",
    },

    boxShadow: {
      card: "0 1px 3px 0 rgba(0,0,0,0.08)",
      none: "0 0 #0000",
    },

    maxWidth: {
      column: "720px",
    },

    extend: {},
  },
  plugins: [],
};

