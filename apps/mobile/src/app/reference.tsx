import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { KbTextInput } from '../components/terminal/KbTextInput';
import { KeyboardDock } from '../components/terminal/KeyboardDock';
import { commandList, formatMan, type CommandDef } from '@linux-learn/engine';
import { useTheme, MONO, MONO_BOLD, space } from '../theme';
import { H1, IconButton, Row, Screen } from '../components/ui';
import { AnsiText } from '../components/terminal/AnsiText';
import { Text } from '../theme/Text';
import { BackButton } from '../components/BackButton';
import { commandSummary, optionText } from '@linux-learn/content';

const ORDER = ['navigation', 'files', 'text', 'search', 'permissions', 'system', 'network', 'shell', 'help'] as const;

export default function ReferenceScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [q, setQ] = useState('');
  const params = useLocalSearchParams<{ cmd?: string }>();
  const [open, setOpen] = useState<CommandDef | null>(() => (params.cmd ? (commandList().find((c) => c.name === params.cmd) ?? null) : null));
  const sections = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = commandList().filter((c) => !needle || c.name.includes(needle) || c.doc.summary.toLowerCase().includes(needle) || commandSummary(c.name, lang, '').toLowerCase().includes(needle));
    return ORDER.map((cat) => ({ title: t(`reference.categories.${cat}`), data: list.filter((c) => (c.category ?? 'shell') === cat) })).filter((s) => s.data.length);
  }, [q, t, lang]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <H1 style={{ fontSize: 22 }}>{t('reference.title')}</H1>
      </Row>
      <KbTextInput
        value={q}
        onChangeText={setQ}
        placeholder={t('reference.search')}
        placeholderTextColor={theme.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t('reference.search')}
        style={[styles.search, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
      />
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.name}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => <Text style={[styles.section, { color: theme.textDim }]}>{section.title.toUpperCase()}</Text>}
        renderItem={({ item }) => (
          <Pressable onPress={() => setOpen(item)} accessibilityRole="button" style={({ pressed }) => [styles.row, { backgroundColor: pressed ? theme.surface2 : theme.surface }]}>
            <Text style={{ fontFamily: MONO_BOLD, color: theme.term.user, fontSize: 16, width: 90 }}>{item.name}</Text>
            <Text style={{ color: theme.text, flex: 1 }} numberOfLines={2}>
              {commandSummary(item.name, lang, item.doc.summary)}
            </Text>
          </Pressable>
        )}
      />
      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpen(null)}>
        <Screen edges={['top', 'bottom']} style={{ backgroundColor: theme.term.bg }}>
          <Row style={{ padding: space.sm }}>
            <IconButton icon="x" label={t('common.close')} onPress={() => setOpen(null)} color={theme.term.fg} />
            <Text style={{ fontFamily: MONO_BOLD, color: theme.term.fg, fontSize: 16 }}>man {open?.name}</Text>
          </Row>
          <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md }} horizontal={false}>
            {open && lang !== 'en' ? (
              <View style={[styles.local, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>
                  <Text style={{ fontFamily: MONO_BOLD, color: theme.term.user }}>{open.name}</Text> — {commandSummary(open.name, lang, open.doc.summary)}
                </Text>
                {(open.doc.options ?? []).map(([spec, desc]) => (
                  <View key={spec} style={{ gap: 2 }}>
                    <Text style={{ fontFamily: MONO, color: theme.warning, fontSize: 13 }}>{spec}</Text>
                    <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>{optionText(open.name, spec, lang, desc)}</Text>
                  </View>
                ))}
                <Text style={{ color: theme.textDim, fontSize: 12 }}>{t('reference.manEnglish')}</Text>
              </View>
            ) : null}
            <ScrollView horizontal>
              <View>{open ? <AnsiText text={formatMan(open, 72)} style={{ fontSize: 13, lineHeight: 19 }} /> : null}</View>
            </ScrollView>
          </ScrollView>
        </Screen>
      </Modal>
      <KeyboardDock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: space.lg, marginBottom: space.sm, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  section: { fontWeight: '800', fontSize: 12, letterSpacing: 1, marginTop: space.lg, marginBottom: space.sm },
  local: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: space.md, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: 12, marginBottom: 6, minHeight: 52 },
});
