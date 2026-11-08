# Google Play: всё для двух приложений

Из одного кода собираются **два отдельных приложения** в Play Console:

| | Бесплатное | Pro (платное) |
|---|---|---|
| Название | Linux Terminal Trainer | Linux Terminal Trainer Pro |
| Пакет | `com.vadymzelenko.linuxtrainer` | `com.vadymzelenko.linuxtrainer.pro` |
| Иконка | зелёная | золотая |
| Что открыто | первые 5 модулей «Linux с нуля» (25 уроков), 3 миссии, 4 задачи практикума, справочник, словарь, «Объясни команду», повторение, 1 машина в песочнице и 4 шаблона | всё: 4 курса, 110 уроков, 17 миссий, 14 задач практикума, экзамен и сертификат, 3 машины, все шаблоны |
| Цена | бесплатно | разовая покупка (цену задаёте в Play Console) |
| Тексты | [`free/listing.md`](free/listing.md) | [`pro/listing.md`](pro/listing.md) |
| Картинки | [`free/graphics/`](free/graphics) | [`pro/graphics/`](pro/graphics) |
| AAB из CI | артефакт `aab-for-google-play-free` | артефакт `aab-for-google-play-pro` |

Закрытый контент в бесплатной версии показан с замком **PRO** и экраном «Получить Pro», который открывает страницу Pro в Google Play. Прогресс переносится в Pro через «Настройки → Перенос прогресса». Где что закрыто — один файл: `apps/mobile/src/lib/edition.ts`.

## 1. Страница в магазине (Main store listing)

Тексты на en / ru / uk / pl, лимиты проверены скриптом (название ≤ 30, краткое ≤ 80, полное ≤ 4000): `free/listing.md`, `pro/listing.md`. Английский — язык по умолчанию, остальные добавляются в «Translations» вручную (не автоперевод).

Картинки (английские подписи, одинаковые для всех языков):

| поле в консоли | файл | размер |
|---|---|---|
| App icon | `graphics/icon-512.png` | 512×512, PNG 32-bit |
| Feature graphic | `graphics/feature-graphic.png` | 1024×500 |
| Phone screenshots (2–8) | `graphics/phone-1…8.png` | 1080×1920 (9:16) |
| 7-inch tablet | `graphics/tablet7-1…4.png` | 1080×1920 (9:16) |
| 10-inch tablet | `graphics/tablet10-1…4.png` | 1920×1080 (16:9) |

Категория: **Education** (Образование). Теги: Education, Programming / Developer tools. Контактный e-mail — обязателен (публичный адрес поддержки). Сайт: `https://<ваш-домен>/site/`.

## 2. Политика конфиденциальности

Одна страница на оба приложения, уже в проекте: `apps/mobile/public/site/privacy.html`. После деплоя на Vercel она доступна по адресу

- `https://<ваш-домен>/privacy` (короткая ссылка) или `https://<ваш-домен>/site/privacy.html`

**Перед публикацией** замените `support@example.com` на ваш адрес поддержки в `privacy.html` и `support.html` (и `<your support e-mail>` в `docs/PRIVACY.md`). Можно завести отдельный ящик вроде `linuxtrainer.app@…`, чтобы не светить личный.

Если хотите держать сайт на своём личном домене — скопируйте папку `apps/mobile/public/site/` целиком (пути внутри начинаются с `/site/`, так что положите её как `/site/` в корень сайта).

## 3. App content — ответы на формы (одинаковые для обоих приложений)

**Privacy policy** — URL из раздела 2.

**Ads** — «No, my app does not contain ads».

**App access** — «All functionality is available without special access» (нет логина).

**Content rating (IARC)** — категория «Reference, News, or Educational». На все вопросы о насилии, сексуальном контенте, ненормативной лексике, наркотиках, азартных играх — **No**. Обмен данными между пользователями / общение — **No**. Покупка цифровых товаров — для бесплатной версии **No**; для Pro — приложение платное, покупок внутри нет → **No**. Ожидаемый результат: **Everyone / PEGI 3 / USK 0**.

**Target audience and content** — возрастные группы **13–15, 16–17, 18+** (не отмечайте младше 13 — тогда не включается программа Families и её требования). «Could your app unintentionally appeal to children?» — **No** (учебник по Linux-терминалу).

**Data safety**:
- Does your app collect or share any of the required user data types? — **No**.
- Тогда раздел о шифровании и удалении не заполняется; в итоге в магазине будет «No data collected · No data shared».
- Обоснование: приложение не делает сетевых запросов, нет аналитики, рекламы, крэш-репортов; прогресс хранится только на устройстве; файл переноса создаётся по команде пользователя и уходит туда, куда он сам выберет (по правилам Google это не «сбор данных»).

**Advertising ID** — «No» (разрешение `AD_ID` удалено из манифеста).

**Government apps** — No. **Financial features** — My app doesn't provide any financial features. **Health** — No. **News app** — No.

**Permissions**: `VIBRATE`, `POST_NOTIFICATIONS` (только напоминания, включаются пользователем) и стандартные (`INTERNET` добавляет сам React Native, но приложение никуда не обращается). Специальных деклараций не требуется.

## 4. Цена и распространение

- **Бесплатное**: Pricing → Free. Страны — все.
- **Pro**: Pricing → Paid, цена по вашему выбору (ориентир для таких приложений $2.99–4.99; Google сам пересчитает в локальные валюты). **Нужен платёжный профиль (Google Payments merchant account)**: Play Console → Setup → Payments profile. Без него платное приложение не опубликовать. Внимание: приложение, однажды опубликованное как бесплатное, нельзя сделать платным — поэтому это два отдельных приложения.
- Если Google Play недоступен в вашей стране для приёма платежей, проверьте список стран продавцов в справке Play Console.

## 5. Порядок публикации

1. Создать в Play Console приложение «Linux Terminal Trainer» (Free) и «Linux Terminal Trainer Pro» (Paid).
2. Загрузить AAB каждого в Internal testing, проверить на телефоне (бесплатное должно открывать Pro-страницу в Play; до публикации Pro она будет «не найдена» — это нормально).
3. Заполнить страницу магазина, App content (раздел 3), цену.
4. Для нового личного аккаунта: закрытый тест минимум 12 тестировщиков × 14 дней (для **каждого** приложения).
5. Сначала опубликовать Pro (чтобы кнопка «Получить Pro» в бесплатном вела на живую страницу), потом бесплатное.

## Как перегенерировать картинки и тексты

См. [`tools/store-graphics/README.md`](../../tools/store-graphics/README.md).
