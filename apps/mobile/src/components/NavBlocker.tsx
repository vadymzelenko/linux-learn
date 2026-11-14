import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { onNavBusy } from '../lib/nav';

/**
 * While a screen is opening, taps anywhere are swallowed (no second copy of
 * the screen), and after a short moment a small spinner shows that the app
 * is working. Back is a system gesture and is not blocked.
 */
export function NavBlocker() {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [spin, setSpin] = useState(false);
  useEffect(() => onNavBusy(setBusy), []);
  useEffect(() => {
    if (!busy) return setSpin(false);
    const id = setTimeout(() => setSpin(true), 220);
    return () => clearTimeout(id);
  }, [busy]);
  if (!busy) return null;
  return (
    <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {spin ? (
        <Animated.View style={[styles.pill, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
          <ActivityIndicator color={theme.accent} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { position: 'absolute', alignSelf: 'center', top: '45%', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
});
