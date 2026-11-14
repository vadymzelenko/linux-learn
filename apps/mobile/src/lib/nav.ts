import { router } from 'expo-router';

/** Back if there is somewhere to go back to, otherwise to the home screen (deep links, web reloads). */
export function goBack(fallback: '/' | '/courses' | '/practice' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Tapping a link several times must not open several screens. A heavy screen
 * (glossary, reference) can take a second to appear on a phone; taps made
 * meanwhile are queued and arrive after it, so a plain time window is not
 * enough. After a push or navigate every further one is ignored until the
 * new screen has been drawn (two frames once JS is free) plus a short pause.
 */
let busy = false;
let lastNav = 0;
function release() {
  // runs only when JS is idle again: queued taps are handled before this
  setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => (busy = false), 450))), 0);
}
function guard<F extends (...a: never[]) => unknown>(fn: F): F {
  return ((...args: Parameters<F>) => {
    const now = Date.now();
    if (busy || now - lastNav < 700) return;
    busy = true;
    lastNav = now;
    try {
      return fn(...args);
    } finally {
      release();
    }
  }) as F;
}
const r = router as unknown as Record<string, unknown>;
if (!r.__guarded) {
  r.push = guard(router.push.bind(router));
  r.navigate = guard(router.navigate.bind(router));
  r.__guarded = true;
}
