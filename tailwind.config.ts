import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        slate: {
          350: '#b0bdcf',
          650: '#3d4b5f',
          750: '#293548',
          850: '#172033',
        },
      },
    },
  },
  plugins: [],
};
export default config;
