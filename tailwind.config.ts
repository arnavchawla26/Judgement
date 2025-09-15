import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Game-specific colors
        "table-felt": "hsl(var(--table-felt))",
        "table-edge": "hsl(var(--table-edge))",
        "table-shadow": "hsl(var(--table-shadow))",
        
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          back: "hsl(var(--card-back))",
          shadow: "hsl(var(--card-shadow))",
        },
        
        trump: {
          glow: "hsl(var(--trump-glow))",
          border: "hsl(var(--trump-border))",
          background: "hsl(var(--trump-background))",
        },
        
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          glow: "hsl(var(--primary-glow))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        suit: {
          red: "hsl(var(--suit-red))",
          black: "hsl(var(--suit-black))",
        },
        
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        
        // Card game keyframes
        "card-deal": {
          "0%": {
            transform: "translateX(-100px) rotate(-15deg) scale(0)",
            opacity: "0",
          },
          "60%": {
            transform: "translateX(10px) rotate(5deg) scale(1.1)",
            opacity: "0.8",
          },
          "100%": {
            transform: "translateX(0) rotate(0deg) scale(1)",
            opacity: "1",
          },
        },
        
        "card-flip": {
          "0%": { transform: "rotateY(0deg)" },
          "50%": { transform: "rotateY(90deg)" },
          "100%": { transform: "rotateY(0deg)" },
        },
        
        "card-play": {
          "0%": { 
            transform: "translateY(0) scale(1)",
            zIndex: "1",
          },
          "50%": { 
            transform: "translateY(-30px) scale(1.1)",
            zIndex: "10",
          },
          "100%": { 
            transform: "translateX(0) translateY(-20px) scale(0.9)",
            zIndex: "5",
          },
        },
        
        "trump-glow": {
          "0%": { boxShadow: "0 0 15px hsl(var(--trump-glow) / 0.4)" },
          "100%": { boxShadow: "0 0 30px hsl(var(--trump-glow) / 0.8)" },
        },
        
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)", opacity: "0.8" },
          "70%": { transform: "scale(0.9)", opacity: "0.9" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        
        "fade-in-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 10px hsl(var(--primary) / 0.3)" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary) / 0.6)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        
        // Card game animations
        "card-deal": "card-deal 0.6s ease-out forwards",
        "card-flip": "card-flip 0.4s ease-in-out",
        "card-play": "card-play 0.5s ease-in-out forwards",
        "trump-glow": "trump-glow 2s ease-in-out infinite alternate",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "fade-in-up": "fade-in-up 0.5s ease-out",
        "pulse-glow": "pulse-glow 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
