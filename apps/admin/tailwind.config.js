/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#08080B',
        panel: '#101014',
        raised: '#17171D',
        accent: '#FF4D2E',
      },
      boxShadow: {
        card: '0 20px 60px rgba(0, 0, 0, .35)',
      },
    },
  },
  plugins: [],
};
