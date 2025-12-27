/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}", "./dist/**/*.{html,js}"],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100ch', // wider reading area
          },
        },
      },
      colors: {
        'brand-dark': '#0f172a',
        'brand-accent': '#38bdf8',
      }
    },
  },
  plugins: [],
}
