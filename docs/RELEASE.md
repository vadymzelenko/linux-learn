# Release plan

## Done (stages 0–1 and most of stage 2)

- Engine with ~75 commands, golden tests against real bash, 93% coverage.
- 6 modules / 30 lessons / 10 missions in en, uk, ru, pl; every task solved by CI.
- App: terminal, lessons, missions, sandbox, practice (daily challenge, SM-2 review, explain, reference), profile, settings, exam + certificate, onboarding.

## Before publishing

1. **Monetization** (needs a dev build, not Expo Go):
   - `npx expo install react-native-google-mobile-ads` and add the config plugin with the AdMob app id.
   - Show the Google UMP consent form on start for EEA users; set `ads.state.consentGiven` only after it.
   - Replace the no-op in `apps/mobile/src/lib/ads.ts#showInterstitial` with `InterstitialAd`; the policy (no ads on the terminal, ≤1 interstitial per 3 lessons, never during a task) is already enforced and tested.
   - Rewarded ads: hint / streak freeze / extra sandbox. Premium via `react-native-iap` or RevenueCat → `ads.state.premium = true`.
2. **E2E**: Maestro flows — onboarding, completing a lesson, sandbox reset, buying Premium.
3. **Play Console**: developer account ($25), closed test (12 testers × 14 days for new personal accounts — re-check the current rule), Data Safety form (declare the ad SDK data), content rating, privacy policy URL (`docs/PRIVACY.md` hosted on your site), store listing and screenshots in 4 languages, Polish texts proofread by a native speaker.
4. **Performance targets**: cold start < 2 s, input latency < 50 ms, AAB < 30 MB, ≥ 99.5% crash-free sessions (Sentry only with consent).

## Release readiness checklist

- [x] CI solves every lesson and mission with the reference solution
- [x] Engine coverage ≥ 90%, golden tests match bash
- [ ] Cold start < 2 s on a mid-range Android phone
- [ ] No crashes during 14 days of closed testing
- [ ] Three people without Linux experience finished module 1 unaided
- [ ] All four languages proofread
- [ ] Ads are not shown before UMP consent
- [ ] Data Safety, content rating and privacy policy ready
- [ ] Screenshots and store description in all languages
