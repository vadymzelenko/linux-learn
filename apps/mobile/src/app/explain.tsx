import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { explain, type ExplainFlag, type ExplainKind, type ExplainPart } from '@linux-learn/engine';
import { commandSummary, optionText } from '@linux-learn/content';
import { useTheme, MONO, MONO_BOLD, space } from '../theme';
import { Body, H1, Icon, IconButton, Row, Screen } from '../components/ui';
import { Text } from '../theme/Text';
import { BackButton } from '../components/BackButton';
import { haptic } from '../lib/haptics';

const EXAMPLES = [
  'ls -lah /var/log',
  'grep -rn TODO src/ | wc -l',
  'find . -name "*.tmp" -mtime +7 -delete',
  'sort access.log | uniq -c | sort -rn | head -5',
  'sudo chown -R www-data:www-data /var/www',
  'chmod 750 deploy.sh && ./deploy.sh 2>/dev/null',
  "awk -F: '{print $1, $7}' /etc/passwd",
  'sed -i "s/http:/https:/g" site.conf',
  'for f in *.log; do gzip "$f"; done',
  'docker run -d --name web -p 8080:80 nginx',
];

/** One translated text for a part (or one flag inside a combined `-la`). */
function useDescribe() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const keyText = (key: string | undefined, params: Record<string, string> | undefined, fallback: string) => {
    if (!key) return fallback;
    const v = t(`explainKeys.${key}`, { defaultValue: '', ...(params ?? {}), interpolation: { escapeValue: false } });
    return v || fallback;
  };
  const flag = (f: ExplainFlag, owner?: string) => (f.spec ? optionText(owner, f.spec, lang, f.description) : keyText(f.key, f.params, f.description));
  const part = (p: ExplainPart): string => {
    if (p.command) return commandSummary(p.command, lang, p.description);
    if (p.spec) return optionText(p.owner, p.spec, lang, p.description);
    return keyText(p.key, p.params, p.description);
  };
  return { flag, part };
}

export default function ExplainScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ cmd?: string }>();
  const [line, setLine] = useState(params.cmd ?? EXAMPLES[1]!);
  const result = useMemo(() => explain(line), [line]);
  const describe = useDescribe();
  const kindColor: Record<ExplainKind, string> = {
    command: theme.term.user,
    subcommand: theme.term.ansi[6]!,
    flag: theme.warning,
    value: theme.term.ansi[6]!,
    arg: theme.term.path,
    operator: theme.term.ansi[5]!,
    redirect: theme.term.ansi[5]!,
    assignment: theme.term.ansi[3]!,
    keyword: theme.term.ansi[5]!,
    unknown: theme.danger,
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <H1 style={{ fontSize: 22 }}>{t('explain.title')}</H1>
      </Row>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={[styles.inputWrap, { backgroundColor: theme.term.bg, borderColor: theme.border }]}>
          <Text style={{ fontFamily: MONO_BOLD, color: theme.term.user, fontSize: 15, paddingTop: 14 }}>$</Text>
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
            style={[styles.input, { color: theme.term.fg }]}
          />
          {line ? (
            <Pressable onPress={() => setLine('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.clear')} style={{ paddingTop: 12 }}>
              <Icon name="x" size={18} color={theme.textDim} />
            </Pressable>
          ) : null}
        </View>

        {result.parts.length ? (
          <View style={[styles.colored, { backgroundColor: theme.term.bg, borderColor: theme.border }]}>
            <Text style={{ fontFamily: MONO, fontSize: 15, lineHeight: 22 }}>
              {result.parts.map((p, i) => (
                <Text key={i} style={{ fontFamily: MONO, color: kindColor[p.kind] }}>
                  {p.text}
                  {i < result.parts.length - 1 ? ' ' : ''}
                </Text>
              ))}
            </Text>
          </View>
        ) : null}
        {result.error ? (
          <Row style={[styles.error, { backgroundColor: theme.surface, borderColor: theme.danger }]}>
            <Icon name="alert-triangle" size={18} color={theme.danger} />
            <Text style={{ color: theme.text, flex: 1 }}>{t('explain.error', { error: result.error })}</Text>
          </Row>
        ) : null}
        {!line.trim() ? <Body dim>{t('explain.empty')}</Body> : null}

        <View style={{ gap: space.sm }}>
          {result.parts.map((p, i) => (
            <View key={i} style={[styles.part, { backgroundColor: theme.surface, borderLeftColor: kindColor[p.kind] }]}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontFamily: MONO, color: kindColor[p.kind], fontSize: 16, flexShrink: 1 }}>{p.text}</Text>
                <Text style={{ color: theme.textDim, fontSize: 12 }}>{t(`explain.kinds.${p.kind}`)}</Text>
              </Row>
              {p.flags ? (
                <View style={{ gap: 6 }}>
                  {p.flags.map((f, k) => (
                    <Row key={k} gap={10} style={{ alignItems: 'flex-start' }}>
                      <Text style={{ fontFamily: MONO, color: f.key === 'explain.optionValue' ? kindColor.value : kindColor.flag, fontSize: 14, minWidth: 28 }}>{f.flag}</Text>
                      <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21, flex: 1 }}>{describe.flag(f, p.owner)}</Text>
                    </Row>
                  ))}
                </View>
              ) : (
                <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21 }}>{describe.part(p)}</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={{ color: theme.textDim, fontWeight: '800', marginTop: space.md, fontSize: 13, letterSpacing: 1 }}>{t('explain.examples').toUpperCase()}</Text>
        <View style={{ gap: 6 }}>
          {EXAMPLES.map((ex) => (
            <Pressable
              key={ex}
              onPress={() => {
                haptic.tap();
                setLine(ex);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.example, { backgroundColor: pressed ? theme.surface2 : theme.surface, borderColor: ex === line ? theme.accent : theme.border }]}
            >
              <Text style={{ fontFamily: MONO, color: theme.term.user }}>$ </Text>
              <Text style={{ fontFamily: MONO, color: theme.text, flex: 1 }} numberOfLines={1}>
                {ex}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, gap: space.md, maxWidth: 820, width: '100%', alignSelf: 'center', paddingBottom: space.xxl },
  inputWrap: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, minHeight: 56 },
  input: { flex: 1, fontFamily: MONO, fontSize: 15, paddingVertical: 14, minHeight: 56 },
  colored: { padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  error: { padding: 12, borderRadius: 12, borderWidth: 1 },
  part: { padding: space.md, borderRadius: 12, borderLeftWidth: 4, gap: 8 },
  example: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
});
