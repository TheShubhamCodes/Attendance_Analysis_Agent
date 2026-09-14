/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        role: {
          primary: 'var(--role-primary)',
          secondary: 'var(--role-secondary)',
          accent: 'var(--role-accent)',
          light: 'var(--role-light)',
          dark: 'var(--role-dark)',
          darker: 'var(--role-darker)',
          darkest: 'var(--role-darkest)',
        },
        brand: {
          50: 'rgb(var(--role-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--role-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--role-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--role-accent-rgb) / <alpha-value>)',
          400: 'rgb(var(--role-secondary-rgb) / <alpha-value>)',
          500: 'rgb(var(--role-primary-rgb) / <alpha-value>)',
          600: 'rgb(var(--role-primary-rgb) / <alpha-value>)',
          700: 'rgb(var(--role-dark-rgb) / <alpha-value>)',
          800: 'rgb(var(--role-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--role-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--role-950-rgb) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
