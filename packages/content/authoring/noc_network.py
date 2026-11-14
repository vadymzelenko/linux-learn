from lib import *

S = 'noc-web01'

# a machine with network problems for practice
NET = {
    "hostname": "web01",
    "network": {"hosts": [
        {"name": "db01", "ip": "10.0.2.30", "latency": 0.6, "ports": {"5432": "postgresql", "22": "ssh"}},
        {"name": "cache01", "ip": "10.0.2.31", "latency": 0.5, "ports": {"22": "ssh"}},
        {"name": "backup01", "ip": "10.0.2.40", "up": False},
        {"name": "vpn.partner.net", "ip": "198.51.100.77", "latency": 85, "loss": 40, "ports": {"443": "https"},
         "hops": ["_gateway 10.0.2.2", "100.64.0.1", "core1.isp.net 203.0.113.1", "*", "edge.partner.net 198.51.100.1"]},
        {"name": "legacy.shop.local", "ip": "10.0.9.15", "dns": False, "ports": {"80": "http"}},
    ]},
    "files": {"/etc/hosts": {"content": "127.0.0.1\tlocalhost\n127.0.1.1\tweb01\n10.0.9.15\tlegacy.shop.local\n", "owner": "root"}},
}

lessons = [
    lesson('net-ip', L('IP addresses, subnets and the gateway', 'IP-адреса, подсети и шлюз', 'IP-адреси, підмережі та шлюз'), ['ip'], setup=S, steps=[
        reading(L(
            """## An address for every machine
An **IPv4 address** is four numbers 0–255: `10.0.2.15`. Every network card (interface) has its own.

## Subnet and CIDR
`10.0.2.15/24` — the `/24` says that the first 24 bits (three numbers) are the **network**, the last number is the **host**. So all `10.0.2.x` machines are neighbours and talk directly.

| CIDR | mask | addresses |
|---|---|---|
| /24 | 255.255.255.0 | 256 |
| /16 | 255.255.0.0 | 65 536 |
| /32 | 255.255.255.255 | 1 (a single host) |

## Private ranges
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` — used inside companies and homes, not reachable from the internet directly.

## The gateway
To reach anything outside your subnet, packets go to the **gateway** (router). No gateway or a wrong one — no internet.

> 127.0.0.1 (**localhost**) is always the machine itself.""",
            """## У каждой машины — адрес
**IPv4-адрес** — четыре числа от 0 до 255: `10.0.2.15`. У каждой сетевой карты (интерфейса) он свой.

## Подсеть и CIDR
`10.0.2.15/24` — `/24` говорит, что первые 24 бита (три числа) — это **сеть**, последнее число — **хост**. Все машины `10.0.2.x` — соседи и общаются напрямую.

| CIDR | маска | адресов |
|---|---|---|
| /24 | 255.255.255.0 | 256 |
| /16 | 255.255.0.0 | 65 536 |
| /32 | 255.255.255.255 | 1 (один хост) |

## Частные диапазоны
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` — используются внутри компаний и домов, напрямую из интернета недоступны.

## Шлюз
Чтобы попасть за пределы своей подсети, пакеты идут на **шлюз** (маршрутизатор). Нет шлюза или он неверный — нет интернета.

> 127.0.0.1 (**localhost**) — это всегда сама машина.""",
            """## У кожної машини — адреса
**IPv4-адреса** — чотири числа від 0 до 255: `10.0.2.15`. У кожної мережевої карти (інтерфейсу) вона своя.

## Підмережа та CIDR
`10.0.2.15/24` — `/24` каже, що перші 24 біти (три числа) — це **мережа**, останнє число — **хост**. Усі машини `10.0.2.x` — сусіди й спілкуються напряму.

| CIDR | маска | адрес |
|---|---|---|
| /24 | 255.255.255.0 | 256 |
| /16 | 255.255.0.0 | 65 536 |
| /32 | 255.255.255.255 | 1 (один хост) |

## Приватні діапазони
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` — використовуються всередині компаній і домівок, напряму з інтернету недоступні.

## Шлюз
Щоб потрапити за межі своєї підмережі, пакети йдуть на **шлюз** (маршрутизатор). Немає шлюзу або він хибний — немає інтернету.

> 127.0.0.1 (**localhost**) — це завжди сама машина."""),
            title=L('Network basics', 'Основы сети', 'Основи мережі')),
        theory(L("""## See it on the server
```
$ ip a
$ ip r
```
`ip a` lists interfaces: look for `state UP` and the `inet` line. `ip r` shows routes: the **default via** line is the gateway.""",
                 """## Посмотрим на сервере
```
$ ip a
$ ip r
```
`ip a` показывает интерфейсы: ищите `state UP` и строку `inet`. `ip r` показывает маршруты: строка **default via** — это шлюз.""",
                 """## Подивімося на сервері
```
$ ip a
$ ip r
```
`ip a` показує інтерфейси: шукайте `state UP` і рядок `inet`. `ip r` показує маршрути: рядок **default via** — це шлюз."""),
               demo=['ip a', 'ip r']),
        task(L('What IP address does web01 have on eth0?', 'Какой IP-адрес у web01 на eth0?', 'Яка IP-адреса у web01 на eth0?'),
             [used('ip', L('Use ip a', 'Используйте ip a', 'Використайте ip a')), out(L('The inet line is visible', 'Видна строка inet', 'Видно рядок inet'), text='inet 10.0.2.15/24')],
             L('ip + a (address).', 'ip + a (address).', 'ip + a (address).'), 'ip', ['ip a']),
        task(L('Find the default gateway of web01.', 'Найдите шлюз по умолчанию у web01.', 'Знайдіть шлюз за замовчуванням у web01.'),
             [used('ip', L('Use ip r', 'Используйте ip r', 'Використайте ip r'), args=['r']), out(L('default via is visible', 'Видно default via', 'Видно default via'), text='default via 10.0.2.2')],
             L('ip + r (route).', 'ip + r (route).', 'ip + r (route).'), 'ip', ['ip r']),
        quiz(L('Are 10.0.2.15/24 and 10.0.3.20/24 in the same subnet?', '10.0.2.15/24 и 10.0.3.20/24 в одной подсети?', '10.0.2.15/24 і 10.0.3.20/24 в одній підмережі?'),
             [L('No: the third numbers differ (2 vs 3)', 'Нет: третьи числа разные (2 и 3)', 'Ні: треті числа різні (2 і 3)'), L('Yes, both start with 10', 'Да, оба начинаются с 10', 'Так, обидві починаються з 10'), L('Yes, /24 is the same', 'Да, /24 одинаковый', 'Так, /24 однаковий')], 0),
        quiz(L('Which address is private (not reachable from the internet)?', 'Какой адрес частный (недоступен из интернета)?', 'Яка адреса приватна (недоступна з інтернету)?'),
             [L('192.168.1.10', '192.168.1.10', '192.168.1.10'), L('8.8.8.8', '8.8.8.8', '8.8.8.8'), L('93.184.215.14', '93.184.215.14', '93.184.215.14')], 0),
    ]),

    lesson('net-ping', L('ping: is the host alive?', 'ping: жив ли хост?', 'ping: чи живий хост?'), ['ping'], setup=NET, steps=[
        theory(L(
            """## ICMP echo
`ping HOST` sends small packets and waits for the echo. It answers three questions:
- **Is the host reachable?** replies come back or not
- **How far?** `time=0.6 ms` in a LAN, 20–100 ms across continents
- **Is the link clean?** `packet loss` in the summary

```
$ ping -c 4 db01
```
A real ping runs until Ctrl+C; `-c 4` sends four packets and stops.

## Reading the result
| result | meaning |
|---|---|
| 0% loss, low time | all good |
| 100% loss | host down, unreachable or blocks ICMP |
| 10–50% loss | a bad link — calls drop, pages hang |
| Name or service not known | DNS problem, not the network |

!> Some hosts block ping on purpose. 100% loss is a clue, not a proof — check the service port too.""",
            """## ICMP echo
`ping ХОСТ` отправляет маленькие пакеты и ждёт эхо. Он отвечает на три вопроса:
- **Доступен ли хост?** ответы приходят или нет
- **Как далеко?** `time=0.6 ms` в локалке, 20–100 мс между континентами
- **Чистый ли канал?** `packet loss` в итогах

```
$ ping -c 4 db01
```
Настоящий ping работает до Ctrl+C; `-c 4` отправит четыре пакета и остановится.

## Читаем результат
| результат | значение |
|---|---|
| 0% loss, малое время | всё хорошо |
| 100% loss | хост выключен, недоступен или блокирует ICMP |
| 10–50% loss | плохой канал — звонки рвутся, страницы виснут |
| Name or service not known | проблема с DNS, а не с сетью |

!> Некоторые хосты специально блокируют ping. 100% loss — зацепка, а не доказательство: проверьте ещё и порт сервиса.""",
            """## ICMP echo
`ping ХОСТ` надсилає маленькі пакети й чекає на відлуння. Він відповідає на три питання:
- **Чи доступний хост?** відповіді приходять чи ні
- **Як далеко?** `time=0.6 ms` у локалці, 20–100 мс між континентами
- **Чи чистий канал?** `packet loss` у підсумках

```
$ ping -c 4 db01
```
Справжній ping працює до Ctrl+C; `-c 4` надішле чотири пакети й зупиниться.

## Читаємо результат
| результат | значення |
|---|---|
| 0% loss, малий час | усе добре |
| 100% loss | хост вимкнений, недоступний або блокує ICMP |
| 10–50% loss | поганий канал — дзвінки рвуться, сторінки зависають |
| Name or service not known | проблема з DNS, а не з мережею |

!> Деякі хости навмисно блокують ping. 100% loss — зачіпка, а не доказ: перевірте ще й порт сервісу."""),
            title=L('Reachability', 'Доступность', 'Доступність'), demo=['ping -c 3 db01']),
        task(L('The API complains about the database. Check that db01 answers: send exactly 4 pings.', 'API жалуется на базу. Проверьте, что db01 отвечает: отправьте ровно 4 пинга.', 'API скаржиться на базу. Перевірте, що db01 відповідає: надішліть рівно 4 пінги.'),
             [used('ping', L('Use ping with -c 4', 'Используйте ping с -c 4', 'Використайте ping з -c 4'), flags=['-c'], args=['4']), out(L('0% packet loss', '0% packet loss', '0% packet loss'), text=' 0% packet loss')],
             L('ping -c COUNT HOST', 'ping -c КОЛИЧЕСТВО ХОСТ', 'ping -c КІЛЬКІСТЬ ХОСТ'), 'ping', ['ping -c 4 db01']),
        task(L('Monitoring says backup01 is unreachable. Confirm it with 3 pings.', 'Мониторинг пишет, что backup01 недоступен. Подтвердите тремя пингами.', 'Моніторинг пише, що backup01 недоступний. Підтвердьте трьома пінгами.'),
             [used('ping', L('Ping backup01', 'Пингуйте backup01', 'Пінгуйте backup01'), args=['backup01']), out(L('100% packet loss', '100% packet loss', '100% packet loss'), text='100% packet loss')],
             L('Same command, another host and -c 3.', 'Та же команда, другой хост и -c 3.', 'Та сама команда, інший хост і -c 3.'), 'ping', ['ping -c 3 backup01']),
        task(L('Users of the partner VPN complain about freezes. Measure the packet loss to vpn.partner.net with 10 pings.', 'Пользователи VPN партнёра жалуются на зависания. Измерьте потерю пакетов до vpn.partner.net десятью пингами.', 'Користувачі VPN партнера скаржаться на зависання. Виміряйте втрату пакетів до vpn.partner.net десятьма пінгами.'),
             [used('ping', L('10 pings to vpn.partner.net', '10 пингов до vpn.partner.net', '10 пінгів до vpn.partner.net'), args=['vpn.partner.net', '10']), out(L('There is packet loss', 'Есть потеря пакетов', 'Є втрата пакетів'), regex='[1-9]\\d?% packet loss')],
             L('-c 10', '-c 10', '-c 10'), 'ping', ['ping -c 10 vpn.partner.net']),
        predict('ping -c 2 nosuchhost.local', ['ping: nosuchhost.local: Name or service not known', '2 packets transmitted, 0 received, 100% packet loss', 'PING nosuchhost.local'], 0,
                L('The name could not be resolved at all — this is a DNS/name problem, no packet was sent.', 'Имя вообще не удалось разрешить — это проблема DNS/имени, ни один пакет не отправлен.', 'Ім’я взагалі не вдалося розв’язати — це проблема DNS/імені, жоден пакет не надіслано.'), setup=NET, context=['cat /etc/hosts']),
        quiz(L('ping shows time=180 ms to a server in the same data center. What is suspicious?', 'ping показывает time=180 ms до сервера в том же дата-центре. Что подозрительно?', 'ping показує time=180 ms до сервера в тому самому дата-центрі. Що підозріло?'),
             [L('Inside one data center it should be < 1 ms: congestion or a wrong route', 'Внутри одного ДЦ должно быть < 1 мс: перегрузка или неверный маршрут', 'Усередині одного ДЦ має бути < 1 мс: перевантаження або хибний маршрут'),
              L('Nothing, 180 ms is normal everywhere', 'Ничего, 180 мс — норма везде', 'Нічого, 180 мс — норма скрізь'), L('The server has too much RAM', 'У сервера слишком много памяти', 'У сервера забагато пам’яті')], 0),
    ]),

    lesson('net-trace', L('traceroute: where does the path break?', 'traceroute: где рвётся путь?', 'traceroute: де рветься шлях?'), ['traceroute'], setup=NET, steps=[
        theory(L(
            """## Hop by hop
`traceroute HOST` shows every router (**hop**) between you and the host with three timing samples.
```
$ traceroute vpn.partner.net
```
- The first hop is usually your gateway
- `* * *` — that hop did not answer (often normal for one hop in the middle)
- Stars **until the end** — the path breaks after the last answering hop
- Time jumping from 5 ms to 150 ms — a long or congested link at that point

> traceroute is your evidence when you call the provider or the partner: "the path breaks after edge.partner.net\".""",
            """## Хоп за хопом
`traceroute ХОСТ` показывает каждый маршрутизатор (**хоп**) между вами и хостом с тремя замерами времени.
```
$ traceroute vpn.partner.net
```
- Первый хоп — обычно ваш шлюз
- `* * *` — хоп не ответил (для одного хопа посередине это часто нормально)
- Звёздочки **до самого конца** — путь рвётся после последнего ответившего хопа
- Время скачет с 5 мс до 150 мс — длинный или перегруженный участок в этом месте

> traceroute — ваше доказательство, когда звоните провайдеру или партнёру: «путь обрывается после edge.partner.net».""",
            """## Хоп за хопом
`traceroute ХОСТ` показує кожен маршрутизатор (**хоп**) між вами й хостом із трьома вимірами часу.
```
$ traceroute vpn.partner.net
```
- Перший хоп — зазвичай ваш шлюз
- `* * *` — хоп не відповів (для одного хопа посередині це часто нормально)
- Зірочки **до самого кінця** — шлях рветься після останнього хопа, що відповів
- Час стрибає з 5 мс до 150 мс — довгий або перевантажений відрізок у цьому місці

> traceroute — ваш доказ, коли телефонуєте провайдеру чи партнеру: «шлях обривається після edge.partner.net»."""),
            title=L('The route', 'Маршрут', 'Маршрут'), demo=['traceroute example.com']),
        task(L('Trace the route from web01 to vpn.partner.net.', 'Проследите маршрут от web01 до vpn.partner.net.', 'Простежте маршрут від web01 до vpn.partner.net.'),
             [used('traceroute', L('Use traceroute', 'Используйте traceroute', 'Використайте traceroute')), out(L('The partner edge router is visible', 'Виден пограничный маршрутизатор партнёра', 'Видно прикордонний маршрутизатор партнера'), text='edge.partner.net')],
             L('trace + route.', 'trace + route.', 'trace + route.'), 'traceroute', ['traceroute vpn.partner.net']),
        task(L('Where does the path to backup01 stop? Run traceroute with numeric output (-n).', 'Где обрывается путь к backup01? Запустите traceroute с числовым выводом (-n).', 'Де обривається шлях до backup01? Запустіть traceroute із числовим виводом (-n).'),
             [used('traceroute', L('traceroute -n backup01', 'traceroute -n backup01', 'traceroute -n backup01'), flags=['-n']), out(L('Only stars after the gateway', 'После шлюза одни звёздочки', 'Після шлюзу самі зірочки'), text='* * *')],
             L('-n = do not resolve names.', '-n = не разрешать имена.', '-n = не розв’язувати імена.'), 'traceroute', ['traceroute -n backup01']),
        quiz(L('Hops 1–4 answer, hop 5 shows * * *, hop 6 (the destination) answers. Is the path broken?', 'Хопы 1–4 отвечают, хоп 5 — * * *, хоп 6 (цель) отвечает. Путь сломан?', 'Хопи 1–4 відповідають, хоп 5 — * * *, хоп 6 (ціль) відповідає. Шлях зламано?'),
             [L('No: one silent router in the middle is normal if the destination answers', 'Нет: один молчащий маршрутизатор посередине — норма, если цель отвечает', 'Ні: один мовчазний маршрутизатор посередині — норма, якщо ціль відповідає'),
              L('Yes, hop 5 is down', 'Да, хоп 5 упал', 'Так, хоп 5 упав'), L('Yes, the destination is lying', 'Да, цель врёт', 'Так, ціль бреше')], 0),
    ]),

    lesson('net-dns', L('DNS: names and addresses', 'DNS: имена и адреса', 'DNS: імена та адреси'), ['dig', 'nslookup', 'host'], setup=NET, steps=[
        reading(L(
            """## The phone book of the internet
People remember names, computers need IP addresses. **DNS** translates `example.com` → `93.184.215.14` (an **A record**).

## Who answers first
Most programs (ping, curl, browsers) ask in this order:
1. the local file **/etc/hosts**
2. the DNS server (on Ubuntu the local resolver 127.0.0.53)

`dig` and `nslookup` ask **only DNS** and ignore /etc/hosts.

## Typical failures
| symptom | meaning |
|---|---|
| NXDOMAIN | the name does not exist (or a typo) |
| works in ping, fails in dig | the name exists only in /etc/hosts |
| SERVFAIL / timeout | the DNS server itself is broken |
| old IP returned | a stale entry in /etc/hosts or a cache |

> "It's always DNS" is a running joke among admins — and often true.""",
            """## Телефонная книга интернета
Люди помнят имена, компьютерам нужны IP-адреса. **DNS** переводит `example.com` → `93.184.215.14` (это **A-запись**).

## Кто отвечает первым
Большинство программ (ping, curl, браузеры) спрашивают в таком порядке:
1. локальный файл **/etc/hosts**
2. DNS-сервер (в Ubuntu локальный резолвер 127.0.0.53)

`dig` и `nslookup` спрашивают **только DNS** и /etc/hosts игнорируют.

## Типичные поломки
| симптом | значение |
|---|---|
| NXDOMAIN | такого имени нет (или опечатка) |
| ping работает, dig — нет | имя есть только в /etc/hosts |
| SERVFAIL / таймаут | сломан сам DNS-сервер |
| возвращается старый IP | устаревшая запись в /etc/hosts или кэш |

> «Это всегда DNS» — вечная шутка админов, и часто правдивая.""",
            """## Телефонна книга інтернету
Люди пам’ятають імена, комп’ютерам потрібні IP-адреси. **DNS** перекладає `example.com` → `93.184.215.14` (це **A-запис**).

## Хто відповідає першим
Більшість програм (ping, curl, браузери) питають у такому порядку:
1. локальний файл **/etc/hosts**
2. DNS-сервер (в Ubuntu локальний резолвер 127.0.0.53)

`dig` і `nslookup` питають **лише DNS** і /etc/hosts ігнорують.

## Типові поломки
| симптом | значення |
|---|---|
| NXDOMAIN | такого імені немає (або друкарська помилка) |
| ping працює, dig — ні | ім’я є лише в /etc/hosts |
| SERVFAIL / таймаут | зламаний сам DNS-сервер |
| повертається стара IP | застарілий запис у /etc/hosts або кеш |

> «Це завжди DNS» — вічний жарт адмінів, і часто правдивий."""),
            title=L('Names → addresses', 'Имена → адреса', 'Імена → адреси')),
        theory(L("""## Three tools
```
$ dig example.com
$ dig +short github.com
$ nslookup example.com
$ host github.com
```
In `dig` look at `status:` (NOERROR / NXDOMAIN) and the **ANSWER SECTION**.""",
                 """## Три инструмента
```
$ dig example.com
$ dig +short github.com
$ nslookup example.com
$ host github.com
```
В выводе `dig` смотрите на `status:` (NOERROR / NXDOMAIN) и **ANSWER SECTION**.""",
                 """## Три інструменти
```
$ dig example.com
$ dig +short github.com
$ nslookup example.com
$ host github.com
```
У виводі `dig` дивіться на `status:` (NOERROR / NXDOMAIN) і **ANSWER SECTION**."""), demo=['dig +short example.com', 'host github.com']),
        task(L('Find the IP address of github.com, print only the address.', 'Найдите IP-адрес github.com, выведите только адрес.', 'Знайдіть IP-адресу github.com, виведіть лише адресу.'),
             [used('dig', L('Use dig +short', 'Используйте dig +short', 'Використайте dig +short')), out(L('Only the IP is printed', 'Выведен только IP', 'Виведено лише IP'), regex='^140\\.82\\.121\\.4$')],
             L('dig with +short.', 'dig с +short.', 'dig із +short.'), 'dig', ['dig +short github.com']),
        task(L('Users cannot open nosuch-shop.com. Ask DNS with nslookup and see what it says.', 'Пользователи не могут открыть nosuch-shop.com. Спросите DNS через nslookup и посмотрите, что он ответит.', 'Користувачі не можуть відкрити nosuch-shop.com. Запитайте DNS через nslookup і подивіться, що він відповість.'),
             [used('nslookup', L('Use nslookup', 'Используйте nslookup', 'Використайте nslookup')), out(L('NXDOMAIN', 'NXDOMAIN', 'NXDOMAIN'), text='NXDOMAIN')],
             L('nslookup NAME', 'nslookup ИМЯ', 'nslookup ІМ’Я'), 'nslookup', ['nslookup nosuch-shop.com']),
        task(L('legacy.shop.local answers to ping, but dig says nothing. Prove where the name comes from: show the line in /etc/hosts.', 'legacy.shop.local отвечает на ping, а dig молчит. Докажите, откуда берётся имя: покажите строку в /etc/hosts.', 'legacy.shop.local відповідає на ping, а dig мовчить. Доведіть, звідки береться ім’я: покажіть рядок в /etc/hosts.'),
             [used('grep', L('Search /etc/hosts with grep', 'Найдите в /etc/hosts через grep', 'Знайдіть в /etc/hosts через grep'), args=['/etc/hosts']), out(L('The hosts entry is visible', 'Видна запись hosts', 'Видно запис hosts'), text='10.0.9.15')],
             L('grep NAME /etc/hosts', 'grep ИМЯ /etc/hosts', 'grep ІМ’Я /etc/hosts'), 'grep', ['grep legacy /etc/hosts']),
        predict('dig +short legacy.shop.local', ['', '10.0.9.15', 'NXDOMAIN'], 0,
                L('dig asks only DNS; the name lives only in /etc/hosts, so the answer is empty.', 'dig спрашивает только DNS; имя есть только в /etc/hosts, поэтому ответ пустой.', 'dig питає лише DNS; ім’я є лише в /etc/hosts, тому відповідь порожня.'), setup=NET, context=['cat /etc/hosts']),
        quiz(L('After moving the site to a new server, only YOUR laptop still opens the old one. Most likely cause?', 'После переезда сайта на новый сервер только ВАШ ноутбук открывает старый. Вероятная причина?', 'Після переїзду сайту на новий сервер лише ВАШ ноутбук відкриває старий. Імовірна причина?'),
             [L('An old entry in your /etc/hosts or a DNS cache', 'Старая запись в вашем /etc/hosts или кэш DNS', 'Старий запис у вашому /etc/hosts або кеш DNS'),
              L('The new server is down', 'Новый сервер упал', 'Новий сервер упав'), L('The internet is broken', 'Сломался интернет', 'Зламався інтернет')], 0),
    ]),

    lesson('net-ports', L('Ports and listening services', 'Порты и слушающие сервисы', 'Порти та сервіси, що слухають'), ['ss', 'nc'], setup=S, steps=[
        reading(L(
            """## One address, many services
A port number picks a service on a machine. A server **listens** on a port; a client **connects** to it.

| port | service |
|---|---|
| 22 | SSH |
| 53 | DNS (UDP) |
| 80 / 443 | HTTP / HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |

## TCP or UDP
**TCP** builds a connection and guarantees delivery (web, ssh, databases). **UDP** just sends datagrams (DNS, video, VoIP).

## Bind address matters
- `0.0.0.0:80` — listens on all interfaces, reachable from the network
- `127.0.0.1:5432` — only from the same machine

## Three answers of a port check
| result | meaning |
|---|---|
| succeeded | something listens |
| Connection refused | host up, nothing listens on that port |
| timed out | host down or a firewall drops packets |""",
            """## Один адрес — много сервисов
Номер порта выбирает сервис на машине. Сервер **слушает** порт, клиент **подключается** к нему.

| порт | сервис |
|---|---|
| 22 | SSH |
| 53 | DNS (UDP) |
| 80 / 443 | HTTP / HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |

## TCP или UDP
**TCP** устанавливает соединение и гарантирует доставку (веб, ssh, базы). **UDP** просто отправляет датаграммы (DNS, видео, VoIP).

## Адрес привязки важен
- `0.0.0.0:80` — слушает на всех интерфейсах, доступен из сети
- `127.0.0.1:5432` — только с этой же машины

## Три ответа проверки порта
| результат | значение |
|---|---|
| succeeded | кто-то слушает |
| Connection refused | хост жив, на порту никто не слушает |
| timed out | хост выключен или пакеты режет файрвол |""",
            """## Одна адреса — багато сервісів
Номер порту вибирає сервіс на машині. Сервер **слухає** порт, клієнт **підключається** до нього.

| порт | сервіс |
|---|---|
| 22 | SSH |
| 53 | DNS (UDP) |
| 80 / 443 | HTTP / HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |

## TCP чи UDP
**TCP** встановлює з’єднання й гарантує доставку (веб, ssh, бази). **UDP** просто надсилає датаграми (DNS, відео, VoIP).

## Адреса прив’язки важлива
- `0.0.0.0:80` — слухає на всіх інтерфейсах, доступний із мережі
- `127.0.0.1:5432` — лише з цієї ж машини

## Три відповіді перевірки порту
| результат | значення |
|---|---|
| succeeded | хтось слухає |
| Connection refused | хост живий, на порту ніхто не слухає |
| timed out | хост вимкнено або пакети ріже файрвол |"""),
            title=L('Ports', 'Порты', 'Порти')),
        theory(L("""## The commands
```
$ sudo ss -tulpn
$ nc -zv db01 5432
```
`ss -tulpn`: **t**cp, **u**dp, **l**istening, **p**rocesses, **n**umeric. Without sudo the process names of other users are hidden.""",
                 """## Команды
```
$ sudo ss -tulpn
$ nc -zv db01 5432
```
`ss -tulpn`: **t**cp, **u**dp, **l**istening (слушающие), **p**rocesses (процессы), **n**umeric (числа). Без sudo имена процессов других пользователей скрыты.""",
                 """## Команди
```
$ sudo ss -tulpn
$ nc -zv db01 5432
```
`ss -tulpn`: **t**cp, **u**dp, **l**istening (що слухають), **p**rocesses (процеси), **n**umeric (числа). Без sudo імена процесів інших користувачів приховано."""),
               demo=['ss -tln']),
        task(L('Which programs listen on which ports on web01? Show TCP+UDP listening sockets with process names.', 'Какие программы на каких портах слушают на web01? Покажите слушающие TCP+UDP-сокеты с именами процессов.', 'Які програми на яких портах слухають на web01? Покажіть TCP+UDP-сокети, що слухають, з іменами процесів.'),
             [used('ss', L('ss -tulpn', 'ss -tulpn', 'ss -tulpn'), flags=['-t', '-u', '-l', '-p']), out(L('nginx is visible on port 80', 'Виден nginx на порту 80', 'Видно nginx на порту 80'), text='"nginx"')],
             L('Process names of other users need sudo.', 'Имена процессов других пользователей требуют sudo.', 'Імена процесів інших користувачів потребують sudo.'), 'ss', ['sudo ss -tulpn']),
        task(L('Is PostgreSQL on db01 reachable from web01? Check port 5432 with nc.', 'Доступен ли PostgreSQL на db01 с web01? Проверьте порт 5432 через nc.', 'Чи доступний PostgreSQL на db01 з web01? Перевірте порт 5432 через nc.'),
             [used('nc', L('nc -zv', 'nc -zv', 'nc -zv'), flags=['-z', '-v']), out(L('succeeded', 'succeeded', 'succeeded'), text='succeeded')],
             L('nc -zv HOST PORT', 'nc -zv ХОСТ ПОРТ', 'nc -zv ХОСТ ПОРТ'), 'nc', ['nc -zv db01 5432']),
        task(L('Redis on cache01 (port 6379) does not answer the API. Check the port and read the message.', 'Redis на cache01 (порт 6379) не отвечает API. Проверьте порт и прочитайте сообщение.', 'Redis на cache01 (порт 6379) не відповідає API. Перевірте порт і прочитайте повідомлення.'),
             [used('nc', L('Check cache01 6379', 'Проверьте cache01 6379', 'Перевірте cache01 6379'), args=['cache01', '6379']), out(L('Connection refused', 'Connection refused', 'Connection refused'), text='Connection refused')],
             L('Same as before, other host and port.', 'Как раньше, другой хост и порт.', 'Як раніше, інший хост і порт.'), 'nc', ['nc -zv cache01 6379'], setup=NET),
        quiz(L('nc to cache01:6379 says "Connection refused", ping to cache01 works. Conclusion?', 'nc на cache01:6379 — «Connection refused», ping до cache01 работает. Вывод?', 'nc на cache01:6379 — «Connection refused», ping до cache01 працює. Висновок?'),
             [L('The host is up, but Redis is not listening — check the service on cache01', 'Хост жив, но Redis не слушает — проверить сервис на cache01', 'Хост живий, але Redis не слухає — перевірити сервіс на cache01'),
              L('The network cable is cut', 'Перерезан сетевой кабель', 'Перерізано мережевий кабель'), L('DNS is broken', 'Сломан DNS', 'Зламано DNS')], 0),
        quiz(L('ss shows 127.0.0.1:5432. Can db clients from other servers connect?', 'ss показывает 127.0.0.1:5432. Могут ли подключиться клиенты с других серверов?', 'ss показує 127.0.0.1:5432. Чи можуть підключитися клієнти з інших серверів?'),
             [L('No, it listens only on localhost', 'Нет, он слушает только localhost', 'Ні, він слухає лише localhost'), L('Yes, any address works', 'Да, подходит любой адрес', 'Так, підходить будь-яка адреса'), L('Only over UDP', 'Только по UDP', 'Лише через UDP')], 0),
    ]),
]

module('09-noc-network.json', 'noc-network', '/noc/network', 'network',
       L('Networking for NOC', 'Сеть для NOC', 'Мережа для NOC'),
       L('IP, subnets, gateway, ping, traceroute, DNS and ports: find where the network breaks.', 'IP, подсети, шлюз, ping, traceroute, DNS и порты: найти, где рвётся сеть.', 'IP, підмережі, шлюз, ping, traceroute, DNS і порти: знайти, де рветься мережа.'),
       lessons)
