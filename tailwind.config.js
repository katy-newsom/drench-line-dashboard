/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F4F2ED',
        card: '#FFFFFF',
        ink: {
          DEFAULT: '#111111',
          2: '#4A4843',
        },
        muted: '#827E75',
        line: {
          DEFAULT: '#E2DED4',
          strong: '#C9C4B8',
        },
        accent: '#CC0000',
        good: '#0B7A35',
        bad: '#B42318',
        night: '#0F0F0F',
        dl: {
          black: '#111111',
          white: '#FFFFFF',
          red: '#CC0000',
          'red-dark': '#990000',
          'red-light': '#CC0000',
        },
      },
      fontFamily: {
        sans: ['var(--font-archivo-narrow)', 'Arial Narrow', 'system-ui', 'sans-serif'],
        display: ['var(--font-archivo-black)', 'Arial Black', 'sans-serif'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
        xl: '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        expand: 'expand 0.2s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        expand: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
