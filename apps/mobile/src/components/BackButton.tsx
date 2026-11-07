import { Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';
import { goBack } from '../lib/nav';
import { haptic } from '../lib/haptics';
import { Icon } from './ui/Icon';
import { KeyCatcher } from './KeyCatcher';
import { Text } from '../theme/Text';

/** A clear "← Back" pill used on every inner screen; Esc does the same on a keyboard. */
export function BackButton({ onPress, label }: { onPress?: () => void; label?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const go = onPress ?? (() => goBack());
  return (
    <>
      <KeyCatcher
        webOnly
        onKey={(e) => {
          if (e.key === 'Escape') {
            go();
            return true;
          }
        }}
      />
      <Pressable
        onPress={() => {
          haptic.tap();
          go();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={label ?? t('common.back')}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.btn, { backgroundColor: pressed || hovered ? theme.border : theme.surface2 }]}
      >
        <Icon name="chevron-left" size={20} color={theme.text} />
        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{label ?? t('common.back')}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 6, paddingRight: 12, height: 38, borderRadius: 999 },
});
