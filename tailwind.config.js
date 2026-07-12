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
        'mc-rojo':       '#E1061E',
        'mc-azul-marino':'#020659',
        'mc-azul':       '#1A3D84',
        'mc-amarillo':   '#F7CC13',
        'mc-negro':      '#0D0D0D',
        'mc-gris':       '#656565',
        'mc-gris-claro': '#F2F2F2',
        'mc-tinta':      '#2B2B2B',
        'mc-gris-apoyo': '#6B7280',
      },
      fontFamily: {
        spartan: ['var(--font-league-spartan)', '"League Spartan"', 'sans-serif'],
        modelica: ['"Bw Modelica"', 'var(--font-bw-modelica)', 'sans-serif'],
      },
      fontWeight: {
        '300': '300',
        '400': '400',
        '600': '600',
        '700': '700',
      },
      padding: {
        'safe': 'env(safe-area-inset-bottom)',
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
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%':      { transform: 'translateX(-6px)' },
          '40%':      { transform: 'translateX(6px)' },
          '60%':      { transform: 'translateX(-4px)' },
          '80%':      { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'option-select':  'option-select 200ms ease-out',
        'slide-in-right': 'slide-in-right 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-out-left': 'slide-out-left 380ms cubic-bezier(0.55, 0, 1, 0.45)',
        'btn-activate':   'btn-activate 400ms ease-out',
        'shake':          'shake 400ms ease-in-out',
      },
    },
  },
  plugins: [],
}
