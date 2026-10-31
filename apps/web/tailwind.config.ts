import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Civic Editorial Palette
        paper: {
          DEFAULT: "#F4F1EA", // Warm Paper primary background
          surface: "#FAF8F5",
          card: "#FFFFFF",
          muted: "#EBE6DC",
        },
        forest: {
          50: "#F2F6F4",
          100: "#E1EDE8",
          200: "#C3DCD2",
          300: "#9EC3B5",
          400: "#6E9E8C",
          500: "#427866",
          600: "#2E5C4E",
          700: "#23493D",
          800: "#18392F", // Forest Ink - primary brand & deep text
          900: "#0F261F",
          950: "#081612",
          DEFAULT: "#18392F",
        },
        coral: {
          50: "#FDF5F2",
          100: "#FBECE8",
          200: "#F6D5CE",
          300: "#EEB5A8",
          400: "#E58B75",
          500: "#E36F50", // Signal Coral - alert & key CTA
          600: "#D05435",
          700: "#AD4026",
          800: "#8E3622",
          900: "#743121",
          DEFAULT: "#E36F50",
        },
        sage: {
          50: "#F4F7F4",
          100: "#E6ECE6",
          200: "#D8E2D8", // Soft Sage
          300: "#C0CEC0",
          400: "#9EAF9E",
          500: "#7A8D7A",
          DEFAULT: "#D8E2D8",
        },
        "warm-grey": {
          50: "#FAF9F6",
          100: "#F3F1EC",
          200: "#E7E4DC",
          300: "#D6D2C7",
          400: "#ABA597",
          500: "#847E71",
          600: "#5C584E",
          700: "#423F37",
        },
        // Backward-compatible aliases
        brand: {
          50: "#F2F6F4",
          100: "#E1EDE8",
          200: "#C3DCD2",
          300: "#9EC3B5",
          400: "#6E9E8C",
          500: "#427866",
          600: "#2E5C4E",
          700: "#23493D",
          800: "#18392F",
          900: "#0F261F",
          950: "#081612",
        },
        accent: {
          primary: "#E36F50",
          hover: "#D05435",
          muted: "#FDF5F2",
        },
      },
      fontFamily: {
        serif: ["ui-serif", "Georgia", "Cambria", '"Times New Roman"', "Times", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "Menlo",
          "Monaco",
          "Consolas",
          '"Liberation Mono"',
          '"Courier New"',
          "monospace",
        ],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(24, 57, 47, 0.05), 0 1px 2px rgba(24, 57, 47, 0.03)",
        card: "0 2px 8px -2px rgba(24, 57, 47, 0.08), 0 1px 4px -1px rgba(24, 57, 47, 0.04)",
        elevated: "0 12px 24px -6px rgba(24, 57, 47, 0.12), 0 4px 12px -2px rgba(24, 57, 47, 0.06)",
        modal: "0 20px 40px -8px rgba(15, 38, 31, 0.25), 0 8px 16px -4px rgba(15, 38, 31, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
