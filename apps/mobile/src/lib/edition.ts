/**
 * Two apps from one code base (chosen at build time, APP_EDITION=free|pro):
 *
 *  - free: the first five modules of "Linux from zero", three missions, four
 *    practice tasks, one sandbox machine; reference, glossary, explain and
 *    review are complete. Everything else is visible with a PRO lock.
 *  - pro: everything.
 *
 * Progress moves between the apps with "Transfer progress" (export / import).
 */
import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

export type Edition = 'free' | 'pro';

const fromConfig = (Constants.expoConfig?.extra as { edition?: string } | undefined)?.edition;
const fromEnv = process.env.EXPO_PUBLIC_EDITION;
export const EDITION: Edition = (fromEnv ?? fromConfig) === 'pro' ? 'pro' : 'free';
export const isPro = EDITION === 'pro';

export const FREE_PACKAGE = 'com.vadymzelenko.linuxtrainer';
export const PRO_PACKAGE = 'com.vadymzelenko.linuxtrainer.pro';

/** Modules of the Linux course that the free app includes. */
export const FREE_MODULES: ReadonlySet<string> = new Set(['navigation', 'files', 'text', 'search', 'permissions']);
export const FREE_MISSIONS: ReadonlySet<string> = new Set(['sort-downloads', 'server-down', 'disk-full']);
export const FREE_CHALLENGES = 4;
export const FREE_TEMPLATES: ReadonlySet<string> = new Set(['empty-home', 'home-basic', 'text-files', 'search']);

export const maxMachines = () => (isPro ? 3 : 1);
export const moduleLocked = (moduleId: string) => !isPro && !FREE_MODULES.has(moduleId);
export const courseLocked = (courseId: string) => !isPro && courseId !== 'linux';
export const missionLocked = (id: string) => !isPro && !FREE_MISSIONS.has(id);
export const challengeLocked = (index: number) => !isPro && index >= FREE_CHALLENGES;
export const templateLocked = (tpl: string) => !isPro && !FREE_TEMPLATES.has(tpl);
export const examLocked = () => !isPro;

/** Open the Pro app's store page (Google Play app if present, else the web page). */
export async function openProInStore() {
  const web = `https://play.google.com/store/apps/details?id=${PRO_PACKAGE}`;
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(`market://details?id=${PRO_PACKAGE}`);
      return;
    } catch {
      /* no Play Store app */
    }
  }
  await Linking.openURL(web).catch(() => undefined);
}
