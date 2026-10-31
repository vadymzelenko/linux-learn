import { Platform, StyleSheet, Text as RNText, type TextProps } from 'react-native';

/** Onest families by weight (custom fonts do not synthesize weights on Android). */
const FAMILY: Record<string, string> = {
  '100': 'Onest_400Regular',
  '200': 'Onest_400Regular',
  '300': 'Onest_400Regular',
  '400': 'Onest_400Regular',
  normal: 'Onest_400Regular',
  '500': 'Onest_500Medium',
  '600': 'Onest_600SemiBold',
  '700': 'Onest_700Bold',
  bold: 'Onest_700Bold',
  '800': 'Onest_800ExtraBold',
  '900': 'Onest_800ExtraBold',
};

/**
 * Drop-in replacement for RN Text that applies the app font. Explicit
 * fontFamily (monospace terminal text) wins.
 */
export function Text({ style, ...props }: TextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  if (flat.fontFamily) return <RNText {...props} style={style} />;
  const family = FAMILY[String(flat.fontWeight ?? '400')] ?? FAMILY['400'];
  return <RNText {...props} style={[style, { fontFamily: family }, Platform.OS !== 'web' && { fontWeight: 'normal' }]} />;
}
