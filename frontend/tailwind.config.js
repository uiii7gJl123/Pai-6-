/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#b3d6ff',
          300: '#84baff',
          400: '#5597ff',
          500: '#2f74ff',
          600: '#1d58db',
          700: '#1644a8',
          800: '#123780',
          900: '#112f69'
        }
      }
    }
  },
  plugins: []
}
