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
| `aab-for-google-play` | `linux-trainer-N.aab` + `badging.txt` — подписан ключом загрузки, для Google Play |
| `aab-DEBUG-not-for-google-play` | то же, но с отладочной подписью: появляется, пока не добавлены секреты (раздел 4); Play его не примет |
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

Google Play принимает только AAB, подписанный вашим **ключом загрузки** (upload key); финальной подписью занимается сам Google (Play App Signing). Без ключа CI подписывает сборку отладочным ключом — тогда артефакт называется `aab-DEBUG-not-for-google-play`, а Play отвечает «подписан в режиме отладки».

**Создать ключ — одна команда на вашем компьютере** (нужна Java: Android Studio или `brew install openjdk`):

```bash
git clone https://github.com/vadymzelenko/linux-learn && cd linux-learn
bash scripts/make-upload-key.sh
```

Скрипт создаст папку `~/linux-trainer-upload-key/` с `upload.jks` и `secrets.txt` (4 значения со случайным паролем). Если установлен и авторизован GitHub CLI (`gh`), он предложит сам добавить секреты. Иначе вручную: GitHub → Settings → Secrets and variables → Actions → **New repository secret**, по одному на каждую пару «имя — значение» из `secrets.txt`:

| секрет | значение |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | длинная строка из `secrets.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | пароль |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | тот же пароль |

Затем Actions → Android → **Run workflow**. В сводке запуска появится «✅ AAB signed with the upload key», артефакт — `aab-for-google-play`. Если секреты заданы, но AAB всё равно отладочный, сборка упадёт с понятной ошибкой.

⚠️ Сохраните `upload.jks` и `secrets.txt` в двух надёжных местах (менеджер паролей + резервная копия) и **не коммитьте** их. Потеряете ключ — сбросить его можно только через поддержку Google Play.

Локальная сборка с тем же ключом: переменные `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` перед `pnpm android:aab` (их читает плагин `apps/mobile/plugins/withReleaseSigning.js`).

## 5. Версии

- `versionCode` должен расти с каждой загрузкой в Play. В Actions он равен номеру запуска workflow (`github.run_number`), локально берётся из `app.json` (`android.versionCode`) или переменной `ANDROID_VERSION_CODE`.
- `versionName` — из `app.json` (`version`); для релиза создайте тег: `git tag v1.0.0 && git push --tags` — сборка возьмёт `1.0.0` из тега.

## 6. Публикация в Google Play — по шагам

Всё для страницы магазина — в папке [`google-play/`](../google-play): иконка, баннер, скриншоты для телефона и планшетов и файл [`google-play.txt`](../google-play/google-play.txt) с текстами на 4 языках и ответами на все формы App content (Data safety, целевая аудитория, реклама, возрастной рейтинг, цена).

Кратко: аккаунт разработчика ($25) → новое бесплатное приложение в консоли → AAB во внутреннее тестирование → страница магазина и App content (по `google-play.txt`) → закрытый тест (12 человек × 14 дней для нового личного аккаунта) → продакшен.

## Что уже настроено в проекте

- Пакет `com.vadymzelenko.linuxtrainer`, иконка и адаптивная иконка (с монохромной для тематических иконок Android 13+), splash.
- Лишние разрешения убраны: нет микрофона, хранилища, фонового воспроизведения и рекламного ID (`blockedPermissions` в `app.json`; `expo-audio` настроен без записи). Остаются только вибрация, уведомления (по согласию) и стандартные. Перенос прогресса работает через системные «Поделиться» и выбор файла — разрешение на хранилище не нужно.
- Экран адаптируется под 5" телефоны, 6–7" телефоны, ландшафт и планшеты: высота клавиатуры терминала ограничена долей экрана, на планшетах и в ландшафте задание и терминал стоят рядом.
- Прогресс хранится в SQLite на устройстве и переживает обновления приложения.
- Автотест APK на эмуляторе в каждом запуске CI.

## Чек-лист перед первым релизом

- [ ] Ключ загрузки создан, лежит в двух надёжных местах, секреты добавлены в GitHub
- [ ] Сборка из Actions зелёная, автотест прошёл, APK проверен на 2–3 реальных телефонах (маленький экран, планшет, физическая клавиатура)
- [ ] Политика конфиденциальности опубликована, указан e-mail поддержки
- [ ] Тексты на польском/украинском вычитаны носителями
- [ ] Закрытый тест 12 человек × 14 дней (для нового личного аккаунта)
