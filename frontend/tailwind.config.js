/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'logo-fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'logo-soft-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.97', transform: 'scale(1.02)' },
        },
        'logo-breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        'logo-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.3))' },
          '50%': { filter: 'drop-shadow(0 0 14px rgba(99, 102, 241, 0.5))' },
        },
      },
      animation: {
        'logo-fade-in': 'logo-fade-in 0.7s ease-out forwards',
        'logo-soft-pulse': 'logo-soft-pulse 4s ease-in-out infinite',
        'logo-breathe': 'logo-breathe 3s ease-in-out infinite',
        'logo-glow': 'logo-glow 2.5s ease-in-out infinite',
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Main blue
          600: '#2563eb', // Darker blue
          700: '#1d4ed8', // Dark blue
          800: '#1e40af',
          900: '#1e3a8a',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
        },
      },
    },
  },
  plugins: [],
}


