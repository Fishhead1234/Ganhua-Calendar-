/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          bg: '#F9F6F0',
          card: '#FAF7F0',
          warm: '#F3EFE6',
          edge: '#E6DFD1',
          ink: '#2D2D2D',
          muted: '#6E6A63',
          seal: '#C83E31',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Songti TC"', '"PMingLiU"', 'Georgia', 'serif'],
        sans: ['"Noto Sans TC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
};

