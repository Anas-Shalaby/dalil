/** @type {import('tailwindcss').Config} */
export default {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F8F8FC',
        surface: '#FFFFFF',
        ink: '#191827',
        muted: '#747387',
        line: '#E9E7F1',
        primary: {
          DEFAULT: '#7440E9',
          hover: '#6335D4',
          soft: '#F2EDFE',
          ink: '#4E229F',
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
