/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F9FA',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
        },
        'text-primary': '#1E293B',
        'text-muted': '#64748B',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans JP', 'sans-serif'],
        jp: ['Noto Sans JP', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
