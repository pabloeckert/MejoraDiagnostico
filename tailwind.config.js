/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mc-rojo':       '#D9072D',
        'mc-azul-marino':'#020659',
        'mc-azul':       '#1C4D8C',
        'mc-amarillo':   '#F2BB16',
        'mc-negro':      '#0D0D0D',
        'mc-gris':       '#656565',
        'mc-gris-claro': '#F2F2F2',
      },
      fontFamily: {
        spartan: ['"League Spartan"', 'sans-serif'],
      },
      fontWeight: {
        '300': '300',
        '400': '400',
        '600': '600',
        '700': '700',
      },
      transitionDuration: {
        '400': '400ms',
      },
      keyframes: {
        'option-select': {
          '0%':   { transform: 'scale(1)' },
          '40%':  { transform: 'scale(0.97)' },
          '70%':  { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%':   { transform: 'translateX(32px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        'slide-out-left': {
          '0%':   { transform: 'translateX(0)',     opacity: '1' },
          '100%': { transform: 'translateX(-32px)', opacity: '0' },
        },
        'btn-activate': {
          '0%':   { boxShadow: '0 0 0 0 rgba(28, 77, 140, 0.4)' },
          '70%':  { boxShadow: '0 0 0 8px rgba(28, 77, 140, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(28, 77, 140, 0)' },
        },
      },
      animation: {
        'option-select':  'option-select 200ms ease-out',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-out-left': 'slide-out-left 180ms cubic-bezier(0.55, 0, 1, 0.45)',
        'btn-activate':   'btn-activate 400ms ease-out',
      },
    },
  },
  plugins: [],
}
