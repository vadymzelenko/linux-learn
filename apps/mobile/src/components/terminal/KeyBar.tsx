import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon } from '../ui/Icon';
import { useTranslation } from 'react-i18next';
import { useTheme, MONO } from '../../theme';
import { Text } from '../../theme/Text';

export type SpecialKey = 'tab' | 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'ctrl' | 'esc' | string;

const KEYS: { key: SpecialKey; label: string; a11y?: string }[] = [
  { key: 'tab', label: 'Tab' },
  { key: 'up', label: '↑', a11y: 'history up' },
  { key: 'down', label: '↓', a11y: 'history down' },
  { key: 'left', label: '←', a11y: 'cursor left' },
  { key: 'right', label: '→', a11y: 'cursor right' },
  { key: 'ctrl', label: 'Ctrl' },
  { key: 'esc', label: 'Esc' },
  ...['|', '>', '<', '~', '/', '-', '$', '*', '&', ';', '"', "'", '.', '_', '='].map((c) => ({ key: c, label: c })),
];

/** Extra keys above the system keyboard: everything a phone keyboard hides. */
export function KeyBar({ onKey, ctrl, onRun, onHide }: { onKey: (k: SpecialKey) => void; ctrl: boolean; onRun: () => void; onHide?: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.bar, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.row}>
        {KEYS.map((k) => {
          const active = k.key === 'ctrl' && ctrl;
          return (
            <Pressable
              key={k.key}
              onPress={() => onKey(k.key)}
              accessibilityRole="button"
              accessibilityLabel={k.a11y ?? k.label}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.key,
                { backgroundColor: active ? theme.accent : pressed ? theme.border : theme.surface2 },
              ]}
            >
              <Text style={[styles.label, { color: active ? theme.onAccent : theme.text }]}>{k.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {onHide && Platform.OS !== 'web' ? (
        // in full-screen mode there is no system Back button to close the keyboard
        <Pressable
          onPress={onHide}
          accessibilityRole="button"
          accessibilityLabel={t('keyboard.hide')}
          style={({ pressed }) => [styles.run, { marginRight: 0, backgroundColor: pressed ? theme.border : theme.surface2 }]}
        >
          <Icon name="keyboard-close" size={20} color={theme.text} />
        </Pressable>
      ) : null}
      <Pressable
        onPress={onRun}
        accessibilityRole="button"
        accessibilityLabel={t('terminal.run')}
        style={({ pressed }) => [styles.run, { backgroundColor: pressed ? theme.border : theme.accent }]}
      >
        <Text style={[styles.label, { color: theme.onAccent }]}>⏎</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 6, paddingLeft: 6 },
  row: { gap: 6, paddingRight: 6 },
  key: { minWidth: 42, height: 40, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  run: { width: 52, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginHorizontal: 6 },
  label: { fontFamily: MONO, fontSize: 15 },
});
