"""Docker course, module 4 "Docker in production": networks, restart policies,
image versions, inspecting containers — and two missions. en/ru/uk/pl.

Imported by docker_course.py (which writes missions.json); can also be run alone
to regenerate the module JSON:

    python3 authoring/docker_prod.py && python3 authoring/courses.py && python3 authoring/register.py
"""
from lib import *


def T(en, ru, uk, pl): return L(en, ru, uk, pl)


NETWORKED = ['docker network create shop-net', 'docker network connect shop-net web', 'docker network connect shop-net cache']
STOPPED_ = lambda name: T(f'Container {name} is stopped', f'Контейнер {name} остановлен', f'Контейнер {name} зупинено', f'Kontener {name} jest zatrzymany')
RUNS = lambda name, net: T(f'{name} runs on the network {net}', f'{name} работает в сети {net}', f'{name} працює в мережі {net}', f'{name} działa w sieci {net}')

# ------------------------------------------------------------------ lessons

prod = [
    lesson('dk-networks', T('Container networks', 'Сети контейнеров', 'Мережі контейнерів', 'Sieci kontenerów'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## Containers talk to each other by name
A web app needs its database and cache. Inside Docker they find each other **by container name** — but only on a **user-defined network**:
```
$ docker network create shop-net
$ docker network connect shop-net web
$ docker network connect shop-net cache
$ docker exec web getent hosts cache
172.18.0.3      cache
```
Docker runs a small DNS server for every such network: the name `cache` turns into the container's IP address.

## The default bridge is different
Containers started without `--network` land on the default `bridge`. There they get an IP, but **names do not resolve** — and IPs change after every restart. Real projects always create their own network.

## Start a container right on a network
```
$ docker run -d --name api --network shop-net nginx
$ docker network inspect shop-net
$ docker network ls
```
`docker network inspect` lists the containers on the network with their addresses.""",
"""## Контейнеры общаются по имени
Веб-приложению нужны база и кэш. Внутри Docker они находят друг друга **по имени контейнера** — но только в **пользовательской сети**:
```
$ docker network create shop-net
$ docker network connect shop-net web
$ docker network connect shop-net cache
$ docker exec web getent hosts cache
172.18.0.3      cache
```
Для каждой такой сети Docker запускает маленький DNS-сервер: имя `cache` превращается в IP-адрес контейнера.

## Стандартный bridge — другое дело
Контейнеры без `--network` попадают в стандартную сеть `bridge`. Там у них есть IP, но **имена не разрешаются** — а IP меняются после каждого перезапуска. В реальных проектах всегда создают свою сеть.

## Запуск сразу в сети
```
$ docker run -d --name api --network shop-net nginx
$ docker network inspect shop-net
$ docker network ls
```
`docker network inspect` показывает контейнеры в сети и их адреса.""",
"""## Контейнери спілкуються за іменем
Вебзастосунку потрібні база й кеш. Усередині Docker вони знаходять одне одного **за іменем контейнера** — але лише в **користувацькій мережі**:
```
$ docker network create shop-net
$ docker network connect shop-net web
$ docker network connect shop-net cache
$ docker exec web getent hosts cache
172.18.0.3      cache
```
Для кожної такої мережі Docker запускає маленький DNS-сервер: ім’я `cache` перетворюється на IP-адресу контейнера.

## Стандартний bridge — інша справа
Контейнери без `--network` потрапляють у стандартну мережу `bridge`. Там у них є IP, але **імена не розв’язуються** — а IP змінюються після кожного перезапуску. У реальних проєктах завжди створюють власну мережу.

## Запуск одразу в мережі
```
$ docker run -d --name api --network shop-net nginx
$ docker network inspect shop-net
$ docker network ls
```
`docker network inspect` показує контейнери в мережі та їхні адреси.""",
"""## Kontenery rozmawiają po nazwie
Aplikacja webowa potrzebuje bazy i cache. W Dockerze znajdują się nawzajem **po nazwie kontenera** — ale tylko w **sieci zdefiniowanej przez użytkownika**:
```
$ docker network create shop-net
$ docker network connect shop-net web
$ docker network connect shop-net cache
$ docker exec web getent hosts cache
172.18.0.3      cache
```
Dla każdej takiej sieci Docker uruchamia mały serwer DNS: nazwa `cache` zamienia się w adres IP kontenera.

## Domyślny bridge działa inaczej
Kontenery bez `--network` trafiają do domyślnej sieci `bridge`. Mają tam IP, ale **nazwy się nie rozwiązują** — a adresy IP zmieniają się po każdym restarcie. W prawdziwych projektach zawsze tworzy się własną sieć.

## Uruchomienie od razu w sieci
```
$ docker run -d --name api --network shop-net nginx
$ docker network inspect shop-net
$ docker network ls
```
`docker network inspect` pokazuje kontenery w sieci i ich adresy."""),
            title=T('One network — names work', 'Одна сеть — имена работают', 'Одна мережа — імена працюють', 'Jedna sieć — nazwy działają'),
            demo=['docker network create demo-net', 'docker network connect demo-net web', 'docker network connect demo-net cache', 'docker exec web getent hosts cache']),
        quiz(T('web and cache run on the default bridge. `docker exec web getent hosts cache` prints nothing. Why?', 'web и cache работают в стандартной сети bridge. `docker exec web getent hosts cache` ничего не выводит. Почему?', 'web і cache працюють у стандартній мережі bridge. `docker exec web getent hosts cache` нічого не виводить. Чому?', 'web i cache działają w domyślnej sieci bridge. `docker exec web getent hosts cache` nic nie wypisuje. Dlaczego?'),
             [T('Names resolve only on a user-defined network', 'Имена разрешаются только в пользовательской сети', 'Імена розв’язуються лише в користувацькій мережі', 'Nazwy rozwiązują się tylko w sieci użytkownika'),
              T('cache needs -p 6379:6379', 'cache нужен -p 6379:6379', 'cache потрібен -p 6379:6379', 'cache potrzebuje -p 6379:6379'),
              T('getent does not work in containers', 'getent не работает в контейнерах', 'getent не працює в контейнерах', 'getent nie działa w kontenerach')], 0,
             T('-p publishes a port to the host; containers on one user network reach each other directly by name.', '-p пробрасывает порт на хост; контейнеры одной пользовательской сети видят друг друга напрямую по имени.', '-p прокидає порт на хост; контейнери однієї користувацької мережі бачать одне одного напряму за іменем.', '-p publikuje port na hoście; kontenery w jednej sieci użytkownika widzą się bezpośrednio po nazwie.')),
        task(T('Put web and cache on a new network shop-net and prove that web finds cache by name.', 'Подключите web и cache к новой сети shop-net и докажите, что web находит cache по имени.', 'Під’єднайте web і cache до нової мережі shop-net і доведіть, що web знаходить cache за іменем.', 'Podłącz web i cache do nowej sieci shop-net i udowodnij, że web znajduje cache po nazwie.'),
             [container('web', 'running', RUNS('web', 'shop-net'), network='shop-net'),
              container('cache', 'running', RUNS('cache', 'shop-net'), network='shop-net'),
              out(T('web resolves the name cache', 'web разрешает имя cache', 'web розв’язує ім’я cache', 'web rozwiązuje nazwę cache'), regex=r'172\.\d+\.0\.\d+\s+cache')],
             T('network create, then network connect for each container, then exec web getent hosts cache.', 'network create, затем network connect для каждого контейнера, затем exec web getent hosts cache.', 'network create, потім network connect для кожного контейнера, потім exec web getent hosts cache.', 'network create, potem network connect dla każdego kontenera, potem exec web getent hosts cache.'),
             'docker network connect', NETWORKED + ['docker exec web getent hosts cache']),
        task(T('Start a second Redis named queue (image redis:7) directly on shop-net, then ping it from cache: redis-cli -h queue ping.', 'Запустите второй Redis с именем queue (образ redis:7) сразу в сети shop-net и пропингуйте его из cache: redis-cli -h queue ping.', 'Запустіть другий Redis з іменем queue (образ redis:7) одразу в мережі shop-net і пропінгуйте його з cache: redis-cli -h queue ping.', 'Uruchom drugi Redis o nazwie queue (obraz redis:7) od razu w sieci shop-net i spinguj go z cache: redis-cli -h queue ping.'),
             [container('queue', 'running', RUNS('queue', 'shop-net'), image='redis:7', network='shop-net'),
              out(T('cache got PONG from queue', 'cache получил PONG от queue', 'cache отримав PONG від queue', 'cache dostał PONG od queue'), text='PONG')],
             T('docker run -d --name queue --network shop-net redis:7, then docker exec cache redis-cli -h queue ping', 'docker run -d --name queue --network shop-net redis:7, затем docker exec cache redis-cli -h queue ping', 'docker run -d --name queue --network shop-net redis:7, потім docker exec cache redis-cli -h queue ping', 'docker run -d --name queue --network shop-net redis:7, potem docker exec cache redis-cli -h queue ping'),
             'docker run -d', ['docker run -d --name queue --network shop-net redis:7', 'docker exec cache redis-cli -h queue ping'], prepare=NETWORKED),
    ]),

    lesson('dk-restart', T('Restart policies', 'Политики перезапуска', 'Політики перезапуску', 'Zasady restartu'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## What happens after a crash or a reboot?
By default — nothing: a stopped container stays stopped. In production that means a night call. A **restart policy** tells Docker what to do:

| `--restart` | the container is started again… |
|---|---|
| `no` (default) | never |
| `on-failure[:N]` | only after a crash (exit code ≠ 0), up to N times |
| `always` | always, even after `docker stop` + a daemon restart |
| `unless-stopped` | always — unless *you* stopped it |

`unless-stopped` is the usual choice for services.

## Set and check
The policy is chosen when the container is created:
```
$ docker run -d --name api --restart unless-stopped nginx
$ docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api
unless-stopped
```
For an existing container, recreate it: `docker rm -f`, then `docker run` with the same options plus `--restart`.

## Keep an eye on resources
```
$ docker stats --no-stream
```
CPU and memory of every running container — the first thing to look at when the host is slow.""",
"""## Что будет после сбоя или перезагрузки?
По умолчанию — ничего: остановленный контейнер так и стоит. В проде это ночной звонок. **Политика перезапуска** говорит Docker, что делать:

| `--restart` | контейнер снова запускается… |
|---|---|
| `no` (по умолчанию) | никогда |
| `on-failure[:N]` | только после падения (код выхода ≠ 0), до N раз |
| `always` | всегда, даже после `docker stop` + перезапуска демона |
| `unless-stopped` | всегда — если только *вы* его не остановили |

Для сервисов обычно выбирают `unless-stopped`.

## Задать и проверить
Политика задаётся при создании контейнера:
```
$ docker run -d --name api --restart unless-stopped nginx
$ docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api
unless-stopped
```
Для существующего контейнера — пересоздайте его: `docker rm -f`, затем `docker run` с теми же опциями плюс `--restart`.

## Следите за ресурсами
```
$ docker stats --no-stream
```
CPU и память каждого работающего контейнера — первое, на что смотреть, когда хост тормозит.""",
"""## Що буде після збою чи перезавантаження?
За замовчуванням — нічого: зупинений контейнер так і стоїть. У проді це нічний дзвінок. **Політика перезапуску** каже Docker, що робити:

| `--restart` | контейнер знову запускається… |
|---|---|
| `no` (за замовчуванням) | ніколи |
| `on-failure[:N]` | лише після падіння (код виходу ≠ 0), до N разів |
| `always` | завжди, навіть після `docker stop` + перезапуску демона |
| `unless-stopped` | завжди — якщо тільки *ви* його не зупинили |

Для сервісів зазвичай обирають `unless-stopped`.

## Задати й перевірити
Політика задається під час створення контейнера:
```
$ docker run -d --name api --restart unless-stopped nginx
$ docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api
unless-stopped
```
Для наявного контейнера — перестворіть його: `docker rm -f`, потім `docker run` з тими самими опціями плюс `--restart`.

## Стежте за ресурсами
```
$ docker stats --no-stream
```
CPU і пам’ять кожного запущеного контейнера — перше, на що дивитися, коли хост гальмує.""",
"""## Co się stanie po awarii lub restarcie?
Domyślnie — nic: zatrzymany kontener tak stoi. Na produkcji oznacza to nocny telefon. **Zasada restartu** mówi Dockerowi, co robić:

| `--restart` | kontener jest uruchamiany ponownie… |
|---|---|
| `no` (domyślnie) | nigdy |
| `on-failure[:N]` | tylko po awarii (kod wyjścia ≠ 0), do N razy |
| `always` | zawsze, nawet po `docker stop` + restarcie demona |
| `unless-stopped` | zawsze — chyba że *Ty* go zatrzymałeś |

Dla usług zwykle wybiera się `unless-stopped`.

## Ustaw i sprawdź
Zasadę wybiera się przy tworzeniu kontenera:
```
$ docker run -d --name api --restart unless-stopped nginx
$ docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api
unless-stopped
```
Dla istniejącego kontenera — utwórz go ponownie: `docker rm -f`, potem `docker run` z tymi samymi opcjami plus `--restart`.

## Pilnuj zasobów
```
$ docker stats --no-stream
```
CPU i pamięć każdego działającego kontenera — pierwsze, na co patrzysz, gdy host zwalnia."""),
            title=T('--restart', '--restart', '--restart', '--restart'),
            demo=['docker run -d --name api --restart unless-stopped nginx', "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' api", 'docker stats --no-stream']),
        quiz(T('The server reboots at night. Which containers come back by themselves?', 'Ночью сервер перезагрузился. Какие контейнеры поднимутся сами?', 'Уночі сервер перезавантажився. Які контейнери піднімуться самі?', 'W nocy serwer się zrestartował. Które kontenery wstaną same?'),
             [T('Those started with --restart unless-stopped or always', 'Запущенные с --restart unless-stopped или always', 'Запущені з --restart unless-stopped або always', 'Uruchomione z --restart unless-stopped lub always'),
              T('All containers that were running', 'Все, что работали', 'Усі, що працювали', 'Wszystkie, które działały'),
              T('Only those with published ports', 'Только с проброшенными портами', 'Лише з прокинутими портами', 'Tylko te z opublikowanymi portami')], 0,
             T('Without a restart policy a container stays down after a reboot.', 'Без политики перезапуска контейнер после перезагрузки так и лежит.', 'Без політики перезапуску контейнер після перезавантаження так і лежить.', 'Bez zasady restartu kontener po restarcie serwera nie wstaje.')),
        task(T('Make the site survive reboots: recreate web (nginx, port 8080) with the restart policy unless-stopped and check the policy with docker inspect.', 'Сделайте так, чтобы сайт переживал перезагрузки: пересоздайте web (nginx, порт 8080) с политикой unless-stopped и проверьте её через docker inspect.', 'Зробіть так, щоб сайт переживав перезавантаження: перестворіть web (nginx, порт 8080) з політикою unless-stopped і перевірте її через docker inspect.', 'Spraw, by strona przetrwała restarty: utwórz ponownie web (nginx, port 8080) z zasadą unless-stopped i sprawdź ją przez docker inspect.'),
             [container('web', 'running', T('web runs on port 8080', 'web работает на порту 8080', 'web працює на порту 8080', 'web działa na porcie 8080'), image='nginx', port=8080),
              out(T('docker inspect shows unless-stopped', 'docker inspect показывает unless-stopped', 'docker inspect показує unless-stopped', 'docker inspect pokazuje unless-stopped'), text='unless-stopped')],
             T('docker rm -f web, then docker run -d --name web -p 8080:80 --restart unless-stopped nginx, then docker inspect.', 'docker rm -f web, затем docker run -d --name web -p 8080:80 --restart unless-stopped nginx, затем docker inspect.', 'docker rm -f web, потім docker run -d --name web -p 8080:80 --restart unless-stopped nginx, потім docker inspect.', 'docker rm -f web, potem docker run -d --name web -p 8080:80 --restart unless-stopped nginx, potem docker inspect.'),
             'docker inspect', ['docker rm -f web', 'docker run -d --name web -p 8080:80 --restart unless-stopped nginx', "docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' web"]),
        task(T('The host is slow. Find the running container that uses the most memory and stop it.', 'Хост тормозит. Найдите работающий контейнер, который ест больше всего памяти, и остановите его.', 'Хост гальмує. Знайдіть запущений контейнер, що їсть найбільше пам’яті, і зупиніть його.', 'Host zwalnia. Znajdź działający kontener, który zużywa najwięcej pamięci, i zatrzymaj go.'),
             [used('docker', T('Looked at docker stats', 'Посмотрели docker stats', 'Подивилися docker stats', 'Sprawdzono docker stats'), args=['stats']),
              container('cache', 'exited', STOPPED_('cache')),
              container('web', 'running', T('web keeps running', 'web продолжает работать', 'web і далі працює', 'web nadal działa'))],
             T('docker stats --no-stream: compare MEM USAGE, then docker stop the biggest one.', 'docker stats --no-stream: сравните MEM USAGE и остановите самый большой через docker stop.', 'docker stats --no-stream: порівняйте MEM USAGE і зупиніть найбільший через docker stop.', 'docker stats --no-stream: porównaj MEM USAGE i zatrzymaj największy przez docker stop.'),
             'docker stats', ['docker stats --no-stream', 'docker stop cache']),
    ]),

    lesson('dk-tags', T('Image versions and tags', 'Версии образов и теги', 'Версії образів і теги', 'Wersje obrazów i tagi'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## latest is just a name
An image reference is `repository:tag`. `nginx` means `nginx:latest` — and **latest** is not "the newest", it is simply the default tag. Today it is one version, after the next pull another.

In production you **pin** versions:
```
$ docker pull nginx:1.27
$ docker run -d --name web -p 8080:80 nginx:1.27
```
Then every server runs exactly the same code, and a rollback is just starting the previous tag.

## Your own names
`docker tag` adds one more name to an existing image — nothing is copied:
```
$ docker tag nginx:1.27 shop-web:1.0
$ docker images
```
Both lines have the same IMAGE ID. `docker rmi shop-web:1.0` then only **untags**: the image stays while another name points to it.""",
"""## latest — просто имя
Ссылка на образ — это `репозиторий:тег`. `nginx` значит `nginx:latest`, а **latest** — не «самый новый», а просто тег по умолчанию. Сегодня это одна версия, после следующего pull — другая.

В проде версии **закрепляют**:
```
$ docker pull nginx:1.27
$ docker run -d --name web -p 8080:80 nginx:1.27
```
Тогда на всех серверах работает ровно один и тот же код, а откат — это просто запуск предыдущего тега.

## Свои имена
`docker tag` добавляет существующему образу ещё одно имя — ничего не копируется:
```
$ docker tag nginx:1.27 shop-web:1.0
$ docker images
```
У обеих строк одинаковый IMAGE ID. `docker rmi shop-web:1.0` тогда лишь **снимает тег**: образ остаётся, пока на него указывает другое имя.""",
"""## latest — просто ім’я
Посилання на образ — це `репозиторій:тег`. `nginx` означає `nginx:latest`, а **latest** — не «найновіший», а просто тег за замовчуванням. Сьогодні це одна версія, після наступного pull — інша.

У проді версії **закріплюють**:
```
$ docker pull nginx:1.27
$ docker run -d --name web -p 8080:80 nginx:1.27
```
Тоді на всіх серверах працює рівно той самий код, а відкат — це просто запуск попереднього тегу.

## Власні імена
`docker tag` додає наявному образу ще одне ім’я — нічого не копіюється:
```
$ docker tag nginx:1.27 shop-web:1.0
$ docker images
```
В обох рядків однаковий IMAGE ID. `docker rmi shop-web:1.0` тоді лише **знімає тег**: образ лишається, доки на нього вказує інше ім’я.""",
"""## latest to tylko nazwa
Odwołanie do obrazu to `repozytorium:tag`. `nginx` oznacza `nginx:latest`, a **latest** to nie „najnowszy”, tylko domyślny tag. Dziś to jedna wersja, po następnym pull — inna.

Na produkcji wersje się **przypina**:
```
$ docker pull nginx:1.27
$ docker run -d --name web -p 8080:80 nginx:1.27
```
Wtedy na każdym serwerze działa dokładnie ten sam kod, a wycofanie zmian to po prostu uruchomienie poprzedniego tagu.

## Własne nazwy
`docker tag` dodaje istniejącemu obrazowi kolejną nazwę — nic nie jest kopiowane:
```
$ docker tag nginx:1.27 shop-web:1.0
$ docker images
```
Oba wiersze mają ten sam IMAGE ID. `docker rmi shop-web:1.0` wtedy tylko **usuwa tag**: obraz zostaje, dopóki wskazuje na niego inna nazwa."""),
            title=T('repository:tag', 'репозиторий:тег', 'репозиторій:тег', 'repozytorium:tag'),
            demo=['docker pull nginx:1.27', 'docker tag nginx:1.27 shop-web:1.0', 'docker images']),
        quiz(T('`docker tag nginx:1.27 shop-web:1.0`, then `docker rmi shop-web:1.0`. What happens to nginx:1.27?', '`docker tag nginx:1.27 shop-web:1.0`, затем `docker rmi shop-web:1.0`. Что станет с nginx:1.27?', '`docker tag nginx:1.27 shop-web:1.0`, потім `docker rmi shop-web:1.0`. Що станеться з nginx:1.27?', '`docker tag nginx:1.27 shop-web:1.0`, potem `docker rmi shop-web:1.0`. Co stanie się z nginx:1.27?'),
             [T('Nothing — only the name shop-web:1.0 is removed', 'Ничего — удаляется только имя shop-web:1.0', 'Нічого — видаляється лише ім’я shop-web:1.0', 'Nic — znika tylko nazwa shop-web:1.0'),
              T('It is deleted too: it is the same image', 'Тоже удалится: это тот же образ', 'Теж видалиться: це той самий образ', 'Też zostanie usunięty: to ten sam obraz'),
              T('rmi refuses: the image has two names', 'rmi откажет: у образа два имени', 'rmi відмовить: в образу два імені', 'rmi odmówi: obraz ma dwie nazwy')], 0,
             T('While another tag points to the image, rmi prints only "Untagged".', 'Пока на образ указывает другой тег, rmi пишет только «Untagged».', 'Доки на образ вказує інший тег, rmi пише лише «Untagged».', 'Dopóki na obraz wskazuje inny tag, rmi wypisuje tylko „Untagged”.')),
        task(T('Pin the version for the release: download nginx:1.27 and give it the name shop-web:1.0.', 'Закрепите версию для релиза: скачайте nginx:1.27 и дайте ему имя shop-web:1.0.', 'Закріпіть версію для релізу: завантажте nginx:1.27 і дайте йому ім’я shop-web:1.0.', 'Przypnij wersję do wydania: pobierz nginx:1.27 i nadaj mu nazwę shop-web:1.0.'),
             [image('nginx:1.27', T('nginx:1.27 is downloaded', 'nginx:1.27 скачан', 'nginx:1.27 завантажено', 'nginx:1.27 pobrany')),
              image('shop-web:1.0', T('shop-web:1.0 exists', 'shop-web:1.0 существует', 'shop-web:1.0 існує', 'shop-web:1.0 istnieje'))],
             T('docker pull nginx:1.27, then docker tag nginx:1.27 shop-web:1.0', 'docker pull nginx:1.27, затем docker tag nginx:1.27 shop-web:1.0', 'docker pull nginx:1.27, потім docker tag nginx:1.27 shop-web:1.0', 'docker pull nginx:1.27, potem docker tag nginx:1.27 shop-web:1.0'),
             'docker tag', ['docker pull nginx:1.27', 'docker tag nginx:1.27 shop-web:1.0']),
        task(T('Switch the site to the pinned version: web must run shop-web:1.0 on port 8080. The old tag shop-web:beta is not needed — remove only that name.', 'Переведите сайт на закреплённую версию: web должен работать из shop-web:1.0 на порту 8080. Старый тег shop-web:beta не нужен — удалите только это имя.', 'Переведіть сайт на закріплену версію: web має працювати з shop-web:1.0 на порту 8080. Старий тег shop-web:beta не потрібен — видаліть лише це ім’я.', 'Przełącz stronę na przypiętą wersję: web ma działać z shop-web:1.0 na porcie 8080. Stary tag shop-web:beta nie jest potrzebny — usuń tylko tę nazwę.'),
             [container('web', 'running', T('web runs shop-web:1.0 on 8080', 'web работает из shop-web:1.0 на 8080', 'web працює з shop-web:1.0 на 8080', 'web działa z shop-web:1.0 na 8080'), image='shop-web:1.0', port=8080),
              image('shop-web:beta', T('The tag shop-web:beta is gone', 'Тега shop-web:beta больше нет', 'Тегу shop-web:beta більше немає', 'Tagu shop-web:beta już nie ma'), exists=False),
              image('nginx:1.27', T('nginx:1.27 is kept', 'nginx:1.27 сохранён', 'nginx:1.27 збережено', 'nginx:1.27 zachowany'))],
             T('docker rm -f web; docker run -d --name web -p 8080:80 shop-web:1.0; docker rmi shop-web:beta', 'docker rm -f web; docker run -d --name web -p 8080:80 shop-web:1.0; docker rmi shop-web:beta', 'docker rm -f web; docker run -d --name web -p 8080:80 shop-web:1.0; docker rmi shop-web:beta', 'docker rm -f web; docker run -d --name web -p 8080:80 shop-web:1.0; docker rmi shop-web:beta'),
             'docker rmi', ['docker rm -f web', 'docker run -d --name web -p 8080:80 shop-web:1.0', 'docker rmi shop-web:beta'],
             prepare=['docker pull -q nginx:1.27 > /dev/null', 'docker tag nginx:1.27 shop-web:1.0', 'docker tag nginx:1.27 shop-web:beta']),
    ]),

    lesson('dk-inspect', T('Inspecting containers', 'Разбор контейнера по косточкам', 'Розбір контейнера до гвинтика', 'Kontener pod lupą'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## docker inspect knows everything
`docker inspect NAME` prints the whole description of a container as JSON: state, exit code, image, ports, variables, volumes, networks. It is long — pick one field with a template:
```
$ docker inspect -f '{{.State.Status}}' db
exited
$ docker inspect -f '{{.State.ExitCode}}' db
1
$ docker inspect -f '{{.Config.Image}}' web
nginx:latest
```
Field names follow the JSON: `.State`, `.Config`, `.HostConfig`, `.NetworkSettings`.

## Rename instead of deleting
A broken container is evidence. Keep it under another name and start a fresh one:
```
$ docker rename db db-broken
$ docker logs db-broken
```
Names must be unique — that is why the old one has to move out of the way.""",
"""## docker inspect знает всё
`docker inspect ИМЯ` выводит полное описание контейнера в JSON: состояние, код выхода, образ, порты, переменные, тома, сети. Это длинно — выберите одно поле шаблоном:
```
$ docker inspect -f '{{.State.Status}}' db
exited
$ docker inspect -f '{{.State.ExitCode}}' db
1
$ docker inspect -f '{{.Config.Image}}' web
nginx:latest
```
Имена полей повторяют JSON: `.State`, `.Config`, `.HostConfig`, `.NetworkSettings`.

## Переименовать, а не удалить
Сломанный контейнер — это улика. Сохраните его под другим именем и запустите новый:
```
$ docker rename db db-broken
$ docker logs db-broken
```
Имена уникальны — поэтому старому нужно уступить место.""",
"""## docker inspect знає все
`docker inspect ІМ’Я` виводить повний опис контейнера в JSON: стан, код виходу, образ, порти, змінні, томи, мережі. Це довго — виберіть одне поле шаблоном:
```
$ docker inspect -f '{{.State.Status}}' db
exited
$ docker inspect -f '{{.State.ExitCode}}' db
1
$ docker inspect -f '{{.Config.Image}}' web
nginx:latest
```
Імена полів повторюють JSON: `.State`, `.Config`, `.HostConfig`, `.NetworkSettings`.

## Перейменувати, а не видалити
Зламаний контейнер — це доказ. Збережіть його під іншим іменем і запустіть новий:
```
$ docker rename db db-broken
$ docker logs db-broken
```
Імена унікальні — тому старому треба поступитися місцем.""",
"""## docker inspect wie wszystko
`docker inspect NAZWA` wypisuje pełny opis kontenera w JSON: stan, kod wyjścia, obraz, porty, zmienne, wolumeny, sieci. To długie — wybierz jedno pole szablonem:
```
$ docker inspect -f '{{.State.Status}}' db
exited
$ docker inspect -f '{{.State.ExitCode}}' db
1
$ docker inspect -f '{{.Config.Image}}' web
nginx:latest
```
Nazwy pól odpowiadają JSON: `.State`, `.Config`, `.HostConfig`, `.NetworkSettings`.

## Zmień nazwę zamiast usuwać
Zepsuty kontener to dowód. Zachowaj go pod inną nazwą i uruchom nowy:
```
$ docker rename db db-broken
$ docker logs db-broken
```
Nazwy są unikalne — dlatego stary musi zrobić miejsce."""),
            title=T('-f TEMPLATE', '-f ШАБЛОН', '-f ШАБЛОН', '-f SZABLON'),
            demo=["docker inspect -f '{{.State.Status}}' db", "docker inspect -f '{{.State.ExitCode}}' db", "docker inspect -f '{{.Config.Image}}' web"]),
        task(T('Without reading the whole JSON: print only the exit code of the db container.', 'Не читая весь JSON: выведите только код выхода контейнера db.', 'Не читаючи весь JSON: виведіть лише код виходу контейнера db.', 'Bez czytania całego JSON: wypisz tylko kod wyjścia kontenera db.'),
             [used('docker', T('Used docker inspect with a template', 'docker inspect с шаблоном', 'docker inspect із шаблоном', 'docker inspect z szablonem'), args=['inspect']),
              lines(T('Exactly one line: the code', 'Ровно одна строка — код', 'Рівно один рядок — код', 'Dokładnie jeden wiersz: kod'), eq=1),
              out(T('The exit code is 1', 'Код выхода — 1', 'Код виходу — 1', 'Kod wyjścia to 1'), regex=r'^1\n?$')],
             T("docker inspect -f '{{.State.ExitCode}}' db", "docker inspect -f '{{.State.ExitCode}}' db", "docker inspect -f '{{.State.ExitCode}}' db", "docker inspect -f '{{.State.ExitCode}}' db"),
             'docker inspect', ["docker inspect -f '{{.State.ExitCode}}' db"]),
        task(T('Keep the broken db for the post-mortem as db-broken, and start a new db from postgres:16 with POSTGRES_PASSWORD=secret.', 'Сохраните сломанный db для разбора как db-broken и запустите новый db из postgres:16 с POSTGRES_PASSWORD=secret.', 'Збережіть зламаний db для розбору як db-broken і запустіть новий db з postgres:16 з POSTGRES_PASSWORD=secret.', 'Zachowaj zepsuty db do analizy jako db-broken i uruchom nowy db z postgres:16 z POSTGRES_PASSWORD=secret.'),
             [container('db-broken', 'exited', T('The old container is kept as db-broken', 'Старый контейнер сохранён как db-broken', 'Старий контейнер збережено як db-broken', 'Stary kontener zachowany jako db-broken')),
              container('db', 'running', T('A new db is running', 'Новый db работает', 'Новий db працює', 'Nowy db działa'), image='postgres:16')],
             T('docker rename db db-broken, then docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16', 'docker rename db db-broken, затем docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16', 'docker rename db db-broken, потім docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16', 'docker rename db db-broken, potem docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16'),
             'docker rename', ['docker rename db db-broken', 'docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16']),
    ]),
]


module('24-docker-prod.json', 'docker-prod', '/docker/prod', 'shield',
       T('Docker in production', 'Docker в продакшене', 'Docker у продакшені', 'Docker na produkcji'),
       T('Networks, restart policies, pinned versions and inspecting containers', 'Сети, политики перезапуска, закреплённые версии и разбор контейнеров', 'Мережі, політики перезапуску, закріплені версії й розбір контейнерів', 'Sieci, zasady restartu, przypięte wersje i analiza kontenerów'), prod)

# ------------------------------------------------------------------ missions

MISSIONS = [
    {
        "id": "docker-cache-dns", "course": "docker", "topics": ["dk-networks"],
        "title": T('Cache not found', 'Кэш не найден', 'Кеш не знайдено', 'Nie znaleziono cache'),
        "story": T('09:12, P2. The payment API on pay01 logs "getaddrinfo ENOTFOUND cache" — it cannot reach Redis by name. Someone started both containers without a network. Put api and cache on a network pay-net (do not recreate them) and prove that api resolves cache.',
                   '09:12, P2. Платёжный API на pay01 пишет в лог «getaddrinfo ENOTFOUND cache» — не может достучаться до Redis по имени. Кто-то запустил оба контейнера без сети. Подключите api и cache к сети pay-net (не пересоздавая их) и докажите, что api разрешает имя cache.',
                   '09:12, P2. Платіжний API на pay01 пише в лог «getaddrinfo ENOTFOUND cache» — не може достукатися до Redis за іменем. Хтось запустив обидва контейнери без мережі. Під’єднайте api і cache до мережі pay-net (не перестворюючи їх) і доведіть, що api розв’язує ім’я cache.',
                   '09:12, P2. API płatności na pay01 loguje „getaddrinfo ENOTFOUND cache” — nie może dotrzeć do Redisa po nazwie. Ktoś uruchomił oba kontenery bez sieci. Podłącz api i cache do sieci pay-net (bez tworzenia ich od nowa) i udowodnij, że api rozwiązuje nazwę cache.'),
        "difficulty": 2, "requires": "docker-prod", "xp": 120,
        "setup": {
            "hostname": "pay01",
            "docker": {
                "images": ["nginx:latest", "redis:7"],
                "containers": [
                    {"name": "api", "image": "nginx", "ports": ["8080:80"], "age": 60, "logs": ["2026/11/14 09:12:03 [error] upstream: getaddrinfo ENOTFOUND cache", "2026/11/14 09:12:04 [error] upstream: getaddrinfo ENOTFOUND cache"]},
                    {"name": "cache", "image": "redis:7", "age": 60},
                ],
            },
            "files": {"~/tickets/INC-5120.txt": "INC-5120  P2  pay01: payments fail, api log: getaddrinfo ENOTFOUND cache\nAction: put api and cache on network pay-net. Do NOT recreate the containers (in-memory sessions).\n"},
        },
        "checks": [
            container('api', 'running', RUNS('api', 'pay-net'), network='pay-net'),
            container('cache', 'running', RUNS('cache', 'pay-net'), network='pay-net'),
            used('docker', T('Checked name resolution from api', 'Проверено разрешение имени из api', 'Перевірено розв’язування імені з api', 'Sprawdzono rozwiązywanie nazwy z api'), args=['exec', 'api'], success=True),
        ],
        "hints": {"direction": T('docker logs api shows the error. docker network create pay-net, docker network connect for both, then docker exec api getent hosts cache.', 'docker logs api покажет ошибку. docker network create pay-net, docker network connect для обоих, затем docker exec api getent hosts cache.', 'docker logs api покаже помилку. docker network create pay-net, docker network connect для обох, потім docker exec api getent hosts cache.', 'docker logs api pokaże błąd. docker network create pay-net, docker network connect dla obu, potem docker exec api getent hosts cache.'), "command": "docker network connect"},
        "solution": ['cat ~/tickets/INC-5120.txt', 'docker logs api', 'docker network create pay-net', 'docker network connect pay-net api', 'docker network connect pay-net cache', 'docker exec api getent hosts cache'],
    },
    {
        "id": "docker-rollback", "course": "docker", "topics": ["dk-tags", "dk-restart", "dk-logs"],
        "title": T('Roll it back', 'Откатить релиз', 'Відкотити реліз', 'Wycofaj wydanie'),
        "story": T('22:40, P1. An hour ago web was upgraded to nginx:1.27 and the site is down. The previous version nginx:1.26 is still on the host. Roll web back to 1.26 on port 8080 with the restart policy unless-stopped, and mark that image as shop-web:stable so nobody deploys the broken one again.',
                   '22:40, P1. Час назад web обновили до nginx:1.27, и сайт лежит. Прошлая версия nginx:1.26 ещё есть на хосте. Откатите web на 1.26 на порту 8080 с политикой unless-stopped и пометьте этот образ как shop-web:stable, чтобы никто снова не выкатил сломанный.',
                   '22:40, P1. Годину тому web оновили до nginx:1.27, і сайт лежить. Попередня версія nginx:1.26 ще є на хості. Відкотіть web на 1.26 на порту 8080 з політикою unless-stopped і позначте цей образ як shop-web:stable, щоб ніхто знову не викотив зламаний.',
                   '22:40, P1. Godzinę temu web zaktualizowano do nginx:1.27 i strona leży. Poprzednia wersja nginx:1.26 jest jeszcze na hoście. Wycofaj web do 1.26 na porcie 8080 z zasadą unless-stopped i oznacz ten obraz jako shop-web:stable, żeby nikt znów nie wdrożył zepsutego.'),
        "difficulty": 3, "requires": "docker-prod", "xp": 150,
        "setup": {
            "hostname": "web01",
            "docker": {
                "images": ["nginx:1.26", "nginx:1.27"],
                "containers": [
                    {"name": "web", "image": "nginx:1.27", "ports": ["8080:80"], "state": "exited", "exitCode": 1, "age": 1,
                     "logs": ['2026/11/14 21:40:12 [emerg] 1#1: unknown directive "ssl_legacy_renegotiation" in /etc/nginx/conf.d/shop.conf:14', 'nginx: [emerg] unknown directive "ssl_legacy_renegotiation" in /etc/nginx/conf.d/shop.conf:14']},
                ],
            },
            "files": {"~/tickets/INC-5133.txt": "INC-5133  P1  web01: shop down since the 21:40 upgrade to nginx:1.27\nRollback approved: nginx:1.26. Keep port 8080. Must survive reboots.\n"},
        },
        "checks": [
            container('web', 'running', T('web runs nginx:1.26 on 8080', 'web работает на nginx:1.26, порт 8080', 'web працює на nginx:1.26, порт 8080', 'web działa na nginx:1.26, port 8080'), image='nginx:1.26', port=8080),
            used('docker', T('The restart policy unless-stopped is set', 'Задана политика unless-stopped', 'Задано політику unless-stopped', 'Ustawiono zasadę unless-stopped'), args=['run', 'unless-stopped'], success=True),
            image('shop-web:stable', T('shop-web:stable is tagged', 'Образ помечен как shop-web:stable', 'Образ позначено як shop-web:stable', 'Obraz oznaczony jako shop-web:stable')),
            used('curl', T('Checked the site with curl', 'Сайт проверен curl', 'Сайт перевірено curl', 'Strona sprawdzona curl'), success=True),
        ],
        "hints": {"direction": T('docker logs web explains the crash. docker rm web, docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.26, docker tag nginx:1.26 shop-web:stable, curl localhost:8080.', 'docker logs web объяснит падение. docker rm web, docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.26, docker tag nginx:1.26 shop-web:stable, curl localhost:8080.', 'docker logs web пояснить падіння. docker rm web, docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.26, docker tag nginx:1.26 shop-web:stable, curl localhost:8080.', 'docker logs web wyjaśni awarię. docker rm web, docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.26, docker tag nginx:1.26 shop-web:stable, curl localhost:8080.'), "command": "docker tag"},
        "solution": ['docker logs web', 'docker rm web', 'docker run -d --name web -p 8080:80 --restart unless-stopped nginx:1.26', 'docker tag nginx:1.26 shop-web:stable', 'curl localhost:8080'],
    },
]

