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
    },
  },
  plugins: [],
}
