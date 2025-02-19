/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'odi-blue': '#1D70B8',
        'odi-dark-blue': '#003078',
        'odi-black': '#0B0C0C',
        'odi-white': '#FFFFFF',
        'odi-gray': {
          100: '#F8F8F8',
          200: '#F3F2F1',
          300: '#DBDAD9',
          400: '#B1B4B6',
          500: '#505A5F',
          600: '#2E3133'
        },
      },
      fontFamily: {
        sans: ['Public Sans', 'sans-serif'],
        display: ['Public Sans', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['48px', '56px'],
        'display-l': ['36px', '44px'],
        'display-m': ['24px', '32px'],
        'body-l': ['19px', '28px'],
        'body-m': ['16px', '24px'],
        'body-s': ['14px', '20px'],
      },
    },
  },
  plugins: [],
}; 