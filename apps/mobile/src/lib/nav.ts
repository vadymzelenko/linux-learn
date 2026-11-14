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
  // queued taps from the old screen are handled within this pause and dropped
  settle = setTimeout(() => requestAnimationFrame(() => setTimeout(unlock, 300)), 0);
}

function guard<F extends (...a: never[]) => unknown>(fn: F): F {
  return ((...args: Parameters<F>) => {
    const now = Date.now();
    if (busy || now - lastNav < 500) return;
    lastNav = now;
    setBusy(true);
    clearTimeout(fallback);
    fallback = setTimeout(unlock, 2500);
    return fn(...args);
  }) as F;
}
const r = router as unknown as Record<string, unknown>;
if (!r.__guarded) {
  r.push = guard(router.push.bind(router));
  r.navigate = guard(router.navigate.bind(router));
  r.__guarded = true;
}
