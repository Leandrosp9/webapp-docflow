/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#080b12',
        panel: '#10141f',
        line: '#242a38',
        accent: '#7c6cff',
        cyan: '#36c8f4',
      },
      boxShadow: {
        glow: '0 20px 70px -32px rgba(108, 92, 255, 0.48)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
