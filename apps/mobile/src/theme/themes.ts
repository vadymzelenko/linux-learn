/**
 * App + terminal themes. Text colours are chosen for WCAG AA contrast
 * (>= 4.5:1) against their background (checked in test/theme.test.ts).
 */
export type ThemeId = 'classic' | 'dracula' | 'solarized' | 'light';

export interface Theme {
  id: ThemeId;
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  /** Text drawn on top of `accent`. */
  onAccent: string;
  success: string;
  warning: string;
  danger: string;
  term: {
    bg: string;
    fg: string;
    user: string;
    path: string;
    cursor: string;
    selection: string;
    /** 16 ANSI colours: 0-7 normal, 8-15 bright. */
    ansi: string[];
  };
}

export const themes: Record<ThemeId, Theme> = {
  classic: {
    id: 'classic',
    dark: true,
    bg: '#0B0F14',
    surface: '#131A22',
    surface2: '#1B2430',
    border: '#263241',
    text: '#E6EDF3',
    textDim: '#9AA7B4',
    accent: '#3DDC84',
    onAccent: '#06240F',
    success: '#3DDC84',
    warning: '#F5C451',
    danger: '#FF6B6B',
    term: {
      bg: '#050805',
      fg: '#B8F5C8',
      user: '#3DDC84',
      path: '#5EA9FF',
      cursor: '#3DDC84',
      selection: '#1F3A28',
      ansi: ['#1B1B1B', '#FF5C57', '#5AF78E', '#F3F99D', '#57C7FF', '#FF6AC1', '#9AEDFE', '#F1F1F0', '#686868', '#FF5C57', '#5AF78E', '#F3F99D', '#57C7FF', '#FF6AC1', '#9AEDFE', '#FFFFFF'],
    },
  },
  dracula: {
    id: 'dracula',
    dark: true,
    bg: '#1E1F29',
    surface: '#282A36',
    surface2: '#343746',
    border: '#44475A',
    text: '#F8F8F2',
    textDim: '#B6B9CC',
    accent: '#BD93F9',
    onAccent: '#1E1F29',
    success: '#50FA7B',
    warning: '#F1FA8C',
    danger: '#FF5555',
    term: {
      bg: '#282A36',
      fg: '#F8F8F2',
      user: '#50FA7B',
      path: '#BD93F9',
      cursor: '#F8F8F2',
      selection: '#44475A',
      ansi: ['#21222C', '#FF5555', '#50FA7B', '#F1FA8C', '#BD93F9', '#FF79C6', '#8BE9FD', '#F8F8F2', '#6272A4', '#FF6E6E', '#69FF94', '#FFFFA5', '#D6ACFF', '#FF92DF', '#A4FFFF', '#FFFFFF'],
    },
  },
  solarized: {
    id: 'solarized',
    dark: true,
    bg: '#00212B',
    surface: '#002B36',
    surface2: '#073642',
    border: '#0E4B5A',
    text: '#EEE8D5',
    textDim: '#A3B4B6',
    accent: '#2AA198',
    onAccent: '#002B36',
    success: '#859900',
    warning: '#B58900',
    danger: '#DC322F',
    term: {
      bg: '#002B36',
      fg: '#C5CFD0',
      user: '#859900',
      path: '#4E9FE0',
      cursor: '#93A1A1',
      selection: '#073642',
      ansi: ['#073642', '#DC322F', '#859900', '#B58900', '#4E9FE0', '#D33682', '#2AA198', '#EEE8D5', '#657B83', '#E85C59', '#A8BF00', '#D9A400', '#6FB3E8', '#E26BA5', '#44C2B8', '#FDF6E3'],
    },
  },
  light: {
    id: 'light',
    dark: false,
    bg: '#F6F7F9',
    surface: '#FFFFFF',
    surface2: '#EEF1F4',
    border: '#D7DDE3',
    text: '#14181F',
    textDim: '#4F5B67',
    accent: '#0B7A3E',
    onAccent: '#FFFFFF',
    success: '#0B7A3E',
    warning: '#8A5A00',
    danger: '#B42318',
    term: {
      bg: '#FDFDFC',
      fg: '#1F2328',
      user: '#0B7A3E',
      path: '#0550AE',
      cursor: '#1F2328',
      selection: '#DDF4E4',
      ansi: ['#24292F', '#B42318', '#0B7A3E', '#7A5800', '#0550AE', '#8250DF', '#0A6B76', '#57606A', '#57606A', '#C0362C', '#116329', '#6E5000', '#0349A0', '#7A3FD0', '#085E68', '#24292F'],
    },
  },
};

export const THEME_IDS = Object.keys(themes) as ThemeId[];

/** Relative luminance & contrast ratio (WCAG 2.x). */
export function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}
