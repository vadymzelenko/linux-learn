import { Platform } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useStore } from '../state/store';

/** Short, quiet synthesised UI sounds (see scripts/gen-sounds.py). */
const SOURCES = {
  tap: require('../../assets/sounds/tap.wav'),
  check: require('../../assets/sounds/check.wav'),
  success: require('../../assets/sounds/success.wav'),
  error: require('../../assets/sounds/error.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  achievement: require('../../assets/sounds/achievement.wav'),
  open: require('../../assets/sounds/open.wav'),
} as const;

export type SoundName = keyof typeof SOURCES;

/** Relative loudness: UI ticks are quieter than rewards. */
const VOLUME: Record<SoundName, number> = { tap: 0.35, open: 0.4, check: 0.55, success: 0.7, error: 0.6, complete: 0.75, achievement: 0.75 };

const players = new Map<SoundName, AudioPlayer>();
let modeSet = false;
let lastPlayed = 0;

function player(name: SoundName): AudioPlayer | null {
  let p = players.get(name);
  if (p) return p;
  try {
    if (!modeSet) {
      modeSet = true;
      // mix with music from other apps and respect the silent switch
      void setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }).catch(() => undefined);
    }
    p = createAudioPlayer(SOURCES[name]);
    p.volume = VOLUME[name];
    players.set(name, p);
    return p;
  } catch {
    return null;
  }
}

const enabled = () => useStore.getState().settings.sounds !== false;

export const sound = {
  play(name: SoundName) {
    if (!enabled()) return;
    // never stack sounds into noise: one cue per 60 ms
    const now = Date.now();
    if (name === 'tap' && now - lastPlayed < 60) return;
    lastPlayed = now;
    const p = player(name);
    if (!p) return;
    try {
      void p.seekTo(0).catch(() => undefined);
      p.play();
    } catch {
      /* audio is a nicety: never crash on it */
    }
  },
  /** Load the players up front so the first cue is not late. */
  preload() {
    if (Platform.OS === 'web' || !enabled()) return;
    for (const n of ['check', 'success', 'error'] as SoundName[]) player(n);
  },
};
