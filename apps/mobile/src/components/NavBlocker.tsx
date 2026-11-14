import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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
        <View style={styles.spin}>
          <ActivityIndicator color={theme.textDim} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spin: { position: 'absolute', alignSelf: 'center', top: '46%' },
});
