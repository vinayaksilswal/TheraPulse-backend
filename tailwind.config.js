/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0D0D0D',
        'clinical-white': '#FAFAFA',
        'ash-gray': '#A1A1AA',
        'brand-teal': '#0D9488',
        'brand-navy': '#1B2A4A',
        'led-red': '#EF4444',
        'led-purple': '#8B00FF',
        'led-blue': '#00D2FF',
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'glow-pulse-teal': 'glow-pulse-teal 2s ease-in-out infinite',
        'glow-pulse-purple': 'glow-pulse-purple 2s ease-in-out infinite',
        'glow-pulse-blue': 'glow-pulse-blue 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'slide-down': 'slide-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        'glow-pulse-teal': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(13, 148, 136, 0.3)', borderColor: 'rgba(13, 148, 136, 0.4)' },
          '50%': { boxShadow: '0 0 35px rgba(13, 148, 136, 0.7)', borderColor: 'rgba(13, 148, 136, 0.9)' },
        },
        'glow-pulse-purple': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(139, 0, 255, 0.3)', borderColor: 'rgba(139, 0, 255, 0.4)' },
          '50%': { boxShadow: '0 0 35px rgba(139, 0, 255, 0.7)', borderColor: 'rgba(139, 0, 255, 0.9)' },
        },
        'glow-pulse-blue': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(0, 210, 255, 0.3)', borderColor: 'rgba(0, 210, 255, 0.4)' },
          '50%': { boxShadow: '0 0 35px rgba(0, 210, 255, 0.7)', borderColor: 'rgba(0, 210, 255, 0.9)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
