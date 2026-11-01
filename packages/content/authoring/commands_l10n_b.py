# Part B: system, network, users, shell builtins, docker. (ru, uk, pl)
from commands_l10n_a import S, O, cmd

cmd('chmod', 'изменить права доступа', 'змінити права доступу', 'zmień uprawnienia',
    ('-R, --recursive', 'менять файлы и директории рекурсивно', 'змінювати файли й директорії рекурсивно', 'zmieniaj pliki i katalogi rekurencyjnie'),
    ('-v, --verbose', 'сообщать о каждом файле', 'повідомляти про кожен файл', 'informuj o każdym pliku'),
    ('-c, --changes', 'сообщать только о реальных изменениях', 'повідомляти лише про справжні зміни', 'informuj tylko o rzeczywistych zmianach'))
cmd('chown', 'сменить владельца и группу файла', 'змінити власника й групу файлу', 'zmień właściciela i grupę pliku',
    ('-R, --recursive', 'менять файлы и директории рекурсивно', 'змінювати файли й директорії рекурсивно', 'zmieniaj pliki i katalogi rekurencyjnie'),
    ('-v, --verbose', 'сообщать о каждом файле', 'повідомляти про кожен файл', 'informuj o każdym pliku'))
cmd('date', 'показать дату и время', 'показати дату й час', 'pokaż datę i czas')
cmd('groups', 'показать группы пользователя', 'показати групи користувача', 'pokaż grupy użytkownika')
cmd('hostname', 'показать имя машины', 'показати ім’я машини', 'pokaż nazwę maszyny')
cmd('id', 'показать UID, GID и группы пользователя', 'показати UID, GID і групи користувача', 'pokaż UID, GID i grupy użytkownika',
    ('-u', 'только ID пользователя', 'лише ID користувача', 'tylko ID użytkownika'),
    ('-g', 'только ID основной группы', 'лише ID основної групи', 'tylko ID grupy głównej'),
    ('-G', 'ID всех групп', 'ID усіх груп', 'ID wszystkich grup'),
    ('-n', 'имена вместо чисел (с -u, -g, -G)', 'імена замість чисел (з -u, -g, -G)', 'nazwy zamiast liczb (z -u, -g, -G)'))
cmd('kill', 'послать сигнал процессу', 'надіслати сигнал процесу', 'wyślij sygnał do procesu')
cmd('man', 'открыть справочное руководство', 'відкрити довідковий посібник', 'otwórz podręcznik')
cmd('nano', 'простой текстовый редактор', 'простий текстовий редактор', 'prosty edytor tekstu')
cmd('ps', 'список запущенных процессов', 'список запущених процесів', 'lista uruchomionych procesów',
    ('aux', 'все процессы всех пользователей, в стиле BSD', 'усі процеси всіх користувачів, у стилі BSD', 'wszystkie procesy wszystkich użytkowników, w stylu BSD'),
    ('-e, -A', 'все процессы', 'усі процеси', 'wszystkie procesy'),
    ('-f', 'полный формат', 'повний формат', 'pełny format'))
cmd('sleep', 'подождать заданное время', 'зачекати заданий час', 'poczekaj podany czas')
cmd('su', 'войти под другим пользователем', 'увійти під іншим користувачем', 'przełącz się na innego użytkownika')
cmd('sudo', 'выполнить команду от имени root (или другого пользователя)', 'виконати команду від імені root (або іншого користувача)', 'wykonaj polecenie jako root (lub inny użytkownik)',
    ('-u user', 'выполнить от имени этого пользователя, а не root', 'виконати від імені цього користувача, а не root', 'wykonaj jako ten użytkownik zamiast roota'),
    ('-i, --login', 'войти в оболочку целевого пользователя (exit — назад)', 'увійти в оболонку цільового користувача (exit — назад)', 'zaloguj się do powłoki docelowego użytkownika (exit — powrót)'),
    ('-s, --shell', 'запустить оболочку от имени целевого пользователя', 'запустити оболонку від імені цільового користувача', 'uruchom powłokę jako docelowy użytkownik'),
    ('-l, --list', 'показать разрешённые команды', 'показати дозволені команди', 'pokaż dozwolone polecenia'))
cmd('uname', 'информация о системе и ядре', 'інформація про систему та ядро', 'informacje o systemie i jądrze',
    ('-a, --all', 'вся информация', 'уся інформація', 'wszystkie informacje'),
    ('-r, --kernel-release', 'версия ядра', 'версія ядра', 'wersja jądra'),
    ('-n, --nodename', 'сетевое имя машины', 'мережеве ім’я машини', 'sieciowa nazwa maszyny'),
    ('-m, --machine', 'архитектура процессора', 'архітектура процесора', 'architektura procesora'))
cmd('vi', 'текстовый редактор vi', 'текстовий редактор vi', 'edytor tekstu vi')
cmd('vim', 'текстовый редактор vim', 'текстовий редактор vim', 'edytor tekstu vim')
cmd('whatis', 'краткое описание команды в одну строку', 'короткий опис команди в один рядок', 'krótki opis polecenia w jednym wierszu')
cmd('whoami', 'показать имя текущего пользователя', 'показати ім’я поточного користувача', 'pokaż nazwę bieżącego użytkownika')
cmd('curl', 'сделать запрос по URL (HTTP)', 'зробити запит за URL (HTTP)', 'wykonaj żądanie pod URL (HTTP)',
    ('-I, --head', 'показать только заголовки ответа', 'показати лише заголовки відповіді', 'pokaż tylko nagłówki odpowiedzi'),
    ('-s, --silent', 'тихий режим, без прогресса', 'тихий режим, без прогресу', 'tryb cichy, bez postępu'),
    ('-o, --output <file>', 'записать тело ответа в файл', 'записати тіло відповіді у файл', 'zapisz treść odpowiedzi do pliku'),
    ('-L, --location', 'следовать перенаправлениям', 'слідувати перенаправленням', 'podążaj za przekierowaniami'),
    ('-w, --write-out <format>', 'вывести доп. данные, напр. -w \'%{http_code}\'', 'вивести дод. дані, напр. -w \'%{http_code}\'', 'wypisz dodatkowe dane, np. -w \'%{http_code}\''),
    ('-f, --fail', 'при HTTP-ошибке выйти с кодом 22', 'при HTTP-помилці вийти з кодом 22', 'przy błędzie HTTP zakończ z kodem 22'),
    ('-v, --verbose', 'показать заголовки запроса и ответа', 'показати заголовки запиту й відповіді', 'pokaż nagłówki żądania i odpowiedzi'))
cmd('dig', 'DNS-запрос: какой IP у имени', 'DNS-запит: який IP у імені', 'zapytanie DNS: jaki IP ma nazwa',
    ('+short', 'только ответ', 'лише відповідь', 'tylko odpowiedź'))
cmd('free', 'сколько памяти занято и свободно', 'скільки пам’яті зайнято й вільно', 'ile pamięci jest zajęte i wolne',
    ('-h, --human', 'в понятных единицах', 'у зрозумілих одиницях', 'w czytelnych jednostkach'),
    ('-m, --mebi', 'в мебибайтах', 'у мебібайтах', 'w mebibajtach'),
    ('-g, --gibi', 'в гибибайтах', 'у гібібайтах', 'w gibibajtach'))
cmd('host', 'DNS-запрос (кратко)', 'DNS-запит (стисло)', 'zapytanie DNS (krótko)')
cmd('ip', 'сетевые интерфейсы, адреса и маршруты', 'мережеві інтерфейси, адреси й маршрути', 'interfejsy sieciowe, adresy i trasy',
    ('-br, -brief', 'одна строка на интерфейс', 'один рядок на інтерфейс', 'jeden wiersz na interfejs'))
cmd('journalctl', 'журналы systemd', 'журнали systemd', 'dzienniki systemd',
    ('-u, --unit=UNIT', 'журнал только этого сервиса', 'журнал лише цього сервісу', 'dziennik tylko tej usługi'),
    ('-n, --lines=N', 'последние N записей', 'останні N записів', 'ostatnie N wpisów'),
    ('-p, --priority=err', 'только ошибки и хуже', 'лише помилки й гірше', 'tylko błędy i gorsze'),
    ('-r, --reverse', 'новые записи первыми', 'нові записи першими', 'najnowsze wpisy najpierw'),
    ('-e', 'сразу в конец журнала', 'одразу в кінець журналу', 'od razu na koniec dziennika'),
    ('-f, --follow', 'следить за новыми записями', 'стежити за новими записами', 'śledź nowe wpisy'))
cmd('nc', 'подключиться к TCP/UDP-порту', 'підключитися до TCP/UDP-порту', 'połącz się z portem TCP/UDP',
    ('-z', 'только проверить, открыт ли порт', 'лише перевірити, чи відкритий порт', 'tylko sprawdź, czy port jest otwarty'),
    ('-v', 'подробно', 'докладно', 'szczegółowo'),
    ('-w secs', 'таймаут в секундах', 'тайм-аут у секундах', 'limit czasu w sekundach'))
cmd('netstat', 'сетевые соединения (устарело, используйте ss)', 'мережеві з’єднання (застаріло, використовуйте ss)', 'połączenia sieciowe (przestarzałe, użyj ss)',
    ('-t', 'TCP', 'TCP', 'TCP'), ('-u', 'UDP', 'UDP', 'UDP'),
    ('-l', 'только слушающие порты', 'лише порти, що слухають', 'tylko nasłuchujące porty'),
    ('-p', 'показать PID и программу', 'показати PID і програму', 'pokaż PID i program'),
    ('-n', 'адреса цифрами', 'адреси цифрами', 'adresy liczbowo'))
cmd('nproc', 'число процессорных ядер', 'кількість процесорних ядер', 'liczba rdzeni procesora')
cmd('nslookup', 'DNS-запрос к серверу имён', 'DNS-запит до сервера імен', 'zapytanie do serwera nazw DNS')
cmd('ping', 'проверить, отвечает ли хост (ICMP)', 'перевірити, чи відповідає хост (ICMP)', 'sprawdź, czy host odpowiada (ICMP)',
    ('-c count', 'остановиться после count пакетов', 'зупинитися після count пакетів', 'zatrzymaj się po count pakietach'),
    ('-i interval', 'пауза между пакетами в секундах', 'пауза між пакетами в секундах', 'przerwa między pakietami w sekundach'),
    ('-W timeout', 'сколько секунд ждать ответ', 'скільки секунд чекати відповідь', 'ile sekund czekać na odpowiedź'),
    ('-q', 'тихо: только итог', 'тихо: лише підсумок', 'cicho: tylko podsumowanie'))
cmd('service', 'управлять сервисом (обёртка над systemctl)', 'керувати сервісом (обгортка над systemctl)', 'zarządzaj usługą (nakładka na systemctl)')
cmd('ss', 'показать сокеты и открытые порты', 'показати сокети й відкриті порти', 'pokaż gniazda i otwarte porty',
    ('-t, --tcp', 'TCP-сокеты', 'TCP-сокети', 'gniazda TCP'),
    ('-u, --udp', 'UDP-сокеты', 'UDP-сокети', 'gniazda UDP'),
    ('-l, --listening', 'только слушающие сокеты', 'лише сокети, що слухають', 'tylko nasłuchujące gniazda'),
    ('-a, --all', 'все сокеты', 'усі сокети', 'wszystkie gniazda'),
    ('-n, --numeric', 'порты цифрами, без имён сервисов', 'порти цифрами, без імен сервісів', 'porty liczbowo, bez nazw usług'),
    ('-p, --processes', 'показать процесс у сокета (чужие — только с root)', 'показати процес сокета (чужі — лише з root)', 'pokaż proces gniazda (cudze — tylko jako root)'))
cmd('systemctl', 'управлять сервисами systemd', 'керувати сервісами systemd', 'zarządzaj usługami systemd',
    ('status UNIT', 'состояние сервиса и последние строки журнала', 'стан сервісу й останні рядки журналу', 'stan usługi i ostatnie wiersze dziennika'),
    ('start|stop|restart UNIT', 'запустить, остановить или перезапустить сервис (нужен sudo)', 'запустити, зупинити або перезапустити сервіс (потрібен sudo)', 'uruchom, zatrzymaj lub zrestartuj usługę (potrzebne sudo)'),
    ('reload UNIT', 'перечитать конфигурацию без остановки', 'перечитати конфігурацію без зупинки', 'przeładuj konfigurację bez zatrzymania'),
    ('enable|disable UNIT', 'запускать (или нет) при загрузке', 'запускати (чи ні) під час завантаження', 'uruchamiaj (lub nie) przy starcie'),
    ('is-active UNIT', 'вывести active / inactive / failed', 'вивести active / inactive / failed', 'wypisz active / inactive / failed'),
    ('list-units --type=service', 'список сервисов', 'список сервісів', 'lista usług'),
    ('--failed', 'список упавших сервисов', 'список сервісів, що впали', 'lista usług, które padły'))
cmd('top', 'процессы и нагрузка в реальном времени', 'процеси й навантаження в реальному часі', 'procesy i obciążenie na żywo',
    ('-b', 'пакетный режим (для скриптов)', 'пакетний режим (для скриптів)', 'tryb wsadowy (dla skryptów)'),
    ('-n N', 'число обновлений', 'кількість оновлень', 'liczba odświeżeń'))
cmd('traceroute', 'показать маршрут пакетов до хоста', 'показати маршрут пакетів до хоста', 'pokaż trasę pakietów do hosta',
    ('-n', 'не превращать IP в имена', 'не перетворювати IP на імена', 'nie zamieniaj IP na nazwy'))
cmd('uptime', 'сколько система работает и нагрузка', 'скільки система працює і навантаження', 'jak długo działa system i obciążenie',
    ('-p, --pretty', 'в удобном виде', 'у зручному вигляді', 'w czytelnej postaci'),
    ('-s, --since', 'с какого момента работает', 'з якого моменту працює', 'od kiedy działa'))
cmd('w', 'кто в системе и что делает', 'хто в системі й що робить', 'kto jest zalogowany i co robi')
cmd('wget', 'скачать файл по URL', 'завантажити файл за URL', 'pobierz plik z URL')
cmd('who', 'кто вошёл в систему', 'хто увійшов у систему', 'kto jest zalogowany')
cmd('groupadd', 'создать группу', 'створити групу', 'utwórz grupę')
cmd('killall', 'завершить процессы по точному имени', 'завершити процеси за точним ім’ям', 'zakończ procesy o dokładnej nazwie')
cmd('passwd', 'сменить пароль пользователя', 'змінити пароль користувача', 'zmień hasło użytkownika')
cmd('pgrep', 'найти процессы по имени', 'знайти процеси за ім’ям', 'znajdź procesy po nazwie',
    ('-l', 'показать и имя процесса', 'показати й ім’я процесу', 'pokaż też nazwę procesu'),
    ('-a', 'показать полную командную строку', 'показати повний командний рядок', 'pokaż pełny wiersz polecenia'),
    ('-f', 'искать по всей командной строке, не только по имени', 'шукати за всім командним рядком, не лише за ім’ям', 'szukaj w całym wierszu polecenia, nie tylko w nazwie'),
    ('-u USER', 'только процессы пользователя USER', 'лише процеси користувача USER', 'tylko procesy użytkownika USER'),
    ('-c', 'вывести количество найденных процессов', 'вивести кількість знайдених процесів', 'wypisz liczbę znalezionych procesów'))
cmd('pkill', 'послать сигнал процессам по имени', 'надіслати сигнал процесам за ім’ям', 'wyślij sygnał procesom po nazwie',
    ('-f', 'искать по всей командной строке', 'шукати за всім командним рядком', 'szukaj w całym wierszu polecenia'),
    ('-u USER', 'только процессы пользователя USER', 'лише процеси користувача USER', 'tylko procesy użytkownika USER'),
    ('-9', 'послать SIGKILL (убить сразу)', 'надіслати SIGKILL (вбити одразу)', 'wyślij SIGKILL (zabij od razu)'))
cmd('useradd', 'создать пользователя', 'створити користувача', 'utwórz użytkownika',
    ('-m, --create-home', 'создать домашнюю директорию', 'створити домашню директорію', 'utwórz katalog domowy'),
    ('-s, --shell SHELL', 'оболочка входа нового пользователя', 'оболонка входу нового користувача', 'powłoka logowania nowego użytkownika'),
    ('-G, --groups GROUPS', 'дополнительные группы (через запятую)', 'додаткові групи (через кому)', 'dodatkowe grupy (po przecinku)'),
    ('-d, --home-dir DIR', 'домашняя директория пользователя', 'домашня директорія користувача', 'katalog domowy użytkownika'))
cmd('userdel', 'удалить пользователя', 'видалити користувача', 'usuń użytkownika',
    ('-r, --remove', 'удалить и домашнюю директорию', 'видалити й домашню директорію', 'usuń też katalog domowy'))
cmd('usermod', 'изменить учётную запись пользователя', 'змінити обліковий запис користувача', 'zmień konto użytkownika',
    ('-a, --append', 'добавить к группам из -G (не убирая другие)', 'додати до груп із -G (не прибираючи інших)', 'dodaj do grup z -G (nie usuwając innych)'),
    ('-G, --groups GROUPS', 'новый список дополнительных групп', 'новий список додаткових груп', 'nowa lista dodatkowych grup'),
    ('-s, --shell SHELL', 'новая оболочка входа', 'нова оболонка входу', 'nowa powłoka logowania'),
    ('-L, --lock', 'заблокировать пароль', 'заблокувати пароль', 'zablokuj hasło'))
cmd('alias', 'создать или показать сокращения команд', 'створити або показати скорочення команд', 'utwórz lub pokaż skróty poleceń')
cmd('bash', 'командная оболочка Bash (запустить скрипт)', 'командна оболонка Bash (запустити скрипт)', 'powłoka Bash (uruchom skrypt)')
TEST_OPTS = [
    ('-e FILE', 'FILE существует', 'FILE існує', 'FILE istnieje'),
    ('-f FILE', 'FILE существует и это обычный файл', 'FILE існує і це звичайний файл', 'FILE istnieje i jest zwykłym plikiem'),
    ('-d FILE', 'FILE существует и это директория', 'FILE існує і це директорія', 'FILE istnieje i jest katalogiem'),
    ('-s FILE', 'FILE существует и не пустой', 'FILE існує і не порожній', 'FILE istnieje i nie jest pusty'),
    ('-r/-w/-x FILE', 'FILE можно читать / писать / выполнять', 'FILE можна читати / писати / виконувати', 'FILE można czytać / zapisywać / wykonywać'),
    ('-z STRING', 'строка пустая', 'рядок порожній', 'napis jest pusty'),
    ('-n STRING', 'строка не пустая', 'рядок не порожній', 'napis nie jest pusty'),
    ('S1 = S2, S1 != S2', 'строки равны / не равны', 'рядки рівні / не рівні', 'napisy równe / różne'),
    ('N1 -eq/-ne/-lt/-le/-gt/-ge N2', 'сравнение чисел: равно, не равно, меньше, ≤, больше, ≥', 'порівняння чисел: дорівнює, не дорівнює, менше, ≤, більше, ≥', 'porównanie liczb: równe, różne, mniejsze, ≤, większe, ≥'),
]
cmd('[', 'проверить условие (то же, что test)', 'перевірити умову (те саме, що test)', 'sprawdź warunek (to samo co test)', *TEST_OPTS)
cmd('test', 'проверить условие', 'перевірити умову', 'sprawdź warunek', *TEST_OPTS)
cmd('break', 'выйти из цикла for, while или until', 'вийти з циклу for, while або until', 'wyjdź z pętli for, while lub until')
cmd('clear', 'очистить экран терминала', 'очистити екран термінала', 'wyczyść ekran terminala')
cmd('continue', 'перейти к следующей итерации цикла', 'перейти до наступної ітерації циклу', 'przejdź do następnej iteracji pętli')
cmd('.', 'выполнить команды из файла в текущей оболочке', 'виконати команди з файлу в поточній оболонці', 'wykonaj polecenia z pliku w bieżącej powłoce')
cmd('env', 'показать переменные окружения или запустить программу с изменёнными', 'показати змінні оточення або запустити програму зі зміненими', 'pokaż zmienne środowiska lub uruchom program ze zmienionymi')
cmd('exit', 'выйти из оболочки', 'вийти з оболонки', 'wyjdź z powłoki')
cmd('export', 'сделать переменную видимой для запускаемых программ', 'зробити змінну видимою для програм, що запускаються', 'udostępnij zmienną uruchamianym programom')
cmd('false', 'ничего не делать и завершиться с ошибкой', 'нічого не робити й завершитися з помилкою', 'nic nie rób i zakończ się błędem')
cmd('help', 'справка по встроенным командам', 'довідка з вбудованих команд', 'pomoc do poleceń wbudowanych')
cmd('history', 'история введённых команд', 'історія введених команд', 'historia wpisanych poleceń',
    ('-c', 'очистить историю', 'очистити історію', 'wyczyść historię'))
cmd('printenv', 'показать переменные окружения', 'показати змінні оточення', 'pokaż zmienne środowiska')
cmd('read', 'прочитать строку ввода в переменные', 'прочитати рядок вводу в змінні', 'wczytaj wiersz wejścia do zmiennych',
    ('-r', 'не считать обратную косую чертой escape', 'не вважати зворотну скісну escape', 'nie traktuj ukośnika wstecznego jako escape'),
    ('-p PROMPT', 'сначала напечатать приглашение PROMPT', 'спочатку надрукувати запрошення PROMPT', 'najpierw wypisz zachętę PROMPT'))
cmd('sh', 'командная оболочка (запустить скрипт)', 'командна оболонка (запустити скрипт)', 'powłoka (uruchom skrypt)')
cmd('source', 'выполнить команды из файла в текущей оболочке', 'виконати команди з файлу в поточній оболонці', 'wykonaj polecenia z pliku w bieżącej powłoce')
cmd('true', 'ничего не делать и завершиться успешно', 'нічого не робити й завершитися успішно', 'nic nie rób i zakończ się sukcesem')
cmd('type', 'показать, что это: команда, встроенная, алиас', 'показати, що це: команда, вбудована, аліас', 'pokaż, czym to jest: polecenie, wbudowane, alias')
cmd('unalias', 'удалить сокращение', 'видалити скорочення', 'usuń skrót')
cmd('unset', 'удалить переменную', 'видалити змінну', 'usuń zmienną')
cmd('docker', 'запускать контейнеры и управлять ими', 'запускати контейнери й керувати ними', 'uruchamiaj kontenery i zarządzaj nimi',
    ('run IMAGE', 'создать и запустить контейнер из образа', 'створити й запустити контейнер з образу', 'utwórz i uruchom kontener z obrazu'),
    ('ps', 'список работающих контейнеров (-a — все, -q — только ID)', 'список запущених контейнерів (-a — усі, -q — лише ID)', 'lista działających kontenerów (-a — wszystkie, -q — tylko ID)'),
    ('images', 'список локальных образов', 'список локальних образів', 'lista lokalnych obrazów'),
    ('pull IMAGE', 'скачать образ с Docker Hub', 'завантажити образ з Docker Hub', 'pobierz obraz z Docker Hub'),
    ('logs CONTAINER', 'вывод (логи) контейнера (--tail N, -f)', 'вивід (логи) контейнера (--tail N, -f)', 'wyjście (logi) kontenera (--tail N, -f)'),
    ('exec CONTAINER CMD', 'выполнить команду внутри работающего контейнера', 'виконати команду всередині запущеного контейнера', 'wykonaj polecenie wewnątrz działającego kontenera'),
    ('stop|start|restart CONTAINER', 'остановить, запустить или перезапустить контейнер', 'зупинити, запустити або перезапустити контейнер', 'zatrzymaj, uruchom lub zrestartuj kontener'),
    ('rm CONTAINER', 'удалить остановленный контейнер (-f — и работающий)', 'видалити зупинений контейнер (-f — і запущений)', 'usuń zatrzymany kontener (-f — także działający)'),
    ('rmi IMAGE', 'удалить образ', 'видалити образ', 'usuń obraz'),
    ('build -t NAME DIR', 'собрать образ по DIR/Dockerfile', 'зібрати образ за DIR/Dockerfile', 'zbuduj obraz z DIR/Dockerfile'),
    ('inspect CONTAINER', 'все подробности в JSON (-f — одно поле)', 'усі подробиці в JSON (-f — одне поле)', 'wszystkie szczegóły w JSON (-f — jedno pole)'),
    ('compose up -d', 'запустить все сервисы из compose.yaml в фоне', 'запустити всі сервіси з compose.yaml у фоні', 'uruchom wszystkie usługi z compose.yaml w tle'),
    ('compose down', 'остановить и удалить сервисы из compose.yaml', 'зупинити й видалити сервіси з compose.yaml', 'zatrzymaj i usuń usługi z compose.yaml'),
    ('volume ls|create|rm', 'управлять именованными томами', 'керувати іменованими томами', 'zarządzaj nazwanymi wolumenami'),
    ('network ls|create', 'список или создание сетей', 'список або створення мереж', 'lista lub tworzenie sieci'),
    ('-d, --detach', 'запустить в фоне и напечатать ID контейнера', 'запустити у фоні й надрукувати ID контейнера', 'uruchom w tle i wypisz ID kontenera'),
    ('-p, --publish HOST:CONTAINER', 'пробросить порт: ХОСТ:КОНТЕЙНЕР, напр. 8080:80', 'прокинути порт: ХОСТ:КОНТЕЙНЕР, напр. 8080:80', 'opublikuj port: HOST:KONTENER, np. 8080:80'),
    ('--name NAME', 'дать контейнеру имя', 'дати контейнеру ім’я', 'nadaj kontenerowi nazwę'),
    ('-e, --env KEY=VALUE', 'задать переменную окружения внутри контейнера', 'задати змінну оточення всередині контейнера', 'ustaw zmienną środowiska w kontenerze'),
    ('-v, --volume SRC:DST', 'подключить папку хоста или именованный том', 'підключити теку хоста або іменований том', 'zamontuj katalog hosta lub nazwany wolumen'),
    ('--rm', 'удалить контейнер сразу после остановки', 'видалити контейнер одразу після зупинки', 'usuń kontener zaraz po zatrzymaniu'),
    ('--restart POLICY', 'политика перезапуска: no, always, unless-stopped, on-failure', 'політика перезапуску: no, always, unless-stopped, on-failure', 'polityka restartu: no, always, unless-stopped, on-failure'),
    ('-i, -t, -it', 'интерактивный режим с терминалом (для оболочек)', 'інтерактивний режим з терміналом (для оболонок)', 'tryb interaktywny z terminalem (dla powłok)'),
    ('-a, --all', 'ps: показать и остановленные контейнеры', 'ps: показати й зупинені контейнери', 'ps: pokaż też zatrzymane kontenery'),
    ('-q, --quiet', 'выводить только ID', 'виводити лише ID', 'wypisuj tylko ID'),
    ('-f, --force', 'принудительно: удалить даже работающий контейнер или используемый образ', 'примусово: видалити навіть запущений контейнер або образ, що використовується', 'wymuś: usuń nawet działający kontener lub używany obraz'),
    ('--tail N', 'logs: только последние N строк', 'logs: лише останні N рядків', 'logs: tylko ostatnie N wierszy'),
    ('-t, --tag NAME', 'build: имя (и тег) нового образа, напр. myapp:1.0', 'build: ім’я (і тег) нового образу, напр. myapp:1.0', 'build: nazwa (i tag) nowego obrazu, np. myapp:1.0'),
    ('--format, -f TEMPLATE', 'вывести только поля по шаблону, напр. {{.State.Status}}', 'вивести лише поля за шаблоном, напр. {{.State.Status}}', 'wypisz tylko pola według szablonu, np. {{.State.Status}}'))
