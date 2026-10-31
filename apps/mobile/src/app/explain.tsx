import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { explain, type ExplainKind } from '@linux-learn/engine';
import { useTheme, MONO, space } from '../theme';
import { Body, H1, IconButton, Row, Screen } from '../components/ui';
import { Text } from '../theme/Text';

const EXAMPLES = ['ls -lah /var/log', 'grep -rn TODO src/ | wc -l', 'find . -name "*.tmp" -mtime +7 -delete', 'sort access.log | uniq -c | sort -rn | head -5', 'sudo chown -R www-data:www-data /var/www', 'tar -czf backup.tar.gz ~/project 2>/dev/null'];

export default function ExplainScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [line, setLine] = useState(EXAMPLES[1]!);
  const result = useMemo(() => explain(line), [line]);
  const kindColor: Record<ExplainKind, string> = {
    command: theme.term.user,
    flag: theme.warning,
    value: theme.term.ansi[6]!,
    arg: theme.term.path,
    operator: theme.term.ansi[5]!,
    redirect: theme.term.ansi[5]!,
    assignment: theme.term.ansi[3]!,
    unknown: theme.danger,
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <IconButton icon="x" label={t('common.close')} onPress={() => router.back()} />
        <H1 style={{ fontSize: 22 }}>{t('explain.title')}</H1>
      </Row>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <TextInput
          value={line}
          onChangeText={setLine}
          placeholder={t('explain.placeholder')}
          placeholderTextColor={theme.textDim}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          autoComplete="off"
          multiline
          accessibilityLabel={t('explain.title')}
          style={[styles.input, { color: theme.term.fg, backgroundColor: theme.term.bg, borderColor: theme.border }]}
        />
        {result.parts.length ? (
          <Text style={[styles.colored, { backgroundColor: theme.term.bg }]}>
            {result.parts.map((p, i) => (
              <Text key={i} style={{ color: kindColor[p.kind] }}>
                {p.text}
                {i < result.parts.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Text>
        ) : null}
        {result.error ? <Text style={{ color: theme.danger }}>{t('explain.error', { error: result.error })}</Text> : null}
        {!line.trim() ? <Body dim>{t('explain.empty')}</Body> : null}
        <View style={{ gap: space.sm }}>
          {result.parts.map((p, i) => (
            <View key={i} style={[styles.part, { backgroundColor: theme.surface, borderLeftColor: kindColor[p.kind] }]}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: MONO, color: kindColor[p.kind], fontSize: 16, flexShrink: 1 }}>{p.text}</Text>
                <Text style={{ color: theme.textDim, fontSize: 12 }}>{t(`explain.kinds.${p.kind}`)}</Text>
              </Row>
              <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>
                {p.key && t(`explainKeys.${p.key}`, { defaultValue: '', ...(p.params ?? {}) }) ? t(`explainKeys.${p.key}`, p.params ?? {}) : p.description}
              </Text>
            </View>
          ))}
        </View>
        <Text style={{ color: theme.textDim, fontWeight: '800', marginTop: space.md }}>{t('explain.examples')}</Text>
        {EXAMPLES.map((ex) => (
          <Text key={ex} onPress={() => setLine(ex)} accessibilityRole="button" style={{ fontFamily: MONO, color: theme.accent, paddingVertical: 6 }}>
            $ {ex}
          </Text>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, maxWidth: 820, width: '100%', alignSelf: 'center' },
  input: { fontFamily: MONO, fontSize: 15, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 56 },
  colored: { fontFamily: MONO, fontSize: 15, padding: 12, borderRadius: 12 },
  part: { padding: space.md, borderRadius: 12, borderLeftWidth: 4, gap: 6 },
});
