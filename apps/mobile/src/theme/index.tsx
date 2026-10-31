import { createContext, useContext, type ReactNode } from 'react';
import { themes, type Theme } from './themes';
import { useStore } from '../state/store';

const ThemeContext = createContext<Theme>(themes.classic);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const id = useStore((s) => s.settings.theme);
  return <ThemeContext.Provider value={themes[id] ?? themes.classic}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

export const MONO = 'JetBrainsMono_400Regular';
export const MONO_BOLD = 'JetBrainsMono_700Bold';

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const;
