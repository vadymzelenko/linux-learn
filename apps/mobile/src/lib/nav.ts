import { BackHandler, Platform } from 'react-native';
import { router } from 'expo-router';

/** Back if there is somewhere to go back to, otherwise to the home screen (deep links, web reloads). */
export function goBack(fallback: '/' | '/courses' | '/practice' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Tapping a link several times must not open several screens. On a phone a
 * heavy screen can take a second to draw, and taps made meanwhile are queued
 * and handled only after it — a plain time window cannot catch them.
 * So after a push / navigate the whole app is "busy": further navigation is
 * ignored until the destination screen reports that it is focused and drawn
 * (Screen → screenReady), plus a short pause for the queued taps to drain.
 * A safety timeout unlocks it in any case. Back (gesture / button) is not
 * affected. While busy, NavBlocker shows a small spinner and eats taps.
 */
type Listener = (busy: boolean) => void;
const listeners = new Set<Listener>();
let busy = false;
let lastNav = 0;
let fallback: ReturnType<typeof setTimeout> | undefined;
let settle: ReturnType<typeof setTimeout> | undefined;
/** The minimal lock after any navigation, whatever the screen reports. */
const MIN_LOCK = 900;

/**
 * Destinations opened and not yet left. A second push to the same place is a
 * repeated tap — ignored until the user goes back. This does not depend on
 * timing at all, so a slow phone cannot slip a copy through.
 */
let opened: { key: string; at: number }[] = [];
const keyOf = (href: unknown) => (typeof href === 'string' ? href : JSON.stringify(href));
/** Tabs are switched, not stacked: they are never "left" by Back. */
const TABS = new Set(['/', '/courses', '/sandbox', '/practice', '/profile']);
const pathOf = (href: unknown) => (typeof href === 'string' ? href.split('?')[0]! : String((href as { pathname?: string })?.pathname ?? ''));
function wentBack() {
  opened = opened.slice(0, -1);
}
if (Platform.OS === 'android') {
  // system back (gesture or button): the top screen is gone
  BackHandler.addEventListener('hardwareBackPress', () => {
    wentBack();
    return false;
  });
}

function setBusy(v: boolean) {
  if (busy === v) return;
  busy = v;
  for (const l of listeners) l(v);
}
function unlock() {
  clearTimeout(fallback);
  clearTimeout(settle);
  setBusy(false);
}

export function isNavBusy() {
  return busy;
}
export function onNavBusy(l: Listener) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

/** Called by every screen when it gains focus: the navigation has landed. */
export function screenReady() {
  if (!busy) return;
  clearTimeout(settle);
  const wait = Math.max(300, MIN_LOCK - (Date.now() - lastNav));
  settle = setTimeout(() => requestAnimationFrame(() => setTimeout(unlock, wait)), 0);
}

function guard<F extends (...a: never[]) => unknown>(fn: F, kind: 'push' | 'navigate'): F {
  return ((...args: Parameters<F>) => {
    const now = Date.now();
    if (busy || now - lastNav < MIN_LOCK) return;
    const key = keyOf(args[0]);
    // the same screen again, while it is still open: a repeated tap
    const stacked = kind === 'push' && !TABS.has(pathOf(args[0]));
    if (stacked && opened.some((o) => o.key === key && now - o.at < 60_000)) return;
    lastNav = now;
    if (stacked) opened = [...opened.slice(-20), { key, at: now }];
    setBusy(true);
    clearTimeout(fallback);
    fallback = setTimeout(unlock, 2500);
    return fn(...args);
  }) as F;
}
const r = router as unknown as Record<string, unknown>;
if (!r.__guarded) {
  r.push = guard(router.push.bind(router), 'push');
  r.navigate = guard(router.navigate.bind(router), 'navigate');
  const back = router.back.bind(router);
  r.back = () => {
    wentBack();
    back();
  };
  r.__guarded = true;
}
