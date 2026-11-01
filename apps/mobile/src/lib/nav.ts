import { router } from 'expo-router';

/** Back if there is somewhere to go back to, otherwise to the home screen (deep links, web reloads). */
export function goBack(fallback: '/' | '/courses' | '/practice' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
