from lib import *

S = 'noc-web01'
B = 'noc-busy'

lessons = [
    lesson('health-load', L('Load average and CPU cores', 'Load average и ядра процессора', 'Load average і ядра процесора'), ['uptime', 'nproc'], setup=B, steps=[
        theory(L(
            """## Three numbers in uptime
`load average: 7.82, 6.95, 4.10` — the average number of processes that were **running or waiting** for a CPU over the last **1, 5 and 15 minutes**.

## How to read them
- Compare with the number of cores: `nproc`
- load ≈ cores — the CPU is fully busy, but coping
- load **much higher** than cores — processes wait in line, everything becomes slow
- 1-minute value > 15-minute value — the load is **growing** right now

| cores | load 1.0 | load 4.0 | load 8.0 |
|---|---|---|---|
| 2 | fine | overloaded ×2 | overloaded ×4 |
| 8 | idle | half busy | fully busy |

> Load also grows when processes wait for a slow **disk**, not only for the CPU.""",
            """## Три числа в uptime
`load average: 7.82, 6.95, 4.10` — среднее число процессов, которые **работали или ждали** процессор за последние **1, 5 и 15 минут**.

## Как их читать
- Сравнивайте с числом ядер: `nproc`
- load ≈ числу ядер — процессор занят полностью, но справляется
- load **намного больше** ядер — процессы стоят в очереди, всё тормозит
- значение за 1 минуту больше, чем за 15 — нагрузка **растёт** прямо сейчас

| ядер | load 1.0 | load 4.0 | load 8.0 |
|---|---|---|---|
| 2 | нормально | перегрузка ×2 | перегрузка ×4 |
| 8 | простаивает | загружен наполовину | загружен полностью |

> Load растёт и когда процессы ждут медленный **диск**, а не только процессор.""",
            """## Три числа в uptime
`load average: 7.82, 6.95, 4.10` — середня кількість процесів, які **працювали або чекали** процесор за останні **1, 5 і 15 хвилин**.

## Як їх читати
- Порівнюйте з кількістю ядер: `nproc`
- load ≈ кількості ядер — процесор зайнятий повністю, але дає раду
- load **значно більший** за ядра — процеси стоять у черзі, усе гальмує
- значення за 1 хвилину більше, ніж за 15 — навантаження **зростає** просто зараз

| ядер | load 1.0 | load 4.0 | load 8.0 |
|---|---|---|---|
| 2 | нормально | перевантаження ×2 | перевантаження ×4 |
| 8 | простоює | завантажений наполовину | завантажений повністю |

> Load зростає й тоді, коли процеси чекають повільний **диск**, а не лише процесор."""),
            title=L('Is the server overloaded?', 'Перегружен ли сервер?', 'Чи перевантажений сервер?'), demo=['uptime', 'nproc']),
        task(L('An alert says "web01 slow". Look at the load average.', 'Алерт: «web01 тормозит». Посмотрите на load average.', 'Алерт: «web01 гальмує». Подивіться на load average.'),
             [used('uptime', L('Check with uptime', 'Проверьте через uptime', 'Перевірте через uptime')), out(L('Load average is on the screen', 'Load average на экране', 'Load average на екрані'), text='load average')],
             L('The command prints time, uptime and load.', 'Команда печатает время, аптайм и нагрузку.', 'Команда друкує час, аптайм і навантаження.'), 'uptime', ['uptime']),
        task(L('How many CPU cores does web01 have? Print the number.', 'Сколько ядер процессора у web01? Выведите число.', 'Скільки ядер процесора у web01? Виведіть число.'),
             [used('nproc', L('Use nproc', 'Используйте nproc', 'Використайте nproc')), out(L('The answer is 2', 'Ответ — 2', 'Відповідь — 2'), regex='^2$')],
             L('n + proc = number of processors.', 'n + proc = число процессоров.', 'n + proc = кількість процесорів.'), 'nproc', ['nproc']),
        quiz(L('load average: 7.82, 6.95, 4.10 on 2 cores. What is going on?', 'load average: 7.82, 6.95, 4.10 при 2 ядрах. Что происходит?', 'load average: 7.82, 6.95, 4.10 на 2 ядрах. Що відбувається?'),
             [L('Heavy overload, and it has been growing for the last 15 minutes', 'Сильная перегрузка, и она растёт последние 15 минут', 'Сильне перевантаження, і воно зростає останні 15 хвилин'),
              L('The server is idle', 'Сервер простаивает', 'Сервер простоює'),
              L('The load is falling', 'Нагрузка падает', 'Навантаження падає')], 0,
             L('7.8 / 2 ≈ 4 processes per core. 1 min > 15 min means the load is rising.', '7,8 / 2 ≈ 4 процесса на ядро. 1 мин > 15 мин — нагрузка растёт.', '7,8 / 2 ≈ 4 процеси на ядро. 1 хв > 15 хв — навантаження зростає.')),
        quiz(L('Load 3.0 on a server with 16 cores is…', 'Load 3.0 на сервере с 16 ядрами — это…', 'Load 3.0 на сервері з 16 ядрами — це…'),
             [L('Light load, nothing to worry about', 'Лёгкая нагрузка, повода для тревоги нет', 'Легке навантаження, приводу хвилюватися немає'), L('Critical overload', 'Критическая перегрузка', 'Критичне перевантаження'), L('A broken disk', 'Сломанный диск', 'Зламаний диск')], 0),
    ]),

    lesson('health-memory', L('Memory and swap', 'Память и своп', 'Пам’ять і своп'), ['free'], setup=B, steps=[
        theory(L(
            """## free -h
```
$ free -h
```
| column | meaning |
|---|---|
| total | all RAM |
| used | taken by programs |
| buff/cache | disk cache — Linux gives it back on demand |
| **available** | what programs can still get — **look here** |

## Swap
When RAM is not enough, Linux moves memory pages to the disk (**swap**). Disk is ~1000× slower than RAM, so heavy swap usage = everything crawls.

## The OOM killer
If memory runs out completely, the kernel kills a big process and writes "Out of memory: Killed process ..." to the log.

> "free" being small is normal. "available" being small and swap being used is a problem.""",
            """## free -h
```
$ free -h
```
| колонка | значение |
|---|---|
| total | вся оперативная память |
| used | занято программами |
| buff/cache | дисковый кэш — Linux отдаёт его по требованию |
| **available** | сколько ещё могут получить программы — **смотрите сюда** |

## Своп
Когда оперативной памяти не хватает, Linux переносит страницы памяти на диск (**своп**). Диск примерно в 1000 раз медленнее памяти, поэтому активный своп = всё ползёт.

## OOM killer
Если память кончилась совсем, ядро убивает крупный процесс и пишет в лог «Out of memory: Killed process ...».

> Маленький «free» — это нормально. Маленький «available» и занятый своп — проблема.""",
            """## free -h
```
$ free -h
```
| колонка | значення |
|---|---|
| total | уся оперативна пам’ять |
| used | зайнято програмами |
| buff/cache | дисковий кеш — Linux віддає його на вимогу |
| **available** | скільки ще можуть отримати програми — **дивіться сюди** |

## Своп
Коли оперативної пам’яті бракує, Linux переносить сторінки пам’яті на диск (**своп**). Диск приблизно в 1000 разів повільніший за пам’ять, тому активний своп = усе повзе.

## OOM killer
Якщо пам’ять закінчилася зовсім, ядро вбиває великий процес і пише в лог «Out of memory: Killed process ...».

> Малий «free» — це нормально. Малий «available» і зайнятий своп — проблема."""),
            title=L('Where did the memory go?', 'Куда делась память?', 'Куди поділася пам’ять?'), demo=['free -h']),
        task(L('Check memory on web01 in human-readable units.', 'Проверьте память на web01 в удобных единицах.', 'Перевірте пам’ять на web01 у зручних одиницях.'),
             [used('free', L('Use free with -h', 'Используйте free с -h', 'Використайте free з -h'), flags=['-h']), out(L('Swap row is visible', 'Видна строка Swap', 'Видно рядок Swap'), text='Swap:')],
             L('free + human readable flag.', 'free + флаг удобных единиц.', 'free + прапорець зручних одиниць.'), 'free', ['free -h']),
        predict('free -h | grep Swap', ['Swap:         2.0Gi       1.4Gi       622Mi', 'Swap:         2.0Gi          0B       2.0Gi', 'Swap:            0B          0B          0B'], 0,
                L('1.4 GiB of swap is used: the server ran out of RAM and is swapping.', 'Занято 1,4 ГиБ свопа: оперативной памяти не хватило, сервер свопится.', 'Зайнято 1,4 ГіБ свопу: оперативної пам’яті забракло, сервер свопиться.'), setup=B, context=['free -h | head -2']),
        quiz(L('free -h: total 3.8Gi, used 1.6Gi, free 200Mi, buff/cache 2.0Gi, available 2.1Gi. Is the server short of memory?', 'free -h: total 3.8Gi, used 1.6Gi, free 200Mi, buff/cache 2.0Gi, available 2.1Gi. Серверу не хватает памяти?', 'free -h: total 3.8Gi, used 1.6Gi, free 200Mi, buff/cache 2.0Gi, available 2.1Gi. Серверу бракує пам’яті?'),
             [L('No: 2.1 GiB is available, the cache will be released', 'Нет: доступно 2,1 ГиБ, кэш освободится', 'Ні: доступно 2,1 ГіБ, кеш звільниться'), L('Yes: only 200 MiB free', 'Да: свободно всего 200 МиБ', 'Так: вільно лише 200 МіБ'), L('Impossible to say', 'Невозможно сказать', 'Неможливо сказати')], 0),
        quiz(L('Which log line proves that the kernel killed a process because of memory?', 'Какая строка лога доказывает, что ядро убило процесс из-за памяти?', 'Який рядок логу доводить, що ядро вбило процес через пам’ять?'),
             [L('Out of memory: Killed process 1001 (node)', 'Out of memory: Killed process 1001 (node)', 'Out of memory: Killed process 1001 (node)'),
              L('Started nginx.service', 'Started nginx.service', 'Started nginx.service'),
              L('Accepted publickey for student', 'Accepted publickey for student', 'Accepted publickey for student')], 0),
    ]),

    lesson('health-disk', L('Disk space', 'Место на диске', 'Місце на диску'), ['df', 'du', 'sort', 'rm'], setup=B, steps=[
        theory(L(
            """## Two tools
- `df -h` — how full each **file system** is (Use%)
- `du -sh PATH` — how much a **directory** takes

## Finding the culprit
```
$ df -h
$ sudo du -sh /var/log/* | sort -h
```
`sort -h` understands sizes like 2.0G and 512M, the biggest ends up at the bottom.

## What can be deleted
- old **rotated** logs: `*.1`, `*.gz`
- core dumps in /var/crash (after telling L2)
- temporary files in /tmp

!> Never delete the **live** log of a running service: the process keeps writing to the deleted file and the space is not freed until a restart.

> At 100% disk databases stop writing, logins fail and services crash. Act at 90%.""",
            """## Два инструмента
- `df -h` — насколько заполнена каждая **файловая система** (Use%)
- `du -sh ПУТЬ` — сколько занимает **директория**

## Ищем виновника
```
$ df -h
$ sudo du -sh /var/log/* | sort -h
```
`sort -h` понимает размеры вида 2.0G и 512M, самое большое окажется внизу.

## Что можно удалять
- старые **ротированные** логи: `*.1`, `*.gz`
- дампы памяти в /var/crash (предупредив L2)
- временные файлы в /tmp

!> Никогда не удаляйте **живой** лог работающего сервиса: процесс продолжит писать в удалённый файл, и место не освободится до рестарта.

> При 100% диска базы перестают писать, вход в систему ломается, сервисы падают. Действуйте на 90%.""",
            """## Два інструменти
- `df -h` — наскільки заповнена кожна **файлова система** (Use%)
- `du -sh ШЛЯХ` — скільки займає **директорія**

## Шукаємо винуватця
```
$ df -h
$ sudo du -sh /var/log/* | sort -h
```
`sort -h` розуміє розміри на кшталт 2.0G і 512M, найбільше опиниться внизу.

## Що можна видаляти
- старі **ротовані** логи: `*.1`, `*.gz`
- дампи пам’яті в /var/crash (попередивши L2)
- тимчасові файли в /tmp

!> Ніколи не видаляйте **живий** лог працюючого сервісу: процес і далі писатиме у видалений файл, і місце не звільниться до рестарту.

> За 100% диска бази перестають писати, вхід до системи ламається, сервіси падають. Дійте на 90%."""),
            title=L('Disk full alert', 'Алерт «диск заполнен»', 'Алерт «диск заповнено»'), demo=['df -h']),
        task(L('Alert: "web01 disk / > 90%". Confirm it: show how full the file systems are.', 'Алерт: «web01 disk / > 90%». Подтвердите: покажите, насколько заполнены файловые системы.', 'Алерт: «web01 disk / > 90%». Підтвердіть: покажіть, наскільки заповнені файлові системи.'),
             [used('df', L('Use df -h', 'Используйте df -h', 'Використайте df -h'), flags=['-h']), out(L('/ is at 95%', '/ заполнен на 95%', '/ заповнено на 95%'), text='95%')],
             L('df = disk free.', 'df = disk free.', 'df = disk free.'), 'df', ['df -h']),
        task(L('Which directory in /var/log takes the most space? Show the sizes sorted.', 'Какая директория в /var/log занимает больше всего? Покажите размеры по возрастанию.', 'Яка директорія в /var/log займає найбільше? Покажіть розміри за зростанням.'),
             [used('du', L('Measure with du -sh', 'Измерьте через du -sh', 'Виміряйте через du -sh'), flags=['-s', '-h']), used('sort', L('Sort with sort -h', 'Отсортируйте через sort -h', 'Відсортуйте через sort -h'), flags=['-h']),
              out(L('/var/log/app is the biggest', '/var/log/app — самая большая', '/var/log/app — найбільша'), regex='G\\s+/var/log/app$')],
             L('sudo du -sh /var/log/* | sort -h', 'sudo du -sh /var/log/* | sort -h', 'sudo du -sh /var/log/* | sort -h'), 'du', ['sudo du -sh /var/log/* | sort -h'],
             instructions=L('1. `sudo du -sh /var/log/*` — size of every item\n2. Add `| sort -h` to sort by size', '1. `sudo du -sh /var/log/*` — размер каждого элемента\n2. Добавьте `| sort -h`, чтобы отсортировать по размеру', '1. `sudo du -sh /var/log/*` — розмір кожного елемента\n2. Додайте `| sort -h`, щоб відсортувати за розміром')),
        task(L('Free space safely: delete the old rotated log /var/log/app/debug.log.1.gz and the core dump /var/crash/api.core. Do NOT touch the live debug.log.',
               'Освободите место безопасно: удалите старый ротированный лог /var/log/app/debug.log.1.gz и дамп /var/crash/api.core. Живой debug.log НЕ трогайте.',
               'Звільніть місце безпечно: видаліть старий ротований лог /var/log/app/debug.log.1.gz і дамп /var/crash/api.core. Живий debug.log НЕ чіпайте.'),
             [gone('/var/log/app/debug.log.1.gz', L('The rotated log is gone', 'Ротированный лог удалён', 'Ротований лог видалено')),
              gone('/var/crash/api.core', L('The core dump is gone', 'Дамп удалён', 'Дамп видалено')),
              fexists('/var/log/app/debug.log', L('The live log is untouched', 'Живой лог не тронут', 'Живий лог не зачеплено'))],
             L('The files belong to root: sudo rm FILE FILE.', 'Файлы принадлежат root: sudo rm ФАЙЛ ФАЙЛ.', 'Файли належать root: sudo rm ФАЙЛ ФАЙЛ.'), 'rm',
             ['sudo rm /var/log/app/debug.log.1.gz /var/crash/api.core']),
        task(L('Check the result: how full is / now?', 'Проверьте результат: насколько заполнен / теперь?', 'Перевірте результат: наскільки заповнено / тепер?'),
             [used('df', L('Run df -h again', 'Снова выполните df -h', 'Знову виконайте df -h'), flags=['-h'])],
             L('Same command as before.', 'Та же команда, что и раньше.', 'Та сама команда, що й раніше.'), 'df', ['df -h'], prepare=['sudo rm /var/log/app/debug.log.1.gz /var/crash/api.core']),
        quiz(L('Why is deleting the live log of a running service a bad idea?', 'Почему удалять живой лог работающего сервиса — плохая идея?', 'Чому видаляти живий лог працюючого сервісу — погана ідея?'),
             [L('The process keeps the file open, the space is not freed and the logs are lost', 'Процесс держит файл открытым, место не освобождается, а логи теряются', 'Процес тримає файл відкритим, місце не звільняється, а логи губляться'),
              L('Linux forbids deleting logs', 'Linux запрещает удалять логи', 'Linux забороняє видаляти логи'),
              L('It is fine, nothing happens', 'Ничего страшного не будет', 'Нічого страшного не буде')], 0),
    ]),

    lesson('health-cpu', L('Who eats the CPU', 'Кто съедает процессор', 'Хто з’їдає процесор'), ['top', 'ps', 'kill'], setup=B, steps=[
        theory(L(
            """## Find the hog
```
$ top
$ ps aux --sort=-%cpu | head -5
```
- `top` — a live view sorted by %CPU (real top refreshes, `q` quits)
- `ps aux --sort=-%cpu` — a snapshot sorted by CPU, the heaviest first
- 100% = one full core; 190% = almost two cores

## Before you kill
1. **Whose** process is it? (USER column)
2. **What** is it? (COMMAND) — never kill databases or system daemons blindly
3. Is it **expected**? A nightly backup at 03:00 is fine; a "report" at peak time is not

## Stopping
`kill PID` sends SIGTERM — a polite request. `kill -9 PID` (SIGKILL) only if it does not react.""",
            """## Найти обжору
```
$ top
$ ps aux --sort=-%cpu | head -5
```
- `top` — живой вид, отсортированный по %CPU (настоящий top обновляется, `q` — выход)
- `ps aux --sort=-%cpu` — снимок по CPU, самые тяжёлые сверху
- 100% = одно ядро целиком; 190% = почти два ядра

## Прежде чем убивать
1. **Чей** это процесс? (колонка USER)
2. **Что** это? (COMMAND) — никогда не убивайте вслепую базы данных и системные демоны
3. Это **ожидаемо**? Ночной бэкап в 03:00 — нормально; «отчёт» в час пик — нет

## Остановка
`kill PID` посылает SIGTERM — вежливую просьбу. `kill -9 PID` (SIGKILL) — только если не реагирует.""",
            """## Знайти ненажеру
```
$ top
$ ps aux --sort=-%cpu | head -5
```
- `top` — живий вигляд, відсортований за %CPU (справжній top оновлюється, `q` — вихід)
- `ps aux --sort=-%cpu` — знімок за CPU, найважчі зверху
- 100% = одне ядро повністю; 190% = майже два ядра

## Перш ніж вбивати
1. **Чий** це процес? (колонка USER)
2. **Що** це? (COMMAND) — ніколи не вбивайте наосліп бази даних і системні демони
3. Це **очікувано**? Нічний бекап о 03:00 — нормально; «звіт» у пікову годину — ні

## Зупинка
`kill PID` надсилає SIGTERM — ввічливе прохання. `kill -9 PID` (SIGKILL) — лише якщо не реагує."""),
            title=L('High CPU', 'Высокая загрузка CPU', 'Високе навантаження CPU'), demo=['ps aux --sort=-%cpu | head -4']),
        task(L('Open top and find the process with the highest %CPU.', 'Откройте top и найдите процесс с самым высоким %CPU.', 'Відкрийте top і знайдіть процес із найвищим %CPU.'),
             [used('top', L('Use top', 'Используйте top', 'Використайте top')), out(L('The heavy process is visible', 'Виден тяжёлый процесс', 'Видно важкий процес'), text='python3')],
             L('Three letters.', 'Три буквы.', 'Три літери.'), 'top', ['top']),
        task(L('Show the 3 heaviest processes by CPU with ps (plus the header line).', 'Покажите через ps 3 самых тяжёлых процесса по CPU (плюс строка заголовка).', 'Покажіть через ps 3 найважчі процеси за CPU (плюс рядок заголовка).'),
             [used('ps', L('Use ps aux sorted by CPU', 'Используйте ps aux с сортировкой по CPU', 'Використайте ps aux із сортуванням за CPU')), used('head', L('Cut with head -4', 'Обрежьте через head -4', 'Обріжте через head -4')),
              out(L('report_generator.py is at the top', 'report_generator.py наверху', 'report_generator.py нагорі'), regex='^USER.*\\n.*report_generator')],
             L('ps aux --sort=-%cpu | head -4', 'ps aux --sort=-%cpu | head -4', 'ps aux --sort=-%cpu | head -4'), 'ps', ['ps aux --sort=-%cpu | head -4']),
        task(L('The heavy python3 report_generator.py was started by you (student) at peak time. Stop it.', 'Тяжёлый python3 report_generator.py запустили вы (student) в час пик. Остановите его.', 'Важкий python3 report_generator.py запустили ви (student) у пікову годину. Зупиніть його.'),
             [proc_gone('report_generator', L('The report generator is stopped', 'Генератор отчётов остановлен', 'Генератор звітів зупинено'))],
             L('Find its PID in ps / top, then kill PID.', 'Найдите его PID в ps / top, затем kill PID.', 'Знайдіть його PID у ps / top, потім kill PID.'), 'kill', ['kill 4711'],
             instructions=L('1. Find the PID: `ps aux --sort=-%cpu | head -3`\n2. Run `kill PID`\n3. Check with `top` that it is gone', '1. Найдите PID: `ps aux --sort=-%cpu | head -3`\n2. Выполните `kill PID`\n3. Проверьте через `top`, что его нет', '1. Знайдіть PID: `ps aux --sort=-%cpu | head -3`\n2. Виконайте `kill PID`\n3. Перевірте через `top`, що його немає')),
        quiz(L('The top process is postgres at 95% CPU during a sale. What should L1 do?', 'Сверху postgres с 95% CPU во время распродажи. Что делать L1?', 'Нагорі postgres із 95% CPU під час розпродажу. Що робити L1?'),
             [L('Do not kill the database; check the dashboards and escalate to L2 db', 'Не убивать базу; посмотреть дашборды и эскалировать на L2 по БД', 'Не вбивати базу; подивитися дашборди й ескалювати на L2 по БД'),
              L('kill -9 postgres immediately', 'Сразу kill -9 postgres', 'Одразу kill -9 postgres'), L('Reboot the server', 'Перезагрузить сервер', 'Перезавантажити сервер')], 0),
    ]),

    lesson('health-checklist', L('The 60-second server check', 'Проверка сервера за 60 секунд', 'Перевірка сервера за 60 секунд'), ['uptime', 'free', 'df', 'systemctl', 'journalctl'], setup=S, steps=[
        reading(L(
            """## Run it on every alert
1. `uptime` — load and recent reboots
2. `free -h` — memory and swap
3. `df -h` — disk space
4. `top` or `ps aux --sort=-%cpu | head` — who eats resources
5. `systemctl --failed` — broken services
6. `journalctl -p err -n 20` — the latest errors

## Write down what you saw
A short ticket note is worth gold for the next engineer:
```
10:42 web01: load 0.4/2 cores, mem avail 2.3G, / 62%,
no failed units, no new errors -> host healthy, looking at app
```
> A healthy host helps too: it tells you to look elsewhere — network, database, the application.""",
            """## Выполняйте при каждом алерте
1. `uptime` — нагрузка и недавние перезагрузки
2. `free -h` — память и своп
3. `df -h` — место на диске
4. `top` или `ps aux --sort=-%cpu | head` — кто ест ресурсы
5. `systemctl --failed` — сломанные сервисы
6. `journalctl -p err -n 20` — последние ошибки

## Запишите увиденное
Короткая заметка в тикете — золото для следующего инженера:
```
10:42 web01: load 0.4/2 ядра, mem avail 2.3G, / 62%,
failed units нет, новых ошибок нет -> хост здоров, смотрю приложение
```
> Здоровый хост тоже помогает: он подсказывает искать в другом месте — сеть, база, приложение.""",
            """## Виконуйте на кожен алерт
1. `uptime` — навантаження та нещодавні перезавантаження
2. `free -h` — пам’ять і своп
3. `df -h` — місце на диску
4. `top` або `ps aux --sort=-%cpu | head` — хто їсть ресурси
5. `systemctl --failed` — зламані сервіси
6. `journalctl -p err -n 20` — останні помилки

## Запишіть побачене
Коротка нотатка в тікеті — золото для наступного інженера:
```
10:42 web01: load 0.4/2 ядра, mem avail 2.3G, / 62%,
failed units немає, нових помилок немає -> хост здоровий, дивлюся застосунок
```
> Здоровий хост теж допомагає: він підказує шукати деінде — мережа, база, застосунок."""),
            title=L('The checklist', 'Чек-лист', 'Чек-лист')),
        task(L('Run the full 60-second check on web01: load, memory, disk, failed services and recent errors.', 'Выполните полную проверку за 60 секунд на web01: нагрузка, память, диск, сломанные сервисы и последние ошибки.', 'Виконайте повну перевірку за 60 секунд на web01: навантаження, пам’ять, диск, зламані сервіси й останні помилки.'),
             [used('uptime', L('uptime', 'uptime', 'uptime')), used('free', L('free -h', 'free -h', 'free -h'), flags=['-h']), used('df', L('df -h', 'df -h', 'df -h'), flags=['-h']),
              used('systemctl', L('systemctl --failed', 'systemctl --failed', 'systemctl --failed')), used('journalctl', L('journalctl -p err', 'journalctl -p err', 'journalctl -p err'))],
             L('Run the five commands from the checklist one by one.', 'Выполните пять команд из чек-листа по очереди.', 'Виконайте п’ять команд із чек-листа по черзі.'), 'uptime',
             ['uptime', 'free -h', 'df -h', 'systemctl --failed', 'journalctl -p err -n 20'], xp=30,
             instructions=L('1. `uptime`\n2. `free -h`\n3. `df -h`\n4. `systemctl --failed`\n5. `journalctl -p err -n 20`', '1. `uptime`\n2. `free -h`\n3. `df -h`\n4. `systemctl --failed`\n5. `journalctl -p err -n 20`', '1. `uptime`\n2. `free -h`\n3. `df -h`\n4. `systemctl --failed`\n5. `journalctl -p err -n 20`')),
        task(L('Save a short host status into ~/status.txt: append the output of uptime and df -h / to the file.', 'Сохраните короткий статус хоста в ~/status.txt: допишите в файл вывод uptime и df -h /.', 'Збережіть короткий статус хоста в ~/status.txt: допишіть у файл вивід uptime і df -h /.'),
             [fcontains('~/status.txt', L('uptime is in the file', 'uptime в файле', 'uptime у файлі'), text='load average'), fcontains('~/status.txt', L('disk usage is in the file', 'место на диске в файле', 'місце на диску у файлі'), text='Mounted on')],
             L('Use >> to append both outputs.', 'Используйте >>, чтобы дописать оба вывода.', 'Використайте >>, щоб дописати обидва виводи.'), 'df', ['uptime >> ~/status.txt', 'df -h / >> ~/status.txt']),
        quiz(L('All six checks look healthy, but users still see errors. What next?', 'Все шесть проверок в норме, а пользователи всё равно видят ошибки. Что дальше?', 'Усі шість перевірок у нормі, а користувачі досі бачать помилки. Що далі?'),
             [L('Look beyond the host: the network, the database, the application logs', 'Смотреть за пределами хоста: сеть, база, логи приложения', 'Дивитися за межами хоста: мережа, база, логи застосунку'),
              L('Reboot the healthy server just in case', 'Перезагрузить здоровый сервер на всякий случай', 'Перезавантажити здоровий сервер про всяк випадок'), L('Close the ticket', 'Закрыть тикет', 'Закрити тікет')], 0),
    ]),
]

module('08-noc-health.json', 'noc-health', '/noc/health', 'activity',
       L('Server health', 'Здоровье сервера', 'Здоров’я сервера'),
       L('Load average, memory, disk and CPU: find out in a minute what is wrong with a host.', 'Load average, память, диск и процессор: за минуту понять, что с хостом не так.', 'Load average, пам’ять, диск і процесор: за хвилину зрозуміти, що з хостом не так.'),
       lessons)
