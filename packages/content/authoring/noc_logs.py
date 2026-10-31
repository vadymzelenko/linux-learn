import copy, json, os, random
from collections import Counter
from lib import *

base = json.load(open(os.path.join(ROOT, 'fixtures', 'noc-web01.json')))
rnd = random.Random(31)

BOT = '45.155.205.66'
IPS = ['203.0.113.10', '198.51.100.23', '192.0.2.44', '203.0.113.77', '198.51.100.5', '192.0.2.150']
PATHS = ['/', '/api/items', '/api/cart', '/static/app.js', '/static/style.css', '/health']

rows = []
for i in range(240):
    minute = i // 4
    sec = (i * 13) % 60
    if i % 5 == 0:
        ip, path, code = BOT, '/login', 401
    else:
        ip, path = rnd.choice(IPS), rnd.choice(PATHS)
        code = 200 if rnd.random() > 0.06 else 404
        if 200 <= i < 232 and path.startswith('/api'):
            code = 502
    rows.append((ip, minute, sec, 'POST' if path == '/login' else 'GET', path, code, rnd.randint(200, 9000)))

ACCESS = ''.join(f'{ip} - - [31/Oct/2026:10:{m:02d}:{s:02d} +0000] "{meth} {p} HTTP/1.1" {c} {size} "-" "{"python-requests/2.31" if ip == BOT else "Mozilla/5.0"}"\n' for ip, m, s, meth, p, c, size in rows)
N502 = sum(1 for r in rows if r[5] == 502)
FIRST502 = next(r for r in rows if r[5] == 502)
FIRST502_T = f'10:{FIRST502[1]:02d}:{FIRST502[2]:02d}'
STATUS = Counter(r[5] for r in rows)
TOP_IP = Counter(r[0] for r in rows).most_common(1)[0]

ERRLOG = ''.join(
    f'2026/10/31 10:{r[1]:02d}:{r[2]:02d} [error] 912#912: *{1000 + k} connect() failed (111: Connection refused) while connecting to upstream, client: {r[0]}, server: shop.example.com, request: "GET {r[4]} HTTP/1.1", upstream: "http://127.0.0.1:3000{r[4]}"\n'
    for k, r in enumerate(x for x in rows if x[5] == 502))

SYSLOG_OLD = '\n'.join([
    'Oct 29 03:00:01 web01 CRON[801]: (root) CMD (/usr/local/bin/backup.sh)',
    'Oct 29 03:12:44 web01 kernel: [  412.118] EXT4-fs warning (device sda1): ext4_dx_add_entry: directory index full',
    'Oct 29 03:12:45 web01 backup.sh[802]: error: disk quota exceeded while writing /backup/db.dump',
    'Oct 29 08:00:01 web01 CRON[990]: (root) CMD (/usr/local/bin/backup.sh)',
]) + '\n'

LOGS = copy.deepcopy(base)
LOGS['files']['/var/log/nginx/access.log'] = {"content": ACCESS, "owner": "www-data", "mode": "644"}
LOGS['files']['/var/log/nginx/error.log'] = {"content": ERRLOG, "owner": "www-data", "mode": "644"}
LOGS['files']['/var/log/syslog.2.gz'] = {"content": SYSLOG_OLD, "owner": "syslog", "mode": "644"}
LOGS['files']['/var/log/nginx/access.log.2.gz'] = {"content": base['files']['/var/log/nginx/access.log.1']['content'], "owner": "www-data", "mode": "644"}
LOGS['files']['/var/log/app/'] = None
LOGS['files']['/var/log/app/api.log'] = {"content": ''.join([
    '2026-10-31T10:49:58Z INFO  request id=8812 GET /api/items 200 12ms\n',
    '2026-10-31T10:50:01Z WARN  db pool 18/20 connections in use\n',
    '2026-10-31T10:50:03Z ERROR db pool exhausted (20/20), request id=8815 waited 5000ms\n',
    '2026-10-31T10:50:03Z ERROR request id=8815 GET /api/cart 500 5004ms\n',
    '2026-10-31T10:50:04Z FATAL unhandled exception: Error: ECONNRESET\n',
    '2026-10-31T10:50:04Z INFO  shutting down\n',
]), "owner": "student", "mode": "644"}

AUTH = base['files']['/var/log/auth.log']['content']
FAILED = sum(1 for l in AUTH.splitlines() if 'Failed password' in l)

L1 = [
    lesson('logs-where', L('Where the logs live', 'Где живут логи', 'Де живуть логи'), ['ls', 'sudo', 'zcat'], setup=LOGS, steps=[
        reading(L(
            """## The log map
| file | what is inside |
|---|---|
| /var/log/syslog | general system messages (Debian/Ubuntu) |
| /var/log/auth.log | logins, sudo, ssh — **root only** |
| /var/log/kern.log | kernel: disks, network cards, OOM |
| /var/log/nginx/access.log | every HTTP request |
| /var/log/nginx/error.log | nginx errors, upstream problems |
| /var/log/app/ | your company's applications |
| journalctl | the systemd journal (all services) |

## Rotation
Logs would grow forever, so **logrotate** renames them every day or week:
```
access.log        ← written right now
access.log.1      ← yesterday
access.log.2.gz   ← older, compressed
```
Compressed logs are read with `zcat`, `zgrep`, `zless` — no need to unpack.

> When an incident started yesterday evening, the answer is often in `.1`, not in the live file.""",
            """## Карта логов
| файл | что внутри |
|---|---|
| /var/log/syslog | общие сообщения системы (Debian/Ubuntu) |
| /var/log/auth.log | входы, sudo, ssh — **только для root** |
| /var/log/kern.log | ядро: диски, сетевые карты, OOM |
| /var/log/nginx/access.log | каждый HTTP-запрос |
| /var/log/nginx/error.log | ошибки nginx, проблемы с upstream |
| /var/log/app/ | приложения вашей компании |
| journalctl | журнал systemd (все сервисы) |

## Ротация
Логи росли бы бесконечно, поэтому **logrotate** каждый день или неделю переименовывает их:
```
access.log        ← пишется прямо сейчас
access.log.1      ← вчера
access.log.2.gz   ← старше, сжат
```
Сжатые логи читают через `zcat`, `zgrep`, `zless` — распаковывать не нужно.

> Если инцидент начался вчера вечером, ответ часто в `.1`, а не в живом файле.""",
            """## Мапа логів
| файл | що всередині |
|---|---|
| /var/log/syslog | загальні повідомлення системи (Debian/Ubuntu) |
| /var/log/auth.log | входи, sudo, ssh — **лише для root** |
| /var/log/kern.log | ядро: диски, мережеві карти, OOM |
| /var/log/nginx/access.log | кожен HTTP-запит |
| /var/log/nginx/error.log | помилки nginx, проблеми з upstream |
| /var/log/app/ | застосунки вашої компанії |
| journalctl | журнал systemd (усі сервіси) |

## Ротація
Логи росли б безкінечно, тому **logrotate** щодня або щотижня перейменовує їх:
```
access.log        ← пишеться просто зараз
access.log.1      ← учора
access.log.2.gz   ← старіший, стиснутий
```
Стиснуті логи читають через `zcat`, `zgrep`, `zless` — розпаковувати не треба.

> Якщо інцидент почався вчора ввечері, відповідь часто в `.1`, а не в живому файлі."""),
            title=L('/var/log', '/var/log', '/var/log')),
        task(L('List the nginx logs with their sizes.', 'Выведите логи nginx с размерами.', 'Виведіть логи nginx із розмірами.'),
             [used('ls', L('ls -lh', 'ls -lh', 'ls -lh'), flags=['-l']), out(L('access.log.2.gz is visible', 'Виден access.log.2.gz', 'Видно access.log.2.gz'), text='access.log.2.gz')],
             L('ls -lh /var/log/nginx', 'ls -lh /var/log/nginx', 'ls -lh /var/log/nginx'), 'ls', ['ls -lh /var/log/nginx']),
        task(L('Read the last 3 lines of /var/log/auth.log. (Hint: it is not readable for everyone.)', 'Прочитайте последние 3 строки /var/log/auth.log. (Подсказка: он читается не всеми.)', 'Прочитайте останні 3 рядки /var/log/auth.log. (Підказка: його читають не всі.)'),
             [used('tail', L('tail -n 3 with sudo', 'tail -n 3 через sudo', 'tail -n 3 через sudo'), success=True), lines(L('3 lines', '3 строки', '3 рядки'), eq=3)],
             L('sudo tail -n 3 /var/log/auth.log', 'sudo tail -n 3 /var/log/auth.log', 'sudo tail -n 3 /var/log/auth.log'), 'tail', ['sudo tail -n 3 /var/log/auth.log']),
        task(L('Two days ago the backup failed. Find "error" in the compressed /var/log/syslog.2.gz.', 'Два дня назад упал бэкап. Найдите «error» в сжатом /var/log/syslog.2.gz.', 'Два дні тому впав бекап. Знайдіть «error» у стиснутому /var/log/syslog.2.gz.'),
             [used('zgrep', L('Use zgrep', 'Используйте zgrep', 'Використайте zgrep')), out(L('disk quota exceeded', 'disk quota exceeded', 'disk quota exceeded'), text='disk quota exceeded')],
             L('zgrep PATTERN FILE.gz', 'zgrep ШАБЛОН ФАЙЛ.gz', 'zgrep ШАБЛОН ФАЙЛ.gz'), 'zgrep', ['zgrep error /var/log/syslog.2.gz']),
        quiz(L('A customer says the site was slow yesterday at 23:00. It is 09:00 now and logs rotate at midnight. Which file?', 'Клиент говорит, что вчера в 23:00 сайт тормозил. Сейчас 09:00, ротация в полночь. Какой файл смотреть?', 'Клієнт каже, що вчора о 23:00 сайт гальмував. Зараз 09:00, ротація опівночі. Який файл дивитися?'),
             [L('access.log.1', 'access.log.1', 'access.log.1'), L('access.log', 'access.log', 'access.log'), L('error.log only', 'Только error.log', 'Лише error.log')], 0,
             L('After midnight yesterday\'s lines moved to .1.', 'После полуночи вчерашние строки переехали в .1.', 'Після опівночі вчорашні рядки переїхали в .1.')),
    ]),

    lesson('logs-grep', L('Searching logs with grep', 'Поиск по логам: grep', 'Пошук у логах: grep'), ['grep', 'wc'], setup=LOGS, steps=[
        theory(L(
            """## Recipes
```
$ grep -i error /var/log/app/api.log
$ grep -c ' 502 ' /var/log/nginx/access.log
$ grep -v ' 200 ' /var/log/nginx/access.log
$ grep '10:5' /var/log/nginx/access.log
$ grep -E 'ERROR|FATAL' /var/log/app/api.log
$ grep -n FATAL /var/log/app/api.log
```
- `-i` ignore case, `-c` count, `-v` invert, `-n` line numbers, `-E` alternatives with `|`
- grep by **time** (`10:5` = 10:50–10:59) to cut a time window

> Put spaces around a status code: `' 502 '` — otherwise `502` also matches a byte size like 15020.""",
            """## Рецепты
```
$ grep -i error /var/log/app/api.log
$ grep -c ' 502 ' /var/log/nginx/access.log
$ grep -v ' 200 ' /var/log/nginx/access.log
$ grep '10:5' /var/log/nginx/access.log
$ grep -E 'ERROR|FATAL' /var/log/app/api.log
$ grep -n FATAL /var/log/app/api.log
```
- `-i` без учёта регистра, `-c` подсчёт, `-v` инверсия, `-n` номера строк, `-E` варианты через `|`
- grep по **времени** (`10:5` = 10:50–10:59) вырезает временное окно

> Обрамляйте код ответа пробелами: `' 502 '` — иначе `502` совпадёт и с размером 15020.""",
            """## Рецепти
```
$ grep -i error /var/log/app/api.log
$ grep -c ' 502 ' /var/log/nginx/access.log
$ grep -v ' 200 ' /var/log/nginx/access.log
$ grep '10:5' /var/log/nginx/access.log
$ grep -E 'ERROR|FATAL' /var/log/app/api.log
$ grep -n FATAL /var/log/app/api.log
```
- `-i` без урахування регістру, `-c` підрахунок, `-v` інверсія, `-n` номери рядків, `-E` варіанти через `|`
- grep за **часом** (`10:5` = 10:50–10:59) вирізає часове вікно

> Обрамлюйте код відповіді пробілами: `' 502 '` — інакше `502` збіжиться й із розміром 15020."""),
            title=L('grep in logs', 'grep по логам', 'grep у логах'), demo=['grep -c FATAL /var/log/app/api.log']),
        task(L('Find all ERROR and FATAL lines in the API log /var/log/app/api.log.', 'Найдите все строки ERROR и FATAL в логе API /var/log/app/api.log.', 'Знайдіть усі рядки ERROR і FATAL у лозі API /var/log/app/api.log.'),
             [used('grep', L('grep -E', 'grep -E', 'grep -E')), lines(L('3 lines', '3 строки', '3 рядки'), eq=3)],
             L("grep -E 'ERROR|FATAL' FILE", "grep -E 'ERROR|FATAL' ФАЙЛ", "grep -E 'ERROR|FATAL' ФАЙЛ"), 'grep', ["grep -E 'ERROR|FATAL' /var/log/app/api.log"]),
        task(L('How many requests ended with 502 in /var/log/nginx/access.log?', 'Сколько запросов закончились кодом 502 в /var/log/nginx/access.log?', 'Скільки запитів завершилися кодом 502 у /var/log/nginx/access.log?'),
             [used('grep', L('grep -c', 'grep -c', 'grep -c'), flags=['-c']), out(L(f'{N502}', f'{N502}', f'{N502}'), regex=f'^{N502}$')],
             L("grep -c ' 502 ' FILE", "grep -c ' 502 ' ФАЙЛ", "grep -c ' 502 ' ФАЙЛ"), 'grep', ["grep -c ' 502 ' /var/log/nginx/access.log"]),
        task(L('When did the 502s start? Show the FIRST 502 line only.', 'Когда начались 502? Покажите только ПЕРВУЮ строку с 502.', 'Коли почалися 502? Покажіть лише ПЕРШИЙ рядок із 502.'),
             [used('grep', L('grep', 'grep', 'grep')), lines(L('1 line', '1 строка', '1 рядок'), eq=1), out(L(f'time {FIRST502_T}', f'время {FIRST502_T}', f'час {FIRST502_T}'), text=FIRST502_T)],
             L("grep ' 502 ' FILE | head -n 1  (or grep -m 1)", "grep ' 502 ' ФАЙЛ | head -n 1  (или grep -m 1)", "grep ' 502 ' ФАЙЛ | head -n 1  (або grep -m 1)"), 'grep', ["grep ' 502 ' /var/log/nginx/access.log | head -n 1"]),
        task(L('Look at the nginx error log: what does nginx say about the upstream? Show the last line.', 'Посмотрите лог ошибок nginx: что nginx пишет про upstream? Покажите последнюю строку.', 'Подивіться лог помилок nginx: що nginx пише про upstream? Покажіть останній рядок.'),
             [used('tail', L('tail -n 1', 'tail -n 1', 'tail -n 1')), out(L('Connection refused', 'Connection refused', 'Connection refused'), text='Connection refused')],
             L('tail -n 1 /var/log/nginx/error.log', 'tail -n 1 /var/log/nginx/error.log', 'tail -n 1 /var/log/nginx/error.log'), 'tail', ['tail -n 1 /var/log/nginx/error.log']),
        quiz(L('nginx error.log says "connect() failed (111: Connection refused) while connecting to upstream 127.0.0.1:3000". Meaning?', 'В error.log nginx: «connect() failed (111: Connection refused) while connecting to upstream 127.0.0.1:3000». Что это значит?', 'В error.log nginx: «connect() failed (111: Connection refused) while connecting to upstream 127.0.0.1:3000». Що це означає?'),
             [L('Nothing listens on port 3000 — the backend is down', 'На порту 3000 никто не слушает — бэкенд лежит', 'На порту 3000 ніхто не слухає — бекенд лежить'), L('The client has no internet', 'У клиента нет интернета', 'У клієнта немає інтернету'), L('DNS is broken', 'Сломан DNS', 'Зламано DNS')], 0),
    ]),

    lesson('logs-access', L('Analysing access.log', 'Анализ access.log', 'Аналіз access.log'), ['awk', 'sort', 'uniq'], setup=LOGS, steps=[
        reading(L(
            """## Anatomy of a line
```
45.155.205.66 - - [31/Oct/2026:10:00:00 +0000] "POST /login HTTP/1.1" 401 512 "-" "python-requests/2.31"
```
| awk field | value |
|---|---|
| `$1` | client IP |
| `$4` | time `[31/Oct/2026:10:00:00` |
| `$6` | method `"POST` |
| `$7` | path `/login` |
| `$9` | **status** 401 |
| `$10` | size in bytes |

## The magic pipeline
```
$ awk '{print $9}' access.log | sort | uniq -c | sort -rn
```
1. `awk` cuts one column
2. `sort` puts equal values together
3. `uniq -c` counts each group
4. `sort -rn` — biggest first

> Swap `$9` for `$1` (who), `$7` (what) — and you answer 80% of "what is going on with the site" questions.""",
            """## Анатомия строки
```
45.155.205.66 - - [31/Oct/2026:10:00:00 +0000] "POST /login HTTP/1.1" 401 512 "-" "python-requests/2.31"
```
| поле awk | значение |
|---|---|
| `$1` | IP клиента |
| `$4` | время `[31/Oct/2026:10:00:00` |
| `$6` | метод `"POST` |
| `$7` | путь `/login` |
| `$9` | **код ответа** 401 |
| `$10` | размер в байтах |

## Магический конвейер
```
$ awk '{print $9}' access.log | sort | uniq -c | sort -rn
```
1. `awk` вырезает одну колонку
2. `sort` ставит одинаковые значения рядом
3. `uniq -c` считает каждую группу
4. `sort -rn` — самые большие сверху

> Замените `$9` на `$1` (кто), `$7` (что) — и вы ответите на 80% вопросов «что происходит с сайтом».""",
            """## Анатомія рядка
```
45.155.205.66 - - [31/Oct/2026:10:00:00 +0000] "POST /login HTTP/1.1" 401 512 "-" "python-requests/2.31"
```
| поле awk | значення |
|---|---|
| `$1` | IP клієнта |
| `$4` | час `[31/Oct/2026:10:00:00` |
| `$6` | метод `"POST` |
| `$7` | шлях `/login` |
| `$9` | **код відповіді** 401 |
| `$10` | розмір у байтах |

## Магічний конвеєр
```
$ awk '{print $9}' access.log | sort | uniq -c | sort -rn
```
1. `awk` вирізає одну колонку
2. `sort` ставить однакові значення поруч
3. `uniq -c` рахує кожну групу
4. `sort -rn` — найбільші зверху

> Замініть `$9` на `$1` (хто), `$7` (що) — і ви відповісте на 80% питань «що відбувається із сайтом»."""),
            title=L('Columns of access.log', 'Колонки access.log', 'Колонки access.log')),
        task(L('Count requests per status code in /var/log/nginx/access.log, most frequent first.', 'Посчитайте запросы по кодам ответа в /var/log/nginx/access.log, самые частые сверху.', 'Порахуйте запити за кодами відповіді в /var/log/nginx/access.log, найчастіші зверху.'),
             [used('awk', L('awk prints $9', 'awk печатает $9', 'awk друкує $9')), used('uniq', L('uniq -c', 'uniq -c', 'uniq -c'), flags=['-c']), out(L(f'{STATUS[200]} requests with 200 on top', f'{STATUS[200]} запросов с 200 сверху', f'{STATUS[200]} запитів із 200 зверху'), regex=f'^\\s*{STATUS[200]} 200')],
             L("awk '{print $9}' FILE | sort | uniq -c | sort -rn", "awk '{print $9}' ФАЙЛ | sort | uniq -c | sort -rn", "awk '{print $9}' ФАЙЛ | sort | uniq -c | sort -rn"), 'awk', ["awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -rn"],
             instructions=L("1. `awk '{print $9}' /var/log/nginx/access.log` — only the codes\n2. `| sort | uniq -c` — count\n3. `| sort -rn` — biggest first", "1. `awk '{print $9}' /var/log/nginx/access.log` — только коды\n2. `| sort | uniq -c` — посчитать\n3. `| sort -rn` — больше сверху", "1. `awk '{print $9}' /var/log/nginx/access.log` — лише коди\n2. `| sort | uniq -c` — порахувати\n3. `| sort -rn` — більші зверху")),
        task(L('Which IP sends the most requests? Show the top 3 IPs.', 'Какой IP шлёт больше всего запросов? Покажите топ-3 IP.', 'Який IP надсилає найбільше запитів? Покажіть топ-3 IP.'),
             [used('head', L('head -n 3 (or -3)', 'head -n 3 (или -3)', 'head -n 3 (або -3)')), lines(L('3 lines', '3 строки', '3 рядки'), eq=3), out(L(f'{TOP_IP[0]} on top', f'{TOP_IP[0]} сверху', f'{TOP_IP[0]} зверху'), regex=f'^\\s*{TOP_IP[1]} {TOP_IP[0]}')],
             L("Same pipeline with $1, then | head -n 3", "Тот же конвейер с $1, затем | head -n 3", "Той самий конвеєр з $1, потім | head -n 3"), 'awk', ["awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -n 3"]),
        task(L('Which paths return 5xx errors? Count 5xx per path.', 'Какие пути отдают ошибки 5xx? Посчитайте 5xx по путям.', 'Які шляхи віддають помилки 5xx? Порахуйте 5xx за шляхами.'),
             [used('awk', L('awk with a condition $9 >= 500', 'awk с условием $9 >= 500', 'awk з умовою $9 >= 500')), out(L('/api/ paths', 'пути /api/', 'шляхи /api/'), text='/api/')],
             L("awk '$9 >= 500 {print $7}' FILE | sort | uniq -c", "awk '$9 >= 500 {print $7}' ФАЙЛ | sort | uniq -c", "awk '$9 >= 500 {print $7}' ФАЙЛ | sort | uniq -c"), 'awk', ["awk '$9 >= 500 {print $7}' /var/log/nginx/access.log | sort | uniq -c"]),
        quiz(L(f'{BOT} sends a POST /login every few seconds, always 401, user agent python-requests. What is it most likely?', f'{BOT} каждые несколько секунд шлёт POST /login, всегда 401, user agent python-requests. Что это скорее всего?', f'{BOT} кожні кілька секунд надсилає POST /login, завжди 401, user agent python-requests. Що це найімовірніше?'),
             [L('A password-guessing bot — report to security, consider blocking', 'Бот подбирает пароли — сообщить безопасникам, подумать о блокировке', 'Бот підбирає паролі — повідомити безпеці, подумати про блокування'), L('A happy customer', 'Довольный клиент', 'Задоволений клієнт'), L('Our own health check', 'Наш собственный health-check', 'Наш власний health-check')], 0),
    ]),

    lesson('logs-auth', L('Security: auth.log', 'Безопасность: auth.log', 'Безпека: auth.log'), ['grep', 'awk', 'sudo'], setup=LOGS, steps=[
        theory(L(
            """## What auth.log shows
- `Accepted publickey for student from 192.168.1.10` — a successful ssh login
- `Failed password for invalid user admin from 45.155.205.2` — someone guessing
- `sudo: student : ... COMMAND=/usr/bin/systemctl restart nginx` — **who** did **what** as root

## Counting attackers
```
$ sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c
```
`$NF` = the last field, `$(NF-3)` = fourth from the end — here the IP.

> `sudo` lines in auth.log are the first place to look after "who restarted nginx at 10:12?".""",
            """## Что показывает auth.log
- `Accepted publickey for student from 192.168.1.10` — успешный вход по ssh
- `Failed password for invalid user admin from 45.155.205.2` — кто-то подбирает пароль
- `sudo: student : ... COMMAND=/usr/bin/systemctl restart nginx` — **кто** сделал **что** от root

## Считаем атакующих
```
$ sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c
```
`$NF` — последнее поле, `$(NF-3)` — четвёртое с конца, здесь это IP.

> Строки sudo в auth.log — первое место, куда смотреть на вопрос «кто перезапустил nginx в 10:12?».""",
            """## Що показує auth.log
- `Accepted publickey for student from 192.168.1.10` — успішний вхід через ssh
- `Failed password for invalid user admin from 45.155.205.2` — хтось підбирає пароль
- `sudo: student : ... COMMAND=/usr/bin/systemctl restart nginx` — **хто** зробив **що** від root

## Рахуємо атакувальників
```
$ sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c
```
`$NF` — останнє поле, `$(NF-3)` — четверте з кінця, тут це IP.

> Рядки sudo в auth.log — перше місце, куди дивитися на питання «хто перезапустив nginx о 10:12?»."""),
            title=L('Logins and sudo', 'Входы и sudo', 'Входи та sudo')),
        task(L('How many failed password attempts are in /var/log/auth.log?', 'Сколько неудачных попыток ввода пароля в /var/log/auth.log?', 'Скільки невдалих спроб введення пароля в /var/log/auth.log?'),
             [used('grep', L('grep -c via sudo', 'grep -c через sudo', 'grep -c через sudo'), success=True), out(L(f'{FAILED}', f'{FAILED}', f'{FAILED}'), regex=f'^{FAILED}$')],
             L("sudo grep -c 'Failed password' /var/log/auth.log", "sudo grep -c 'Failed password' /var/log/auth.log", "sudo grep -c 'Failed password' /var/log/auth.log"), 'grep', ["sudo grep -c 'Failed password' /var/log/auth.log"]),
        task(L('Who restarted nginx with sudo? Find the sudo line.', 'Кто перезапускал nginx через sudo? Найдите строку sudo.', 'Хто перезапускав nginx через sudo? Знайдіть рядок sudo.'),
             [used('grep', L('grep COMMAND', 'grep COMMAND', 'grep COMMAND'), success=True), out(L('restart nginx', 'restart nginx', 'restart nginx'), text='restart nginx')],
             L('sudo grep COMMAND /var/log/auth.log', 'sudo grep COMMAND /var/log/auth.log', 'sudo grep COMMAND /var/log/auth.log'), 'grep', ['sudo grep COMMAND /var/log/auth.log']),
        task(L('List the attacking IPs (one per line, unique).', 'Выведите атакующие IP (по одному на строку, без повторов).', 'Виведіть IP атакувальників (по одному на рядок, без повторів).'),
             [used('awk', L('awk $(NF-3)', 'awk $(NF-3)', 'awk $(NF-3)')), out(L('45.155.205.9 is listed', 'Есть 45.155.205.9', 'Є 45.155.205.9'), text='45.155.205.9'), lines(L('6 unique IPs', '6 уникальных IP', '6 унікальних IP'), eq=6)],
             L("sudo grep 'Failed password' FILE | awk '{print $(NF-3)}' | sort -u", "sudo grep 'Failed password' ФАЙЛ | awk '{print $(NF-3)}' | sort -u", "sudo grep 'Failed password' ФАЙЛ | awk '{print $(NF-3)}' | sort -u"), 'awk', ["sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort -u"]),
        quiz(L('You see thousands of "Failed password for invalid user admin" from different IPs. Correct NOC reaction?', 'Вы видите тысячи «Failed password for invalid user admin» с разных IP. Правильная реакция NOC?', 'Ви бачите тисячі «Failed password for invalid user admin» з різних IP. Правильна реакція NOC?'),
             [L('Note it in a ticket for security; it is background noise unless a login succeeded', 'Записать в тикет для безопасности; это фон, если нет успешного входа', 'Записати в тікет для безпеки; це фон, якщо немає успішного входу'), L('Shut the server down', 'Выключить сервер', 'Вимкнути сервер'), L('Delete auth.log', 'Удалить auth.log', 'Видалити auth.log')], 0),
    ]),

    lesson('logs-timeline', L('Building a timeline', 'Строим таймлайн', 'Будуємо таймлайн'), ['grep', 'head', 'tail'], setup=LOGS, steps=[
        reading(L(
            """## Why a timeline
Every incident review starts with the question **"what happened when?"**. Collect events from all sources into one list:
```
10:12  student restarted nginx (auth.log)
10:50  api: db pool exhausted (app/api.log)
10:50  api: FATAL ECONNRESET, shutting down
10:50  nginx: first 502 (access.log)
10:55  alert "5xx rate high" fired
```
## Rules
- times in **one timezone** (UTC is safest)
- the source of each line — so others can verify
- facts, not guesses: "api stopped" — fact, "the DB is to blame" — hypothesis

> The first error in time is usually closer to the cause than the loudest one.""",
            """## Зачем таймлайн
Любой разбор инцидента начинается с вопроса **«что и когда случилось?»**. Соберите события из всех источников в один список:
```
10:12  student перезапустил nginx (auth.log)
10:50  api: db pool exhausted (app/api.log)
10:50  api: FATAL ECONNRESET, shutting down
10:50  nginx: первый 502 (access.log)
10:55  сработал алерт «5xx rate high»
```
## Правила
- время в **одном часовом поясе** (надёжнее всего UTC)
- источник каждой строки — чтобы другие могли проверить
- факты, а не догадки: «api остановился» — факт, «виновата БД» — гипотеза

> Первая по времени ошибка обычно ближе к причине, чем самая громкая.""",
            """## Навіщо таймлайн
Будь-який розбір інциденту починається з питання **«що і коли сталося?»**. Зберіть події з усіх джерел в один список:
```
10:12  student перезапустив nginx (auth.log)
10:50  api: db pool exhausted (app/api.log)
10:50  api: FATAL ECONNRESET, shutting down
10:50  nginx: перший 502 (access.log)
10:55  спрацював алерт «5xx rate high»
```
## Правила
- час в **одному часовому поясі** (найнадійніше UTC)
- джерело кожного рядка — щоб інші могли перевірити
- факти, а не здогадки: «api зупинився» — факт, «винна БД» — гіпотеза

> Перша за часом помилка зазвичай ближча до причини, ніж найгучніша."""),
            title=L('What happened when', 'Что и когда', 'Що і коли')),
        task(L('Find the very first warning or error in /var/log/app/api.log (with its line number).', 'Найдите самое первое предупреждение или ошибку в /var/log/app/api.log (с номером строки).', 'Знайдіть найперше попередження або помилку в /var/log/app/api.log (з номером рядка).'),
             [used('grep', L('grep -n', 'grep -n', 'grep -n'), flags=['-n']), out(L('2: ... WARN db pool', '2: ... WARN db pool', '2: ... WARN db pool'), regex='^2:.*WARN')],
             L("grep -n -E 'WARN|ERROR' FILE | head -n 1", "grep -n -E 'WARN|ERROR' ФАЙЛ | head -n 1", "grep -n -E 'WARN|ERROR' ФАЙЛ | head -n 1"), 'grep', ["grep -n -E 'WARN|ERROR|FATAL' /var/log/app/api.log | head -n 1"]),
        task(L('Start a timeline: save the ERROR and FATAL lines of the API log to ~/incident/timeline.txt.', 'Начните таймлайн: сохраните строки ERROR и FATAL лога API в ~/incident/timeline.txt.', 'Почніть таймлайн: збережіть рядки ERROR і FATAL логу API в ~/incident/timeline.txt.'),
             [dexists('~/incident', L('~/incident exists', '~/incident создан', '~/incident створено')), fcontains('~/incident/timeline.txt', L('FATAL is in the timeline', 'FATAL в таймлайне', 'FATAL у таймлайні'), text='FATAL'), flines('~/incident/timeline.txt', 3, L('3 lines', '3 строки', '3 рядки'))],
             L("mkdir ~/incident, then grep -E ... > ~/incident/timeline.txt", "mkdir ~/incident, затем grep -E ... > ~/incident/timeline.txt", "mkdir ~/incident, потім grep -E ... > ~/incident/timeline.txt"), 'grep', ['mkdir -p ~/incident', "grep -E 'ERROR|FATAL' /var/log/app/api.log > ~/incident/timeline.txt"],
             instructions=L("1. `mkdir -p ~/incident`\n2. `grep -E 'ERROR|FATAL' /var/log/app/api.log > ~/incident/timeline.txt`\n3. `cat ~/incident/timeline.txt`", "1. `mkdir -p ~/incident`\n2. `grep -E 'ERROR|FATAL' /var/log/app/api.log > ~/incident/timeline.txt`\n3. `cat ~/incident/timeline.txt`", "1. `mkdir -p ~/incident`\n2. `grep -E 'ERROR|FATAL' /var/log/app/api.log > ~/incident/timeline.txt`\n3. `cat ~/incident/timeline.txt`")),
        task(L('Add the first 502 from access.log to the end of the timeline (do not overwrite it!).', 'Добавьте первый 502 из access.log в конец таймлайна (не перезапишите его!).', 'Додайте перший 502 з access.log у кінець таймлайну (не перезапишіть його!).'),
             [fcontains('~/incident/timeline.txt', L('FATAL is still there', 'FATAL на месте', 'FATAL на місці'), text='FATAL'), fcontains('~/incident/timeline.txt', L('The 502 line was appended', 'Строка 502 дописана', 'Рядок 502 дописано'), text=' 502 '), flines('~/incident/timeline.txt', 4, L('4 lines', '4 строки', '4 рядки'))],
             L('>> appends, > overwrites.', '>> дописывает, > перезаписывает.', '>> дописує, > перезаписує.'), 'grep', ["grep -m 1 ' 502 ' /var/log/nginx/access.log >> ~/incident/timeline.txt"],
             prepare=['mkdir -p ~/incident', "grep -E 'ERROR|FATAL' /var/log/app/api.log > ~/incident/timeline.txt"]),
        quiz(L('Which statement belongs in the timeline as a FACT?', 'Какое утверждение попадает в таймлайн как ФАКТ?', 'Яке твердження потрапляє в таймлайн як ФАКТ?'),
             [L('10:50:04 api logged FATAL ECONNRESET and shut down', '10:50:04 api записал FATAL ECONNRESET и завершился', '10:50:04 api записав FATAL ECONNRESET і завершився'), L('The developers broke something again', 'Разработчики опять что-то сломали', 'Розробники знову щось зламали'), L('Probably the database is slow', 'Наверное, база тормозит', 'Мабуть, база гальмує')], 0),
    ]),
]

module('11-noc-logs.json', 'noc-logs', '/noc/logs', 'file-search',
       L('Logs and investigation', 'Логи и расследование', 'Логи та розслідування'),
       L('Where logs live, grep and awk on real access logs, security events and timelines.', 'Где лежат логи, grep и awk по настоящим access-логам, события безопасности и таймлайны.', 'Де лежать логи, grep і awk по справжніх access-логах, події безпеки й таймлайни.'),
       L1)
