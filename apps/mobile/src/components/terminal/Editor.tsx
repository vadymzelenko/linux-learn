import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme, MONO } from '../../theme';
import type { EditorState } from './useShell';
import { Text } from '../../theme/Text';

/** Simplified nano: edit, save (^O), exit (^X). */
export function Editor({ state, onSave, onClose }: { state: EditorState; onSave: (content: string) => string | null; onClose: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [text, setText] = useState(state.content);
  const [status, setStatus] = useState<string | null>(null);
  const name = state.path.split('/').pop() ?? state.path;
  const dirty = text !== state.content;

  const save = () => {
    const err = onSave(text);
    setStatus(err ? t('terminal.editorError', { file: name, error: err }) : t('terminal.editorSaved', { file: name }));
    return !err;
  };
  const exit = () => {
    if (!dirty) return onClose();
    if (Platform.OS === 'web') {
      if (save()) onClose();
      return;
    }
    Alert.alert(t('terminal.unsaved'), undefined, [
      { text: t('terminal.discard'), style: 'destructive', onPress: onClose },
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.save'), onPress: () => save() && onClose() },
    ]);
  };

  return (
    <Modal visible animationType="slide" onRequestClose={exit}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.term.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.title, { backgroundColor: theme.term.fg }]}>
            <Text style={[styles.mono, { color: theme.term.bg }]} numberOfLines={1}>
              {t('terminal.editorTitle', { file: state.path })}
              {dirty ? '  *' : ''}
            </Text>
          </View>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'}
            textAlignVertical="top"
            style={[styles.area, styles.mono, { color: theme.term.fg }]}
            accessibilityLabel={name}
          />
          {status ? <Text style={[styles.mono, styles.status, { color: theme.term.fg }]}>[ {status} ]</Text> : null}
          <View style={[styles.bar, { borderTopColor: theme.border }]}>
            <Pressable onPress={save} style={[styles.btn, { backgroundColor: theme.surface2 }]} accessibilityRole="button">
              <Text style={[styles.mono, { color: theme.text }]}>{t('terminal.editorSave')}</Text>
            </Pressable>
            <Pressable onPress={exit} style={[styles.btn, { backgroundColor: theme.surface2 }]} accessibilityRole="button">
              <Text style={[styles.mono, { color: theme.text }]}>{t('terminal.editorExit')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: 12, paddingVertical: 6 },
  mono: { fontFamily: MONO, fontSize: 14 },
  area: { flex: 1, padding: 12, lineHeight: 20 },
  status: { textAlign: 'center', paddingVertical: 4 },
  bar: { flexDirection: 'row', gap: 10, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
});
