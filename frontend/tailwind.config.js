/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f172a', // Deep navy
          light: '#1e293b',
        },
        accent: {
          DEFAULT: '#0284c7', // Cyan / blue
          light: '#38bdf8',
        },
        success: '#10b981',
        warning: '#f59e0b',
        critical: '#ef4444',
        background: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
