export const theme = {
  colors: {
    primary: 'hsl(144, 48%, 19%)',
    'primary-light': 'hsl(144, 41%, 30%)',
    'primary-dark': 'hsl(144, 46%, 11%)',
    accent: 'hsl(43, 65%, 52%)',
    'accent-light': 'hsl(48, 78%, 59%)',
    'accent-dark': 'hsl(42, 72%, 42%)',
    success: 'hsl(160, 84%, 39%)',
    warning: 'hsl(25, 95%, 53%)',
    danger: 'hsl(0, 84%, 60%)',
  },
  fonts: {
    base: '"Inter", sans-serif',
    display: '"Playfair Display", serif',
    serif: '"Lora", serif',
    mono: '"JetBrains Mono", monospace',
  },
} as const;

export type Theme = typeof theme;
