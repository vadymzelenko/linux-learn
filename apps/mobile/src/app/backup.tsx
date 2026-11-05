import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { useStore } from '../state/store';
import { useTheme, MONO, radius, space } from '../theme';
import { Body, Button, Card, FadeIn, H1, H2, Icon, Row, Screen } from '../components/ui';
import { BackButton } from '../components/BackButton';
import { infoDialog, useDialog } from '../components/Dialog';
import { Text } from '../theme/Text';
import { backupFileName, backupSummary, buildBackup, parseBackup, type Backup } from '../lib/backup';
import { pickBackupFile, saveBackupFile } from '../lib/backupIO';
import { feedback } from '../lib/haptics';

/** Export / import of progress and settings between devices. */
export default function BackupScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'file' | 'open' | null>(null);

  const json = () => {
    const s = useStore.getState();
    return JSON.stringify(buildBackup({ settings: s.settings, progress: s.progress, sandbox: s.sandbox }, Platform.OS));
  };

  const fail = (message: string) => {
    feedback.wrong();
    infoDialog({ title: t('backup.errTitle'), message, ok: t('common.ok'), icon: 'alert-triangle', tone: 'danger' });
  };

  const ask = (b: Backup) => {
    const sum = backupSummary(b);
    useDialog.getState().show({
      title: t('backup.confirmTitle'),
      message: `${t('backup.summary', sum)}\n\n${t('backup.mergeHint')}`,
      icon: 'download',
      tone: 'info',
      actions: [
        { label: t('common.cancel'), style: 'cancel' },
        { label: t('backup.replace'), style: 'destructive', onPress: () => apply(b, 'replace') },
        { label: t('backup.merge'), style: 'primary', onPress: () => apply(b, 'merge') },
      ],
    });
  };

  const apply = (b: Backup, mode: 'replace' | 'merge') => {
    useStore.getState().importBackup(b, mode);
    setText('');
    feedback.correct();
    useStore.getState().pushToast({ kind: 'text', text: t('backup.done') });
  };

  const importText = (raw: string) => {
    const r = parseBackup(raw);
    if (!r.ok) return fail(t(`backup.err.${r.error}`));
    ask(r.backup);
  };

  const saveFile = async () => {
    setBusy('file');
    try {
      const res = await saveBackupFile(backupFileName(), json());
      if (res === 'unavailable') infoDialog({ title: t('backup.title'), message: t('backup.shareUnavailable'), ok: t('common.ok') });
    } catch {
      fail(t('backup.shareUnavailable'));
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    await Clipboard.setStringAsync(json());
    feedback.correct();
    useStore.getState().pushToast({ kind: 'text', text: t('backup.copied') });
  };

  const openFile = async () => {
    setBusy('open');
    try {
      const content = await pickBackupFile();
      if (content !== null) importText(content);
    } catch {
      fail(t('backup.err.read'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <H1 style={{ fontSize: 24, flexShrink: 1 }}>{t('backup.title')}</H1>
      </Row>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <Body dim>{t('backup.entry')}</Body>
        </FadeIn>

        <FadeIn index={1}>
          <Card style={{ gap: space.md }}>
            <Text style={{ color: theme.text, fontWeight: '800' }}>{t('backup.how')}</Text>
            {[t('backup.step1'), t('backup.step2')].map((s, i) => (
              <Row key={i} gap={12} style={{ alignItems: 'flex-start' }}>
                <View style={[styles.num, { backgroundColor: theme.accent }]}>
                  <Text style={{ color: theme.onAccent, fontWeight: '800' }}>{i + 1}</Text>
                </View>
                <Body style={{ flex: 1 }}>{s}</Body>
              </Row>
            ))}
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <H2 style={styles.h}>{t('backup.export')}</H2>
          <View style={styles.buttons}>
            <Button icon="share" title={t('backup.saveFile')} loading={busy === 'file'} onPress={() => void saveFile()} style={styles.btn} />
            <Button icon="content-copy" variant="secondary" title={t('backup.copyText')} onPress={() => void copy()} style={styles.btn} />
          </View>
        </FadeIn>

        <FadeIn index={3}>
          <H2 style={styles.h}>{t('backup.import')}</H2>
          <View style={{ gap: space.md }}>
            <Button icon="folder-open" variant="secondary" title={t('backup.openFile')} loading={busy === 'open'} onPress={() => void openFile()} />
            <View style={[styles.paste, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t('backup.pastePlaceholder')}
                placeholderTextColor={theme.textDim}
                multiline
                autoCorrect={false}
                autoCapitalize="none"
                spellCheck={false}
                accessibilityLabel={t('backup.pastePlaceholder')}
                style={[styles.input, { color: theme.text }]}
              />
            </View>
            <Row style={{ flexWrap: 'wrap' }}>
              <Button
                small
                variant="secondary"
                icon="clipboard-arrow-down-outline"
                title={t('backup.pasteClipboard')}
                onPress={() => void Clipboard.getStringAsync().then((v) => setText(v))}
              />
              <Button small icon="download" title={t('backup.importText')} disabled={!text.trim()} onPress={() => importText(text)} style={{ flexGrow: 1 }} />
            </Row>
          </View>
        </FadeIn>

        <Row gap={10} style={{ alignItems: 'flex-start', marginTop: space.md }}>
          <Icon name="shield" size={18} color={theme.textDim} />
          <Body dim style={{ flex: 1, fontSize: 13 }}>
            {t('backup.privacy')}
          </Body>
        </Row>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },
  h: { marginTop: space.md, marginBottom: space.sm },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  btn: { flexGrow: 1, minWidth: 220 },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paste: { borderWidth: 1, borderRadius: radius.md, minHeight: 96 },
  input: { fontFamily: MONO, fontSize: 13, padding: 12, minHeight: 96, maxHeight: 200, textAlignVertical: 'top', ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
});
