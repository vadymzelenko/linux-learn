/**
 * Advertising policy from the spec. The Google Mobile Ads SDK needs a
 * development build and an AdMob account, so the SDK itself is plugged in
 * later (see docs/MONETIZATION.md); everything here is the policy:
 *
 *  - banners only on list screens, never on the terminal;
 *  - an interstitial at most once per 3 completed lessons and never during a task;
 *  - nothing is loaded before the UMP consent form was answered (EU);
 *  - Premium disables ads entirely.
 */
export interface AdsState {
  lessonsSinceInterstitial: number;
  consentGiven: boolean;
  premium: boolean;
}

export const INTERSTITIAL_EVERY = 3;

export function interstitialAllowed(s: AdsState, inTask: boolean): boolean {
  return !s.premium && s.consentGiven && !inTask && s.lessonsSinceInterstitial >= INTERSTITIAL_EVERY;
}

export function bannerAllowed(s: AdsState, screen: 'list' | 'terminal'): boolean {
  return !s.premium && s.consentGiven && screen === 'list';
}

const state: AdsState = { lessonsSinceInterstitial: 0, consentGiven: false, premium: false };

export const ads = {
  state,
  onLessonCompleted() {
    state.lessonsSinceInterstitial++;
  },
  shouldShowInterstitial() {
    return interstitialAllowed(state, false);
  },
  showInterstitial() {
    // SDK integration point (react-native-google-mobile-ads InterstitialAd).
    state.lessonsSinceInterstitial = 0;
  },
};
