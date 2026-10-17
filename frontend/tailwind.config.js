/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm, Claude.ai-inspired palette
        canvas: '#FAF9F5',       // main background
        surface: '#FFFFFF',      // cards / input
        panel: '#F0EEE6',        // sidebar + user bubble
        'panel-strong': '#E8E5DB',
        ink: '#1F1E1D',          // primary text
        'ink-soft': '#3D3B38',   // secondary text
        'ink-muted': '#8A857D',  // hints, placeholders
        line: '#E5E2D8',         // borders
        accent: '#C96442',       // terracotta primary
        'accent-hover': '#B0532F',
        'accent-soft': '#F6E7DE',
        success: '#2F7D5B',
        warning: '#B26A26',
        danger: '#B3402E',
        'danger-soft': '#F9E7E3',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        serif: ['Georgia', '"Tiempos Text"', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        composer: '0 1px 2px rgba(31, 30, 29, 0.06), 0 4px 16px rgba(31, 30, 29, 0.06)',
        pop: '0 2px 8px rgba(31, 30, 29, 0.10), 0 12px 32px rgba(31, 30, 29, 0.10)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'blink-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-up': 'fade-up 220ms ease-out',
        'blink-dot': 'blink-dot 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
