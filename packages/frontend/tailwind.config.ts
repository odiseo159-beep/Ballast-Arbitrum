import type { Config } from 'tailwindcss';

// Design tokens lifted verbatim from the chat.html mockup (deep-ocean / gold / teal).
export default {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'deep-ocean': '#081826',
        midnight: '#10293F',
        gold: '#D6B36A',
        'gold-soft': '#E4C887',
        teal: '#5FA7A0',
        mist: '#F6F5F2',
        'soft-stone': '#D8D6D1',
        slate: '#7A848E',
        graphite: '#1D232A',
      },
      fontFamily: {
        display: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        line: 'rgba(214, 179, 106, 0.18)',
        'line-strong': 'rgba(214, 179, 106, 0.35)',
        card: 'rgba(255,255,255,0.06)',
      },
      backgroundColor: {
        surface: 'rgba(255,255,255,0.025)',
        'surface-2': 'rgba(255,255,255,0.04)',
      },
      keyframes: {
        fadeUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        blink: { '50%': { opacity: '0' } },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        fadeUp: 'fadeUp 600ms ease-out',
        pulseGold: 'pulseGold 2s ease-in-out infinite',
        blink: 'blink 1s steps(2) infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
