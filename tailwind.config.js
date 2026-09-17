/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Light Maroon Brand Palette
        maroon: {
          50: '#FDF7F8',
          100: '#F9ECEF',
          200: '#F4D5DB',
          300: '#EAB2BC',
          400: '#DB8393',
          500: '#C5546C',
          600: '#A43950',
          700: '#862B3F',
          800: '#6E2535',
          900: '#5A202D',
          950: '#3D111C',
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
        // Warm Ivory Application Canvas
        canvas: {
          base: '#FAF8F5',
          card: '#FFFFFF',
          subtle: '#F6F3EE',
          muted: '#EFECE6',
        },
        // Soft border palette
        borderlight: {
          DEFAULT: '#E7E2D8',
          subtle: '#F0ECE4',
          strong: '#D5CEC2',
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
