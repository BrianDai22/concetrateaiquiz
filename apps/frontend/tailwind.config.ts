import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6FC2FF',
          50: '#E6F5FF',
          100: '#CCE9FF',
          200: '#99D4FF',
          300: '#6FC2FF',
          400: '#3CAFFF',
          500: '#0A9CFF',
          600: '#0080D6',
          700: '#0064AD',
          800: '#004884',
          900: '#002C5B',
        },
        neutral: {
          DEFAULT: '#383838',
          50: '#F8F8F7',
          100: '#F4EFEA',
          200: '#E8E8E8',
          300: '#C8C8C8',
          400: '#A1A1A1',
          500: '#7A7A7A',
          600: '#5C5C5C',
          700: '#383838',
          800: '#252525',
          900: '#121212',
        },
        accent: {
          yellow: '#FFDE00',
          green: '#E8F5E9',
        },
      },
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '2px',
        md: '4px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};

export default config;
