/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/front-end/html/**/*.html",
    "./src/front-end/html/**/*.{js,ts,jsx,tsx}",
    "./src/front-end/typescript/**/*.{js,ts,jsx,tsx}"
    // Add any other paths that might contain Tailwind classes
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
