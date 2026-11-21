import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { onNavBusy } from '../lib/nav';

/**
 * While a screen is opening, taps anywhere are swallowed so a repeated tap
 * cannot open a second copy. Nothing is drawn. Back is a system gesture and
 * is not blocked.
 */
export function NavBlocker() {
  const [busy, setBusy] = useState(false);
  useEffect(() => onNavBusy(setBusy), []);
  if (!busy) return null;
  return <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
