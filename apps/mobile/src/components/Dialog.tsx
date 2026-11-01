import { useEffect, useRef } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { useTheme, radius, space } from '../theme';
import { haptic } from '../lib/haptics';
import { sound } from '../lib/sound';
import { Icon } from './ui/Icon';
import { Text } from '../theme/Text';

/**
 * In-app dialogs and bottom sheets instead of the system `Alert`: they follow
 * the app theme, work the same on Android, iOS and web and never block JS.
 */
export interface DialogAction {
  label: string;
  style?: 'default' | 'cancel' | 'destructive' | 'primary';
  icon?: string;
  onPress?: () => void;
}

export interface DialogSpec {
  title: string;
  message?: string;
  icon?: string;
  tone?: 'info' | 'danger' | 'success' | 'warning';
  actions: DialogAction[];
}

interface DialogState {
  current: (DialogSpec & { id: number }) | null;
  queue: (DialogSpec & { id: number })[];
  show(d: DialogSpec): void;
  close(): void;
}

let seq = 1;

export const useDialog = create<DialogState>((set, get) => ({
  current: null,
  queue: [],
  show: (d) => {
    const item = { ...d, id: seq++ };
    if (get().current) set({ queue: [...get().queue, item] });
    else set({ current: item });
  },
  close: () => {
    const [next, ...rest] = get().queue;
    set({ current: next ?? null, queue: rest });
  },
}));

/** Ask for confirmation: `confirm({ title, confirm: 'Delete', destructive: true, onConfirm })`. */
export function confirmDialog(o: { title: string; message?: string; confirm: string; cancel: string; destructive?: boolean; icon?: string; onConfirm: () => void }) {
  haptic.warning();
  useDialog.getState().show({
    title: o.title,
    ...(o.message ? { message: o.message } : {}),
    icon: o.icon ?? (o.destructive ? 'alert-triangle' : 'info'),
    tone: o.destructive ? 'danger' : 'info',
    actions: [
      { label: o.cancel, style: 'cancel' },
      { label: o.confirm, style: o.destructive ? 'destructive' : 'primary', onPress: o.onConfirm },
    ],
  });
}

/** A one-button information sheet. */
export function infoDialog(o: { title: string; message?: string; ok: string; icon?: string; tone?: DialogSpec['tone'] }) {
  useDialog.getState().show({ title: o.title, ...(o.message ? { message: o.message } : {}), icon: o.icon ?? 'info', tone: o.tone ?? 'info', actions: [{ label: o.ok, style: 'primary' }] });
}

export function DialogHost() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const current = useDialog((s) => s.current);
  const close = useDialog((s) => s.close);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start();
    sound.play('open');
  }, [anim, current]);

  const finish = (a?: DialogAction) => {
    Animated.timing(anim, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: Platform.OS !== 'web' }).start(() => {
      close();
      a?.onPress?.();
    });
  };

  useEffect(() => {
    if (!current || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') e.stopPropagation();
      if (e.key === 'Escape') {
        e.preventDefault();
        finish(current.actions.find((a) => a.style === 'cancel'));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        finish(current.actions.find((a) => a.style === 'primary' || a.style === 'destructive') ?? current.actions[current.actions.length - 1]);
      }
    };
    document.addEventListener('keydown', h, true);
    return () => document.removeEventListener('keydown', h, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  useEffect(() => {
    if (!current || Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      finish(current.actions.find((a) => a.style === 'cancel'));
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;
  const toneColor = { info: theme.accent, danger: theme.danger, success: theme.success, warning: theme.warning }[current.tone ?? 'info'];
  const cancel = current.actions.find((a) => a.style === 'cancel');

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: anim }]}>
        <Pressable style={{ flex: 1 }} onPress={() => finish(cancel)} accessibilityLabel={cancel?.label} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, space.lg),
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
          },
        ]}
        accessibilityRole="alert"
      >
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <View style={styles.head}>
          {current.icon ? (
            <View style={[styles.icon, { backgroundColor: theme.surface2 }]}>
              <Icon name={current.icon} size={24} color={toneColor} />
            </View>
          ) : null}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{current.title}</Text>
            {current.message ? <Text style={{ color: theme.textDim, fontSize: 15, lineHeight: 21 }}>{current.message}</Text> : null}
          </View>
        </View>
        <View style={[styles.actions, current.actions.length > 2 && { flexDirection: 'column' }]}>
          {current.actions.map((a, i) => {
            const bg =
              a.style === 'destructive' ? theme.danger : a.style === 'primary' ? theme.accent : a.style === 'cancel' ? theme.surface2 : theme.surface2;
            const fg = a.style === 'destructive' ? '#FFFFFF' : a.style === 'primary' ? theme.onAccent : theme.text;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  haptic.tap();
                  finish(a);
                }}
                accessibilityRole="button"
                accessibilityLabel={a.label}
                style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, current.actions.length <= 2 && { flex: 1 }]}
              >
                {a.icon ? <Icon name={a.icon} size={18} color={fg} /> : null}
                <Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    marginHorizontal: 'auto',
  },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  head: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: space.sm },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.lg },
});
