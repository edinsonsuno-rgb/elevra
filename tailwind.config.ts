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
        'df-bg':      '#0D1117',
        'df-card':    '#161B22',
        'df-surface': '#21262D',
        'df-border':  '#30363D',
        'df-text':    '#E6EDF3',
        'df-muted':   '#8B949E',
        'df-purple':  '#39D353',
        'df-violet':  '#2ECC71',
        'df-pink':    '#ec4899',
      },
    },
  },
  plugins: [],
}
