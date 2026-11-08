import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'store')
L = {}
L['free'] = {
'en': dict(title='Linux Terminal Trainer', short='Learn Linux by typing real commands. Safe sandbox, offline, free.', full='''Learn the Linux command line the way system administrators and developers really use it — by typing real commands.

Linux Terminal Trainer gives you a safe, simulated Linux machine right on your phone. Run ls, cd, grep, find, chmod and pipes, see real output, make mistakes and try again. Nothing can break: every machine resets with one tap.

WHAT YOU GET FOR FREE
• The first five modules of "Linux from zero": navigation, files and folders, working with text, search, and permissions — 25 short lessons
• Hands-on tasks checked by the result: any correct solution counts, just like on a real server
• 3 story missions: tidy up downloads, a server with errors, a full disk
• "Explain a command": paste any command and see what every part does
• A command reference with manual pages and a glossary of 140 terms
• A sandbox machine for free practice, with colourful, syntax-highlighted output
• Spaced-repetition review that brings back the commands you struggled with
• Streaks, XP and achievements to keep you going

MADE FOR LEARNING ON A PHONE
• A keyboard built for the terminal: every symbol one tap away, Tab, arrows, Ctrl and Alt, drag the space bar to move the cursor
• Works in portrait and landscape, on phones and tablets; with a hardware keyboard too
• Fully offline: no account, no ads, no tracking
• English, Ukrainian, Russian and Polish

WANT THE WHOLE PATH?
Linux Terminal Trainer Pro adds the full Linux course, the NOC engineer course (networks, services, logs, incidents), Docker and Git & GitHub, 17 missions, a final exam and a certificate. Move your progress to Pro in one step: Settings → Transfer progress.

Perfect for beginners, students, future system administrators, DevOps and support engineers, and anyone preparing for a first IT job or a Linux certification.

Start with your first pwd today — a few minutes a day is enough.'''),
'ru': dict(title='Linux Terminal Trainer', short='Учите Linux, вводя настоящие команды. Песочница, офлайн, бесплатно.', full='''Освойте командную строку Linux так, как ею пользуются системные администраторы и разработчики, — набирая настоящие команды.

Linux Terminal Trainer — это безопасная симулированная Linux-машина прямо в телефоне. Выполняйте ls, cd, grep, find, chmod и конвейеры, смотрите настоящий вывод, ошибайтесь и пробуйте снова. Сломать ничего нельзя: любая машина сбрасывается одним нажатием.

ЧТО ВХОДИТ БЕСПЛАТНО
• Первые пять модулей курса «Linux с нуля»: навигация, файлы и папки, работа с текстом, поиск и права доступа — 25 коротких уроков
• Практические задания, которые проверяются по результату: засчитывается любое верное решение, как на настоящем сервере
• 3 сюжетные миссии: разобрать загрузки, сервер с ошибками, переполненный диск
• «Объясни команду»: вставьте любую команду и узнайте, что делает каждая её часть
• Справочник команд с man-страницами и словарь из 140 терминов
• Песочница для свободной практики с цветной подсветкой команд и вывода
• Интервальное повторение возвращает команды, которые давались труднее
• Серии дней, XP и достижения для мотивации

СДЕЛАНО ДЛЯ ТЕЛЕФОНА
• Клавиатура для терминала: все символы в одно касание, Tab, стрелки, Ctrl и Alt, курсор двигается проведением по пробелу
• Вертикальный и горизонтальный режим, телефоны и планшеты, физическая клавиатура
• Полностью офлайн: без аккаунта, рекламы и слежки
• Русский, украинский, английский и польский

ХОТИТЕ ВЕСЬ ПУТЬ?
Linux Terminal Trainer Pro добавляет полный курс Linux, курс NOC-инженера (сети, сервисы, логи, инциденты), Docker и Git с GitHub, 17 миссий, итоговый экзамен и сертификат. Прогресс переносится в Pro за один шаг: Настройки → «Перенос прогресса».

Подходит новичкам, студентам, будущим системным администраторам, DevOps- и support-инженерам и всем, кто готовится к первой работе в IT или к сертификации по Linux.

Начните с первой команды pwd уже сегодня — достаточно нескольких минут в день.'''),
'uk': dict(title='Linux Terminal Trainer', short='Вивчайте Linux, вводячи справжні команди. Пісочниця, офлайн, безкоштовно.', full='''Опануйте командний рядок Linux так, як ним користуються системні адміністратори й розробники, — набираючи справжні команди.

Linux Terminal Trainer — це безпечна симульована Linux-машина просто в телефоні. Виконуйте ls, cd, grep, find, chmod і конвеєри, дивіться справжній вивід, помиляйтеся й пробуйте знову. Зламати нічого не можна: будь-яка машина скидається одним дотиком.

ЩО ВХОДИТЬ БЕЗКОШТОВНО
• Перші п’ять модулів курсу «Linux з нуля»: навігація, файли й теки, робота з текстом, пошук і права доступу — 25 коротких уроків
• Практичні завдання, що перевіряються за результатом: зараховується будь-яке правильне рішення, як на справжньому сервері
• 3 сюжетні місії: розібрати завантаження, сервер з помилками, переповнений диск
• «Поясни команду»: вставте будь-яку команду й дізнайтеся, що робить кожна її частина
• Довідник команд із man-сторінками та словник на 140 термінів
• Пісочниця для вільної практики з кольоровим підсвічуванням команд і виводу
• Інтервальне повторення повертає команди, які давалися важче
• Серії днів, XP і досягнення для мотивації

ЗРОБЛЕНО ДЛЯ ТЕЛЕФОНА
• Клавіатура для термінала: усі символи в один дотик, Tab, стрілки, Ctrl і Alt, курсор рухається проведенням по пробілу
• Вертикальний і горизонтальний режим, телефони й планшети, фізична клавіатура
• Повністю офлайн: без акаунта, реклами й стеження
• Українська, англійська, російська та польська

ХОЧЕТЕ ВЕСЬ ШЛЯХ?
Linux Terminal Trainer Pro додає повний курс Linux, курс NOC-інженера (мережі, сервіси, логи, інциденти), Docker і Git із GitHub, 17 місій, підсумковий іспит і сертифікат. Прогрес переноситься в Pro за один крок: Налаштування → «Перенесення прогресу».

Підходить новачкам, студентам, майбутнім системним адміністраторам, DevOps- і support-інженерам і всім, хто готується до першої роботи в IT або до сертифікації з Linux.

Почніть із першої команди pwd уже сьогодні — достатньо кількох хвилин на день.'''),
'pl': dict(title='Linux Terminal Trainer', short='Ucz się Linuksa, wpisując prawdziwe polecenia. Offline i za darmo.', full='''Opanuj wiersz poleceń Linuksa tak, jak używają go administratorzy i programiści — wpisując prawdziwe polecenia.

Linux Terminal Trainer to bezpieczna, symulowana maszyna z Linuksem w Twoim telefonie. Uruchamiaj ls, cd, grep, find, chmod i potoki, oglądaj prawdziwe wyniki, myl się i próbuj ponownie. Nic się nie zepsuje: każdą maszynę resetujesz jednym dotknięciem.

CO DOSTAJESZ ZA DARMO
• Pierwsze pięć modułów kursu „Linux od zera”: nawigacja, pliki i foldery, praca z tekstem, wyszukiwanie i uprawnienia — 25 krótkich lekcji
• Zadania praktyczne sprawdzane po wyniku: liczy się każde poprawne rozwiązanie, jak na prawdziwym serwerze
• 3 misje fabularne: porządek w pobranych, serwer z błędami, pełny dysk
• „Wyjaśnij polecenie”: wklej dowolne polecenie i zobacz, co robi każda jego część
• Leksykon poleceń ze stronami man i słownik 140 pojęć
• Piaskownica do swobodnej praktyki z kolorowym podświetlaniem poleceń i wyników
• Powtórki w odstępach czasu przypominają polecenia, które sprawiały trudność
• Serie dni, XP i osiągnięcia dla motywacji

STWORZONE NA TELEFON
• Klawiatura do terminala: wszystkie symbole jednym dotknięciem, Tab, strzałki, Ctrl i Alt, kursor przesuwasz, przeciągając spację
• Pion i poziom, telefony i tablety, klawiatura fizyczna
• W pełni offline: bez konta, reklam i śledzenia
• Polski, angielski, ukraiński i rosyjski

CHCESZ CAŁĄ ŚCIEŻKĘ?
Linux Terminal Trainer Pro dodaje pełny kurs Linuksa, kurs inżyniera NOC (sieci, usługi, logi, incydenty), Dockera oraz Git i GitHub, 17 misji, egzamin końcowy i certyfikat. Postępy przeniesiesz do Pro jednym krokiem: Ustawienia → „Przenoszenie postępów”.

Dla początkujących, studentów, przyszłych administratorów, inżynierów DevOps i wsparcia oraz wszystkich, którzy szykują się do pierwszej pracy w IT lub certyfikacji z Linuksa.

Zacznij od pierwszego pwd już dziś — wystarczy kilka minut dziennie.'''),
}
L['pro'] = {
'en': dict(title='Linux Terminal Trainer Pro', short='Linux, networks, Docker & Git by typing real commands. No ads.', full='''The complete path from your first Linux command to on-call engineer — learned by typing real commands in a safe, simulated system.

Linux Terminal Trainer Pro is a full Linux and networking course in your pocket: a realistic shell with almost 120 commands, instant checks of your work, and missions taken from real on-call shifts. One payment, no subscription, no ads.

4 COURSES · 110 LESSONS · 240+ HANDS-ON TASKS
• Linux from zero (≈13 h): navigation, files, text processing, search, permissions, the filesystem, users and groups, processes and services, shell scripting with loops and conditions, sed, awk and more
• NOC engineer (≈7.5 h): server health, networking (ip, ping, traceroute, DNS, ports), web services (HTTP codes, curl, systemctl, journalctl), logs, incident management, escalation and postmortems
• Docker (≈2 h): images and containers, ports, logs, volumes, Dockerfile, Docker Compose
• Git & GitHub (≈2.3 h): commits, history, undo, .gitignore, branches, merge conflicts, push and pull, pull requests and issues on a simulated GitHub

17 MISSIONS FROM REAL LIFE
A 502 on Black Friday, a disk at 95%, a DNS mystery, a brute-force attack in the logs, a bad Friday deploy, containers killed by OOM, a hotfix through a pull request — practise on-call work without risk.

LEARN BY DOING
• Tasks are checked by the result: any correct solution counts
• "Explain a command": every flag and argument in plain words
• Predict-the-output and build-the-command exercises
• Spaced-repetition review, a practice set of 14 real-world tasks
• Final exam and a shareable certificate
• Sandbox with 3 machines and every template: Docker host, web server, Git project, overloaded server…

MADE FOR PHONES AND TABLETS
• A keyboard built for the terminal: symbols one tap away, Tab, arrows, Ctrl and Alt, drag the space bar to move the cursor
• Syntax-highlighted terminal in four themes
• Portrait, landscape and tablet layouts with goal and terminal side by side; hardware keyboards supported
• Fully offline: no account, no ads, no tracking
• English, Ukrainian, Russian and Polish
• Move your progress from the free app or to the web version: Settings → Transfer progress

Ideal for future system administrators, DevOps, SRE, NOC and support engineers, students, and anyone preparing for a Linux certification or a first IT job. New courses (Bash scripting, networks deep dive, Kubernetes) are included as they come out.'''),
'ru': dict(title='Linux Terminal Trainer Pro', short='Linux, сети, Docker и Git на настоящих командах. Без рекламы.', full='''Полный путь от первой команды Linux до дежурного инженера — на настоящих командах в безопасной симулированной системе.

Linux Terminal Trainer Pro — это полноценный курс Linux и сетей в кармане: реалистичная оболочка почти со 120 командами, мгновенная проверка решений и миссии из настоящих дежурств. Один платёж, без подписки и рекламы.

4 КУРСА · 110 УРОКОВ · 240+ ПРАКТИЧЕСКИХ ЗАДАНИЙ
• Linux с нуля (≈13 ч): навигация, файлы, обработка текста, поиск, права, устройство файловой системы, пользователи и группы, процессы и сервисы, скрипты с циклами и условиями, sed, awk и многое другое
• NOC-инженер (≈7,5 ч): здоровье сервера, сети (ip, ping, traceroute, DNS, порты), веб-сервисы (HTTP-коды, curl, systemctl, journalctl), логи, управление инцидентами, эскалация и постмортемы
• Docker (≈2 ч): образы и контейнеры, порты, логи, тома, Dockerfile, Docker Compose
• Git и GitHub (≈2,3 ч): коммиты, история, отмена изменений, .gitignore, ветки, конфликты слияния, push и pull, pull request’ы и issues на симулированном GitHub

17 МИССИЙ ИЗ ЖИЗНИ
502 в Чёрную пятницу, диск на 95%, загадка DNS, подбор паролей в логах, неудачный пятничный деплой, контейнеры, убитые OOM, хотфикс через pull request — дежурства без риска.

УЧИТЕСЬ НА ПРАКТИКЕ
• Задания проверяются по результату: засчитывается любое верное решение
• «Объясни команду»: каждый флаг и аргумент простыми словами
• Упражнения «что выведет команда» и «собери команду»
• Интервальное повторение и практикум из 14 задач из реальной работы
• Итоговый экзамен и сертификат
• Песочница на 3 машины со всеми шаблонами: Docker-хост, веб-сервер, Git-проект, перегруженный сервер…

ДЛЯ ТЕЛЕФОНОВ И ПЛАНШЕТОВ
• Клавиатура для терминала: символы в одно касание, Tab, стрелки, Ctrl и Alt, курсор — проведением по пробелу
• Терминал с подсветкой синтаксиса в четырёх темах
• Вертикальный и горизонтальный режим, на планшете задание и терминал рядом; поддержка физической клавиатуры
• Полностью офлайн: без аккаунта, рекламы и слежки
• Русский, украинский, английский и польский
• Перенос прогресса из бесплатной версии и в веб-версию: Настройки → «Перенос прогресса»

Для будущих системных администраторов, DevOps, SRE, NOC- и support-инженеров, студентов и всех, кто готовится к сертификации по Linux или к первой работе в IT. Новые курсы (Bash-скрипты, сети глубже, Kubernetes) войдут бесплатно по мере выхода.'''),
'uk': dict(title='Linux Terminal Trainer Pro', short='Linux, мережі, Docker і Git на справжніх командах. Без реклами.', full='''Повний шлях від першої команди Linux до чергового інженера — на справжніх командах у безпечній симульованій системі.

Linux Terminal Trainer Pro — це повноцінний курс Linux і мереж у кишені: реалістична оболонка майже зі 120 командами, миттєва перевірка рішень і місії зі справжніх чергувань. Один платіж, без підписки й реклами.

4 КУРСИ · 110 УРОКІВ · 240+ ПРАКТИЧНИХ ЗАВДАНЬ
• Linux з нуля (≈13 год): навігація, файли, обробка тексту, пошук, права, будова файлової системи, користувачі й групи, процеси й сервіси, скрипти з циклами й умовами, sed, awk та багато іншого
• NOC-інженер (≈7,5 год): стан сервера, мережі (ip, ping, traceroute, DNS, порти), вебсервіси (HTTP-коди, curl, systemctl, journalctl), логи, керування інцидентами, ескалація й постмортеми
• Docker (≈2 год): образи й контейнери, порти, логи, томи, Dockerfile, Docker Compose
• Git і GitHub (≈2,3 год): коміти, історія, скасування змін, .gitignore, гілки, конфлікти злиття, push і pull, pull request’и та issues на симульованому GitHub

17 МІСІЙ ІЗ ЖИТТЯ
502 у Чорну п’ятницю, диск на 95%, загадка DNS, підбір паролів у логах, невдалий п’ятничний деплой, контейнери, убиті OOM, хотфікс через pull request — чергування без ризику.

ВЧІТЬСЯ НА ПРАКТИЦІ
• Завдання перевіряються за результатом: зараховується будь-яке правильне рішення
• «Поясни команду»: кожен прапорець і аргумент простими словами
• Вправи «що виведе команда» та «збери команду»
• Інтервальне повторення й практикум із 14 задач зі справжньої роботи
• Підсумковий іспит і сертифікат
• Пісочниця на 3 машини з усіма шаблонами: Docker-хост, вебсервер, Git-проєкт, перевантажений сервер…

ДЛЯ ТЕЛЕФОНІВ І ПЛАНШЕТІВ
• Клавіатура для термінала: символи в один дотик, Tab, стрілки, Ctrl і Alt, курсор — проведенням по пробілу
• Термінал із підсвічуванням синтаксису в чотирьох темах
• Вертикальний і горизонтальний режим, на планшеті завдання й термінал поруч; підтримка фізичної клавіатури
• Повністю офлайн: без акаунта, реклами й стеження
• Українська, англійська, російська та польська
• Перенесення прогресу з безкоштовної версії та у вебверсію: Налаштування → «Перенесення прогресу»

Для майбутніх системних адміністраторів, DevOps, SRE, NOC- і support-інженерів, студентів і всіх, хто готується до сертифікації з Linux або до першої роботи в IT. Нові курси (Bash-скрипти, мережі глибше, Kubernetes) увійдуть безкоштовно в міру виходу.'''),
'pl': dict(title='Linux Terminal Trainer Pro', short='Linux, sieci, Docker i Git na prawdziwych poleceniach. Bez reklam.', full='''Pełna ścieżka od pierwszego polecenia Linuksa do inżyniera dyżurnego — na prawdziwych poleceniach w bezpiecznym, symulowanym systemie.

Linux Terminal Trainer Pro to kompletny kurs Linuksa i sieci w kieszeni: realistyczna powłoka z prawie 120 poleceniami, natychmiastowe sprawdzanie rozwiązań i misje z prawdziwych dyżurów. Jedna płatność, bez subskrypcji i reklam.

4 KURSY · 110 LEKCJI · PONAD 240 ZADAŃ PRAKTYCZNYCH
• Linux od zera (≈13 h): nawigacja, pliki, przetwarzanie tekstu, wyszukiwanie, uprawnienia, budowa systemu plików, użytkownicy i grupy, procesy i usługi, skrypty z pętlami i warunkami, sed, awk i więcej
• Inżynier NOC (≈7,5 h): kondycja serwera, sieci (ip, ping, traceroute, DNS, porty), usługi WWW (kody HTTP, curl, systemctl, journalctl), logi, zarządzanie incydentami, eskalacja i postmortemy
• Docker (≈2 h): obrazy i kontenery, porty, logi, wolumeny, Dockerfile, Docker Compose
• Git i GitHub (≈2,3 h): commity, historia, cofanie zmian, .gitignore, gałęzie, konflikty scalania, push i pull, pull requesty i zgłoszenia na symulowanym GitHubie

17 MISJI Z ŻYCIA
502 w Czarny piątek, dysk zajęty w 95%, zagadka DNS, łamanie haseł w logach, nieudane piątkowe wdrożenie, kontenery zabite przez OOM, hotfix przez pull request — dyżury bez ryzyka.

UCZ SIĘ W PRAKTYCE
• Zadania sprawdzane po wyniku: liczy się każde poprawne rozwiązanie
• „Wyjaśnij polecenie”: każda flaga i argument prostymi słowami
• Ćwiczenia „co wypisze polecenie” i „zbuduj polecenie”
• Powtórki w odstępach czasu i 14 zadań z prawdziwej pracy
• Egzamin końcowy i certyfikat
• Piaskownica na 3 maszyny ze wszystkimi szablonami: host Dockera, serwer WWW, projekt Git, przeciążony serwer…

NA TELEFONY I TABLETY
• Klawiatura do terminala: symbole jednym dotknięciem, Tab, strzałki, Ctrl i Alt, kursor — przeciągnięciem spacji
• Terminal z podświetlaniem składni w czterech motywach
• Pion, poziom i układ tabletowy z zadaniem i terminalem obok siebie; obsługa klawiatury fizycznej
• W pełni offline: bez konta, reklam i śledzenia
• Polski, angielski, ukraiński i rosyjski
• Przenoszenie postępów z wersji darmowej i do wersji webowej: Ustawienia → „Przenoszenie postępów”

Dla przyszłych administratorów, inżynierów DevOps, SRE, NOC i wsparcia, studentów oraz wszystkich, którzy szykują się do certyfikacji z Linuksa lub pierwszej pracy w IT. Nowe kursy (skrypty Bash, sieci dogłębnie, Kubernetes) w cenie, gdy tylko się pojawią.'''),
}
NOTES = {
'free': {'en': 'First release: the first five modules of "Linux from zero", 3 missions, sandbox, Explain a command, reference and glossary. Free, offline, no ads.', 'ru': 'Первый выпуск: первые пять модулей «Linux с нуля», 3 миссии, песочница, «Объясни команду», справочник и словарь. Бесплатно, офлайн, без рекламы.', 'uk': 'Перший випуск: перші п’ять модулів «Linux з нуля», 3 місії, пісочниця, «Поясни команду», довідник і словник. Безкоштовно, офлайн, без реклами.', 'pl': 'Pierwsze wydanie: pierwsze pięć modułów „Linux od zera”, 3 misje, piaskownica, „Wyjaśnij polecenie”, leksykon i słownik. Za darmo, offline, bez reklam.'},
'pro': {'en': 'First release: 4 courses (Linux, NOC engineer, Docker, Git & GitHub), 110 lessons, 17 missions, final exam and certificate. One payment, no ads.', 'ru': 'Первый выпуск: 4 курса (Linux, NOC-инженер, Docker, Git и GitHub), 110 уроков, 17 миссий, экзамен и сертификат. Один платёж, без рекламы.', 'uk': 'Перший випуск: 4 курси (Linux, NOC-інженер, Docker, Git і GitHub), 110 уроків, 17 місій, іспит і сертифікат. Один платіж, без реклами.', 'pl': 'Pierwsze wydanie: 4 kursy (Linux, inżynier NOC, Docker, Git i GitHub), 110 lekcji, 17 misji, egzamin i certyfikat. Jedna płatność, bez reklam.'},
}
NAMES = {'en': 'English (en-US)', 'ru': 'Русский (ru-RU)', 'uk': 'Українська (uk)', 'pl': 'Polski (pl-PL)'}
for ed in ('free', 'pro'):
    app = 'Linux Terminal Trainer' + (' Pro' if ed == 'pro' else '')
    pkg = 'com.vadymzelenko.linuxtrainer' + ('.pro' if ed == 'pro' else '')
    out = [f'# Google Play: {app}\n', f'Package: `{pkg}` · Price: **{"Free" if ed == "free" else "Paid (one-time)"}** · Category: **Education** · Ads: **No** · In-app purchases: **No**\n',
           'Limits: title ≤ 30, short description ≤ 80, full description ≤ 4000 characters (counted below by a script, all within limits). English is the default language; add the other three as translations in Play Console.\n',
           'Graphics: `graphics/` — `icon-512.png`, `feature-graphic.png` (1024×500), `phone-1…8.png` (1080×1920), `tablet7-1…4.png` (1080×1920), `tablet10-1…4.png` (1920×1080). Upload the phone screenshots in this order.\n']
    for lang in ('en', 'ru', 'uk', 'pl'):
        d = L[ed][lang]
        assert len(d['title']) <= 30 and len(d['short']) <= 80 and len(d['full']) <= 4000, (ed, lang, len(d['title']), len(d['short']), len(d['full']))
        out.append(f'\n---\n\n## {NAMES[lang]}\n\n**Title** ({len(d["title"])}/30)\n\n```\n{d["title"]}\n```\n\n**Short description** ({len(d["short"])}/80)\n\n```\n{d["short"]}\n```\n\n**Full description** ({len(d["full"])}/4000)\n\n```\n{d["full"]}\n```\n\n**Release notes** ({len(NOTES[ed][lang])}/500)\n\n```\n{NOTES[ed][lang]}\n```\n')
    os.makedirs(f'{ROOT}/{ed}', exist_ok=True)
    open(f'{ROOT}/{ed}/listing.md', 'w').write('\n'.join(out))
    print(ed, {l: len(L[ed][l]['full']) for l in L[ed]})
