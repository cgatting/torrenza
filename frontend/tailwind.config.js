/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'rgb(var(--accent) / <alpha-value>)',
        ink: 'var(--ink)',
        gray: { 200: '#39354d', 300: '#474259', 400: '#625d75', 500: '#68647b', 600: '#59546e' },
        surface: '#f7f6fb',
        elevated: { DEFAULT: '#ffffff', hover: '#f0edf8' },
        border: { DEFAULT: '#e6e3ef', subtle: '#f0edf7', active: 'rgb(var(--accent) / <alpha-value>)' },
        accent: {
          cyan: '#00D9FF',
          purple: '#A855F7',
          amber: '#F59E0B',
          rose: '#F43F5E',
        },
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'stripe': 'stripe 1s linear infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s infinite',
        'progress-stripe': 'progress-stripe 1s linear infinite',
      },
      keyframes: {
        stripe: {
          '0%': { backgroundPosition: '1rem 0' },
          '100%': { backgroundPosition: '0 0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'progress-stripe': {
          '0%': { backgroundPosition: '40px 0' },
          '100%': { backgroundPosition: '0 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
        'stripe': 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%)',
        'stripe-dark': 'linear-gradient(45deg, transparent 25%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.2) 50%, transparent 50%, transparent 75%, rgba(0,0,0,0.2) 75%)',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(76, 175, 80, 0.3)',
        'glow-lg': '0 0 30px rgba(76, 175, 80, 0.4)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.5)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}
