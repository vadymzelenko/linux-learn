import { memo } from 'react';
import { type TextStyle } from 'react-native';
import { parseAnsi } from '@linux-learn/engine';
import { useTheme, MONO, MONO_BOLD } from '../../theme';
import { Text } from '../../theme/Text';

interface Props {
  text: string;
  style?: TextStyle;
}

/** Renders terminal text with ANSI SGR colours (ls, grep --color). */
export const AnsiText = memo(function AnsiText({ text, style }: Props) {
  const theme = useTheme();
  const { spans } = parseAnsi(text);
  return (
    <Text style={[{ color: theme.term.fg, fontFamily: MONO }, style]}>
      {spans.map((s, i) => {
        const idx = s.style.fg === undefined ? undefined : s.style.bold && s.style.fg < 8 ? s.style.fg + 8 : s.style.fg;
        const color = idx === undefined ? undefined : theme.term.ansi[idx];
        if (!color && !s.style.bold && s.style.bg === undefined) return s.text;
        return (
          <Text
            key={i}
            style={{
              ...(color ? { color } : {}),
              ...(s.style.bold ? { fontFamily: MONO_BOLD } : {}),
              ...(s.style.bg !== undefined ? { backgroundColor: theme.term.ansi[s.style.bg] } : {}),
            }}
          >
            {s.text}
          </Text>
        );
      })}
    </Text>
  );
});
