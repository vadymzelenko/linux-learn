import copy, json, os
from lib import *

S = 'noc-web01'
base = json.load(open(os.path.join(ROOT, 'fixtures', 'noc-web01.json')))


def variant(**patch):
    spec = copy.deepcopy(base)
    for svc in spec['services']:
        if svc['name'] == 'nginx':
            svc['http']['/api/items'] = {"status": 200, "body": "{\"items\":42}\n", "upstream": "api"}
            svc['http']['/'] = {**svc['http']['/'], "upstream": "api"}
    for name, changes in patch.get('services', {}).items():
        for svc in spec['services']:
            if svc['name'] == name:
                svc.update(changes)
    spec['files'].update(patch.get('files', {}))
    return spec


H = 'web01'
API_DOWN = variant(services={'api': {"state": "failed", "logs": [
    f'Oct 31 09:00:04 {H} systemd[1]: Started api.service - Shop API (node).',
    f'Oct 31 10:41:57 {H} node[1001]: Error: ECONNRESET at TCP.onStreamRead',
    f'Oct 31 10:41:57 {H} node[1001]: FATAL unhandled exception, exiting',
    f'Oct 31 10:41:57 {H} systemd[1]: api.service: Main process exited, code=exited, status=1/FAILURE',
    f"Oct 31 10:41:57 {H} systemd[1]: api.service: Failed with result 'exit-code'.",
]}})

NGINX_BAD = variant(
    services={'nginx': {"state": "failed", "logs": [
        f'Oct 31 10:30:12 {H} systemd[1]: Starting nginx.service - A high performance web server and a reverse proxy server...',
        f'Oct 31 10:30:12 {H} nginx[1810]: nginx: [emerg] unknown directive "listn" in /etc/nginx/nginx.conf:8',
        f'Oct 31 10:30:12 {H} systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE',
        f'Oct 31 10:30:12 {H} systemd[1]: Failed to start nginx.service - A high performance web server and a reverse proxy server.',
    ], "config": {"path": "/etc/nginx/nginx.conf", "mustContain": "listen 80;", "error": 'nginx: [emerg] unknown directive "listn" in /etc/nginx/nginx.conf:8'}}},
    files={"/etc/nginx/nginx.conf": {"content": base['files']['/etc/nginx/nginx.conf']['content'].replace('listen 80;', 'listn 80;'), "owner": "root", "mode": "644"}},
)

lessons = [
    lesson('http-basics', L('HTTP and status codes', 'HTTP и коды ответов', 'HTTP і коди відповідей'), ['curl'], setup=S, steps=[
        reading(L(
            """## Request and response
The browser (client) sends a **request**: `GET /api/items HTTP/1.1` plus headers. The server sends a **response**: a status line, headers and a body.

## Status codes
| class | meaning | examples |
|---|---|---|
| 2xx | success | 200 OK, 204 No Content |
| 3xx | go elsewhere | 301 Moved Permanently, 302 Found |
| 4xx | the **client** is wrong | 400, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | the **server** is broken | 500 Internal Error, 502 Bad Gateway, 503 Unavailable, 504 Timeout |

## What the 5xx tell a NOC engineer
- **500** — the application crashed on this request (read the app logs)
- **502** — the proxy (nginx) is alive, the backend behind it is not answering
- **503** — the service is overloaded or in maintenance
- **504** — the backend answers too slowly

> A spike of 4xx is usually a client / bot problem; a spike of 5xx is **our** problem.""",
            """## Запрос и ответ
Браузер (клиент) отправляет **запрос**: `GET /api/items HTTP/1.1` плюс заголовки. Сервер присылает **ответ**: строку статуса, заголовки и тело.

## Коды ответа
| класс | значение | примеры |
|---|---|---|
| 2xx | успех | 200 OK, 204 No Content |
| 3xx | идите в другое место | 301 Moved Permanently, 302 Found |
| 4xx | ошибся **клиент** | 400, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | сломался **сервер** | 500 Internal Error, 502 Bad Gateway, 503 Unavailable, 504 Timeout |

## Что 5xx говорят NOC-инженеру
- **500** — приложение упало на этом запросе (читайте логи приложения)
- **502** — прокси (nginx) жив, а бэкенд за ним не отвечает
- **503** — сервис перегружен или на обслуживании
- **504** — бэкенд отвечает слишком медленно

> Всплеск 4xx — обычно проблема клиентов или ботов; всплеск 5xx — **наша** проблема.""",
            """## Запит і відповідь
Браузер (клієнт) надсилає **запит**: `GET /api/items HTTP/1.1` плюс заголовки. Сервер надсилає **відповідь**: рядок статусу, заголовки й тіло.

## Коди відповіді
| клас | значення | приклади |
|---|---|---|
| 2xx | успіх | 200 OK, 204 No Content |
| 3xx | ідіть в інше місце | 301 Moved Permanently, 302 Found |
| 4xx | помилився **клієнт** | 400, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | зламався **сервер** | 500 Internal Error, 502 Bad Gateway, 503 Unavailable, 504 Timeout |

## Що 5xx кажуть NOC-інженеру
- **500** — застосунок упав на цьому запиті (читайте логи застосунку)
- **502** — проксі (nginx) живий, а бекенд за ним не відповідає
- **503** — сервіс перевантажений або на обслуговуванні
- **504** — бекенд відповідає надто повільно

> Сплеск 4xx — зазвичай проблема клієнтів чи ботів; сплеск 5xx — **наша** проблема."""),
            title=L('How the web talks', 'Как разговаривает веб', 'Як розмовляє веб')),
        quiz(L('nginx answers but the page shows "502 Bad Gateway". Where do you look first?', 'nginx отвечает, но страница показывает «502 Bad Gateway». Куда смотреть в первую очередь?', 'nginx відповідає, але сторінка показує «502 Bad Gateway». Куди дивитися насамперед?'),
             [L('At the backend application behind nginx', 'На бэкенд-приложение за nginx', 'На бекенд-застосунок за nginx'), L('At the user\'s browser', 'В браузер пользователя', 'У браузер користувача'), L('At DNS', 'В DNS', 'У DNS')], 0),
        quiz(L('Which code means "the requested page does not exist"?', 'Какой код означает «запрошенной страницы нет»?', 'Який код означає «запитаної сторінки немає»?'),
             [L('404', '404', '404'), L('500', '500', '500'), L('301', '301', '301'), L('503', '503', '503')], 0),
        task(L('Check the status code of http://example.com with curl (headers only).', 'Проверьте код ответа http://example.com через curl (только заголовки).', 'Перевірте код відповіді http://example.com через curl (лише заголовки).'),
             [used('curl', L('curl -I', 'curl -I', 'curl -I'), flags=['-I']), out(L('200 OK', '200 OK', '200 OK'), text='200 OK')],
             L('-I = headers only.', '-I = только заголовки.', '-I = лише заголовки.'), 'curl', ['curl -I http://example.com']),
        task(L('Request a page that does not exist: http://example.com/nope — print just the status code.', 'Запросите несуществующую страницу http://example.com/nope — выведите только код ответа.', 'Запитайте неіснуючу сторінку http://example.com/nope — виведіть лише код відповіді.'),
             [used('curl', L('curl with -w', 'curl с -w', 'curl з -w')), out(L('404', '404', '404'), regex='404$')],
             L("curl -s -o /dev/null -w '%{http_code}' URL", "curl -s -o /dev/null -w '%{http_code}' URL", "curl -s -o /dev/null -w '%{http_code}' URL"), 'curl', ["curl -s -o /dev/null -w '%{http_code}' http://example.com/nope"],
             instructions=L("1. `-s` — silent\n2. `-o /dev/null` — throw the body away\n3. `-w '%{http_code}'` — print only the code", "1. `-s` — тихо\n2. `-o /dev/null` — тело выбросить\n3. `-w '%{http_code}'` — напечатать только код", "1. `-s` — тихо\n2. `-o /dev/null` — тіло викинути\n3. `-w '%{http_code}'` — надрукувати лише код")),
    ]),

    lesson('http-curl', L('curl like a NOC engineer', 'curl как у NOC-инженера', 'curl як у NOC-інженера'), ['curl', 'nc'], setup=API_DOWN, steps=[
        theory(L(
            """## Useful forms
```
$ curl -I http://localhost
$ curl -s localhost/health
$ curl -s -o /dev/null -w '%{http_code}\\n' localhost
$ curl -v http://localhost
```
## curl error codes
| error | meaning |
|---|---|
| (6) Could not resolve host | DNS / typo |
| (7) Couldn't connect | nothing listens on that port |
| (28) Timeout | host down or firewall |
| (22) with -f | HTTP ≥ 400 |

> Check **from the server itself** (localhost) and **from outside**: if only one works, the problem is in between — firewall, proxy, DNS.""",
            """## Полезные формы
```
$ curl -I http://localhost
$ curl -s localhost/health
$ curl -s -o /dev/null -w '%{http_code}\\n' localhost
$ curl -v http://localhost
```
## Коды ошибок curl
| ошибка | значение |
|---|---|
| (6) Could not resolve host | DNS / опечатка |
| (7) Couldn't connect | на порту никто не слушает |
| (28) Timeout | хост выключен или файрвол |
| (22) с -f | HTTP ≥ 400 |

> Проверяйте **с самого сервера** (localhost) и **снаружи**: если работает только одно, проблема посередине — файрвол, прокси, DNS.""",
            """## Корисні форми
```
$ curl -I http://localhost
$ curl -s localhost/health
$ curl -s -o /dev/null -w '%{http_code}\\n' localhost
$ curl -v http://localhost
```
## Коди помилок curl
| помилка | значення |
|---|---|
| (6) Could not resolve host | DNS / друкарська помилка |
| (7) Couldn't connect | на порту ніхто не слухає |
| (28) Timeout | хост вимкнено або файрвол |
| (22) з -f | HTTP ≥ 400 |

> Перевіряйте **із самого сервера** (localhost) і **ззовні**: якщо працює лише одне, проблема посередині — файрвол, проксі, DNS."""),
            title=L('Checking a site', 'Проверяем сайт', 'Перевіряємо сайт'), demo=['curl -I http://localhost']),
        task(L('Alert: "shop 5xx rate high". Check what nginx returns on http://localhost/api/items.', 'Алерт: «у магазина много 5xx». Проверьте, что nginx отвечает на http://localhost/api/items.', 'Алерт: «у магазину багато 5xx». Перевірте, що nginx відповідає на http://localhost/api/items.'),
             [used('curl', L('Request it with curl -I', 'Запросите через curl -I', 'Запитайте через curl -I'), flags=['-I']), out(L('502 Bad Gateway', '502 Bad Gateway', '502 Bad Gateway'), text='502 Bad Gateway')],
             L('curl -I URL', 'curl -I URL', 'curl -I URL'), 'curl', ['curl -I http://localhost/api/items']),
        task(L('nginx proxies to the API on 127.0.0.1:3000. Check whether anything listens there.', 'nginx проксирует на API по адресу 127.0.0.1:3000. Проверьте, слушает ли там кто-нибудь.', 'nginx проксує на API за адресою 127.0.0.1:3000. Перевірте, чи слухає там хтось.'),
             [used('curl', L('Request localhost:3000/health', 'Запросите localhost:3000/health', 'Запитайте localhost:3000/health'), args=['localhost:3000/health']), out(L("Couldn't connect", "Couldn't connect", "Couldn't connect"), text="Couldn't connect")],
             L('curl localhost:3000/health', 'curl localhost:3000/health', 'curl localhost:3000/health'), 'curl', ['curl localhost:3000/health']),
        quiz(L('nginx returns 502 and curl to the backend port says "Couldn\'t connect". Next step?', 'nginx отдаёт 502, а curl на порт бэкенда — «Couldn\'t connect». Следующий шаг?', 'nginx віддає 502, а curl на порт бекенда — «Couldn\'t connect». Наступний крок?'),
             [L('Check the backend service: systemctl status api', 'Проверить бэкенд-сервис: systemctl status api', 'Перевірити бекенд-сервіс: systemctl status api'), L('Restart nginx again and again', 'Перезапускать nginx снова и снова', 'Перезапускати nginx знову й знову'), L('Clear the browser cache', 'Очистить кэш браузера', 'Очистити кеш браузера')], 0),
    ]),

    lesson('svc-systemctl', L('Services with systemctl', 'Сервисы и systemctl', 'Сервіси та systemctl'), ['systemctl', 'sudo'], setup=API_DOWN, steps=[
        theory(L(
            """## systemd manages daemons
Every daemon is a **unit**: nginx.service, postgresql.service, api.service.
```
$ systemctl status api
$ systemctl --failed
$ sudo systemctl restart api
$ systemctl is-active api
```
## States
| Active: | meaning |
|---|---|
| active (running) | works |
| inactive (dead) | stopped normally |
| failed | crashed or failed to start — read the log lines under it |

## Changing state needs root
start / stop / restart / enable need `sudo`. Without it: "Interactive authentication required".

> `restart` is a **mitigation**, not a fix: always read why it died (the log lines in status, journalctl) and write it into the ticket.""",
            """## systemd управляет демонами
Каждый демон — это **юнит**: nginx.service, postgresql.service, api.service.
```
$ systemctl status api
$ systemctl --failed
$ sudo systemctl restart api
$ systemctl is-active api
```
## Состояния
| Active: | значение |
|---|---|
| active (running) | работает |
| inactive (dead) | остановлен штатно |
| failed | упал или не смог стартовать — читайте строки лога под ним |

## Менять состояние может только root
start / stop / restart / enable требуют `sudo`. Без него: «Interactive authentication required».

> `restart` — это **митигация**, а не исправление: всегда выясняйте, почему сервис упал (строки лога в status, journalctl), и записывайте это в тикет.""",
            """## systemd керує демонами
Кожен демон — це **юніт**: nginx.service, postgresql.service, api.service.
```
$ systemctl status api
$ systemctl --failed
$ sudo systemctl restart api
$ systemctl is-active api
```
## Стани
| Active: | значення |
|---|---|
| active (running) | працює |
| inactive (dead) | зупинено штатно |
| failed | упав або не зміг стартувати — читайте рядки логу під ним |

## Змінювати стан може лише root
start / stop / restart / enable потребують `sudo`. Без нього: «Interactive authentication required».

> `restart` — це **мітигація**, а не виправлення: завжди з’ясовуйте, чому сервіс упав (рядки логу в status, journalctl), і записуйте це в тікет."""),
            title=L('Units and states', 'Юниты и состояния', 'Юніти та стани'), demo=['systemctl --failed']),
        task(L('Which services are broken on web01?', 'Какие сервисы сломаны на web01?', 'Які сервіси зламано на web01?'),
             [used('systemctl', L('systemctl --failed', 'systemctl --failed', 'systemctl --failed')), out(L('api.service is failed', 'api.service в состоянии failed', 'api.service у стані failed'), text='api.service')],
             L('systemctl --failed', 'systemctl --failed', 'systemctl --failed'), 'systemctl', ['systemctl --failed']),
        task(L('Look at the status of the api service and read why it stopped.', 'Посмотрите статус сервиса api и прочитайте, почему он остановился.', 'Подивіться статус сервісу api і прочитайте, чому він зупинився.'),
             [used('systemctl', L('systemctl status api', 'systemctl status api', 'systemctl status api'), args=['status', 'api']), out(L('The FATAL line is visible', 'Видна строка FATAL', 'Видно рядок FATAL'), text='FATAL')],
             L('systemctl status NAME', 'systemctl status ИМЯ', 'systemctl status НАЗВА'), 'systemctl', ['systemctl status api']),
        task(L('Mitigate: restart the api service and make sure the shop answers 200 again.', 'Митигация: перезапустите сервис api и убедитесь, что магазин снова отвечает 200.', 'Мітигація: перезапустіть сервіс api і переконайтеся, що магазин знову відповідає 200.'),
             [svc('api', 'active', L('api is active', 'api активен', 'api активний')), used('curl', L('Check the site with curl', 'Проверьте сайт через curl', 'Перевірте сайт через curl')), out(L('HTTP 200', 'HTTP 200', 'HTTP 200'), text='200')],
             L('sudo systemctl restart api, then curl -I localhost', 'sudo systemctl restart api, затем curl -I localhost', 'sudo systemctl restart api, потім curl -I localhost'), 'systemctl', ['sudo systemctl restart api', 'curl -I http://localhost/api/items'],
             instructions=L('1. `sudo systemctl restart api`\n2. `systemctl is-active api` → active\n3. `curl -I http://localhost/api/items` → 200', '1. `sudo systemctl restart api`\n2. `systemctl is-active api` → active\n3. `curl -I http://localhost/api/items` → 200', '1. `sudo systemctl restart api`\n2. `systemctl is-active api` → active\n3. `curl -I http://localhost/api/items` → 200')),
        quiz(L('You ran "systemctl restart api" without sudo and got "Interactive authentication required". Why?', 'Вы выполнили «systemctl restart api» без sudo и получили «Interactive authentication required». Почему?', 'Ви виконали «systemctl restart api» без sudo і отримали «Interactive authentication required». Чому?'),
             [L('Changing a service state needs root', 'Менять состояние сервиса может только root', 'Змінювати стан сервісу може лише root'), L('The service does not exist', 'Сервиса не существует', 'Сервісу не існує'), L('systemd is broken', 'systemd сломан', 'systemd зламано')], 0),
    ]),

    lesson('svc-journal', L('Service logs with journalctl', 'Логи сервисов: journalctl', 'Логи сервісів: journalctl'), ['journalctl'], setup=API_DOWN, steps=[
        theory(L(
            """## The journal
systemd collects the output of every service:
```
$ journalctl -u api -n 20
$ journalctl -p err -n 20
$ journalctl -u nginx -r
```
- `-u NAME` — one unit
- `-n 20` — the last 20 lines
- `-p err` — only errors and worse
- `-r` — newest first
- `-f` — follow live (Ctrl+C to stop)

> Read from the **first** error, not the last: the last lines are often only consequences ("Failed with result"), the cause is above.""",
            """## Журнал
systemd собирает вывод каждого сервиса:
```
$ journalctl -u api -n 20
$ journalctl -p err -n 20
$ journalctl -u nginx -r
```
- `-u ИМЯ` — один юнит
- `-n 20` — последние 20 строк
- `-p err` — только ошибки и хуже
- `-r` — сначала новые
- `-f` — следить вживую (Ctrl+C — выход)

> Читайте с **первой** ошибки, а не с последней: последние строки часто лишь следствия («Failed with result»), причина — выше.""",
            """## Журнал
systemd збирає вивід кожного сервісу:
```
$ journalctl -u api -n 20
$ journalctl -p err -n 20
$ journalctl -u nginx -r
```
- `-u НАЗВА` — один юніт
- `-n 20` — останні 20 рядків
- `-p err` — лише помилки й гірше
- `-r` — спершу нові
- `-f` — стежити наживо (Ctrl+C — вихід)

> Читайте з **першої** помилки, а не з останньої: останні рядки часто лише наслідки («Failed with result»), причина — вище."""),
            title=L('Reading the journal', 'Читаем журнал', 'Читаємо журнал'), demo=['journalctl -u api -n 3']),
        task(L('Show the last 5 log lines of the api service.', 'Покажите последние 5 строк лога сервиса api.', 'Покажіть останні 5 рядків логу сервісу api.'),
             [used('journalctl', L('journalctl -u api -n 5', 'journalctl -u api -n 5', 'journalctl -u api -n 5'), args=['api']), lines(L('Exactly 5 lines', 'Ровно 5 строк', 'Рівно 5 рядків'), eq=5)],
             L('-u for the unit, -n for the count.', '-u — юнит, -n — количество.', '-u — юніт, -n — кількість.'), 'journalctl', ['journalctl -u api -n 5']),
        task(L('Show only the errors of the whole journal.', 'Покажите только ошибки всего журнала.', 'Покажіть лише помилки всього журналу.'),
             [used('journalctl', L('journalctl -p err', 'journalctl -p err', 'journalctl -p err'), args=['err']), out(L('ECONNRESET is visible', 'Виден ECONNRESET', 'Видно ECONNRESET'), text='ECONNRESET')],
             L('-p err', '-p err', '-p err'), 'journalctl', ['journalctl -p err']),
        predict('journalctl -u api -n 1', ["Oct 31 10:41:57 web01 systemd[1]: api.service: Failed with result 'exit-code'.", 'Oct 31 09:00:04 web01 systemd[1]: Started api.service - Shop API (node).', '-- No entries --'], 0,
                L('-n 1 prints only the newest entry — a consequence, not the cause.', '-n 1 выводит только самую новую запись — следствие, а не причину.', '-n 1 виводить лише найновіший запис — наслідок, а не причину.'), setup=API_DOWN, context=['systemctl is-active api']),
        quiz(L('The last line says "Failed with result \'exit-code\'". Where is the real cause?', 'Последняя строка: «Failed with result \'exit-code\'». Где настоящая причина?', 'Останній рядок: «Failed with result \'exit-code\'». Де справжня причина?'),
             [L('In the earlier lines of the same service', 'В более ранних строках того же сервиса', 'У ранніших рядках того самого сервісу'), L('In that very line', 'Именно в этой строке', 'Саме в цьому рядку'), L('In /etc/hosts', 'В /etc/hosts', 'В /etc/hosts')], 0),
    ]),

    lesson('svc-config', L('A broken config', 'Сломанный конфиг', 'Зламаний конфіг'), ['systemctl', 'journalctl', 'sed', 'grep'], setup=NGINX_BAD, steps=[
        reading(L(
            """## The classic incident
Someone edited a config and restarted the service — it does not start. The journal says exactly what is wrong:
```
nginx: [emerg] unknown directive "listn" in /etc/nginx/nginx.conf:8
```
- **what**: unknown directive "listn" (a typo of `listen`)
- **where**: file /etc/nginx/nginx.conf, **line 8**

## Fix it carefully
1. Look at the line: `sed -n '8p' FILE` or `grep -n listn FILE`
2. Back up before editing: `sudo cp FILE FILE.bak`
3. Fix: `sudo sed -i 's/listn/listen/' FILE` (or `sudo nano FILE`)
4. Start: `sudo systemctl restart nginx`
5. Verify: `systemctl is-active nginx`, `curl -I localhost`

> In real life nginx has `nginx -t` to test the config before restarting — always use it if available.""",
            """## Классический инцидент
Кто-то поправил конфиг и перезапустил сервис — тот не стартует. Журнал прямо говорит, что не так:
```
nginx: [emerg] unknown directive "listn" in /etc/nginx/nginx.conf:8
```
- **что**: неизвестная директива «listn» (опечатка в `listen`)
- **где**: файл /etc/nginx/nginx.conf, **строка 8**

## Чиним аккуратно
1. Посмотрите строку: `sed -n '8p' ФАЙЛ` или `grep -n listn ФАЙЛ`
2. Сделайте копию перед правкой: `sudo cp ФАЙЛ ФАЙЛ.bak`
3. Исправьте: `sudo sed -i 's/listn/listen/' ФАЙЛ` (или `sudo nano ФАЙЛ`)
4. Запустите: `sudo systemctl restart nginx`
5. Проверьте: `systemctl is-active nginx`, `curl -I localhost`

> В реальной жизни у nginx есть `nginx -t` для проверки конфига перед рестартом — используйте, если доступно.""",
            """## Класичний інцидент
Хтось поправив конфіг і перезапустив сервіс — той не стартує. Журнал прямо каже, що не так:
```
nginx: [emerg] unknown directive "listn" in /etc/nginx/nginx.conf:8
```
- **що**: невідома директива «listn» (друкарська помилка в `listen`)
- **де**: файл /etc/nginx/nginx.conf, **рядок 8**

## Лагодимо обережно
1. Подивіться рядок: `sed -n '8p' ФАЙЛ` або `grep -n listn ФАЙЛ`
2. Зробіть копію перед правкою: `sudo cp ФАЙЛ ФАЙЛ.bak`
3. Виправте: `sudo sed -i 's/listn/listen/' ФАЙЛ` (або `sudo nano ФАЙЛ`)
4. Запустіть: `sudo systemctl restart nginx`
5. Перевірте: `systemctl is-active nginx`, `curl -I localhost`

> У реальному житті в nginx є `nginx -t` для перевірки конфігу перед рестартом — використовуйте, якщо доступно."""),
            title=L('Read the error, fix the line', 'Прочитать ошибку, исправить строку', 'Прочитати помилку, виправити рядок')),
        task(L('nginx does not start. Find in the journal which file and line are broken.', 'nginx не стартует. Найдите в журнале, какой файл и какая строка сломаны.', 'nginx не стартує. Знайдіть у журналі, який файл і який рядок зламано.'),
             [used('journalctl', L('Read the nginx journal', 'Прочитайте журнал nginx', 'Прочитайте журнал nginx'), args=['nginx']), out(L('The [emerg] line is visible', 'Видна строка [emerg]', 'Видно рядок [emerg]'), text='[emerg]')],
             L('journalctl -u nginx', 'journalctl -u nginx', 'journalctl -u nginx'), 'journalctl', ['journalctl -u nginx']),
        task(L('Show the broken line with its number.', 'Покажите сломанную строку вместе с номером.', 'Покажіть зламаний рядок разом із номером.'),
             [used('grep', L('grep -n', 'grep -n', 'grep -n'), flags=['-n']), out(L('8: listn 80;', '8: listn 80;', '8: listn 80;'), regex='^8:\\s*listn')],
             L('grep -n WORD FILE prints line numbers.', 'grep -n СЛОВО ФАЙЛ выводит номера строк.', 'grep -n СЛОВО ФАЙЛ виводить номери рядків.'), 'grep', ['grep -n listn /etc/nginx/nginx.conf']),
        task(L('Back up the config, fix the typo and start nginx again.', 'Сделайте копию конфига, исправьте опечатку и снова запустите nginx.', 'Зробіть копію конфігу, виправте друкарську помилку й знову запустіть nginx.'),
             [fexists('/etc/nginx/nginx.conf.bak', L('A backup exists', 'Есть резервная копия', 'Є резервна копія')),
              fcontains('/etc/nginx/nginx.conf', L('listen 80; is fixed', 'listen 80; исправлен', 'listen 80; виправлено'), text='listen 80;'),
              svc('nginx', 'active', L('nginx is active', 'nginx активен', 'nginx активний'))],
             L('sudo cp, sudo sed -i, sudo systemctl restart.', 'sudo cp, sudo sed -i, sudo systemctl restart.', 'sudo cp, sudo sed -i, sudo systemctl restart.'), 'sed',
             ['sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak', "sudo sed -i 's/listn/listen/' /etc/nginx/nginx.conf", 'sudo systemctl restart nginx'], xp=30,
             instructions=L("1. `sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak`\n2. `sudo sed -i 's/listn/listen/' /etc/nginx/nginx.conf`\n3. `sudo systemctl restart nginx`\n4. `curl -I localhost`",
                            "1. `sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak`\n2. `sudo sed -i 's/listn/listen/' /etc/nginx/nginx.conf`\n3. `sudo systemctl restart nginx`\n4. `curl -I localhost`",
                            "1. `sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak`\n2. `sudo sed -i 's/listn/listen/' /etc/nginx/nginx.conf`\n3. `sudo systemctl restart nginx`\n4. `curl -I localhost`")),
        quiz(L('Why back up a config before editing it on a production server?', 'Зачем делать копию конфига перед правкой на продакшене?', 'Навіщо робити копію конфігу перед правкою на продакшені?'),
             [L('To roll back in seconds if the edit makes things worse', 'Чтобы за секунды откатиться, если правка сделает хуже', 'Щоб за секунди відкотитися, якщо правка зробить гірше'), L('Linux requires it', 'Этого требует Linux', 'Цього вимагає Linux'), L('It makes nginx faster', 'Это ускоряет nginx', 'Це пришвидшує nginx')], 0),
    ]),
]

module('10-noc-web.json', 'noc-web', '/noc/web', 'server',
       L('Web services', 'Веб-сервисы', 'Веб-сервіси'),
       L('HTTP codes, curl checks, systemd services, journals and broken configs.', 'Коды HTTP, проверки curl, сервисы systemd, журналы и сломанные конфиги.', 'Коди HTTP, перевірки curl, сервіси systemd, журнали та зламані конфіги.'),
       lessons)
