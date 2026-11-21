# Linux Terminal Trainer

A pocket Linux terminal trainer for Android: real commands in a simulated system, lessons, exercises and story missions. No ads, works offline, no account required. Available in English, Ukrainian, Russian and Polish, including the "Explain command" feature. Progress can be moved between devices (phone to the web version on a computer) as a file or text.

Web version and app site: https://vadymzelenko.github.io/linux-learn/

| Part | Description |
|---|---|
| Engine, `packages/engine` | Pure TypeScript, no React Native: a virtual file system with permissions and symlinks, a bash parser with loops and conditionals, an interpreter, about 120 commands (including networking, systemd, logs, Docker, git and the GitHub CLI), exercise checking, autocompletion and command explanations |
| Content, `packages/content` | 4 courses (Linux from scratch, about 13 h; NOC engineer, about 7.5 h; Docker, about 3.5 h; Git and GitHub, about 3.5 h), 25 modules, 118 lessons, 532 steps (258 terminal exercises), 21 missions, 14 practice challenges, a 140-term glossary, 19 achievements. JSON validated with zod |
| App, `apps/mobile` | Expo SDK 58, expo-router, Zustand with immer, expo-sqlite for progress and sandboxes on the device, i18next, expo-audio and expo-haptics |

## Getting started

```bash
pnpm install
pnpm web            # web version
pnpm android        # Expo dev server for Android
pnpm run ci         # everything CI checks
```

The web version deploys to Vercel without configuration: `vercel.json` defines the install and build commands (`expo export --platform web`) and the `apps/mobile/dist` output.

APK and AAB files are built by GitHub Actions on every push (the Android workflow). The APK is installed on an emulator and smoke-tested with screenshots. Local and EAS builds, the upload key and Google Play publishing are described in [`docs/ANDROID.md`](docs/ANDROID.md). Store assets (icon, feature graphic, screenshots, listings in four languages, Play Console form answers) are in [`google-play/`](google-play/google-play.txt).

The app website (landing page, privacy policy, support) lives in `apps/mobile/public/site/` and is published to GitHub Pages by the Website workflow: [site](https://vadymzelenko.github.io/linux-learn/), [web app](https://vadymzelenko.github.io/linux-learn/app/), [privacy](https://vadymzelenko.github.io/linux-learn/privacy/), [support](https://vadymzelenko.github.io/linux-learn/support/).

## Architecture

```
apps/mobile  ──actions──▶  Zustand store  ──command──▶  packages/engine
  screens                  progress, sandboxes          parser → interpreter → commands → VFS
                           (expo-sqlite)                exercise checks
packages/content ──lessons, missions, machine definitions (JSON)──▶ store / engine
```

Screens never modify the file system directly. `run(session, line)` is a pure function that returns a new session, so the same engine runs unchanged in Node, in the browser and in Hermes.

### Engine

- **File system:** files, directories, symlinks with loop protection, `rwx` permissions plus setuid, setgid and sticky bits, owners and groups, a `student` user and `root` through `sudo`, immutable updates with immer.
- **Shell:** quoting and escaping, comments, variables (`$HOME`, `$?`, `${X}`, `export`), `$(…)`, `$((…))`, brace expansion, globs, pipes, redirections (`> >> < 2> 2>&1 &>`), `; && ||`, `for`, `while`, `until`, `if`, command groups, `read`, `break` and `continue`, aliases, `!!`, history, scripts (`./script.sh`, `bash`, `source`, scripts on `$PATH`), `test` and `[`.
- **Networking and services:** `ping traceroute ip ss netstat dig nslookup host curl wget nc`, `systemctl service journalctl`, `uptime free nproc top w who`. Each lesson machine describes hosts (unreachable, lossy, only in `/etc/hosts`), services (a broken config fails a restart, a dead upstream returns 502) and load.
- **Administration:** `useradd usermod userdel groupadd passwd`, `pgrep pkill killall`, `diff comm paste`, `zcat zgrep`.
- **Git and GitHub:** a repository is a real `.git` folder in the virtual file system. Supported: `init clone status add rm mv restore commit log show diff branch switch checkout merge` (fast-forward, three-way merge, conflicts with markers, `--abort`), `reset revert stash tag remote fetch pull push` (non-fast-forward rejection, upstream tracking). "GitHub" is a set of bare repositories reachable by `https://github.com/…` and `git@github.com:…` URLs, with `gh repo`, `gh pr` and `gh issue` commands.
- **Docker:** `run ps images pull logs exec stop start restart kill pause rm rmi build inspect stats tag volume network system` and `docker compose up/down/ps/logs`. Published ports are reachable with `curl` and visible in `ss`, bind mounts reflect host files live, the daemon is a `docker` service and the socket requires the `docker` group. Errors (port in use, name conflict, `pull access denied`, broken `COPY`) match Docker 27 with BuildKit.
- **Commands:** output and error messages match GNU coreutils 9.4 exactly: `pwd ls cd tree mkdir touch cat rm cp mv ln echo printf head tail wc grep sort uniq cut tr tee sed awk find du df chmod chown sudo ps kill nano vim less` and many more.
- **Safety limits:** output, step and recursion limits (fork bombs and recursive scripts cannot freeze the app), a fixed clock for deterministic tests. An unexpected error inside a command becomes a message instead of a crash.

### Quality

- 459 engine tests (Vitest and fast-check), 93% line coverage, with a 90% threshold in CI.
- Golden tests: 239 commands recorded in real bash 5.2 with coreutils 9.4 (`packages/engine/golden/scenarios.ts`) match the engine output byte for byte. Re-record with `pnpm --filter @linux-learn/engine golden:record` (or `golden:record:docker`).
- Content linter: every JSON file is schema-checked, then the engine solves every exercise, mission and challenge with its reference solution, verifies "what will this print" answers and checks translation completeness. An unsolvable lesson fails CI.
- App tests: SM-2 spaced repetition, streaks and streak freezes, lesson unlocking, achievements, progress transfer, WCAG AA contrast of all themes, UI translation completeness.

## App features

- **Terminal:** JetBrains Mono, four themes (green, Dracula, Solarized, light), ANSI colours for `ls` and `grep`, a 1000-line virtualised buffer, long-press to copy output, Tab completion for commands, paths and variables, history, a helper key row and Ctrl shortcuts, a simplified `nano`. A custom terminal keyboard adapts to the screen size and supports cursor movement by swiping on the space bar.
- **Learning:** course, module, lesson and step. Step types: theory with a live terminal, exercise, fix the command, predict the output, build the command, quiz. Checks are based on file system state, with partial credit and three levels of hints.
- **Motivation:** XP and levels from newbie to root, daily streaks with freezes, 14 practice challenges, SM-2 spaced repetition, 19 achievements, a progress map drawn as a file system tree, a final exam with a certificate image, optional local reminders.
- **Sandbox:** up to three saved machines, six templates, one-tap reset.
- **Progress transfer:** export lessons, XP, settings and machines to a JSON file or the clipboard; import with merge or replace.
- **Explain command:** the role of every argument (grep patterns, sed scripts, awk programs, chmod permissions, kill signals, docker, systemctl and ip subcommands, loops and conditionals), plus a reference with man pages.
- **Courses:** the Linux course covers navigation, files, text processing, search, permissions, file system layout, users and groups, processes and services, shell scripting, sed, awk and diff. The NOC course covers SLA and MTTR, server health, networking, web services, logs and incident management, with on-call missions such as a 502 on Black Friday, a disk at 95% and rolling back a Friday deployment.
- Accessible layout: bottom sheets instead of system alerts, screen reader labels, side-by-side task and terminal on tablets and in landscape.

## Authoring content

Lessons are generated by Python scripts in `packages/content/authoring/` (one per module, shared helpers in `lib.py`):

```bash
cd packages/content
python3 authoring/<module>.py && python3 authoring/courses.py && python3 authoring/register.py
python3 authoring/pl_tools.py apply   # Polish translations (authoring/pl/*.py, keyed by a hash of the English text)
npx tsx scripts/lint.ts               # solves every exercise and computes course hours
```

`python3 authoring/pl_tools.py todo <file>` lists untranslated strings.

## Roadmap

See [`docs/RELEASE.md`](docs/RELEASE.md): AdMob with UMP consent and Google Play Billing (the ad display policy is already implemented and tested in `apps/mobile/src/lib/ads.ts`), Maestro end-to-end tests, closed testing and Play Console forms. Privacy policy: [`docs/PRIVACY.md`](docs/PRIVACY.md).

## License

Copyright © Vadym Zelenko. All rights reserved. The source is published for review; reuse or redistribution of the app or its course content requires permission.
