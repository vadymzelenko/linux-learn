import { useEffect, useRef, type ReactNode } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme, radius, space, MONO } from '../../theme';
import { haptic } from '../../lib/haptics';
import { Icon } from './Icon';
import { Text } from '../../theme/Text';
import { ND, usePressScale } from './Motion';

export { FadeIn, SlideIn } from './Motion';

export { Icon };

export function Screen({ children, edges = ['top'], style }: { children: ReactNode; edges?: Edge[]; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: t.bg }, style]}>{children}</SafeAreaView>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={[{ color: t.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 }, style]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text accessibilityRole="header" style={[{ color: t.text, fontSize: 19, fontWeight: '700' }, style]}>{children}</Text>;
}

export function Body({ children, dim, style, numberOfLines }: { children: ReactNode; dim?: boolean; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const t = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ color: dim ? t.textDim : t.text, fontSize: 15, lineHeight: 22 }, style]}>{children}</Text>;
}

export function Mono({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return <Text style={[{ color: t.text, fontFamily: MONO, fontSize: 14 }, style]}>{children}</Text>;
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  const t = useTheme();
  const press = usePressScale(0.98);
  const base = [styles.card, { backgroundColor: t.surface, borderColor: t.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Animated.View style={press.style}>
      <Pressable
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [...base, (pressed || hovered) && { borderColor: t.accent }]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Layout props of a button that must apply to its animated wrapper. */
function outer(style: StyleProp<ViewStyle>): ViewStyle {
  const f = (StyleSheet.flatten(style) ?? {}) as ViewStyle;
  return { ...(f.flex !== undefined ? { flex: f.flex } : {}), ...(f.alignSelf !== undefined ? { alignSelf: f.alignSelf } : {}), ...(f.width !== undefined ? { width: f.width } : {}) };
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
  hint,
}: {
  /** Keyboard shortcut shown on the button, e.g. "Enter". */
  hint?: string;
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const t = useTheme();
  const press = usePressScale(0.96);
  const bg = { primary: t.accent, secondary: t.surface2, ghost: 'transparent', danger: t.danger }[variant];
  const fg = { primary: t.onAccent, secondary: t.text, ghost: t.accent, danger: '#FFFFFF' }[variant];
  return (
    <Animated.View style={[press.style, outer(style)]}>
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { paddingHorizontal: space.sm },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 20} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: small ? 14 : 16, fontWeight: '700' }}>{title}</Text>
      {hint ? (
        <View style={[styles.kbd, { borderColor: variant === 'primary' ? fg : t.border }]}>
          <Text style={{ color: fg, fontSize: 11, fontFamily: MONO, opacity: 0.8 }}>{hint}</Text>
        </View>
      ) : null}
    </Pressable>
    </Animated.View>
  );
}

export function ProgressBar({ value, color, height = 8, style, track }: { value: number; color?: string; height?: number; style?: StyleProp<ViewStyle>; track?: string }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(1, value));
  const anim = useRef(new Animated.Value(v)).current;
  useEffect(() => {
    // width cannot use the native driver
    Animated.timing(anim, { toValue: v, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, v]);
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[{ height, borderRadius: height, backgroundColor: track ?? t.surface2, overflow: 'hidden' }, style]}
    >
      <Animated.View style={{ width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height, borderRadius: height, backgroundColor: color ?? t.accent }} />
    </View>
  );
}

export function Pill({ text, color, bg }: { text: string; color?: string; bg?: string }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: bg ?? t.surface2, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ color: color ?? t.textDim, fontSize: 12, fontWeight: '700' }}>{text}</Text>
    </View>
  );
}

export function Row({ children, style, gap = space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function IconButton({ icon, onPress, label, color }: { icon: string; onPress: () => void; label: string; color?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [{ padding: 8, borderRadius: 999, backgroundColor: pressed ? t.surface2 : 'transparent' }]}
    >
      <Icon name={icon} color={color ?? t.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, borderWidth: StyleSheet.hairlineWidth },
  btn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.md, minHeight: 48 },
  kbd: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, marginLeft: 2 },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
});
