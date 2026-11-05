# Release plan

The app is **free**: no ads, no in-app purchases, no accounts. Nothing has to be added before publishing — only the Play Console paperwork.

## Done

- Engine with ~120 commands (including a simulated `docker`, `git` and GitHub CLI `gh`), golden tests against real bash, ≥ 90% coverage.
- 4 courses (Linux, NOC engineer, Docker, Git & GitHub), 23 modules, 110 lessons, 17 missions in en, uk, ru, pl; every task and mission is solved by its reference solution in CI. 3 more courses are announced as “Later”.
- App: terminal with its own keyboard, lessons, missions, sandbox, practice, explain, reference, profile, settings, exam + certificate, onboarding, progress transfer between devices (file or text, merge or replace).
- Android: release APK/AAB in GitHub Actions, emulator smoke test, minimal permissions (no storage, microphone or advertising ID).

## Before publishing

1. **Upload key** and GitHub secrets (`docs/ANDROID.md`, section 4).
2. **Play Console**: developer account ($25), closed test (12 testers × 14 days for new personal accounts — re-check the current rule), Data safety (no data collected — answers in `docs/store/listing.md`), content rating, privacy policy URL (`docs/PRIVACY.md` published, support e-mail filled in), store listing and screenshots in 4 languages.
3. **Proofreading** of the Polish and Ukrainian texts by native speakers.
4. **Performance targets**: cold start < 2 s, input latency < 50 ms, AAB < 30 MB.

## Release readiness checklist

- [x] CI solves every lesson and mission with the reference solution
- [x] Engine coverage ≥ 90%, golden tests match bash
- [x] No ads / tracking SDKs, advertising ID permission removed
- [x] Layout checked on 5" phones, 6–7" phones, landscape, tablets and desktop web
- [ ] Cold start < 2 s on a mid-range Android phone
- [ ] No crashes during 14 days of closed testing
- [ ] Three people without Linux experience finished module 1 unaided
- [ ] All four languages proofread
- [ ] Data Safety, content rating and privacy policy URL filled in the console
- [ ] Screenshots and store description in all languages uploaded
