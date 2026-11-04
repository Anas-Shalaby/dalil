/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#FBFAFF',
        surface: '#FFFFFF',
        ink: '#201A2D',
        muted: '#777184',
        line: '#E9E7F1',
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          soft: '#DBEAFE',
          ink: '#1E40AF',
        },
        accent: {
          blue: '#2563EB',
          emerald: '#10B981',
          amber: '#F59E0B',
        },
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        success: '#157F55',
        warning: '#9A5B00',
        danger: '#B4233A',
      },
      fontFamily: {
        sans: [
          '"IBM Plex Sans Arabic"',
          '"SF Arabic"',
          '"Segoe UI"',
          'Tahoma',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(25, 24, 39, 0.04)',
        float: '0 18px 50px -20px rgba(25, 24, 39, 0.28)',
        pop: '0 12px 30px -12px rgba(25, 24, 39, 0.22)',
      },
      borderRadius: {
        xl2: '18px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'rise-in': 'rise-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'soft-pulse': 'soft-pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
