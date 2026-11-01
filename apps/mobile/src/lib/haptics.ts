import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../state/store';
import { sound } from './sound';

const enabled = () => Platform.OS !== 'web' && useStore.getState().settings.haptics;
const safe = (p: Promise<unknown>) => void p.catch(() => undefined);
const later = (ms: number, fn: () => void) => setTimeout(fn, ms);

/**
 * Vibration patterns. Each situation has its own feel: a crisp tick for
 * selections, a soft bump for a passed check, a double pulse for an error,
 * a rising "da-da-DUM" for a finished lesson.
 */
export const haptic = {
  /** Selection change, button press. */
  tap() {
    if (enabled()) safe(Haptics.selectionAsync());
  },
  /** Very light key press (quick-keys bar, tokens). */
  key() {
    if (enabled()) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  light() {
    if (enabled()) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** One check of a task turned green. */
  check() {
    if (enabled()) safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  success() {
    if (enabled()) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  warning() {
    if (enabled()) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  error() {
    if (enabled()) safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
  /** Lesson / mission complete: three rising pulses. */
  celebrate() {
    if (!enabled()) return;
    safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
    later(110, () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)));
    later(240, () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)));
  },
  /** Achievement / level up: a sparkle of soft taps. */
  sparkle() {
    if (!enabled()) return;
    [0, 70, 140, 230].forEach((ms, i) => later(ms, () => safe(Haptics.impactAsync(i === 3 ? Haptics.ImpactFeedbackStyle.Rigid : Haptics.ImpactFeedbackStyle.Soft))));
  },
};

/** Sound + vibration for the events of the app, in one call. */
export const feedback = {
  tap: () => haptic.tap(),
  key: () => {
    haptic.key();
    sound.play('tap');
  },
  check: () => {
    haptic.check();
    sound.play('check');
  },
  correct: () => {
    haptic.success();
    sound.play('success');
  },
  wrong: () => {
    haptic.error();
    sound.play('error');
  },
  complete: () => {
    haptic.celebrate();
    sound.play('complete');
  },
  achievement: () => {
    haptic.sparkle();
    sound.play('achievement');
  },
};
