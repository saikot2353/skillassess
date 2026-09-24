/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Maroon Palette (used for buttons & active states)
        maroon: {
          50: '#FDF2F4',
          100: '#FCE7EB',
          200: '#F7D0D8',
          300: '#EEAAB7',
          400: '#E0758B',
          500: '#C74A64',
          600: '#B5435B',
          700: '#A43950',
          800: '#8E2F43',
          900: '#7D283A',
          950: '#551924',
        },
        // Elegant Gold Palette
        gold: {
          50: '#FDFBF5',
          100: '#FBF6E9',
          200: '#F5ECCB',
          300: '#EDDDA2',
          400: '#E2C76C',
          500: '#D4AF37',
          600: '#B88E28',
          700: '#946E20',
          800: '#7A581F',
          900: '#67491F',
          950: '#3C280D',
        },
        // Fully White Application Canvas
        canvas: {
          base: '#FFFFFF',
          card: '#FFFFFF',
          subtle: '#FFFFFF',
          muted: '#F9FAFB',
        },
        // Clean neutral border palette
        borderlight: {
          DEFAULT: '#E5E7EB',
          subtle: '#F3F4F6',
          strong: '#D1D5DB',
        }
      },
      fontFamily: {
        sans: [
          'IBM Plex Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        arabic: [
          'Cairo',
          'Tajawal',
          'IBM Plex Sans Arabic',
          'Segoe UI',
          'Tahoma',
          'sans-serif'
        ]
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
        'elevated': '0 4px 14px 0 rgba(70, 20, 30, 0.05)',
        'modal': '0 10px 30px rgba(70, 20, 30, 0.08)',
      }
    },
  },
  plugins: [],
}
