/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        about: {
          bg: '#F6E4CF',
          text: '#321C04',
        },
        cream: {
          light: '#FFF9F2',
        },
        accent: {
          muted: '#D9C4AA',
          hover: '#CEBA9E',
        },
        button: {
          darkHover: '#1F1003',
        },
      },
      keyframes: {
        'fade-in-down': {
          '0%': {
            opacity: '0',
            transform: 'translateY(-8px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
