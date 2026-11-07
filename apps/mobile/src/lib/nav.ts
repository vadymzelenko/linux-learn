import { router } from 'expo-router';

/** Back if there is somewhere to go back to, otherwise to the home screen (deep links, web reloads). */
export function goBack(fallback: '/' | '/courses' | '/practice' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * Tapping a link five times must not open five screens: every push or
 * navigate within 700 ms of the previous one is ignored (app-wide).
 */
let lastNav = 0;
function guard<F extends (...a: never[]) => unknown>(fn: F): F {
  return ((...args: Parameters<F>) => {
    const now = Date.now();
    if (now - lastNav < 700) return;
    lastNav = now;
    return fn(...args);
  }) as F;
}
const r = router as unknown as Record<string, unknown>;
if (!r.__guarded) {
  r.push = guard(router.push.bind(router));
  r.navigate = guard(router.navigate.bind(router));
  r.__guarded = true;
}
