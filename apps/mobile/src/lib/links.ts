import { Linking } from 'react-native';

/** Public website (GitHub Pages, workflow "Website"; source: public/site). */
export const SITE_URL = 'https://vadymzelenko.github.io/linux-learn/';
export const PRIVACY_URL = SITE_URL + 'privacy/';
export const SUPPORT_URL = SITE_URL + 'support/';

export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
