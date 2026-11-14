"""google-play/google-play.txt: every text Google Play asks for (store listing in
4 languages, release notes, App content answers), with Play's length limits checked.

    python3 tools/store-graphics/listings.py
"""
import os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'google-play')

L = {}
L['en'] = dict(
    title='Linux Terminal Trainer',
    short='Learn Linux, networks, Docker & Git by typing real commands. Free, offline.',
    full='''The complete path from your first Linux command to on-call engineer — learned by typing real commands in a safe, simulated system. Everything is free: no ads, no subscription, no account.

Linux Terminal Trainer is a full Linux and networking course in your pocket: a realistic shell with almost 120 commands, instant checks of your work, and missions taken from real on-call shifts.

4 COURSES · 118 LESSONS · 250+ HANDS-ON TASKS
• Linux from zero (≈13 h): navigation, files, text processing, search, permissions, the filesystem, users and groups, processes and services, shell scripting with loops and conditions, sed, awk and more
• NOC engineer (≈7.5 h): server health, networking (ip, ping, traceroute, DNS, ports), web services (HTTP codes, curl, systemctl, journalctl), logs, incident management, escalation and postmortems
• Docker (≈3.5 h): images and containers, ports, logs, volumes, Dockerfile, Docker Compose, container networks, restart policies, pinned image versions
• Git & GitHub (≈3.5 h): commits, history, undo, .gitignore, branches, merge conflicts, push and pull, pull requests, stash, tags and releases, cherry-pick — on a simulated GitHub

21 MISSIONS FROM REAL LIFE
A 502 on Black Friday, a disk at 95%, a DNS mystery, a brute-force attack in the logs, containers killed by OOM, a cache that can't be found by name, a release rollback at night, a leaked password in a commit, release day with a hotfix — practise on-call work without risk.

LEARN BY DOING
• Tasks are checked by the result: any correct solution counts
• "Explain a command": every flag and argument in plain words
• Predict-the-output and build-the-command exercises
• Spaced-repetition review and a practice set of 14 real-world tasks
• Final exam and a shareable certificate
• Sandbox with 3 machines and templates: Docker host, web server, Git project, overloaded server…

MADE FOR PHONES AND TABLETS
• A keyboard built for the terminal: symbols one tap away, Tab, arrows, Ctrl and Alt, drag the space bar to move the cursor
• Syntax-highlighted terminal in four themes
• Portrait, landscape and tablet layouts with goal and terminal side by side; hardware keyboards supported
• Fully offline: no account, no ads, no tracking
• English, Ukrainian, Russian and Polish
• Continue on a computer: Settings → Transfer progress moves everything to the web version

Ideal for future system administrators, DevOps, SRE, NOC and support engineers, students, and anyone preparing for a Linux certification or a first IT job. New courses (Bash scripting, networks deep dive, Kubernetes) are on the way.''',
    notes='4 courses free: Linux, NOC engineer, Docker and Git & GitHub — 118 lessons, 250+ hands-on tasks and 21 missions. New: Docker in production and Git in practice. No ads, works offline.',
)
L['ru'] = dict(
    title='Linux Terminal Trainer',
    short='Linux, сети, Docker и Git на настоящих командах. Бесплатно и офлайн.',
    full='''Полный путь от первой команды Linux до дежурного инженера — на настоящих командах в безопасной симулированной системе. Всё бесплатно: без рекламы, подписки и аккаунта.

Linux Terminal Trainer — это полноценный курс Linux и сетей в кармане: реалистичная оболочка почти со 120 командами, мгновенная проверка решений и миссии из настоящих дежурств.

4 КУРСА · 118 УРОКОВ · 250+ ПРАКТИЧЕСКИХ ЗАДАНИЙ
• Linux с нуля (≈13 ч): навигация, файлы, обработка текста, поиск, права, устройство файловой системы, пользователи и группы, процессы и сервисы, скрипты с циклами и условиями, sed, awk и многое другое
• NOC-инженер (≈7,5 ч): здоровье сервера, сети (ip, ping, traceroute, DNS, порты), веб-сервисы (HTTP-коды, curl, systemctl, journalctl), логи, управление инцидентами, эскалация и постмортемы
• Docker (≈3,5 ч): образы и контейнеры, порты, логи, тома, Dockerfile, Docker Compose, сети контейнеров, политики перезапуска, закреплённые версии образов
• Git и GitHub (≈3,5 ч): коммиты, история, отмена изменений, .gitignore, ветки, конфликты слияния, push и pull, pull request’ы, stash, теги и релизы, cherry-pick — на симулированном GitHub

21 МИССИЯ ИЗ ЖИЗНИ
502 в Чёрную пятницу, диск на 95%, загадка DNS, подбор паролей в логах, контейнеры, убитые OOM, кэш, который не находится по имени, ночной откат релиза, пароль в коммите, день релиза с хотфиксом — дежурства без риска.

УЧИТЕСЬ НА ПРАКТИКЕ
• Задания проверяются по результату: засчитывается любое верное решение
• «Объясни команду»: каждый флаг и аргумент простыми словами
• Упражнения «что выведет команда» и «собери команду»
• Интервальное повторение и практикум из 14 задач из реальной работы
• Итоговый экзамен и сертификат
• Песочница на 3 машины с шаблонами: Docker-хост, веб-сервер, Git-проект, перегруженный сервер…

ДЛЯ ТЕЛЕФОНОВ И ПЛАНШЕТОВ
• Клавиатура для терминала: символы в одно касание, Tab, стрелки, Ctrl и Alt, курсор — проведением по пробелу
• Терминал с подсветкой синтаксиса в четырёх темах
• Вертикальный и горизонтальный режим, на планшете задание и терминал рядом; поддержка физической клавиатуры
• Полностью офлайн: без аккаунта, рекламы и слежки
• Русский, украинский, английский и польский
• Продолжайте на компьютере: Настройки → «Перенос прогресса» переносит всё в веб-версию

Для будущих системных администраторов, DevOps, SRE, NOC- и support-инженеров, студентов и всех, кто готовится к сертификации по Linux или к первой работе в IT. Скоро новые курсы: Bash-скрипты, сети глубже, Kubernetes.''',
    notes='4 курса бесплатно: Linux, NOC-инженер, Docker, Git и GitHub — 118 уроков, 250+ практических заданий и 21 миссия. Новое: Docker в продакшене и Git на практике. Без рекламы, работает офлайн.',
)
L['uk'] = dict(
    title='Linux Terminal Trainer',
    short='Linux, мережі, Docker і Git на справжніх командах. Безкоштовно й офлайн.',
    full='''Повний шлях від першої команди Linux до чергового інженера — на справжніх командах у безпечній симульованій системі. Усе безкоштовно: без реклами, підписки й акаунта.

Linux Terminal Trainer — це повноцінний курс Linux і мереж у кишені: реалістична оболонка майже зі 120 командами, миттєва перевірка рішень і місії зі справжніх чергувань.

4 КУРСИ · 118 УРОКІВ · 250+ ПРАКТИЧНИХ ЗАВДАНЬ
• Linux з нуля (≈13 год): навігація, файли, обробка тексту, пошук, права, будова файлової системи, користувачі й групи, процеси й сервіси, скрипти з циклами й умовами, sed, awk та багато іншого
• NOC-інженер (≈7,5 год): стан сервера, мережі (ip, ping, traceroute, DNS, порти), вебсервіси (HTTP-коди, curl, systemctl, journalctl), логи, керування інцидентами, ескалація й постмортеми
• Docker (≈3,5 год): образи й контейнери, порти, логи, томи, Dockerfile, Docker Compose, мережі контейнерів, політики перезапуску, закріплені версії образів
• Git і GitHub (≈3,5 год): коміти, історія, скасування змін, .gitignore, гілки, конфлікти злиття, push і pull, pull request’и, stash, теги й релізи, cherry-pick — на симульованому GitHub

21 МІСІЯ ІЗ ЖИТТЯ
502 у Чорну п’ятницю, диск на 95%, загадка DNS, підбір паролів у логах, контейнери, убиті OOM, кеш, який не знаходиться за іменем, нічний відкат релізу, пароль у коміті, день релізу з хотфіксом — чергування без ризику.

ВЧІТЬСЯ НА ПРАКТИЦІ
• Завдання перевіряються за результатом: зараховується будь-яке правильне рішення
• «Поясни команду»: кожен прапорець і аргумент простими словами
• Вправи «що виведе команда» та «збери команду»
• Інтервальне повторення й практикум із 14 задач зі справжньої роботи
• Підсумковий іспит і сертифікат
• Пісочниця на 3 машини з шаблонами: Docker-хост, вебсервер, Git-проєкт, перевантажений сервер…

ДЛЯ ТЕЛЕФОНІВ І ПЛАНШЕТІВ
• Клавіатура для термінала: символи в один дотик, Tab, стрілки, Ctrl і Alt, курсор — проведенням по пробілу
• Термінал із підсвічуванням синтаксису в чотирьох темах
• Вертикальний і горизонтальний режим, на планшеті завдання й термінал поруч; підтримка фізичної клавіатури
• Повністю офлайн: без акаунта, реклами й стеження
• Українська, англійська, російська та польська
• Продовжуйте на комп’ютері: Налаштування → «Перенесення прогресу» переносить усе у вебверсію

Для майбутніх системних адміністраторів, DevOps, SRE, NOC- і support-інженерів, студентів і всіх, хто готується до сертифікації з Linux або до першої роботи в IT. Незабаром нові курси: Bash-скрипти, мережі глибше, Kubernetes.''',
    notes='4 курси безкоштовно: Linux, NOC-інженер, Docker, Git і GitHub — 118 уроків, 250+ практичних завдань і 21 місія. Нове: Docker у продакшені та Git на практиці. Без реклами, працює офлайн.',
)
L['pl'] = dict(
    title='Linux Terminal Trainer',
    short='Linux, sieci, Docker i Git na prawdziwych poleceniach. Za darmo, offline.',
    full='''Pełna ścieżka od pierwszego polecenia Linuksa do inżyniera dyżurnego — na prawdziwych poleceniach w bezpiecznym, symulowanym systemie. Wszystko za darmo: bez reklam, subskrypcji i konta.

Linux Terminal Trainer to kompletny kurs Linuksa i sieci w kieszeni: realistyczna powłoka z prawie 120 poleceniami, natychmiastowe sprawdzanie rozwiązań i misje z prawdziwych dyżurów.

4 KURSY · 118 LEKCJI · PONAD 250 ZADAŃ PRAKTYCZNYCH
• Linux od zera (≈13 h): nawigacja, pliki, przetwarzanie tekstu, wyszukiwanie, uprawnienia, budowa systemu plików, użytkownicy i grupy, procesy i usługi, skrypty z pętlami i warunkami, sed, awk i więcej
• Inżynier NOC (≈7,5 h): kondycja serwera, sieci (ip, ping, traceroute, DNS, porty), usługi WWW (kody HTTP, curl, systemctl, journalctl), logi, zarządzanie incydentami, eskalacja i postmortemy
• Docker (≈3,5 h): obrazy i kontenery, porty, logi, wolumeny, Dockerfile, Docker Compose, sieci kontenerów, zasady restartu, przypięte wersje obrazów
• Git i GitHub (≈3,5 h): commity, historia, cofanie zmian, .gitignore, gałęzie, konflikty scalania, push i pull, pull requesty, stash, tagi i wydania, cherry-pick — na symulowanym GitHubie

21 MISJI Z ŻYCIA
502 w Czarny piątek, dysk zajęty w 95%, zagadka DNS, łamanie haseł w logach, kontenery zabite przez OOM, cache nieznajdowany po nazwie, nocne wycofanie wydania, hasło w commicie, dzień wydania z hotfixem — dyżury bez ryzyka.

UCZ SIĘ W PRAKTYCE
• Zadania sprawdzane po wyniku: liczy się każde poprawne rozwiązanie
• „Wyjaśnij polecenie”: każda flaga i argument prostymi słowami
• Ćwiczenia „co wypisze polecenie” i „zbuduj polecenie”
• Powtórki w odstępach czasu i 14 zadań z prawdziwej pracy
• Egzamin końcowy i certyfikat
• Piaskownica na 3 maszyny z szablonami: host Dockera, serwer WWW, projekt Git, przeciążony serwer…

NA TELEFONY I TABLETY
• Klawiatura do terminala: symbole jednym dotknięciem, Tab, strzałki, Ctrl i Alt, kursor — przeciągnięciem spacji
• Terminal z podświetlaniem składni w czterech motywach
• Pion, poziom i układ tabletowy z zadaniem i terminalem obok siebie; obsługa klawiatury fizycznej
• W pełni offline: bez konta, reklam i śledzenia
• Polski, angielski, ukraiński i rosyjski
• Kontynuuj na komputerze: Ustawienia → „Przenoszenie postępów” przenosi wszystko do wersji webowej

Dla przyszłych administratorów, inżynierów DevOps, SRE, NOC i wsparcia, studentów oraz wszystkich, którzy szykują się do certyfikacji z Linuksa lub pierwszej pracy w IT. Wkrótce nowe kursy: skrypty Bash, sieci dogłębnie, Kubernetes.''',
    notes='4 kursy za darmo: Linux, inżynier NOC, Docker, Git i GitHub — 118 lekcji, ponad 250 zadań praktycznych i 21 misji. Nowość: Docker na produkcji i Git w praktyce. Bez reklam, działa offline.',
)

NAMES = {'en': 'ENGLISH (en-US) — default language', 'ru': 'РУССКИЙ (ru-RU)', 'uk': 'УКРАЇНСЬКА (uk)', 'pl': 'POLSKI (pl-PL)'}
LINE = '=' * 78

FORMS = f'''{LINE}
APP DETAILS
{LINE}
App name ............ Linux Terminal Trainer
Package ............. com.vadymzelenko.linuxtrainer
Developer ........... VZstudio
App or game ......... App
Free or paid ........ Free
Category ............ Education
Tags ................ Education; Developer tools / Programming
Contact e-mail ...... <your public support e-mail>   (required, shown on the store page)
Website ............. https://<your-domain>/site/
Privacy policy URL .. https://<your-domain>/privacy

{LINE}
GRAPHICS (files in this folder, upload in this order)
{LINE}
App icon ............ icon-512.png             512 x 512, 32-bit PNG
Feature graphic ..... feature-graphic.png      1024 x 500
Phone screenshots ... phone-1.png … phone-8.png       1080 x 1920 (9:16)
7-inch tablet ....... tablet7-1.png … tablet7-4.png   1080 x 1920 (9:16)
10-inch tablet ...... tablet10-1.png … tablet10-4.png 1920 x 1080 (16:9)
The captions on the images are in English; use the same images for every language.

{LINE}
APP CONTENT (Policy → App content)
{LINE}
Privacy policy ...... https://<your-domain>/privacy  (page: apps/mobile/public/site/privacy.html)
Ads ................. No, my app does not contain ads
App access .......... All functionality is available without special access (no login)
Content rating ...... Category: Reference, News, or Educational.
                      Violence, sexual content, profanity, drugs, gambling: No.
                      Users interact / share content: No. Digital purchases: No.
                      Expected result: Everyone / PEGI 3 / USK 0
Target audience ..... 13–15, 16–17, 18+  (do NOT select under 13 — the app is not
                      made for children and must not enter the Families programme)
Appeals to children . No
Data safety ......... Does your app collect or share any of the required user data
                      types? → No. Result on the store: "No data collected",
                      "No data shared". Reason: no network requests, no analytics,
                      no ads, no crash reporting; progress stays on the device;
                      a progress backup is created only on the user's request and
                      sent wherever the user chooses (not collection by Google's rules).
Advertising ID ...... No (the AD_ID permission is removed from the manifest)
Government app ...... No
Financial features .. My app doesn't provide any financial features
Health .............. No
News app ............ No
Permissions ......... VIBRATE, POST_NOTIFICATIONS (daily reminder, only when the user
                      turns it on). No special declarations needed.

{LINE}
PRICING AND DISTRIBUTION
{LINE}
Price ............... Free
Countries ........... All available countries
Contains ads ........ No
In-app purchases .... No
'''


def main():
    os.makedirs(OUT, exist_ok=True)
    parts = [f'''LINUX TERMINAL TRAINER — EVERYTHING FOR GOOGLE PLAY
Generated by tools/store-graphics/listings.py. Limits: title 30, short description 80,
full description 4000, release notes 500 characters (all checked below).
Copy each block between the lines into Play Console. English is the default language;
add Russian, Ukrainian and Polish under Store presence → Main store listing →
Manage translations → Add your own translations.

{FORMS}''']
    for lang in ('en', 'ru', 'uk', 'pl'):
        d = L[lang]
        sizes = {k: len(d[k]) for k in ('title', 'short', 'full', 'notes')}
        assert sizes['title'] <= 30 and sizes['short'] <= 80 and sizes['full'] <= 4000 and sizes['notes'] <= 500, (lang, sizes)
        parts.append(f'''{LINE}
STORE LISTING — {NAMES[lang]}
{LINE}

App name ({sizes["title"]}/30):
{d["title"]}

Short description ({sizes["short"]}/80):
{d["short"]}

Full description ({sizes["full"]}/4000):
{d["full"]}

Release notes / What's new ({sizes["notes"]}/500):
<{lang}>
{d["notes"]}
</{lang}>
''')
    with open(os.path.join(OUT, 'google-play.txt'), 'w') as f:
        f.write('\n'.join(parts))
    print({lang: {k: len(L[lang][k]) for k in ('title', 'short', 'full', 'notes')} for lang in L})


main()
