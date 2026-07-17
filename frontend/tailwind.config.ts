import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ink: '#1B2420',
        parchment: '#EFE6D3',
        bone: '#F7F3E8',
        jembe: '#1F6E4A',
        marigold: '#E3A123',
        clay: '#B84C3C',
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'monospace'],
      },
      keyframes: {
        waveform: {
          '0%, 100%': { height: '8px' },
          '50%': { height: '32px' },
        },
        slideDown: {
          'from': { opacity: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOutBg: {
          '0%': { backgroundColor: 'rgba(227, 161, 35, 0.1)' },
          '100%': { backgroundColor: 'transparent' },
        }
      },
      animation: {
        waveform: 'waveform 1.2s ease-in-out infinite',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'fade-out-bg': 'fadeOutBg 1.5s ease-out 0.3s forwards',
      }
    },
  },
  plugins: [],
};
export default config;
