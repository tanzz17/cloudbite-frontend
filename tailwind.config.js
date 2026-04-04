/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        brand: {
          orange: '#f97316',
          'orange-dark': '#ea580c',
          'orange-light': '#fed7aa',
          cream: '#fffbf5',
          'dark-bg': '#0f0a05',
          'dark-surface': '#1a1108',
          'dark-card': '#241a0d',
          'dark-border': '#3d2f1a',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        hand: ['"Caveat"', 'cursive'],
        body: ['"Lato"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-in-out',
        'pulse-orange': 'pulseOrange 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseOrange: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249, 115, 22, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(249, 115, 22, 0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      boxShadow: {
        'orange': '0 4px 14px 0 rgba(249, 115, 22, 0.39)',
        'orange-lg': '0 10px 40px 0 rgba(249, 115, 22, 0.3)',
        'card': '0 2px 20px rgba(0,0,0,0.08)',
        'card-dark': '0 2px 20px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'orange-gradient': 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
        'orange-soft': 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1a1108 0%, #0f0a05 100%)',
        'hero-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },
  plugins: [],
}
