/** @type {import('tailwindcss').Config} */
const c = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Colors come from CSS variables so the Settings page can re-theme the whole site.
        discord: {
          blurple: c('blurple'),
          green: c('green'),
          yellow: c('yellow'),
          fuchsia: c('fuchsia'),
          red: c('red'),
          dark: c('dark'),
          darker: c('darker'),
          card: c('card'),
          hover: c('hover'),
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
