/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'doggo-canvas': '#F7F3EC',
        'doggo-ink': '#28231F',
        'doggo-muted': '#746A62',
        'doggo-border': '#E5DDD2',
        'doggo-accent': '#B65E3C',
        'doggo-accent-soft': '#F5DED3',
        'doggo-success': '#39705A',
        'doggo-success-soft': '#E1F0E8',
        'doggo-skeleton': '#EAE2D8',
      },
    },
  },
  plugins: [],
};
