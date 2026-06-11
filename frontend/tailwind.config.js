/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
        mono: ['Courier New', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'], // Include retro font option
      },
      colors: {
        muffin: {
          gold: '#d97706',
          brown: '#475569',
          espresso: '#0f172a',
          cream: '#f1f5f9',
        },
        retro: {
          bg: '#0f172a',        // Deep Space Dark Blue
          panel: '#1e293b',     // Dark slate paneling
          border: '#334155',    // Muted border slate
          green: {
            bg: '#14532d',      // Dark Forest Green
            accent: '#22c55e',  // Vibrant Neon Green
            text: '#86efac'     // Muted Lime Text
          },
          purple: {
            bg: '#3b0764',      // Deep Royal Purple
            accent: '#a855f7',  // Vibrant Electric Purple
            text: '#d8b4fe'     // Light Lavender Text
          },
          blue: {
            bg: '#172554',      // Deep Navy Blue
            accent: '#3b82f6',  // Neon Blue
            text: '#93c5fd'     // Soft Sky Blue
          },
          orange: {
            bg: '#431407',      // Dark Auburn Orange
            accent: '#f97316',  // Bright Neon Orange
            text: '#fdba74'     // Soft Peach Text
          },
          yellow: {
            accent: '#eab308',  // Retro Gold
            text: '#fef08a'
          }
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink-slow': 'blink 1.5s step-end infinite',
        'steam-rise': 'steam 2s ease-out infinite',
      },
      keyframes: {
        blink: {
          '50%': { opacity: '0.3' },
        },
        steam: {
          '0%': { transform: 'translateY(0) scale(0.8)', opacity: '0.6' },
          '50%': { transform: 'translateY(-15px) scale(1.1)', opacity: '0.4' },
          '100%': { transform: 'translateY(-30px) scale(1.4)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
