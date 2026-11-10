/** @type {import('tailwindcss').Config} */
// Tokens del sistema de diseño de SPAZIO (SDD §7.4 + diseño de Figma).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primario teal y su variante suave
        teal: {
          DEFAULT: '#16637A',
          soft: '#E6F0F3',
          600: '#12566A',
          700: '#0E4759',
        },
        // Texto
        ink: '#14303D', // texto principal
        subtle: '#6B7C86', // texto secundario
        // Superficies
        canvas: '#F4F6F8', // fondo de la app
        line: '#E3E8EC', // bordes de tarjetas
        // Estados
        success: { DEFAULT: '#1E7A4D', soft: '#E8F5EE' },
        warn: { DEFAULT: '#B45309', soft: '#FFF0E0' }, // advertencia-simulación
        danger: { DEFAULT: '#B42318', soft: '#FDECEC' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        md: '8px',
        lg: '10px',
        xl: '16px', // tarjetas
        '2xl': '20px', // modal
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,48,61,0.04), 0 1px 3px rgba(20,48,61,0.06)',
        pop: '0 12px 34px rgba(20,48,61,0.14)',
      },
      fontSize: {
        eyebrow: ['11px', { lineHeight: '14px', fontWeight: '700', letterSpacing: '0.08em' }],
      },
      minWidth: { touch: '44px' },
      minHeight: { touch: '44px' },
    },
  },
  plugins: [],
}
