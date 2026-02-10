/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ===== DAFC BRAND COLORS =====
      colors: {
        // Brand Colors
        dafc: {
          gold: {
            DEFAULT: '#D7B797',
            light: '#E8D4C0',
            dark: '#B89970',
            darker: '#8A6340',
          },
          green: {
            DEFAULT: '#127749',
            light: '#2A9E6A',
            dark: '#095431',
          },
        },

        // Surface Colors (Dark Theme)
        surface: {
          DEFAULT: '#121212',
          secondary: '#1A1A1A',
          elevated: '#242424',
          overlay: 'rgba(36, 36, 36, 0.5)',
        },
        canvas: '#000000',

        // Content/Text Colors
        content: {
          DEFAULT: '#F2F2F2',
          secondary: '#999999',
          muted: '#666666',
          inverse: '#000000',
        },

        // Border Colors
        border: {
          DEFAULT: '#2E2E2E',
          muted: '#1A1A1A',
          emphasis: '#3D3D3D',
        },

        // Status Colors
        status: {
          critical: {
            DEFAULT: '#F85149',
            muted: 'rgba(248, 81, 73, 0.15)',
            text: '#FF7B72',
          },
          warning: {
            DEFAULT: '#D29922',
            muted: 'rgba(210, 153, 34, 0.15)',
            text: '#E3B341',
          },
          success: {
            DEFAULT: '#127749',
            muted: 'rgba(18, 119, 73, 0.15)',
            text: '#2A9E6A',
          },
          info: {
            DEFAULT: '#58A6FF',
            muted: 'rgba(88, 166, 255, 0.15)',
            text: '#79C0FF',
          },
          neutral: {
            DEFAULT: '#8B949E',
            muted: 'rgba(139, 148, 158, 0.15)',
          },
        },

        // Data Visualization
        data: {
          positive: '#127749',
          negative: '#F85149',
          neutral: '#8B949E',
        },

        // Chart Colors
        chart: {
          1: '#D7B797',
          2: '#2A9E6A',
          3: '#D29922',
          4: '#A371F7',
          5: '#F85149',
          6: '#8B949E',
          7: '#58A6FF',
          8: '#48CAE4',
        },

        // AI/Special Colors
        ai: {
          DEFAULT: '#A371F7',
          muted: 'rgba(163, 113, 247, 0.15)',
          text: '#D2A8FF',
        },
      },

      // ===== TYPOGRAPHY =====
      fontFamily: {
        brand: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        data: ['var(--font-jetbrains-mono)', 'Consolas', 'monospace'],
        mono: ['var(--font-jetbrains-mono)', 'Consolas', 'monospace'],
      },

      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['13px', { lineHeight: '18px' }],
        'base': ['14px', { lineHeight: '20px' }],
        'md': ['16px', { lineHeight: '22px' }],
        'lg': ['18px', { lineHeight: '26px' }],
        'xl': ['22px', { lineHeight: '30px' }],
        '2xl': ['26px', { lineHeight: '34px' }],
        '3xl': ['34px', { lineHeight: '42px' }],
      },

      // ===== SPACING (Compact Scale - 2px base) =====
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },

      // ===== COMPONENT HEIGHTS =====
      height: {
        'header': '48px',
        'row': '36px',
        'row-compact': '32px',
        'input': '36px',
        'input-sm': '32px',
        'input-lg': '40px',
        'btn': '32px',
        'btn-sm': '28px',
        'btn-lg': '40px',
      },

      // ===== COMPONENT WIDTHS =====
      width: {
        'sidebar': '240px',
        'sidebar-collapsed': '48px',
        'panel-sm': '400px',
        'panel-md': '480px',
        'panel-lg': '560px',
        'btn': '32px',
      },

      // ===== BORDER RADIUS (Flat Design) =====
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',
        '2xl': '12px',
        'full': '9999px',
        'pill': '99px',
      },

      // ===== SHADOWS (Flat Design - Minimal) =====
      boxShadow: {
        'sm': 'none',
        'DEFAULT': 'none',
        'md': 'none',
        'lg': 'none',
        'xl': 'none',
        '2xl': 'none',
        'focus': '0 0 0 3px rgba(215, 183, 151, 0.3)',
        'glow': '0 0 20px rgba(215, 183, 151, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.12)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.24)',
        'tooltip': '0 4px 12px rgba(0, 0, 0, 0.5)',
        'none': 'none',
      },

      // ===== TRANSITIONS =====
      transitionDuration: {
        'fast': '100ms',
        'normal': '200ms',
        'slow': '300ms',
      },

      // ===== ANIMATIONS =====
      keyframes: {
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'slideDown': {
          'from': { opacity: '0', maxHeight: '0', transform: 'translateY(-10px)' },
          'to': { opacity: '1', maxHeight: '2000px', transform: 'translateY(0)' },
        },
        'slideUp': {
          'from': { opacity: '1', maxHeight: '2000px' },
          'to': { opacity: '0', maxHeight: '0' },
        },
        'fadeIn': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'scaleIn': {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },

      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'pulse-subtle': 'pulse-subtle 2s infinite',
        'slide-down': 'slideDown 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
