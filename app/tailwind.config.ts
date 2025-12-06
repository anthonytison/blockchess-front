import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        regular: ["var(--font-regular)", "system-ui", "-apple-system", "sans-serif"],
        pixel: ["var(--font-pixel)", "monospace"],
      },
      fontSize: {
        xs: ['0.625rem', { lineHeight: '1rem' }],      // 10px
        sm: ['0.75rem', { lineHeight: '1.125rem' }],    // 12px
        base: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px (was 16px)
        lg: ['1rem', { lineHeight: '1.5rem' }],         // 16px (was 18px)
        xl: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px (was 20px)
        '2xl': ['1.25rem', { lineHeight: '2rem' }],     // 20px (was 24px)
        '3xl': ['1.5rem', { lineHeight: '2.25rem' }],   // 24px (was 30px)
        '4xl': ['1.875rem', { lineHeight: '2.5rem' }],  // 30px (was 36px)
        '5xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px (was 48px)
      },
      animation: {
        "piece-move": "piece-move 0.3s ease-in-out",
      },
      keyframes: {
        "piece-move": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.1)" },
          "100%": { transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;