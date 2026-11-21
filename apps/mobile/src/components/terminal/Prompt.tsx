
import type { PromptParts } from '@linux-learn/engine';
import { useTheme, MONO_BOLD } from '../../theme';
import { Text } from '../../theme/Text';

export function PromptText({ prompt, fontSize }: { prompt: PromptParts; fontSize: number }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: MONO_BOLD, fontSize, lineHeight: fontSize * 1.45 }}>
      <Text style={{ color: t.term.user }}>{`${prompt.user}@${prompt.host}`}</Text>
      <Text style={{ color: t.term.fg, opacity: 0.6 }}>:</Text>
      <Text style={{ color: t.term.path }}>{prompt.path}</Text>
      <Text style={{ color: prompt.symbol === '#' ? t.danger : t.term.cursor }}>{`${prompt.symbol} `}</Text>
    </Text>
  );
}
