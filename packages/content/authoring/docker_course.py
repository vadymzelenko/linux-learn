"""Docker course: 3 modules, 12 lessons and a mission, in en/ru/uk/pl.

    python3 authoring/docker_course.py && python3 authoring/courses.py && python3 authoring/register.py
"""
import json, os
from lib import *

def T(en, ru, uk, pl): return L(en, ru, uk, pl)

EMPTY = {"hostname": "dock01", "docker": {}}
WITH_NGINX = {"hostname": "dock01", "docker": {"images": ["nginx:latest"]}}

SITE = '<!doctype html>\n<h1>Hello from my site</h1>\n'
APP_INDEX = '<!doctype html>\n<h1>Shop v2 — built with Docker</h1>\n'
DOCKERFILE = 'FROM nginx:alpine\nWORKDIR /usr/share/nginx/html\nCOPY index.html .\nEXPOSE 80\n'
COMPOSE = 'services:\n  web:\n    image: nginx:alpine\n    ports:\n      - "8090:80"\n  cache:\n    image: redis:7\n'

LAB = {
    "hostname": "dock01",
    "docker": {
        "images": ["nginx:latest", "redis:7", "postgres:16", "alpine:latest"],
        "containers": [
            {"name": "web", "image": "nginx", "ports": ["8080:80"], "age": 180},
            {"name": "cache", "image": "redis:7", "age": 180},
            {"name": "db", "image": "postgres:16", "state": "exited", "exitCode": 1, "age": 30},
        ],
    },
    "files": {
        "~/site/index.html": SITE,
        "~/app/Dockerfile": DOCKERFILE,
        "~/app/index.html": APP_INDEX,
        "~/shop/compose.yaml": COMPOSE,
        "~/notes.txt": "web   -> http://localhost:8080\ncache -> redis on 6379 (internal)\ndb    -> postgres (broken since the last deploy?)\n",
    },
}
fixture('docker-lab', LAB)

RUNNING = lambda name: T(f'Container {name} is running', f'Контейнер {name} запущен', f'Контейнер {name} запущено', f'Kontener {name} działa')
STOPPED = lambda name: T(f'Container {name} is stopped', f'Контейнер {name} остановлен', f'Контейнер {name} зупинено', f'Kontener {name} jest zatrzymany')
REMOVED = lambda name: T(f'Container {name} is removed', f'Контейнер {name} удалён', f'Контейнер {name} видалено', f'Kontener {name} jest usunięty')
USED = lambda c: T(f'Used {c}', f'Использована {c}', f'Використано {c}', f'Użyto {c}')

# ------------------------------------------------------------------ module 1: basics

basics = [
    lesson('dk-why', T('Why Docker', 'Зачем нужен Docker', 'Навіщо потрібен Docker', 'Po co Docker'), ['docker'], setup=EMPTY, steps=[
        reading(T(
"""## "It works on my machine"
An application needs more than its code: a language runtime, libraries, config files, the right versions of all of them. On the server something is always different — and the app breaks.

**Docker** packs the application *together with everything it needs* into an **image**. The image runs the same way on a laptop, a test server and in production.

## Three words
| word | what it is | analogy |
|---|---|---|
| **image** | a read-only template: files + the command to start | a recipe / an installer |
| **container** | a running (or stopped) instance of an image | a dish cooked from the recipe |
| **registry** | a store of images (Docker Hub) | a recipe book in the library |

One image → as many containers as you like.

## Container ≠ virtual machine
A VM emulates a whole computer with its own kernel and boots in minutes. A container is just an **isolated process** on the host's Linux kernel: it starts in a second and weighs megabytes.

> Everything you learned in the Linux course works inside containers too: processes, files, permissions, ports, logs.""",
"""## «У меня на машине работает»
Приложению нужен не только код: среда выполнения языка, библиотеки, конфиги — и всё нужных версий. На сервере что-то всегда отличается, и приложение ломается.

**Docker** упаковывает приложение *вместе со всем необходимым* в **образ** (image). Образ запускается одинаково на ноутбуке, тестовом сервере и в проде.

## Три слова
| слово | что это | аналогия |
|---|---|---|
| **образ** (image) | шаблон только для чтения: файлы + команда запуска | рецепт / установщик |
| **контейнер** | запущенный (или остановленный) экземпляр образа | блюдо, приготовленное по рецепту |
| **реестр** (registry) | хранилище образов (Docker Hub) | книга рецептов в библиотеке |

Из одного образа — сколько угодно контейнеров.

## Контейнер ≠ виртуальная машина
ВМ эмулирует целый компьютер со своим ядром и загружается минутами. Контейнер — это просто **изолированный процесс** на ядре Linux хоста: стартует за секунду и весит мегабайты.

> Всё, что вы узнали в курсе Linux, работает и внутри контейнеров: процессы, файлы, права, порты, логи.""",
"""## «У мене на машині працює»
Застосунку потрібен не лише код: середовище виконання мови, бібліотеки, конфіги — і все потрібних версій. На сервері щось завжди відрізняється, і застосунок ламається.

**Docker** пакує застосунок *разом з усім потрібним* в **образ** (image). Образ запускається однаково на ноутбуці, тестовому сервері й у проді.

## Три слова
| слово | що це | аналогія |
|---|---|---|
| **образ** (image) | шаблон лише для читання: файли + команда запуску | рецепт / інсталятор |
| **контейнер** | запущений (або зупинений) екземпляр образу | страва, приготована за рецептом |
| **реєстр** (registry) | сховище образів (Docker Hub) | книга рецептів у бібліотеці |

З одного образу — скільки завгодно контейнерів.

## Контейнер ≠ віртуальна машина
ВМ емулює цілий комп’ютер зі своїм ядром і завантажується хвилинами. Контейнер — це просто **ізольований процес** на ядрі Linux хоста: стартує за секунду й важить мегабайти.

> Усе, що ви дізналися в курсі Linux, працює й усередині контейнерів: процеси, файли, права, порти, логи.""",
"""## „U mnie działa”
Aplikacja potrzebuje więcej niż kodu: środowiska uruchomieniowego, bibliotek, plików konfiguracyjnych — i to w odpowiednich wersjach. Na serwerze zawsze coś jest inaczej i aplikacja się psuje.

**Docker** pakuje aplikację *razem ze wszystkim, czego potrzebuje*, w **obraz** (image). Obraz działa tak samo na laptopie, serwerze testowym i na produkcji.

## Trzy słowa
| słowo | co to jest | analogia |
|---|---|---|
| **obraz** (image) | szablon tylko do odczytu: pliki + polecenie startowe | przepis / instalator |
| **kontener** | uruchomiona (lub zatrzymana) instancja obrazu | danie ugotowane z przepisu |
| **rejestr** (registry) | magazyn obrazów (Docker Hub) | książka kucharska w bibliotece |

Z jednego obrazu — dowolnie wiele kontenerów.

## Kontener ≠ maszyna wirtualna
VM emuluje cały komputer z własnym jądrem i uruchamia się minutami. Kontener to po prostu **odizolowany proces** na jądrze Linuksa hosta: startuje w sekundę i waży megabajty.

> Wszystko, czego nauczyłeś się w kursie Linuksa, działa też w kontenerach: procesy, pliki, uprawnienia, porty, logi."""),
            title=T('Images and containers', 'Образы и контейнеры', 'Образи й контейнери', 'Obrazy i kontenery')),
        quiz(T('What is the relation between an image and a container?', 'Как связаны образ и контейнер?', 'Як пов’язані образ і контейнер?', 'Jaki jest związek między obrazem a kontenerem?'),
             [T('A container is a running instance of an image; one image can give many containers', 'Контейнер — запущенный экземпляр образа; из одного образа можно запустить много контейнеров', 'Контейнер — запущений екземпляр образу; з одного образу можна запустити багато контейнерів', 'Kontener to uruchomiona instancja obrazu; z jednego obrazu powstaje wiele kontenerów'),
              T('An image is a running container saved to disk; they are one-to-one', 'Образ — это запущенный контейнер, сохранённый на диск; они один к одному', 'Образ — це запущений контейнер, збережений на диск; вони один до одного', 'Obraz to zapisany na dysk działający kontener; są jeden do jednego'),
              T('They are two names for the same thing', 'Это два названия одного и того же', 'Це дві назви одного й того самого', 'To dwie nazwy tego samego')], 0,
             T('Image = template (read-only). Container = a process started from it, with its own writable layer.', 'Образ — шаблон (только чтение). Контейнер — процесс, запущенный из него, со своим слоем для записи.', 'Образ — шаблон (лише читання). Контейнер — процес, запущений з нього, зі своїм шаром для запису.', 'Obraz to szablon (tylko odczyt). Kontener to proces uruchomiony z niego, z własną warstwą do zapisu.')),
        quiz(T('Why does a container start much faster than a virtual machine?', 'Почему контейнер стартует гораздо быстрее виртуальной машины?', 'Чому контейнер стартує набагато швидше за віртуальну машину?', 'Dlaczego kontener startuje dużo szybciej niż maszyna wirtualna?'),
             [T('It uses the host kernel: no OS has to boot, just a process starts', 'Он использует ядро хоста: не нужно загружать ОС, просто стартует процесс', 'Він використовує ядро хоста: не треба завантажувати ОС, просто стартує процес', 'Używa jądra hosta: nie trzeba uruchamiać systemu, startuje tylko proces'),
              T('Containers are compiled to machine code', 'Контейнеры компилируются в машинный код', 'Контейнери компілюються в машинний код', 'Kontenery są kompilowane do kodu maszynowego'),
              T('Docker skips the application\'s start command', 'Docker пропускает команду запуска приложения', 'Docker пропускає команду запуску застосунку', 'Docker pomija polecenie startowe aplikacji')], 0),
    ]),

    lesson('dk-hello', T('Your first container', 'Первый контейнер', 'Перший контейнер', 'Pierwszy kontener'), ['docker'], setup=EMPTY, steps=[
        theory(T(
"""## docker run
```
$ docker run hello-world
```
What happens:
1. Docker looks for the image `hello-world` **locally** — it is not there yet
2. it **pulls** it from Docker Hub (`Unable to find image… Pulling…`)
3. it **creates** a container and **runs** its command
4. the program prints its text and **exits** — and so does the container

## Look around
```
$ docker ps
$ docker ps -a
$ docker images
```
- `docker ps` — only **running** containers (hello-world is already finished, so it is not there)
- `docker ps -a` — **all** containers, including stopped (`Exited (0)` = finished successfully)
- `docker images` — images downloaded to this machine

> The name `hello-world` means `hello-world:latest`: after the colon comes the **tag** (version). No tag = `latest`.""",
"""## docker run
```
$ docker run hello-world
```
Что происходит:
1. Docker ищет образ `hello-world` **локально** — его ещё нет
2. **скачивает** (pull) его с Docker Hub (`Unable to find image… Pulling…`)
3. **создаёт** контейнер и **запускает** его команду
4. программа печатает текст и **завершается** — вместе с ней и контейнер

## Осмотритесь
```
$ docker ps
$ docker ps -a
$ docker images
```
- `docker ps` — только **работающие** контейнеры (hello-world уже завершился, его там нет)
- `docker ps -a` — **все** контейнеры, включая остановленные (`Exited (0)` = завершился успешно)
- `docker images` — образы, скачанные на эту машину

> Имя `hello-world` означает `hello-world:latest`: после двоеточия идёт **тег** (версия). Нет тега — значит `latest`.""",
"""## docker run
```
$ docker run hello-world
```
Що відбувається:
1. Docker шукає образ `hello-world` **локально** — його ще немає
2. **завантажує** (pull) його з Docker Hub (`Unable to find image… Pulling…`)
3. **створює** контейнер і **запускає** його команду
4. програма друкує текст і **завершується** — разом з нею й контейнер

## Роздивіться
```
$ docker ps
$ docker ps -a
$ docker images
```
- `docker ps` — лише **запущені** контейнери (hello-world уже завершився, його там немає)
- `docker ps -a` — **усі** контейнери, разом із зупиненими (`Exited (0)` = завершився успішно)
- `docker images` — образи, завантажені на цю машину

> Ім’я `hello-world` означає `hello-world:latest`: після двокрапки йде **тег** (версія). Немає тегу — отже `latest`.""",
"""## docker run
```
$ docker run hello-world
```
Co się dzieje:
1. Docker szuka obrazu `hello-world` **lokalnie** — jeszcze go nie ma
2. **pobiera** go (pull) z Docker Hub (`Unable to find image… Pulling…`)
3. **tworzy** kontener i **uruchamia** jego polecenie
4. program wypisuje tekst i **kończy się** — a razem z nim kontener

## Rozejrzyj się
```
$ docker ps
$ docker ps -a
$ docker images
```
- `docker ps` — tylko **działające** kontenery (hello-world już się zakończył, więc go nie ma)
- `docker ps -a` — **wszystkie** kontenery, także zatrzymane (`Exited (0)` = zakończył się sukcesem)
- `docker images` — obrazy pobrane na tę maszynę

> Nazwa `hello-world` oznacza `hello-world:latest`: po dwukropku jest **tag** (wersja). Brak tagu = `latest`."""),
            title=T('Run, list, look', 'Запустить, посмотреть', 'Запустити, подивитися', 'Uruchom i obejrzyj'), demo=['docker run hello-world', 'docker ps -a', 'docker images']),
        task(T('Run the hello-world container.', 'Запустите контейнер hello-world.', 'Запустіть контейнер hello-world.', 'Uruchom kontener hello-world.'),
             [used('docker', T('docker run succeeded', 'docker run выполнен успешно', 'docker run виконано успішно', 'docker run zakończony sukcesem'), args=['run'], success=True),
              image('hello-world', T('The hello-world image was downloaded', 'Образ hello-world скачан', 'Образ hello-world завантажено', 'Obraz hello-world został pobrany')),
              out(T('You saw "Hello from Docker!"', 'Вы увидели «Hello from Docker!»', 'Ви побачили «Hello from Docker!»', 'Zobaczyłeś „Hello from Docker!”'), text='Hello from Docker!')],
             T('docker run IMAGE', 'docker run ОБРАЗ', 'docker run ОБРАЗ', 'docker run OBRAZ'), 'docker run', ['docker run hello-world']),
        quiz(T('You ran hello-world, but `docker ps` shows an empty table. Why?', 'Вы запустили hello-world, но `docker ps` показывает пустую таблицу. Почему?', 'Ви запустили hello-world, але `docker ps` показує порожню таблицю. Чому?', 'Uruchomiłeś hello-world, ale `docker ps` pokazuje pustą tabelę. Dlaczego?'),
             [T('The container already finished; docker ps shows only running ones — use docker ps -a', 'Контейнер уже завершился, а docker ps показывает только работающие — нужен docker ps -a', 'Контейнер уже завершився, а docker ps показує лише запущені — потрібен docker ps -a', 'Kontener już się zakończył, a docker ps pokazuje tylko działające — użyj docker ps -a'),
              T('The container was deleted automatically', 'Контейнер удалился автоматически', 'Контейнер видалився автоматично', 'Kontener usunął się automatycznie'),
              T('The image failed to download', 'Образ не скачался', 'Образ не завантажився', 'Obraz się nie pobrał')], 0),
        task(T('Show all containers, including the stopped ones.', 'Покажите все контейнеры, включая остановленные.', 'Покажіть усі контейнери, включно із зупиненими.', 'Pokaż wszystkie kontenery, także zatrzymane.'),
             [used('docker', T('docker ps -a', 'docker ps -a', 'docker ps -a', 'docker ps -a'), args=['ps'], flags=['-a']), out(T('hello-world is in the list', 'hello-world есть в списке', 'hello-world є у списку', 'hello-world jest na liście'), text='hello-world')],
             T('ps lists containers; one flag adds the stopped ones.', 'ps — список контейнеров; один флаг добавляет остановленные.', 'ps — список контейнерів; один прапорець додає зупинені.', 'ps wyświetla kontenery; jedna flaga dodaje zatrzymane.'), 'docker ps', ['docker ps -a'], prepare=['docker run hello-world']),
    ]),

    lesson('dk-background', T('Containers in the background', 'Контейнеры в фоне', 'Контейнери у фоні', 'Kontenery w tle'), ['docker'], setup=WITH_NGINX, steps=[
        theory(T(
"""## Servers run for a long time
A web server does not "finish" — it waits for requests. Run it **detached** (in the background) and give it a **name**:
```
$ docker run -d --name web nginx
$ docker ps
```
`-d` prints the container ID and returns the prompt. Without `--name` Docker invents a funny name like `quirky_turing`.

## Life cycle
```
$ docker stop web
$ docker start web
$ docker restart web
$ docker rm web
```
| command | what it does |
|---|---|
| `stop` | stops the process (SIGTERM, then SIGKILL after 10 s) |
| `start` | starts a stopped container again |
| `rm` | deletes a **stopped** container |
| `rm -f` | stops and deletes in one go |

> A stopped container still exists (and keeps its name!) until you `rm` it. That is why `docker run --name web` fails the second time.""",
"""## Серверы работают долго
Веб-сервер не «завершается» — он ждёт запросы. Запускайте его **в фоне** (detached) и давайте **имя**:
```
$ docker run -d --name web nginx
$ docker ps
```
`-d` печатает ID контейнера и возвращает приглашение. Без `--name` Docker придумает смешное имя вроде `quirky_turing`.

## Жизненный цикл
```
$ docker stop web
$ docker start web
$ docker restart web
$ docker rm web
```
| команда | что делает |
|---|---|
| `stop` | останавливает процесс (SIGTERM, через 10 с — SIGKILL) |
| `start` | снова запускает остановленный контейнер |
| `rm` | удаляет **остановленный** контейнер |
| `rm -f` | останавливает и удаляет за один раз |

> Остановленный контейнер продолжает существовать (и занимать имя!), пока вы не сделаете `rm`. Поэтому `docker run --name web` второй раз выдаёт ошибку.""",
"""## Сервери працюють довго
Вебсервер не «завершується» — він чекає запитів. Запускайте його **у фоні** (detached) і давайте **ім’я**:
```
$ docker run -d --name web nginx
$ docker ps
```
`-d` друкує ID контейнера й повертає запрошення. Без `--name` Docker вигадає кумедне ім’я на кшталт `quirky_turing`.

## Життєвий цикл
```
$ docker stop web
$ docker start web
$ docker restart web
$ docker rm web
```
| команда | що робить |
|---|---|
| `stop` | зупиняє процес (SIGTERM, через 10 с — SIGKILL) |
| `start` | знову запускає зупинений контейнер |
| `rm` | видаляє **зупинений** контейнер |
| `rm -f` | зупиняє й видаляє за один раз |

> Зупинений контейнер продовжує існувати (і займати ім’я!), доки ви не зробите `rm`. Тому `docker run --name web` вдруге видає помилку.""",
"""## Serwery działają długo
Serwer WWW się „nie kończy” — czeka na żądania. Uruchamiaj go **w tle** (detached) i nadaj mu **nazwę**:
```
$ docker run -d --name web nginx
$ docker ps
```
`-d` wypisuje ID kontenera i oddaje znak zachęty. Bez `--name` Docker wymyśli zabawną nazwę w stylu `quirky_turing`.

## Cykl życia
```
$ docker stop web
$ docker start web
$ docker restart web
$ docker rm web
```
| polecenie | co robi |
|---|---|
| `stop` | zatrzymuje proces (SIGTERM, po 10 s SIGKILL) |
| `start` | ponownie uruchamia zatrzymany kontener |
| `rm` | usuwa **zatrzymany** kontener |
| `rm -f` | zatrzymuje i usuwa za jednym razem |

> Zatrzymany kontener nadal istnieje (i zajmuje nazwę!), dopóki go nie usuniesz `rm`. Dlatego drugie `docker run --name web` kończy się błędem."""),
            title=T('Detached containers', 'Фоновые контейнеры', 'Фонові контейнери', 'Kontenery w tle'), demo=['docker run -d --name web nginx', 'docker ps', 'docker stop web', 'docker ps -a']),
        task(T('Start nginx in the background in a container named web.', 'Запустите nginx в фоне в контейнере с именем web.', 'Запустіть nginx у фоні в контейнері з іменем web.', 'Uruchom nginx w tle w kontenerze o nazwie web.'),
             [container('web', 'running', RUNNING('web'), image='nginx'), used('docker', T('In the background (-d)', 'В фоне (-d)', 'У фоні (-d)', 'W tle (-d)'), args=['run'], flags=['-d'])],
             T('run + the flag for background + --name', 'run + флаг фона + --name', 'run + прапорець фону + --name', 'run + flaga tła + --name'), 'docker run -d', ['docker run -d --name web nginx']),
        task(T('Stop the web container, but do not delete it.', 'Остановите контейнер web, но не удаляйте.', 'Зупиніть контейнер web, але не видаляйте.', 'Zatrzymaj kontener web, ale go nie usuwaj.'),
             [container('web', 'exited', STOPPED('web'))],
             T('docker stop NAME', 'docker stop ИМЯ', 'docker stop ІМ’Я', 'docker stop NAZWA'), 'docker stop', ['docker stop web'], prepare=['docker run -d --name web nginx']),
        quiz(T('You stopped web and now run `docker run -d --name web nginx` again. What happens?', 'Вы остановили web и снова запускаете `docker run -d --name web nginx`. Что произойдёт?', 'Ви зупинили web і знову запускаєте `docker run -d --name web nginx`. Що станеться?', 'Zatrzymałeś web i znów uruchamiasz `docker run -d --name web nginx`. Co się stanie?'),
             [T('An error: the name "/web" is already in use by the stopped container', 'Ошибка: имя «/web» уже занято остановленным контейнером', 'Помилка: ім’я «/web» уже зайняте зупиненим контейнером', 'Błąd: nazwa „/web” jest już zajęta przez zatrzymany kontener'),
              T('The stopped container starts again', 'Остановленный контейнер запустится снова', 'Зупинений контейнер запуститься знову', 'Zatrzymany kontener uruchomi się ponownie'),
              T('The old container is replaced by a new one', 'Старый контейнер заменится новым', 'Старий контейнер заміниться новим', 'Stary kontener zostanie zastąpiony nowym')], 0,
             T('A stopped container still owns its name. Use docker start web, or remove it first (docker rm web).', 'Остановленный контейнер всё ещё занимает имя. Используйте docker start web или сначала удалите его (docker rm web).', 'Зупинений контейнер досі займає ім’я. Використайте docker start web або спочатку видаліть його (docker rm web).', 'Zatrzymany kontener wciąż zajmuje nazwę. Użyj docker start web albo najpierw go usuń (docker rm web).')),
        task(T('Delete the web container completely (it is running).', 'Полностью удалите контейнер web (он работает).', 'Повністю видаліть контейнер web (він працює).', 'Całkowicie usuń kontener web (działa).'),
             [container('web', 'absent', REMOVED('web'))],
             T('Either stop + rm, or rm with the force flag.', 'Либо stop + rm, либо rm с флагом принудительно.', 'Або stop + rm, або rm із прапорцем примусово.', 'Albo stop + rm, albo rm z flagą wymuszenia.'), 'docker rm', ['docker rm -f web'], prepare=['docker run -d --name web nginx']),
    ]),

    lesson('dk-ports', T('Publishing ports', 'Проброс портов', 'Прокидання портів', 'Publikowanie portów'), ['docker', 'curl'], setup=WITH_NGINX, steps=[
        theory(T(
"""## A container has its own network
nginx inside the container listens on port **80** — but that is the container's port 80, not the host's. To reach it from the host, **publish** the port:
```
$ docker run -d --name site -p 8080:80 nginx
$ curl localhost:8080
```
`-p HOST:CONTAINER` — the left number is the port **on your machine**, the right one is **inside** the container. Requests to `localhost:8080` go to port 80 of the container.

## Check
```
$ docker ps
$ ss -tln
```
`docker ps` shows `0.0.0.0:8080->80/tcp`, and `ss` shows that the host listens on 8080.

## Port already taken
Two programs cannot listen on the same host port:
```
Bind for 0.0.0.0:8080 failed: port is already allocated
```
Pick another host port (`-p 8081:80`) or stop whatever holds the port.""",
"""## У контейнера своя сеть
nginx внутри контейнера слушает порт **80** — но это порт 80 контейнера, а не хоста. Чтобы достучаться с хоста, порт нужно **пробросить** (publish):
```
$ docker run -d --name site -p 8080:80 nginx
$ curl localhost:8080
```
`-p ХОСТ:КОНТЕЙНЕР` — левое число — порт **на вашей машине**, правое — **внутри** контейнера. Запросы на `localhost:8080` попадают на порт 80 контейнера.

## Проверка
```
$ docker ps
$ ss -tln
```
`docker ps` показывает `0.0.0.0:8080->80/tcp`, а `ss` — что хост слушает 8080.

## Порт уже занят
Две программы не могут слушать один и тот же порт хоста:
```
Bind for 0.0.0.0:8080 failed: port is already allocated
```
Возьмите другой порт хоста (`-p 8081:80`) или остановите то, что его держит.""",
"""## У контейнера своя мережа
nginx усередині контейнера слухає порт **80** — але це порт 80 контейнера, а не хоста. Щоб достукатися з хоста, порт треба **прокинути** (publish):
```
$ docker run -d --name site -p 8080:80 nginx
$ curl localhost:8080
```
`-p ХОСТ:КОНТЕЙНЕР` — ліве число — порт **на вашій машині**, праве — **усередині** контейнера. Запити на `localhost:8080` потрапляють на порт 80 контейнера.

## Перевірка
```
$ docker ps
$ ss -tln
```
`docker ps` показує `0.0.0.0:8080->80/tcp`, а `ss` — що хост слухає 8080.

## Порт уже зайнятий
Дві програми не можуть слухати той самий порт хоста:
```
Bind for 0.0.0.0:8080 failed: port is already allocated
```
Візьміть інший порт хоста (`-p 8081:80`) або зупиніть те, що його тримає.""",
"""## Kontener ma własną sieć
nginx w kontenerze nasłuchuje na porcie **80** — ale to port 80 kontenera, nie hosta. Aby dostać się do niego z hosta, **opublikuj** port:
```
$ docker run -d --name site -p 8080:80 nginx
$ curl localhost:8080
```
`-p HOST:KONTENER` — lewa liczba to port **na Twojej maszynie**, prawa — **w kontenerze**. Żądania na `localhost:8080` trafiają na port 80 kontenera.

## Sprawdzenie
```
$ docker ps
$ ss -tln
```
`docker ps` pokazuje `0.0.0.0:8080->80/tcp`, a `ss` — że host nasłuchuje na 8080.

## Port zajęty
Dwa programy nie mogą nasłuchiwać na tym samym porcie hosta:
```
Bind for 0.0.0.0:8080 failed: port is already allocated
```
Wybierz inny port hosta (`-p 8081:80`) albo zatrzymaj to, co go trzyma."""),
            title=T('HOST:CONTAINER', 'ХОСТ:КОНТЕЙНЕР', 'ХОСТ:КОНТЕЙНЕР', 'HOST:KONTENER'), demo=['docker run -d --name site -p 8080:80 nginx', 'curl -s localhost:8080 | head -4']),
        quiz(T('`docker run -d -p 3000:80 nginx`. Which address opens the site on the host?', '`docker run -d -p 3000:80 nginx`. По какому адресу сайт откроется на хосте?', '`docker run -d -p 3000:80 nginx`. За якою адресою сайт відкриється на хості?', '`docker run -d -p 3000:80 nginx`. Pod jakim adresem strona otworzy się na hoście?'),
             [T('http://localhost:3000', 'http://localhost:3000', 'http://localhost:3000', 'http://localhost:3000'), T('http://localhost:80', 'http://localhost:80', 'http://localhost:80', 'http://localhost:80'), T('http://localhost:3080', 'http://localhost:3080', 'http://localhost:3080', 'http://localhost:3080')], 0,
             T('Left = host port, right = container port.', 'Слева — порт хоста, справа — порт контейнера.', 'Ліворуч — порт хоста, праворуч — порт контейнера.', 'Lewa = port hosta, prawa = port kontenera.')),
        task(T('Start nginx named site so that it opens at http://localhost:8080, and check it with curl.', 'Запустите nginx с именем site так, чтобы он открывался на http://localhost:8080, и проверьте curl.', 'Запустіть nginx з іменем site так, щоб він відкривався на http://localhost:8080, і перевірте curl.', 'Uruchom nginx o nazwie site tak, by otwierał się pod http://localhost:8080, i sprawdź curl.'),
             [container('site', 'running', T('site runs with port 8080 published', 'site работает, порт 8080 проброшен', 'site працює, порт 8080 прокинуто', 'site działa z opublikowanym portem 8080'), port=8080),
              out(T('curl shows the nginx page', 'curl показывает страницу nginx', 'curl показує сторінку nginx', 'curl pokazuje stronę nginx'), text='Welcome to nginx')],
             T('-p 8080:80, then curl localhost:8080', '-p 8080:80, потом curl localhost:8080', '-p 8080:80, потім curl localhost:8080', '-p 8080:80, potem curl localhost:8080'), 'docker run -d', ['docker run -d --name site -p 8080:80 nginx', 'curl localhost:8080']),
        task(T('A forgotten test container "old" holds port 8080. Free the port and start a new nginx container "blog" on http://localhost:8080.', 'Забытый тестовый контейнер «old» держит порт 8080. Освободите порт и запустите новый контейнер nginx «blog» на http://localhost:8080.', 'Забутий тестовий контейнер «old» тримає порт 8080. Звільніть порт і запустіть новий контейнер nginx «blog» на http://localhost:8080.', 'Zapomniany testowy kontener „old” trzyma port 8080. Zwolnij port i uruchom nowy kontener nginx „blog” pod http://localhost:8080.'),
             [container('old', 'absent', REMOVED('old')), container('blog', 'running', T('blog runs on port 8080', 'blog работает на порту 8080', 'blog працює на порту 8080', 'blog działa na porcie 8080'), port=8080)],
             T('Read the error, remove old (rm -f), then run blog again.', 'Прочитайте ошибку, удалите old (rm -f), затем снова запустите blog.', 'Прочитайте помилку, видаліть old (rm -f), потім знову запустіть blog.', 'Przeczytaj błąd, usuń old (rm -f), potem uruchom blog ponownie.'), 'docker rm -f',
             ['docker rm -f old', 'docker rm -f blog', 'docker run -d --name blog -p 8080:80 nginx'], prepare=['docker run -d --name old -p 8080:80 nginx'], prefill='docker run -d --name blog -p 8080:80 nginx', fix=True),
    ]),
]

module('18-docker-basics.json', 'docker-basics', '/docker/basics', 'docker',
       T('First containers', 'Первые контейнеры', 'Перші контейнери', 'Pierwsze kontenery'),
       T('Images, containers, the life cycle and ports', 'Образы, контейнеры, жизненный цикл и порты', 'Образи, контейнери, життєвий цикл і порти', 'Obrazy, kontenery, cykl życia i porty'), basics)

# ------------------------------------------------------------------ module 2: operations

ops = [
    lesson('dk-logs', T('Logs and exit codes', 'Логи и коды выхода', 'Логи й коди виходу', 'Logi i kody wyjścia'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## What did the container say?
Everything the main process prints goes to the container **log**:
```
$ docker logs web
$ docker logs --tail 5 web
$ docker logs -f web
```
`--tail N` — only the last lines, `-f` — keep following (Ctrl+C to stop).

## Why did it stop?
`docker ps -a` shows the **exit code** of stopped containers:
| status | meaning |
|---|---|
| `Exited (0)` | finished normally |
| `Exited (1)` | the app reported an error — read `docker logs` |
| `Exited (137)` | killed by SIGKILL (128 + 9): `docker kill` or **out of memory** |
| `Exited (143)` | stopped by SIGTERM (128 + 15): a normal `docker stop` |

> The first two commands of any container incident: `docker ps -a` and `docker logs NAME`.""",
"""## Что сказал контейнер?
Всё, что печатает главный процесс, попадает в **лог** контейнера:
```
$ docker logs web
$ docker logs --tail 5 web
$ docker logs -f web
```
`--tail N` — только последние строки, `-f` — следить дальше (Ctrl+C — выйти).

## Почему он остановился?
`docker ps -a` показывает **код выхода** остановленных контейнеров:
| статус | значение |
|---|---|
| `Exited (0)` | завершился нормально |
| `Exited (1)` | приложение сообщило об ошибке — читайте `docker logs` |
| `Exited (137)` | убит SIGKILL (128 + 9): `docker kill` или **нехватка памяти** |
| `Exited (143)` | остановлен SIGTERM (128 + 15): обычный `docker stop` |

> Первые две команды при любом инциденте с контейнером: `docker ps -a` и `docker logs ИМЯ`.""",
"""## Що сказав контейнер?
Усе, що друкує головний процес, потрапляє в **лог** контейнера:
```
$ docker logs web
$ docker logs --tail 5 web
$ docker logs -f web
```
`--tail N` — лише останні рядки, `-f` — стежити далі (Ctrl+C — вийти).

## Чому він зупинився?
`docker ps -a` показує **код виходу** зупинених контейнерів:
| статус | значення |
|---|---|
| `Exited (0)` | завершився нормально |
| `Exited (1)` | застосунок повідомив про помилку — читайте `docker logs` |
| `Exited (137)` | убитий SIGKILL (128 + 9): `docker kill` або **брак пам’яті** |
| `Exited (143)` | зупинений SIGTERM (128 + 15): звичайний `docker stop` |

> Перші дві команди під час будь-якого інциденту з контейнером: `docker ps -a` і `docker logs ІМ’Я`.""",
"""## Co powiedział kontener?
Wszystko, co wypisuje główny proces, trafia do **logu** kontenera:
```
$ docker logs web
$ docker logs --tail 5 web
$ docker logs -f web
```
`--tail N` — tylko ostatnie wiersze, `-f` — śledź dalej (Ctrl+C — wyjście).

## Dlaczego się zatrzymał?
`docker ps -a` pokazuje **kod wyjścia** zatrzymanych kontenerów:
| status | znaczenie |
|---|---|
| `Exited (0)` | zakończył się normalnie |
| `Exited (1)` | aplikacja zgłosiła błąd — czytaj `docker logs` |
| `Exited (137)` | zabity przez SIGKILL (128 + 9): `docker kill` lub **brak pamięci** |
| `Exited (143)` | zatrzymany przez SIGTERM (128 + 15): zwykłe `docker stop` |

> Pierwsze dwa polecenia przy każdym incydencie z kontenerem: `docker ps -a` i `docker logs NAZWA`."""),
            title=T('docker logs', 'docker logs', 'docker logs', 'docker logs'), demo=['docker ps -a', 'docker logs --tail 3 web']),
        task(T('The db container is not running. Find out why from its log.', 'Контейнер db не работает. Узнайте причину из его лога.', 'Контейнер db не працює. З’ясуйте причину з його логу.', 'Kontener db nie działa. Sprawdź przyczynę w jego logu.'),
             [used('docker', T('Read the logs of db', 'Прочитан лог db', 'Прочитано лог db', 'Przeczytano log db'), args=['logs', 'db']), out(T('The cause is in the output', 'Причина видна в выводе', 'Причина видна у виводі', 'Przyczyna jest w wyjściu'), text='POSTGRES_PASSWORD')],
             T('docker logs NAME', 'docker logs ИМЯ', 'docker logs ІМ’Я', 'docker logs NAZWA'), 'docker logs', ['docker logs db']),
        quiz(T('A container shows `Exited (137)` and its log ends abruptly. What is the most likely cause?', 'Контейнер в статусе `Exited (137)`, а лог обрывается на полуслове. Самая вероятная причина?', 'Контейнер у статусі `Exited (137)`, а лог обривається на півслові. Найімовірніша причина?', 'Kontener ma `Exited (137)`, a log urywa się w pół słowa. Najbardziej prawdopodobna przyczyna?'),
             [T('It was killed with SIGKILL — often by the out-of-memory killer', 'Его убили SIGKILL — часто это OOM-killer из-за нехватки памяти', 'Його вбили SIGKILL — часто це OOM-killer через брак пам’яті', 'Został zabity SIGKILL — często przez OOM killer z powodu braku pamięci'),
              T('The application finished successfully', 'Приложение успешно завершило работу', 'Застосунок успішно завершив роботу', 'Aplikacja zakończyła się sukcesem'),
              T('The image was not found', 'Образ не найден', 'Образ не знайдено', 'Nie znaleziono obrazu')], 0),
        task(T('Show only the last 2 lines of the web container log.', 'Покажите только 2 последние строки лога контейнера web.', 'Покажіть лише 2 останні рядки логу контейнера web.', 'Pokaż tylko 2 ostatnie wiersze logu kontenera web.'),
             [used('docker', T('docker logs --tail', 'docker logs --tail', 'docker logs --tail', 'docker logs --tail'), args=['logs', 'web']), lines(T('Exactly 2 lines', 'Ровно 2 строки', 'Рівно 2 рядки', 'Dokładnie 2 wiersze'), eq=2)],
             T('--tail N', '--tail N', '--tail N', '--tail N'), 'docker logs --tail', ['docker logs --tail 2 web']),
    ]),

    lesson('dk-exec', T('Inside a container', 'Внутри контейнера', 'Усередині контейнера', 'Wewnątrz kontenera'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## docker exec
Run a command **inside a running** container:
```
$ docker exec web cat /etc/nginx/nginx.conf
$ docker exec web ls /usr/share/nginx/html
$ docker exec web nginx -t
```
`docker exec -it web sh` opens an interactive shell inside (in the trainer, run single commands instead).

## The container has its own file system
`/etc/nginx/nginx.conf` above is the file **in the container**, not on your host. `cat /etc/nginx/nginx.conf` on the host would say "No such file".

## The output is yours
The output of `docker exec` comes to your terminal, so pipes work as usual:
```
$ docker exec web cat /etc/nginx/nginx.conf | grep worker
```
> `exec` only works with a running container. A stopped one: `start` it first, or read its `logs`.""",
"""## docker exec
Выполнить команду **внутри работающего** контейнера:
```
$ docker exec web cat /etc/nginx/nginx.conf
$ docker exec web ls /usr/share/nginx/html
$ docker exec web nginx -t
```
`docker exec -it web sh` открывает интерактивную оболочку внутри (в тренажёре запускайте отдельные команды).

## У контейнера своя файловая система
`/etc/nginx/nginx.conf` выше — файл **в контейнере**, а не на хосте. `cat /etc/nginx/nginx.conf` на хосте скажет «No such file».

## Вывод — ваш
Вывод `docker exec` приходит в ваш терминал, поэтому конвейеры работают как обычно:
```
$ docker exec web cat /etc/nginx/nginx.conf | grep worker
```
> `exec` работает только с запущенным контейнером. Остановленный — сначала `start` или читайте `logs`.""",
"""## docker exec
Виконати команду **всередині запущеного** контейнера:
```
$ docker exec web cat /etc/nginx/nginx.conf
$ docker exec web ls /usr/share/nginx/html
$ docker exec web nginx -t
```
`docker exec -it web sh` відкриває інтерактивну оболонку всередині (у тренажері запускайте окремі команди).

## У контейнера своя файлова система
`/etc/nginx/nginx.conf` вище — файл **у контейнері**, а не на хості. `cat /etc/nginx/nginx.conf` на хості скаже «No such file».

## Вивід — ваш
Вивід `docker exec` приходить у ваш термінал, тому конвеєри працюють як завжди:
```
$ docker exec web cat /etc/nginx/nginx.conf | grep worker
```
> `exec` працює лише із запущеним контейнером. Зупинений — спочатку `start` або читайте `logs`.""",
"""## docker exec
Wykonaj polecenie **wewnątrz działającego** kontenera:
```
$ docker exec web cat /etc/nginx/nginx.conf
$ docker exec web ls /usr/share/nginx/html
$ docker exec web nginx -t
```
`docker exec -it web sh` otwiera interaktywną powłokę w środku (w trenażerze uruchamiaj pojedyncze polecenia).

## Kontener ma własny system plików
`/etc/nginx/nginx.conf` powyżej to plik **w kontenerze**, nie na hoście. `cat /etc/nginx/nginx.conf` na hoście powie „No such file”.

## Wyjście jest Twoje
Wyjście `docker exec` trafia do Twojego terminala, więc potoki działają jak zwykle:
```
$ docker exec web cat /etc/nginx/nginx.conf | grep worker
```
> `exec` działa tylko z działającym kontenerem. Zatrzymany — najpierw `start` albo czytaj `logs`."""),
            title=T('docker exec', 'docker exec', 'docker exec', 'docker exec'), demo=['docker exec web ls /usr/share/nginx/html', 'docker exec web nginx -t']),
        predict('docker exec web ls /usr/share/nginx/html', ['50x.html\nindex.html', 'index.html', "ls: cannot access '/usr/share/nginx/html': No such file or directory"], 0,
                T('The command runs inside the nginx container, where the default site lives.', 'Команда выполняется внутри контейнера nginx, где лежит сайт по умолчанию.', 'Команда виконується всередині контейнера nginx, де лежить сайт за замовчуванням.', 'Polecenie działa w kontenerze nginx, gdzie leży domyślna strona.'), context=['docker ps']),
        task(T('Find the worker_processes line in the nginx config inside the web container.', 'Найдите строку worker_processes в конфиге nginx внутри контейнера web.', 'Знайдіть рядок worker_processes у конфігу nginx усередині контейнера web.', 'Znajdź wiersz worker_processes w konfiguracji nginx w kontenerze web.'),
             [used('docker', T('docker exec', 'docker exec', 'docker exec', 'docker exec'), args=['exec', 'web']), out(T('The line is in the output', 'Строка в выводе', 'Рядок у виводі', 'Wiersz jest w wyjściu'), regex='worker_processes\\s+auto'), lines(T('Only that line', 'Только эта строка', 'Лише цей рядок', 'Tylko ten wiersz'), eq=1)],
             T('exec … cat the config, pipe to grep', 'exec … cat конфига, конвейер в grep', 'exec … cat конфігу, конвеєр у grep', 'exec … cat konfiguracji, potok do grep'), 'docker exec web cat', ['docker exec web cat /etc/nginx/nginx.conf | grep worker_processes']),
        task(T('Check the nginx configuration syntax inside web.', 'Проверьте синтаксис конфигурации nginx внутри web.', 'Перевірте синтаксис конфігурації nginx усередині web.', 'Sprawdź składnię konfiguracji nginx w web.'),
             [out(T('syntax is ok', 'syntax is ok', 'syntax is ok', 'syntax is ok'), text='syntax is ok')],
             T('nginx has a test flag: -t', 'У nginx есть флаг проверки: -t', 'У nginx є прапорець перевірки: -t', 'nginx ma flagę testu: -t'), 'docker exec web nginx', ['docker exec web nginx -t']),
    ]),

    lesson('dk-env-volumes', T('Variables and volumes', 'Переменные и тома', 'Змінні й томи', 'Zmienne i wolumeny'), ['docker', 'curl'], setup='docker-lab', steps=[
        theory(T(
"""## Configure with -e
Images read settings from **environment variables**:
```
$ docker run -d --name db2 -e POSTGRES_PASSWORD=secret postgres:16
```
The postgres image refuses to start without `POSTGRES_PASSWORD` — exactly what happened to `db`.

## Data does not live in the container
`docker rm` deletes the container **with all files written inside it**. Keep data outside:
| kind | syntax | when |
|---|---|---|
| bind mount | `-v ~/site:/usr/share/nginx/html` | your files from the host (code, configs) |
| named volume | `-v pgdata:/var/lib/postgresql/data` | data Docker manages (databases) |

```
$ docker run -d -p 8081:80 -v ~/site:/usr/share/nginx/html nginx
$ curl localhost:8081
```
With a bind mount the container sees the host folder **live**: edit `~/site/index.html` and the next `curl` shows the change.

> Never store a database inside a container without a volume: the next `rm` — and the data is gone.""",
"""## Настройка через -e
Образы читают настройки из **переменных окружения**:
```
$ docker run -d --name db2 -e POSTGRES_PASSWORD=secret postgres:16
```
Образ postgres отказывается стартовать без `POSTGRES_PASSWORD` — именно это случилось с `db`.

## Данные не живут в контейнере
`docker rm` удаляет контейнер **вместе со всеми файлами, записанными внутри**. Храните данные снаружи:
| вид | синтаксис | когда |
|---|---|---|
| bind mount | `-v ~/site:/usr/share/nginx/html` | ваши файлы с хоста (код, конфиги) |
| именованный том | `-v pgdata:/var/lib/postgresql/data` | данные, которыми управляет Docker (базы) |

```
$ docker run -d -p 8081:80 -v ~/site:/usr/share/nginx/html nginx
$ curl localhost:8081
```
С bind mount контейнер видит папку хоста **вживую**: поменяйте `~/site/index.html` — следующий `curl` покажет изменения.

> Никогда не храните базу в контейнере без тома: следующий `rm` — и данных нет.""",
"""## Налаштування через -e
Образи читають налаштування зі **змінних оточення**:
```
$ docker run -d --name db2 -e POSTGRES_PASSWORD=secret postgres:16
```
Образ postgres відмовляється стартувати без `POSTGRES_PASSWORD` — саме це сталося з `db`.

## Дані не живуть у контейнері
`docker rm` видаляє контейнер **разом з усіма файлами, записаними всередині**. Зберігайте дані назовні:
| вид | синтаксис | коли |
|---|---|---|
| bind mount | `-v ~/site:/usr/share/nginx/html` | ваші файли з хоста (код, конфіги) |
| іменований том | `-v pgdata:/var/lib/postgresql/data` | дані, якими керує Docker (бази) |

```
$ docker run -d -p 8081:80 -v ~/site:/usr/share/nginx/html nginx
$ curl localhost:8081
```
З bind mount контейнер бачить теку хоста **наживо**: змініть `~/site/index.html` — наступний `curl` покаже зміни.

> Ніколи не зберігайте базу в контейнері без тому: наступний `rm` — і даних немає.""",
"""## Konfiguracja przez -e
Obrazy czytają ustawienia ze **zmiennych środowiska**:
```
$ docker run -d --name db2 -e POSTGRES_PASSWORD=secret postgres:16
```
Obraz postgres nie wystartuje bez `POSTGRES_PASSWORD` — dokładnie to stało się z `db`.

## Dane nie mieszkają w kontenerze
`docker rm` usuwa kontener **razem ze wszystkimi plikami zapisanymi w środku**. Trzymaj dane na zewnątrz:
| rodzaj | składnia | kiedy |
|---|---|---|
| bind mount | `-v ~/site:/usr/share/nginx/html` | Twoje pliki z hosta (kod, konfiguracje) |
| nazwany wolumen | `-v pgdata:/var/lib/postgresql/data` | dane zarządzane przez Dockera (bazy) |

```
$ docker run -d -p 8081:80 -v ~/site:/usr/share/nginx/html nginx
$ curl localhost:8081
```
Z bind mount kontener widzi katalog hosta **na żywo**: zmień `~/site/index.html`, a następny `curl` pokaże zmiany.

> Nigdy nie trzymaj bazy w kontenerze bez wolumenu: następne `rm` — i danych nie ma."""),
            title=T('-e and -v', '-e и -v', '-e і -v', '-e i -v')),
        task(T('Start a working postgres:16 container named db2 (the password is up to you).', 'Запустите рабочий контейнер postgres:16 с именем db2 (пароль — на ваш выбор).', 'Запустіть робочий контейнер postgres:16 з іменем db2 (пароль — на ваш вибір).', 'Uruchom działający kontener postgres:16 o nazwie db2 (hasło dowolne).'),
             [container('db2', 'running', RUNNING('db2'), image='postgres:16')],
             T('-e POSTGRES_PASSWORD=…', '-e POSTGRES_PASSWORD=…', '-e POSTGRES_PASSWORD=…', '-e POSTGRES_PASSWORD=…'), 'docker run -d', ['docker run -d --name db2 -e POSTGRES_PASSWORD=secret postgres:16']),
        task(T('Serve the folder ~/site with nginx at http://localhost:8081 (a container named mysite) and check it with curl.', 'Раздайте папку ~/site через nginx на http://localhost:8081 (контейнер mysite) и проверьте curl.', 'Роздайте теку ~/site через nginx на http://localhost:8081 (контейнер mysite) і перевірте curl.', 'Udostępnij katalog ~/site przez nginx pod http://localhost:8081 (kontener mysite) i sprawdź curl.'),
             [container('mysite', 'running', T('mysite runs on 8081', 'mysite работает на 8081', 'mysite працює на 8081', 'mysite działa na 8081'), port=8081), out(T('curl shows your page', 'curl показывает вашу страницу', 'curl показує вашу сторінку', 'curl pokazuje Twoją stronę'), text='Hello from my site')],
             T('-p 8081:80 -v ~/site:/usr/share/nginx/html', '-p 8081:80 -v ~/site:/usr/share/nginx/html', '-p 8081:80 -v ~/site:/usr/share/nginx/html', '-p 8081:80 -v ~/site:/usr/share/nginx/html'), 'docker run -d',
             ['docker run -d --name mysite -p 8081:80 -v ~/site:/usr/share/nginx/html nginx', 'curl localhost:8081']),
        quiz(T('You ran postgres without a volume and later did `docker rm -f db`. What happened to the database data?', 'Вы запустили postgres без тома, а потом сделали `docker rm -f db`. Что стало с данными базы?', 'Ви запустили postgres без тому, а потім зробили `docker rm -f db`. Що сталося з даними бази?', 'Uruchomiłeś postgres bez wolumenu, a potem `docker rm -f db`. Co się stało z danymi bazy?'),
             [T('They were deleted together with the container', 'Удалены вместе с контейнером', 'Видалені разом із контейнером', 'Zostały usunięte razem z kontenerem'), T('They stay in the image', 'Остались в образе', 'Залишилися в образі', 'Zostały w obrazie'), T('Docker moved them to ~/', 'Docker перенёс их в ~/', 'Docker переніс їх у ~/', 'Docker przeniósł je do ~/')], 0),
    ]),

    lesson('dk-cleanup', T('Cleaning up', 'Уборка', 'Прибирання', 'Sprzątanie'), ['docker'], setup='docker-lab', steps=[
        theory(T(
"""## Containers and images pile up
Every `docker run` without `--rm` leaves a container behind; every version you pull stays on disk.
```
$ docker ps -a
$ docker container prune -f
$ docker images
$ docker rmi alpine
$ docker system df
```
| command | removes |
|---|---|
| `docker rm NAME` | one stopped container |
| `docker container prune` | **all** stopped containers |
| `docker rmi IMAGE` | an image (not used by any container) |
| `docker image prune` | dangling `<none>` images |
| `docker run --rm …` | the container right after it exits |

> `docker rmi` refuses to delete an image a container uses — even a stopped one. Remove the container first.""",
"""## Контейнеры и образы копятся
Каждый `docker run` без `--rm` оставляет контейнер; каждая скачанная версия остаётся на диске.
```
$ docker ps -a
$ docker container prune -f
$ docker images
$ docker rmi alpine
$ docker system df
```
| команда | что удаляет |
|---|---|
| `docker rm ИМЯ` | один остановленный контейнер |
| `docker container prune` | **все** остановленные контейнеры |
| `docker rmi ОБРАЗ` | образ (не используемый контейнерами) |
| `docker image prune` | «висящие» образы `<none>` |
| `docker run --rm …` | контейнер сразу после завершения |

> `docker rmi` отказывается удалять образ, который использует контейнер — даже остановленный. Сначала удалите контейнер.""",
"""## Контейнери й образи накопичуються
Кожен `docker run` без `--rm` залишає контейнер; кожна завантажена версія лишається на диску.
```
$ docker ps -a
$ docker container prune -f
$ docker images
$ docker rmi alpine
$ docker system df
```
| команда | що видаляє |
|---|---|
| `docker rm ІМ’Я` | один зупинений контейнер |
| `docker container prune` | **усі** зупинені контейнери |
| `docker rmi ОБРАЗ` | образ (що не використовується контейнерами) |
| `docker image prune` | «висячі» образи `<none>` |
| `docker run --rm …` | контейнер одразу після завершення |

> `docker rmi` відмовляється видаляти образ, який використовує контейнер — навіть зупинений. Спочатку видаліть контейнер.""",
"""## Kontenery i obrazy się gromadzą
Każde `docker run` bez `--rm` zostawia kontener; każda pobrana wersja zostaje na dysku.
```
$ docker ps -a
$ docker container prune -f
$ docker images
$ docker rmi alpine
$ docker system df
```
| polecenie | co usuwa |
|---|---|
| `docker rm NAZWA` | jeden zatrzymany kontener |
| `docker container prune` | **wszystkie** zatrzymane kontenery |
| `docker rmi OBRAZ` | obraz (nieużywany przez kontenery) |
| `docker image prune` | „wiszące” obrazy `<none>` |
| `docker run --rm …` | kontener zaraz po zakończeniu |

> `docker rmi` nie usunie obrazu używanego przez kontener — nawet zatrzymany. Najpierw usuń kontener."""),
            title=T('rm, rmi, prune', 'rm, rmi, prune', 'rm, rmi, prune', 'rm, rmi, prune')),
        task(T('Remove all stopped containers, keep the running ones.', 'Удалите все остановленные контейнеры, работающие оставьте.', 'Видаліть усі зупинені контейнери, запущені залиште.', 'Usuń wszystkie zatrzymane kontenery, działające zostaw.'),
             [container('db', 'absent', REMOVED('db')), container('web', 'running', RUNNING('web')), container('cache', 'running', RUNNING('cache'))],
             T('container prune, or rm of each stopped one', 'container prune или rm каждого остановленного', 'container prune або rm кожного зупиненого', 'container prune albo rm każdego zatrzymanego'), 'docker container prune', ['docker container prune -f']),
        task(T('Delete the alpine image — nobody uses it.', 'Удалите образ alpine — им никто не пользуется.', 'Видаліть образ alpine — ним ніхто не користується.', 'Usuń obraz alpine — nikt go nie używa.'),
             [image('alpine', T('No alpine image', 'Образа alpine нет', 'Образу alpine немає', 'Brak obrazu alpine'), exists=False)],
             T('docker rmi IMAGE', 'docker rmi ОБРАЗ', 'docker rmi ОБРАЗ', 'docker rmi OBRAZ'), 'docker rmi', ['docker rmi alpine']),
        quiz(T('`docker rmi nginx` fails with "image is being used by stopped container". What do you do?', '`docker rmi nginx` падает с «image is being used by stopped container». Что делать?', '`docker rmi nginx` падає з «image is being used by stopped container». Що робити?', '`docker rmi nginx` kończy się błędem „image is being used by stopped container”. Co robisz?'),
             [T('Remove that container first (docker rm), then the image', 'Сначала удалить этот контейнер (docker rm), потом образ', 'Спочатку видалити цей контейнер (docker rm), потім образ', 'Najpierw usuń ten kontener (docker rm), potem obraz'),
              T('Start the container', 'Запустить контейнер', 'Запустити контейнер', 'Uruchomić kontener'), T('Delete /var/lib/docker by hand', 'Удалить /var/lib/docker вручную', 'Видалити /var/lib/docker вручну', 'Usunąć ręcznie /var/lib/docker')], 0),
    ]),
]

module('19-docker-ops.json', 'docker-ops', '/docker/ops', 'activity',
       T('Living with containers', 'Жизнь контейнера', 'Життя контейнера', 'Życie kontenera'),
       T('Logs, exit codes, exec, variables, volumes and cleanup', 'Логи, коды выхода, exec, переменные, тома и уборка', 'Логи, коди виходу, exec, змінні, томи й прибирання', 'Logi, kody wyjścia, exec, zmienne, wolumeny i sprzątanie'), ops)

# ------------------------------------------------------------------ module 3: build and compose

BROKEN_APP = {**LAB, "cwd": "~/app", "files": {**LAB["files"], "~/app/Dockerfile": DOCKERFILE.replace('COPY index.html .', 'COPY index.htm .')}}
NO_GROUP = {"hostname": "dock01", "docker": {"group": False, "images": ["nginx:latest"]}}
DAEMON_OFF = {"hostname": "dock01", "docker": {"daemon": "inactive", "images": ["nginx:latest"]}}

build_lessons = [
    lesson('dk-dockerfile', T('Dockerfile', 'Dockerfile', 'Dockerfile', 'Dockerfile'), ['docker'], setup={**LAB, "cwd": "~/app"}, steps=[
        theory(T(
"""## Your own image
A **Dockerfile** is a recipe: start from a base image and add your files.
```
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY index.html .
EXPOSE 80
```
| instruction | meaning |
|---|---|
| `FROM` | the base image |
| `WORKDIR` | the working directory inside the image (`cd`) |
| `COPY src dst` | copy files from the **build context** into the image |
| `RUN cmd` | run a command while building (install packages) |
| `ENV K=V` | an environment variable |
| `EXPOSE 80` | document the port the app listens on |
| `CMD [...]` | the command a container starts with |

## Build and run
```
$ cat Dockerfile
$ docker build -t shop:2 .
$ docker images
$ docker run -d --name shop -p 8082:80 shop:2
```
The `.` at the end is the **build context**: the folder whose files `COPY` can see.

> Each instruction is a **layer**. Unchanged layers are taken from the cache, so put rarely changing steps (installing packages) before frequently changing ones (copying your code).""",
"""## Свой образ
**Dockerfile** — это рецепт: взять базовый образ и добавить свои файлы.
```
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY index.html .
EXPOSE 80
```
| инструкция | значение |
|---|---|
| `FROM` | базовый образ |
| `WORKDIR` | рабочая директория внутри образа (`cd`) |
| `COPY src dst` | скопировать файлы из **контекста сборки** в образ |
| `RUN cmd` | выполнить команду при сборке (установка пакетов) |
| `ENV K=V` | переменная окружения |
| `EXPOSE 80` | указать порт, который слушает приложение |
| `CMD [...]` | команда, с которой стартует контейнер |

## Собрать и запустить
```
$ cat Dockerfile
$ docker build -t shop:2 .
$ docker images
$ docker run -d --name shop -p 8082:80 shop:2
```
Точка в конце — **контекст сборки**: папка, файлы которой видит `COPY`.

> Каждая инструкция — это **слой**. Неизменённые слои берутся из кэша, поэтому редко меняющиеся шаги (установка пакетов) ставьте раньше часто меняющихся (копирование кода).""",
"""## Свій образ
**Dockerfile** — це рецепт: узяти базовий образ і додати свої файли.
```
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY index.html .
EXPOSE 80
```
| інструкція | значення |
|---|---|
| `FROM` | базовий образ |
| `WORKDIR` | робоча директорія всередині образу (`cd`) |
| `COPY src dst` | скопіювати файли з **контексту збирання** в образ |
| `RUN cmd` | виконати команду під час збирання (встановлення пакетів) |
| `ENV K=V` | змінна оточення |
| `EXPOSE 80` | вказати порт, який слухає застосунок |
| `CMD [...]` | команда, з якою стартує контейнер |

## Зібрати й запустити
```
$ cat Dockerfile
$ docker build -t shop:2 .
$ docker images
$ docker run -d --name shop -p 8082:80 shop:2
```
Крапка в кінці — **контекст збирання**: тека, файли якої бачить `COPY`.

> Кожна інструкція — це **шар**. Незмінені шари беруться з кешу, тому рідко змінювані кроки (встановлення пакетів) ставте раніше за часто змінювані (копіювання коду).""",
"""## Własny obraz
**Dockerfile** to przepis: weź obraz bazowy i dodaj swoje pliki.
```
FROM nginx:alpine
WORKDIR /usr/share/nginx/html
COPY index.html .
EXPOSE 80
```
| instrukcja | znaczenie |
|---|---|
| `FROM` | obraz bazowy |
| `WORKDIR` | katalog roboczy w obrazie (`cd`) |
| `COPY src dst` | skopiuj pliki z **kontekstu budowania** do obrazu |
| `RUN cmd` | wykonaj polecenie podczas budowania (instalacja pakietów) |
| `ENV K=V` | zmienna środowiska |
| `EXPOSE 80` | zadeklaruj port, na którym słucha aplikacja |
| `CMD [...]` | polecenie, od którego startuje kontener |

## Zbuduj i uruchom
```
$ cat Dockerfile
$ docker build -t shop:2 .
$ docker images
$ docker run -d --name shop -p 8082:80 shop:2
```
Kropka na końcu to **kontekst budowania**: katalog, którego pliki widzi `COPY`.

> Każda instrukcja to **warstwa**. Niezmienione warstwy pochodzą z cache, więc rzadko zmieniane kroki (instalacja pakietów) dawaj przed często zmienianymi (kopiowanie kodu)."""),
            title=T('FROM, COPY, CMD', 'FROM, COPY, CMD', 'FROM, COPY, CMD', 'FROM, COPY, CMD'), demo=['cat Dockerfile', 'docker build -t shop:2 .']),
        build(T('Build an image named shop with tag 2 from the current folder.', 'Соберите образ shop с тегом 2 из текущей папки.', 'Зберіть образ shop з тегом 2 з поточної теки.', 'Zbuduj obraz shop z tagiem 2 z bieżącego katalogu.'),
              ['docker', 'build', '-t', 'shop:2', '.'], ['run', '-p', '~'],
              T('-t gives the name:tag, "." is the build context.', '-t задаёт имя:тег, «.» — контекст сборки.', '-t задає ім’я:тег, «.» — контекст збирання.', '-t nadaje nazwę:tag, „.” to kontekst budowania.')),
        task(T('In ~/app build the image shop:2 and run it as container shop on http://localhost:8082. Check with curl.', 'В ~/app соберите образ shop:2 и запустите его контейнером shop на http://localhost:8082. Проверьте curl.', 'У ~/app зберіть образ shop:2 і запустіть його контейнером shop на http://localhost:8082. Перевірте curl.', 'W ~/app zbuduj obraz shop:2 i uruchom go jako kontener shop pod http://localhost:8082. Sprawdź curl.'),
             [image('shop:2', T('Image shop:2 exists', 'Образ shop:2 есть', 'Образ shop:2 є', 'Obraz shop:2 istnieje')), container('shop', 'running', T('shop runs on 8082', 'shop работает на 8082', 'shop працює на 8082', 'shop działa na 8082'), port=8082), out(T('Your page is served', 'Отдаётся ваша страница', 'Віддається ваша сторінка', 'Serwowana jest Twoja strona'), text='Shop v2')],
             T('build -t shop:2 . → run -d -p 8082:80 → curl', 'build -t shop:2 . → run -d -p 8082:80 → curl', 'build -t shop:2 . → run -d -p 8082:80 → curl', 'build -t shop:2 . → run -d -p 8082:80 → curl'), 'docker build -t',
             ['docker build -t shop:2 .', 'docker run -d --name shop -p 8082:80 shop:2', 'curl localhost:8082']),
    ]),

    lesson('dk-fix-build', T('When the build fails', 'Когда сборка падает', 'Коли збирання падає', 'Gdy budowanie się nie udaje'), ['docker', 'sed'], setup=BROKEN_APP, steps=[
        theory(T(
"""## Read the error from the end
```
ERROR: failed to solve: failed to compute cache key: … "/index.htm": not found
```
BuildKit says *which step* failed and *why*. "not found" in a `COPY` means: there is no such file **in the build context** — a typo, a wrong folder, or the file is excluded by `.dockerignore`.

## Typical build errors
| message | cause |
|---|---|
| `"/x": not found` | `COPY` of a missing file |
| `pull access denied` / `not found` in `FROM` | a typo in the base image |
| `unknown instruction` | a typo in the instruction (`COPPY`) |
| `failed to read dockerfile` | no `Dockerfile` in the folder |

> Fix the Dockerfile (nano or sed), then run the same `docker build` again — the unchanged steps come from cache.""",
"""## Читайте ошибку с конца
```
ERROR: failed to solve: failed to compute cache key: … "/index.htm": not found
```
BuildKit говорит, *какой шаг* упал и *почему*. «not found» в `COPY` значит: такого файла нет **в контексте сборки** — опечатка, не та папка или файл исключён `.dockerignore`.

## Типовые ошибки сборки
| сообщение | причина |
|---|---|
| `"/x": not found` | `COPY` несуществующего файла |
| `pull access denied` / `not found` во `FROM` | опечатка в базовом образе |
| `unknown instruction` | опечатка в инструкции (`COPPY`) |
| `failed to read dockerfile` | в папке нет `Dockerfile` |

> Исправьте Dockerfile (nano или sed) и запустите тот же `docker build` снова — неизменённые шаги возьмутся из кэша.""",
"""## Читайте помилку з кінця
```
ERROR: failed to solve: failed to compute cache key: … "/index.htm": not found
```
BuildKit каже, *який крок* упав і *чому*. «not found» у `COPY` означає: такого файлу немає **в контексті збирання** — одруківка, не та тека або файл виключено `.dockerignore`.

## Типові помилки збирання
| повідомлення | причина |
|---|---|
| `"/x": not found` | `COPY` неіснуючого файлу |
| `pull access denied` / `not found` у `FROM` | одруківка в базовому образі |
| `unknown instruction` | одруківка в інструкції (`COPPY`) |
| `failed to read dockerfile` | у теці немає `Dockerfile` |

> Виправте Dockerfile (nano або sed) і запустіть той самий `docker build` знову — незмінені кроки візьмуться з кешу.""",
"""## Czytaj błąd od końca
```
ERROR: failed to solve: failed to compute cache key: … "/index.htm": not found
```
BuildKit mówi, *który krok* się nie udał i *dlaczego*. „not found” w `COPY` oznacza: nie ma takiego pliku **w kontekście budowania** — literówka, zły katalog albo plik wykluczony przez `.dockerignore`.

## Typowe błędy budowania
| komunikat | przyczyna |
|---|---|
| `"/x": not found` | `COPY` nieistniejącego pliku |
| `pull access denied` / `not found` w `FROM` | literówka w obrazie bazowym |
| `unknown instruction` | literówka w instrukcji (`COPPY`) |
| `failed to read dockerfile` | brak `Dockerfile` w katalogu |

> Popraw Dockerfile (nano lub sed) i uruchom to samo `docker build` ponownie — niezmienione kroki wezmą się z cache."""),
            title=T('Build errors', 'Ошибки сборки', 'Помилки збирання', 'Błędy budowania')),
        task(T('The build of shop:3 fails. Find the mistake in ~/app/Dockerfile, fix it and build shop:3.', 'Сборка shop:3 падает. Найдите ошибку в ~/app/Dockerfile, исправьте и соберите shop:3.', 'Збирання shop:3 падає. Знайдіть помилку в ~/app/Dockerfile, виправте й зберіть shop:3.', 'Budowanie shop:3 się nie udaje. Znajdź błąd w ~/app/Dockerfile, popraw go i zbuduj shop:3.'),
             [fcontains('~/app/Dockerfile', T('COPY copies index.html', 'COPY копирует index.html', 'COPY копіює index.html', 'COPY kopiuje index.html'), regex='COPY index\\.html '), image('shop:3', T('Image shop:3 exists', 'Образ shop:3 есть', 'Образ shop:3 є', 'Obraz shop:3 istnieje'))],
             T('ls shows the real file name; sed -i "s/index.htm /index.html /" Dockerfile', 'ls покажет настоящее имя файла; sed -i "s/index.htm /index.html /" Dockerfile', 'ls покаже справжнє ім’я файлу; sed -i "s/index.htm /index.html /" Dockerfile', 'ls pokaże prawdziwą nazwę pliku; sed -i "s/index.htm /index.html /" Dockerfile'), 'sed -i',
             ['sed -i "s/index.htm /index.html /" Dockerfile', 'docker build -t shop:3 .'], prefill='docker build -t shop:3 .', fix=True),
        quiz(T('`docker build -t app .` says `"/requirements.txt": not found`, but the file is in ~/project/. You ran the command in ~/project/docker/. Why?', '`docker build -t app .` пишет `"/requirements.txt": not found`, а файл лежит в ~/project/. Команда запущена в ~/project/docker/. Почему?', '`docker build -t app .` пише `"/requirements.txt": not found`, а файл лежить у ~/project/. Команду запущено в ~/project/docker/. Чому?', '`docker build -t app .` zgłasza `"/requirements.txt": not found`, a plik jest w ~/project/. Uruchomiłeś polecenie w ~/project/docker/. Dlaczego?'),
             [T('The build context is "." = ~/project/docker; COPY cannot see files outside it', 'Контекст сборки «.» = ~/project/docker; COPY не видит файлы снаружи', 'Контекст збирання «.» = ~/project/docker; COPY не бачить файли ззовні', 'Kontekst budowania „.” = ~/project/docker; COPY nie widzi plików poza nim'),
              T('Docker cannot copy .txt files', 'Docker не умеет копировать .txt', 'Docker не вміє копіювати .txt', 'Docker nie umie kopiować plików .txt'),
              T('The file must be named Dockerfile', 'Файл должен называться Dockerfile', 'Файл має називатися Dockerfile', 'Plik musi się nazywać Dockerfile')], 0),
    ]),

    lesson('dk-compose', T('Docker Compose', 'Docker Compose', 'Docker Compose', 'Docker Compose'), ['docker'], setup={**LAB, "cwd": "~/shop"}, steps=[
        theory(T(
"""## Many containers — one file
A real app is several containers: web, cache, database. Instead of long `docker run` lines, describe them in **compose.yaml**:
```
services:
  web:
    image: nginx:alpine
    ports:
      - "8090:80"
  cache:
    image: redis:7
```
## Commands (run them in the folder with the file)
```
$ cat compose.yaml
$ docker compose up -d
$ docker compose ps
$ docker compose logs web
$ docker compose down
```
- `up -d` — create and start everything in the background
- containers get names `<folder>-<service>-1`: `shop-web-1`, `shop-cache-1`
- all services share a network and reach each other **by service name** (`cache:6379`)
- `down` — stop and remove the containers and the network (volumes stay)

> compose.yaml goes to git next to the code: the whole environment is started with one command.""",
"""## Много контейнеров — один файл
Настоящее приложение — это несколько контейнеров: веб, кэш, база. Вместо длинных `docker run` опишите их в **compose.yaml**:
```
services:
  web:
    image: nginx:alpine
    ports:
      - "8090:80"
  cache:
    image: redis:7
```
## Команды (запускать в папке с файлом)
```
$ cat compose.yaml
$ docker compose up -d
$ docker compose ps
$ docker compose logs web
$ docker compose down
```
- `up -d` — создать и запустить всё в фоне
- контейнеры получают имена `<папка>-<сервис>-1`: `shop-web-1`, `shop-cache-1`
- все сервисы в общей сети и видят друг друга **по имени сервиса** (`cache:6379`)
- `down` — остановить и удалить контейнеры и сеть (тома остаются)

> compose.yaml кладут в git рядом с кодом: всё окружение поднимается одной командой.""",
"""## Багато контейнерів — один файл
Справжній застосунок — це кілька контейнерів: веб, кеш, база. Замість довгих `docker run` опишіть їх у **compose.yaml**:
```
services:
  web:
    image: nginx:alpine
    ports:
      - "8090:80"
  cache:
    image: redis:7
```
## Команди (запускати в теці з файлом)
```
$ cat compose.yaml
$ docker compose up -d
$ docker compose ps
$ docker compose logs web
$ docker compose down
```
- `up -d` — створити й запустити все у фоні
- контейнери отримують імена `<тека>-<сервіс>-1`: `shop-web-1`, `shop-cache-1`
- усі сервіси в спільній мережі й бачать одне одного **за іменем сервісу** (`cache:6379`)
- `down` — зупинити й видалити контейнери та мережу (томи залишаються)

> compose.yaml кладуть у git поруч із кодом: усе оточення піднімається однією командою.""",
"""## Wiele kontenerów — jeden plik
Prawdziwa aplikacja to kilka kontenerów: web, cache, baza. Zamiast długich `docker run` opisz je w **compose.yaml**:
```
services:
  web:
    image: nginx:alpine
    ports:
      - "8090:80"
  cache:
    image: redis:7
```
## Polecenia (uruchamiaj w katalogu z plikiem)
```
$ cat compose.yaml
$ docker compose up -d
$ docker compose ps
$ docker compose logs web
$ docker compose down
```
- `up -d` — utwórz i uruchom wszystko w tle
- kontenery dostają nazwy `<katalog>-<usługa>-1`: `shop-web-1`, `shop-cache-1`
- wszystkie usługi są we wspólnej sieci i widzą się **po nazwie usługi** (`cache:6379`)
- `down` — zatrzymaj i usuń kontenery oraz sieć (wolumeny zostają)

> compose.yaml trafia do gita obok kodu: całe środowisko startuje jednym poleceniem."""),
            title=T('compose.yaml', 'compose.yaml', 'compose.yaml', 'compose.yaml'), demo=['cat compose.yaml', 'docker compose up -d', 'docker compose ps']),
        task(T('Start everything described in ~/shop/compose.yaml in the background and open the site at http://localhost:8090.', 'Запустите в фоне всё, что описано в ~/shop/compose.yaml, и откройте сайт на http://localhost:8090.', 'Запустіть у фоні все, що описано в ~/shop/compose.yaml, і відкрийте сайт на http://localhost:8090.', 'Uruchom w tle wszystko z ~/shop/compose.yaml i otwórz stronę pod http://localhost:8090.'),
             [container('shop-web-1', 'running', RUNNING('shop-web-1')), container('shop-cache-1', 'running', RUNNING('shop-cache-1')), out(T('The site answers', 'Сайт отвечает', 'Сайт відповідає', 'Strona odpowiada'), text='Welcome to nginx')],
             T('docker compose up -d, then curl', 'docker compose up -d, затем curl', 'docker compose up -d, потім curl', 'docker compose up -d, potem curl'), 'docker compose up', ['docker compose up -d', 'curl localhost:8090']),
        task(T('Stop and remove the whole shop environment with one command.', 'Остановите и удалите всё окружение shop одной командой.', 'Зупиніть і видаліть усе оточення shop однією командою.', 'Zatrzymaj i usuń całe środowisko shop jednym poleceniem.'),
             [container('shop-web-1', 'absent', REMOVED('shop-web-1')), container('shop-cache-1', 'absent', REMOVED('shop-cache-1'))],
             T('The opposite of up', 'Противоположность up', 'Протилежність up', 'Przeciwieństwo up'), 'docker compose', ['docker compose down'], prepare=['docker compose up -d']),
    ]),

    lesson('dk-troubleshoot', T('Typical breakages', 'Типовые поломки', 'Типові поломки', 'Typowe awarie'), ['docker', 'systemctl', 'usermod'], setup=DAEMON_OFF, steps=[
        reading(T(
"""## Five errors you will see
| error | what to do |
|---|---|
| `Cannot connect to the Docker daemon … Is the docker daemon running?` | the `docker` service is stopped: `sudo systemctl start docker` |
| `permission denied while trying to connect to the Docker daemon socket` | your user is not in the `docker` group: `sudo usermod -aG docker $USER`, then log out and in |
| `port is already allocated` | the host port is taken: another `-p`, or stop the holder (`docker ps`, `ss -tlnp`) |
| `Conflict. The container name "/web" is already in use` | an old container keeps the name: `docker rm web` |
| `pull access denied … repository does not exist` | a typo in the image name (`ngnix`) |

## The docker daemon is a service
`dockerd` is an ordinary systemd service — everything from the NOC course applies:
```
$ systemctl status docker
$ sudo systemctl start docker
$ journalctl -u docker
```
> The `docker` group gives root-equivalent rights on the host (a container can mount `/`). Add only trusted users.""",
"""## Пять ошибок, которые вы увидите
| ошибка | что делать |
|---|---|
| `Cannot connect to the Docker daemon … Is the docker daemon running?` | сервис `docker` остановлен: `sudo systemctl start docker` |
| `permission denied while trying to connect to the Docker daemon socket` | вашего пользователя нет в группе `docker`: `sudo usermod -aG docker $USER`, затем перелогиниться |
| `port is already allocated` | порт хоста занят: другой `-p` или остановить того, кто держит (`docker ps`, `ss -tlnp`) |
| `Conflict. The container name "/web" is already in use` | имя держит старый контейнер: `docker rm web` |
| `pull access denied … repository does not exist` | опечатка в имени образа (`ngnix`) |

## Демон docker — это сервис
`dockerd` — обычный сервис systemd, всё из курса NOC применимо:
```
$ systemctl status docker
$ sudo systemctl start docker
$ journalctl -u docker
```
> Группа `docker` даёт права, равные root на хосте (контейнер может смонтировать `/`). Добавляйте только доверенных пользователей.""",
"""## П’ять помилок, які ви побачите
| помилка | що робити |
|---|---|
| `Cannot connect to the Docker daemon … Is the docker daemon running?` | сервіс `docker` зупинено: `sudo systemctl start docker` |
| `permission denied while trying to connect to the Docker daemon socket` | вашого користувача немає в групі `docker`: `sudo usermod -aG docker $USER`, потім перелогінитися |
| `port is already allocated` | порт хоста зайнятий: інший `-p` або зупинити того, хто тримає (`docker ps`, `ss -tlnp`) |
| `Conflict. The container name "/web" is already in use` | ім’я тримає старий контейнер: `docker rm web` |
| `pull access denied … repository does not exist` | одруківка в імені образу (`ngnix`) |

## Демон docker — це сервіс
`dockerd` — звичайний сервіс systemd, усе з курсу NOC застосовне:
```
$ systemctl status docker
$ sudo systemctl start docker
$ journalctl -u docker
```
> Група `docker` дає права, рівні root на хості (контейнер може змонтувати `/`). Додавайте лише довірених користувачів.""",
"""## Pięć błędów, które zobaczysz
| błąd | co zrobić |
|---|---|
| `Cannot connect to the Docker daemon … Is the docker daemon running?` | usługa `docker` jest zatrzymana: `sudo systemctl start docker` |
| `permission denied while trying to connect to the Docker daemon socket` | Twojego użytkownika nie ma w grupie `docker`: `sudo usermod -aG docker $USER`, potem wyloguj się i zaloguj |
| `port is already allocated` | port hosta zajęty: inny `-p` albo zatrzymaj to, co go trzyma (`docker ps`, `ss -tlnp`) |
| `Conflict. The container name "/web" is already in use` | nazwę trzyma stary kontener: `docker rm web` |
| `pull access denied … repository does not exist` | literówka w nazwie obrazu (`ngnix`) |

## Demon docker to usługa
`dockerd` to zwykła usługa systemd — wszystko z kursu NOC ma zastosowanie:
```
$ systemctl status docker
$ sudo systemctl start docker
$ journalctl -u docker
```
> Grupa `docker` daje uprawnienia równe rootowi na hoście (kontener może zamontować `/`). Dodawaj tylko zaufanych użytkowników."""),
            title=T('Read the message', 'Читайте сообщение', 'Читайте повідомлення', 'Czytaj komunikat')),
        task(T('`docker ps` cannot reach the daemon. Bring Docker back and make sure `docker ps` works.', '`docker ps` не может достучаться до демона. Верните Docker к жизни и убедитесь, что `docker ps` работает.', '`docker ps` не може достукатися до демона. Поверніть Docker до життя й переконайтеся, що `docker ps` працює.', '`docker ps` nie może połączyć się z demonem. Przywróć Dockera i upewnij się, że `docker ps` działa.'),
             [svc('docker', 'active', T('The docker service is active', 'Сервис docker активен', 'Сервіс docker активний', 'Usługa docker jest aktywna')), used('docker', T('docker ps succeeded', 'docker ps выполнен успешно', 'docker ps виконано успішно', 'docker ps zakończony sukcesem'), args=['ps'], success=True)],
             T('The daemon is a systemd service named docker.', 'Демон — это сервис systemd с именем docker.', 'Демон — це сервіс systemd з іменем docker.', 'Demon to usługa systemd o nazwie docker.'), 'sudo systemctl start', ['sudo systemctl start docker', 'docker ps'], prefill='docker ps'),
        task(T('docker says "permission denied … docker.sock". Add the user student to the docker group (keep the other groups).', 'docker пишет «permission denied … docker.sock». Добавьте пользователя student в группу docker (не теряя остальные группы).', 'docker пише «permission denied … docker.sock». Додайте користувача student до групи docker (не втрачаючи інших груп).', 'docker zgłasza „permission denied … docker.sock”. Dodaj użytkownika student do grupy docker (zachowując pozostałe grupy).'),
             [uexists('student', T('student is in the docker group', 'student в группе docker', 'student у групі docker', 'student jest w grupie docker'), group='docker'), uexists('student', T('student is still in sudo', 'student всё ещё в sudo', 'student досі в sudo', 'student nadal jest w sudo'), group='sudo')],
             T('usermod with -a (append) and -G', 'usermod с -a (добавить) и -G', 'usermod з -a (додати) і -G', 'usermod z -a (dopisz) i -G'), 'sudo usermod -aG', ['sudo usermod -aG docker student'], setup=NO_GROUP, prefill='docker ps'),
        quiz(T('`docker run -d --name api -p 80:80 myapi` → "port is already allocated", and `docker ps` shows no container on 80. What else can hold the port?', '`docker run -d --name api -p 80:80 myapi` → «port is already allocated», а `docker ps` не показывает контейнера на 80. Кто ещё может держать порт?', '`docker run -d --name api -p 80:80 myapi` → «port is already allocated», а `docker ps` не показує контейнера на 80. Хто ще може тримати порт?', '`docker run -d --name api -p 80:80 myapi` → „port is already allocated”, a `docker ps` nie pokazuje kontenera na 80. Co jeszcze może trzymać port?'),
             [T('A program on the host itself, e.g. a system nginx — check ss -tlnp', 'Программа на самом хосте, например системный nginx — проверьте ss -tlnp', 'Програма на самому хості, наприклад системний nginx — перевірте ss -tlnp', 'Program na samym hoście, np. systemowy nginx — sprawdź ss -tlnp'),
              T('Nothing: Docker is wrong, restart the computer', 'Никто: Docker ошибается, перезагрузите компьютер', 'Ніхто: Docker помиляється, перезавантажте комп’ютер', 'Nic: Docker się myli, zrestartuj komputer'),
              T('The image myapi itself', 'Сам образ myapi', 'Сам образ myapi', 'Sam obraz myapi')], 0),
    ]),
]

module('20-docker-build.json', 'docker-build', '/docker/build', 'code',
       T('Images and Compose', 'Свои образы и Compose', 'Свої образи й Compose', 'Własne obrazy i Compose'),
       T('Dockerfile, build errors, docker compose and typical breakages', 'Dockerfile, ошибки сборки, docker compose и типовые поломки', 'Dockerfile, помилки збирання, docker compose і типові поломки', 'Dockerfile, błędy budowania, docker compose i typowe awarie'), build_lessons)

# ------------------------------------------------------------------ mission

MISSION_SETUP = {
    "hostname": "dock01",
    "docker": {
        "images": ["nginx:latest", "postgres:16"],
        "containers": [
            {"name": "web", "image": "nginx", "ports": ["8080:80"], "state": "exited", "exitCode": 137, "age": 25, "logs": ["2026/10/31 11:58:02 [notice] 1#1: signal 9 (SIGKILL) received from kernel: Out of memory"]},
            {"name": "db", "image": "postgres:16", "state": "exited", "exitCode": 1, "age": 25},
        ],
    },
    "files": {"~/tickets/INC-4102.txt": "INC-4102  P1  Shop on dock01 is down: http://localhost:8080 refuses connections (11:58 UTC)\nThe database container must run too (any password, the app is not connected yet).\n"},
}

MISSION = {
    "id": "docker-shop-down", "course": "docker", "topics": ["dk-logs", "dk-env-volumes"],
    "title": T('Containers down', 'Контейнеры легли', 'Контейнери лягли', 'Kontenery padły'),
    "story": T('11:58 UTC, P1. After a memory spike on dock01 the shop is down. Read ~/tickets/INC-4102.txt, find out why each container stopped, bring web back on http://localhost:8080 and get the db container running.',
               '11:58 UTC, P1. После скачка памяти на dock01 магазин лежит. Прочитайте ~/tickets/INC-4102.txt, выясните, почему остановился каждый контейнер, верните web на http://localhost:8080 и запустите контейнер db.',
               '11:58 UTC, P1. Після стрибка пам’яті на dock01 магазин лежить. Прочитайте ~/tickets/INC-4102.txt, з’ясуйте, чому зупинився кожен контейнер, поверніть web на http://localhost:8080 і запустіть контейнер db.',
               '11:58 UTC, P1. Po skoku pamięci na dock01 sklep leży. Przeczytaj ~/tickets/INC-4102.txt, ustal, dlaczego zatrzymał się każdy kontener, przywróć web pod http://localhost:8080 i uruchom kontener db.'),
    "difficulty": 2, "requires": "docker-ops", "xp": 120, "setup": MISSION_SETUP,
    "checks": [
        container('web', 'running', T('web is running again', 'web снова работает', 'web знову працює', 'web znów działa'), port=8080),
        used('curl', T('Checked the site with curl', 'Сайт проверен curl', 'Сайт перевірено curl', 'Strona sprawdzona curl'), success=True),
        container('db', 'running', T('A working db container', 'Рабочий контейнер db', 'Робочий контейнер db', 'Działający kontener db'), image='postgres:16'),
    ],
    "hints": {"direction": T('docker ps -a and docker logs for both. web just needs a start; db needs to be recreated with POSTGRES_PASSWORD.', 'docker ps -a и docker logs для обоих. web достаточно запустить; db нужно пересоздать с POSTGRES_PASSWORD.', 'docker ps -a і docker logs для обох. web достатньо запустити; db треба перестворити з POSTGRES_PASSWORD.', 'docker ps -a i docker logs dla obu. web wystarczy uruchomić; db trzeba utworzyć ponownie z POSTGRES_PASSWORD.'), "command": "docker logs"},
    "solution": ['docker start web', 'curl localhost:8080', 'docker rm db', 'docker run -d --name db -e POSTGRES_PASSWORD=secret postgres:16'],
}

MP = os.path.join(ROOT, 'missions', 'missions.json')
from docker_prod import MISSIONS as PROD_MISSIONS
ms = [m for m in json.load(open(MP)) if m.get('course') != 'docker'] + [MISSION] + PROD_MISSIONS
with open(MP, 'w') as f:
    json.dump(ms, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('missions:', len(ms))
