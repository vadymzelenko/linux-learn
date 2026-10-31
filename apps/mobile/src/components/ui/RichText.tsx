import { Text, type TextStyle } from 'react-native';
import { useTheme, MONO } from '../../theme';

/**
 * Tiny markdown subset used in lesson texts: paragraphs, **bold**, *italic*
 * and `code`. Tapping code calls onCode (pastes the command into the terminal).
 */
export function RichText({ text, onCode, style }: { text: string; onCode?: (code: string) => void; style?: TextStyle }) {
  const t = useTheme();
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, pi) => (
        <Text key={pi} style={[{ color: t.text, fontSize: 16, lineHeight: 24, marginBottom: 12 }, style]}>
          {p.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
            if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
              const code = part.slice(1, -1);
              return (
                <Text
                  key={i}
                  onPress={onCode ? () => onCode(code) : undefined}
                  suppressHighlighting={false}
                  accessibilityRole={onCode ? 'button' : undefined}
                  style={{ fontFamily: MONO, color: t.accent, backgroundColor: t.surface2, fontSize: 15 }}
                >
                  {` ${code} `}
                </Text>
              );
            }
            if (part.startsWith('**') && part.endsWith('**')) return <Text key={i} style={{ fontWeight: '800' }}>{part.slice(2, -2)}</Text>;
            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <Text key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
            return part;
          })}
        </Text>
      ))}
    </>
  );
}
