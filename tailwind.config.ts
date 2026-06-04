/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
      },
      colors: {
        'df-bg':      '#080612',
        'df-card':    '#0f0d1a',
        'df-surface': '#150f24',
        'df-border':  '#2a1f45',
        'df-text':    '#f0eeff',
        'df-muted':   '#7c6fa0',
        'df-purple':  '#7c3aed',
        'df-violet':  '#8b5cf6',
        'df-pink':    '#ec4899',
      },
    },
  },
  plugins: [],
}
