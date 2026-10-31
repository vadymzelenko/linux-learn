import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../state/store';

const enabled = () => Platform.OS !== 'web' && useStore.getState().settings.haptics;

export const haptic = {
  tap() {
    if (enabled()) void Haptics.selectionAsync().catch(() => undefined);
  },
  success() {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  error() {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
  },
  light() {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
};
