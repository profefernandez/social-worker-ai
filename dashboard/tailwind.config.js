/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f1115',
          card: '#1a1d24',
          deep: '#121419',
          accent: '#fee104',
          'accent-hover': '#d6be00',
        },
      },
      boxShadow: {
        'accent-glow': '0 0 15px rgba(254,225,4,0.15)',
        'accent-glow-strong': '0 0 25px rgba(254,225,4,0.5)',
      },
    },
  },
  plugins: [],
};
