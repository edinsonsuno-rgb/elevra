/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
      },
      colors: {
        'df-bg': '#3D3D3D',
        'df-card': '#161B22',
        'df-surface': '#21262D',
        'df-border': '#30363D',
        'df-text': '#E6EDF3',
        'df-muted': '#8B949E',
        'df-purple': 'rgb(var(--df-purple-rgb) / <alpha-value>)',
        'df-violet': 'rgb(var(--df-violet-rgb) / <alpha-value>)',
        'df-pink': 'rgb(var(--df-pink-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}