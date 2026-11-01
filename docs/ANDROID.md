# Android: сборка APK, тестирование и публикация в Google Play

Есть три способа получить APK. Самый простой — первый: ничего не нужно ставить.

## 1. APK из GitHub Actions (рекомендуется)

Каждый push в `main`, `claude/**` и каждый тег `v*` запускает workflow **Android** (`.github/workflows/android.yml`):

1. генерирует нативный проект (`expo prebuild`);
2. собирает **APK** (для установки на телефон) и **AAB** (для Google Play);
3. ставит APK на эмулятор Android 14 и прогоняет автотест (`apps/mobile/.maestro/smoke.yaml`): онбординг → первая команда → урок → решение задания с клавиатуры → выход через «Назад» → песочница. Скриншоты каждого шага сохраняются.

Где взять файлы: GitHub → вкладка **Actions** → workflow **Android** → нужный запуск → внизу **Artifacts**:

| артефакт | что внутри |
|---|---|
| `apk` | `linux-trainer-N.apk` — ставится на любой телефон |
| `aab-for-google-play` | `linux-trainer-N.aab` + `badging.txt` (пакет, версия, разрешения, targetSdk) |
| `smoke-test-screenshots` | скриншоты с эмулятора, отчёт и `logcat.txt` при падении |

Можно запустить вручную: Actions → Android → **Run workflow**.

### Установка APK на телефон
1. Скачайте `apk.zip`, распакуйте, перенесите `.apk` на телефон (или откройте ссылку на артефакт прямо с телефона).
2. Откройте файл → разрешите «Установка из неизвестных источников» для браузера/файлового менеджера.
3. Если стояла сборка с другой подписью — сначала удалите старую версию.

С компьютера: `adb install -r linux-trainer-N.apk`.

> Пока не добавлены секреты с ключом (раздел 4), APK подписан **отладочным ключом**: он отлично ставится на телефон, но в Google Play его не примут.

## 2. Локальная сборка на своём компьютере

Нужно: Node 22, pnpm, JDK 17, Android Studio (Android SDK, NDK и CMake ставятся из SDK Manager), переменная `ANDROID_HOME`.

```bash
pnpm install
cd apps/mobile
pnpm android:prebuild        # создаёт apps/mobile/android (папка в .gitignore)
pnpm android:apk             # → android/app/build/outputs/apk/release/app-release.apk
pnpm android:aab             # → android/app/build/outputs/bundle/release/app-release.aab
```

Запуск на подключённом телефоне (USB-отладка) с живой перезагрузкой: `npx expo run:android`.

## 3. Облачная сборка EAS (Expo)

Подходит, если не хочется хранить ключ самому: Expo создаст и сохранит ключ загрузки.

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android      # APK для тестировщиков
npx eas-cli@latest build --profile production --platform android   # AAB для Play
npx eas-cli@latest submit --platform android                       # отправка в Play (track: internal)
```

## 4. Ключ загрузки для Google Play

Google Play принимает AAB, подписанный вашим **ключом загрузки** (upload key); финальной подписью занимается сам Google (Play App Signing). Создайте ключ один раз **на своём компьютере** и храните его копию в надёжном месте — без него не выпустить обновление (восстанавливается только через поддержку Google).

```bash
keytool -genkeypair -v -storetype JKS -keystore upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 upload.jks > upload.jks.b64      # macOS: base64 -i upload.jks -o upload.jks.b64
```

GitHub → Settings → Secrets and variables → Actions → **New repository secret**:

| секрет | значение |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | содержимое `upload.jks.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | пароль хранилища |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | пароль ключа |

После этого все сборки из Actions подписываются ключом загрузки. Локально то же самое — через переменные `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` перед `pnpm android:aab` (их читает плагин `apps/mobile/plugins/withReleaseSigning.js`).

## 5. Версии

- `versionCode` должен расти с каждой загрузкой в Play. В Actions он равен номеру запуска workflow (`github.run_number`), локально берётся из `app.json` (`android.versionCode`) или переменной `ANDROID_VERSION_CODE`.
- `versionName` — из `app.json` (`version`); для релиза создайте тег: `git tag v1.0.0 && git push --tags` — сборка возьмёт `1.0.0` из тега.

## 6. Публикация в Google Play — по шагам

1. **Аккаунт разработчика**: play.google.com/console, разовый взнос $25, проверка личности.
2. **Создать приложение**: название «Linux Terminal Trainer», язык по умолчанию, тип «Приложение», бесплатное.
3. **Политика конфиденциальности**: опубликуйте `docs/PRIVACY.md` по публичной ссылке (GitHub Pages или раздел на вашем сайте) и вставьте URL. Замените `<your support e-mail>` на реальный адрес.
4. **App content** (содержимое приложения) — ответы готовы в `docs/store/listing.md`:
   - Data safety: данные не собираются и не передаются;
   - рейтинг (IARC): образовательное, без запрещённого контента → 3+;
   - целевая аудитория 13+, реклама: нет.
5. **Страница в магазине** на 4 языках: тексты — `docs/store/listing.md`, картинки — `docs/store/graphics/` (иконка 512×512, баннер 1024×500, скриншоты 1080×1920).
6. **Тестирование**:
   - *Внутреннее* (до 100 тестировщиков, без проверки) — загрузите AAB, добавьте свои e-mail, ставьте по ссылке-приглашению.
   - *Закрытое*: для **новых личных аккаунтов** Google требует закрытый тест минимум с **12 тестировщиками в течение 14 дней** подряд, прежде чем откроется продакшен (проверьте актуальное требование в консоли).
7. **Продакшен**: Releases → Production → Create release → загрузите AAB `linux-trainer-N.aab` → заметки о выпуске → отправьте на проверку (обычно от нескольких часов до нескольких дней).

## Что уже настроено в проекте

- Пакет `com.vadymzelenko.linuxtrainer`, иконка и адаптивная иконка (с монохромной для тематических иконок Android 13+), splash.
- Лишние разрешения убраны: нет микрофона, хранилища, фонового воспроизведения (`blockedPermissions` в `app.json`; `expo-audio` настроен без записи). Остаются только вибрация, уведомления (по согласию) и стандартные.
- Прогресс хранится в SQLite на устройстве и переживает обновления приложения.
- Автотест APK на эмуляторе в каждом запуске CI.

## Чек-лист перед первым релизом

- [ ] Ключ загрузки создан, лежит в двух надёжных местах, секреты добавлены в GitHub
- [ ] Сборка из Actions зелёная, автотест прошёл, APK проверен на 2–3 реальных телефонах (маленький экран, планшет, физическая клавиатура)
- [ ] Политика конфиденциальности опубликована, указан e-mail поддержки
- [ ] Тексты на польском/украинском вычитаны носителями
- [ ] Закрытый тест 12 человек × 14 дней (для нового личного аккаунта)
