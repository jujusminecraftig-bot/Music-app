import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        background: '#07070f',
        foreground: '#f0f0ff',
        primary: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          glow: 'rgba(124, 58, 237, 0.4)',
        },
        accent: {
          DEFAULT: '#a855f7',
          hover: '#9333ea',
        },
        pink: {
          DEFAULT: '#ec4899',
          hover: '#db2777',
          glow: 'rgba(236, 72, 153, 0.3)',
        },
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.04)',
          hover: 'rgba(255, 255, 255, 0.08)',
          strong: 'rgba(255, 255, 255, 0.07)',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.12)',
        },
        muted: '#8b8ba7',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'spin-slow': 'spin 4s linear infinite',
        'spin-vinyl': 'spin 3s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'eq-bar': 'equalizer-bounce 0.8s ease-in-out infinite alternate',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'bg-shift': 'bgShift 15s ease-in-out infinite alternate',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(124, 58, 237, 0.3)',
        'glow': '0 0 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(124, 58, 237, 0.15)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3), 0 0 40px rgba(236, 72, 153, 0.1)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(124, 58, 237, 0.2)',
      },
    },
  },
  plugins: [],
}

export default config
