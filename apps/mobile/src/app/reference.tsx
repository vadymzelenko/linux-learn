import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { commandList, formatMan, type CommandDef } from '@linux-learn/engine';
import { useTheme, MONO, MONO_BOLD, space } from '../theme';
import { H1, IconButton, Row, Screen } from '../components/ui';
import { AnsiText } from '../components/terminal/AnsiText';
import { Text } from '../theme/Text';

const ORDER = ['navigation', 'files', 'text', 'search', 'permissions', 'system', 'network', 'shell', 'help'] as const;

export default function ReferenceScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const params = useLocalSearchParams<{ cmd?: string }>();
  const [open, setOpen] = useState<CommandDef | null>(() => (params.cmd ? (commandList().find((c) => c.name === params.cmd) ?? null) : null));
  const sections = useMemo(() => {
    const list = commandList().filter((c) => !q || c.name.includes(q.toLowerCase()) || c.doc.summary.toLowerCase().includes(q.toLowerCase()));
    return ORDER.map((cat) => ({ title: t(`reference.categories.${cat}`), data: list.filter((c) => (c.category ?? 'shell') === cat) })).filter((s) => s.data.length);
  }, [q, t]);

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <IconButton icon="x" label={t('common.close')} onPress={() => router.back()} />
        <H1 style={{ fontSize: 22 }}>{t('reference.title')}</H1>
      </Row>
      <TextInput
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
              {item.doc.summary}
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
          <ScrollView contentContainerStyle={{ padding: space.md }} horizontal={false}>
            <ScrollView horizontal>
              <View>{open ? <AnsiText text={formatMan(open, 72)} style={{ fontSize: 13, lineHeight: 19 }} /> : null}</View>
            </ScrollView>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginHorizontal: space.lg, marginBottom: space.sm, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  section: { fontWeight: '800', fontSize: 12, letterSpacing: 1, marginTop: space.lg, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: 12, marginBottom: 6, minHeight: 52 },
});
