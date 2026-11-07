import { useMemo, useState } from 'react';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KbTextInput } from '../components/terminal/KbTextInput';
import { KeyboardDock } from '../components/terminal/KeyboardDock';
import { glossary, tr } from '@linux-learn/content';
import { Text } from '../theme/Text';
import { BackButton } from '../components/BackButton';
import { useTheme, MONO, space } from '../theme';
import { H1, IconButton, Row, Screen } from '../components/ui';

const ORDER = ['basics', 'files', 'text', 'permissions', 'processes', 'shell', 'network', 'noc', 'docker'];

export default function GlossaryScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ q?: string }>();
  const [q, setQ] = useState(params.q ?? '');
  const [open, setOpen] = useState<string | null>(null);
  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = glossary
      .filter((g) => !needle || tr(g.term, i18n.language).toLowerCase().includes(needle) || g.term.en.toLowerCase().includes(needle) || tr(g.definition, i18n.language).toLowerCase().includes(needle))
      .sort((a, b) => tr(a.term, i18n.language).localeCompare(tr(b.term, i18n.language), i18n.language));
    return ORDER.map((cat) => ({ title: t(`glossary.categories.${cat}` as 'glossary.categories.basics'), data: list.filter((g) => g.category === cat) })).filter((s) => s.data.length);
  }, [q, i18n.language, t]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <H1 style={{ fontSize: 24 }}>{t('glossary.title')}</H1>
        <Text style={{ color: theme.textDim, marginLeft: 'auto', marginRight: space.md }}>{t('glossary.count', { n: glossary.length })}</Text>
      </Row>
      <KbTextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('glossary.search')}
        placeholderTextColor={theme.textDim}
        autoCorrect={false}
        accessibilityLabel={t('glossary.search')}
        style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, fontFamily: 'Onest_400Regular' }]}
      />
      <SectionList
        sections={sections}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, maxWidth: 820, width: '100%', alignSelf: 'center' }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={[styles.section, { color: theme.accent }]}>{section.title.toUpperCase()}</Text>}
        renderItem={({ item }) => {
          const expanded = open === item.id || q.length > 1;
          return (
            <Pressable
              onPress={() => setOpen(open === item.id ? null : item.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: expanded ? theme.accent : theme.border }]}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, flex: 1 }}>{tr(item.term, i18n.language)}</Text>
                {i18n.language !== 'en' ? <Text style={{ color: theme.textDim, fontSize: 13 }}>{item.term.en}</Text> : null}
              </Row>
              {expanded ? (
                <View style={{ gap: 8, marginTop: 6 }}>
                  <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{tr(item.definition, i18n.language)}</Text>
                  {item.command ? (
                    <Text onPress={() => router.push({ pathname: '/reference', params: { cmd: item.command } })} style={{ color: theme.accent, fontFamily: MONO }}>
                      man {item.command} →
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />
      <KeyboardDock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: space.lg, marginBottom: space.sm, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, maxWidth: 820, alignSelf: 'center', width: '92%' },
  section: { fontWeight: '800', fontSize: 12, letterSpacing: 1, marginTop: space.lg, marginBottom: space.sm },
  row: { padding: space.md, borderRadius: 14, marginBottom: 8, borderWidth: 1 },
});
