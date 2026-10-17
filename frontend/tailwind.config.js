import animate from 'tailwindcss-animate';

/**
 * IRIS.ai Tailwind config (Tailwind v3).
 *
 * Two token families live here:
 *  1. Project tokens (canvas, ink, panel…) — the Claude.ai-inspired warm palette.
 *  2. shadcn-style tokens (background, card, muted, ring…) — consumed by the
 *     ui/ components (ai-chat-input, honey-ember-background).
 *
 * Every value is `rgb(var(--token) / <alpha-value>)` so both palettes are
 * defined once as raw R-G-B triplets in src/index.css (:root + .dark).
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Project tokens ----
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        'panel-strong': 'rgb(var(--c-panel-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        'ink-soft': 'rgb(var(--c-ink-soft) / <alpha-value>)',
        'ink-muted': 'rgb(var(--c-ink-muted) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--c-accent-hover) / <alpha-value>)',
        'accent-soft': 'rgb(var(--c-accent-soft) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)',

        // ---- shadcn-style tokens (ui/ components) ----
        background: 'rgb(var(--c-background) / <alpha-value>)',
        foreground: 'rgb(var(--c-foreground) / <alpha-value>)',
        card: 'rgb(var(--c-card) / <alpha-value>)',
        'card-foreground': 'rgb(var(--c-card-foreground) / <alpha-value>)',
        popover: 'rgb(var(--c-popover) / <alpha-value>)',
        'popover-foreground': 'rgb(var(--c-popover-foreground) / <alpha-value>)',
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--c-primary-foreground) / <alpha-value>)',
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        'secondary-foreground': 'rgb(var(--c-secondary-foreground) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--c-muted-foreground) / <alpha-value>)',
        accentfg: 'rgb(var(--c-accentfg) / <alpha-value>)', // hover-accent (name avoids clash with `accent`)
        'accent-foreground': 'rgb(var(--c-accent-foreground) / <alpha-value>)',
        destructive: 'rgb(var(--c-destructive) / <alpha-value>)',
        'destructive-foreground': 'rgb(var(--c-destructive-foreground) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        input: 'rgb(var(--c-input) / <alpha-value>)',
        ring: 'rgb(var(--c-ring) / <alpha-value>)',
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
      transitionDuration: {
        400: '400ms',
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
  plugins: [animate],
};
