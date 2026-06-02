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
      backgroundImage: {
        accent: 'linear-gradient(135deg, #FF6A3D, #FF2D55)',
      },
      boxShadow: {
        card: '0 20px 60px rgba(0, 0, 0, .35)',
        glow: '0 12px 30px rgba(255, 77, 46, .3)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        float: 'float 2.6s ease-in-out infinite',
        'fade-up': 'fadeUp .22s ease-out',
        pulseSoft: 'pulseSoft 2.8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(6px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '.55', transform: 'scale(1)' },
          '50%': { opacity: '.85', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};

