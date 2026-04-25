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
        primary: {
          DEFAULT: '#4CAF50',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        surface: {
          DEFAULT: '#0f1117',
          50: '#f5f5f5',
          100: '#e8e8ed',
          200: '#d1d1d9',
          300: '#b0b0bf',
          400: '#808099',
          500: '#5a5a78',
          600: '#1a1a2e',
          700: '#12121c',
          800: '#0d0d16',
          900: '#08080f',
        },
        elevated: {
          DEFAULT: '#1a1a2e',
          hover: '#252540',
        },
        border: {
          DEFAULT: '#2a2a3e',
          subtle: '#1e1e30',
          active: '#4CAF50',
        },
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
