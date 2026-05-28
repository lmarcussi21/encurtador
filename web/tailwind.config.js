export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: {
            DEFAULT: '#2C46B1',
            dark: '#2C4091',
            hover: '#2C4091',
            disabled: '#9caae5',
            light: '#eff6ff',
          },
          gray: {
            100: '#F9F9FB',
            200: '#E4E6EC',
            300: '#CDCFD5',
            400: '#74798B',
            500: '#4D505C',
            600: '#1F2025',
          },
          feedback: {
            danger: '#B12C4D',
          },
          bg: '#F9F9FB',
          card: '#FFFFFF',
          text: {
            primary: '#1F2025',
            secondary: '#74798B',
            muted: '#4D505C',
          },
        },
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
