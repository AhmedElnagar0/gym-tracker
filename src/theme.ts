// Visual constants. Sizes are in points (iOS logical pixels).

export const colors = {
  light: {
    text: '#11181C',
    textMuted: '#60646C',
    background: '#FFFFFF',
    surface: '#F0F0F3',
    border: '#D9D9E0',
    accent: '#0A7EA4',
    danger: '#CE2C31',
    ok: '#218358',
  },
  dark: {
    text: '#ECEDEE',
    textMuted: '#B0B4BA',
    background: '#111113',
    surface: '#212225',
    border: '#363A3F',
    accent: '#3BAFD6',
    danger: '#FF6369',
    ok: '#3DD68C',
  },
} as const;

export type Palette = { [K in keyof (typeof colors)['light']]: string };

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

export const fontSize = { small: 13, body: 17, large: 22, title: 28 } as const;

// Minimum height/width for anything tappable. Apple's guideline is 44pt; gym use
// (sweaty thumbs, quick glances) gets more.
export const TAP_TARGET = 56;
