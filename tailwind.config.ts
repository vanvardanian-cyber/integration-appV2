import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFCF8",
          100: "#FAF8F4",
          200: "#F2EDE0",
          300: "#E8E2D5",
          400: "#D4CDB8",
        },
        ink: {
          900: "#1A1A1A",
          700: "#2D1810",
          500: "#5A5448",
          400: "#8B5A3C",
          300: "#8B8578",
        },
        warm: {
          peach: "#FFE4D1",
          orange: "#D97757",
          amber: "#E85D2C",
        },
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "4xl": "32px",
      },
    },
  },
  plugins: [],
};

export default config;
