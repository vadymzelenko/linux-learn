import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { achievements, tr } from '@linux-learn/content';
import { useStore, type Toast } from '../state/store';
import { useTheme } from '../theme';
import { haptic } from '../lib/haptics';
import { Icon } from './ui/Icon';
import { Text } from '../theme/Text';

function ToastView({ toast }: { toast: Toast }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const dismiss = useStore((s) => s.dismissToast);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (toast.kind === 'achievement' || toast.kind === 'level') haptic.success();
    Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    const timer = setTimeout(
      () => Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => dismiss(toast.id)),
      toast.kind === 'xp' ? 1400 : 3200,
    );
    return () => clearTimeout(timer);
  }, [anim, dismiss, toast]);

  let icon = 'star';
  let title = '';
  let sub = '';
  if (toast.kind === 'achievement') {
    const a = achievements.find((x) => x.id === toast.achievementId);
    icon = a?.icon ?? 'award';
    title = t('achievements.unlocked');
    sub = a ? tr(a.title, i18n.language) : '';
  } else if (toast.kind === 'level') {
    icon = 'crown';
    title = t('profile.level');
    sub = t(`profile.levels.${toast.level}` as 'profile.levels.root');
  } else if (toast.kind === 'xp') {
    title = t('lesson.earned', { xp: toast.xp });
  } else title = toast.text;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { backgroundColor: theme.surface2, borderColor: theme.border },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: theme.accent }]}>
        <Icon name={icon} size={18} color={theme.onAccent} />
      </View>
      <View style={{ flexShrink: 1 }}>
        <Text style={{ color: theme.text, fontWeight: '800' }}>{title}</Text>
        {sub ? <Text style={{ color: theme.textDim }}>{sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
      {toasts.slice(-3).map((t) => (
        <ToastView key={t.id} toast={t} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, maxWidth: 420, elevation: 4, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
