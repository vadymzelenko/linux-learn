"""Linux course: filesystem hierarchy, users and groups, processes."""
from lib import *
from lib import _c

# ---------------------------------------------------------------- FHS

FHS = {
    "hostname": "trainer",
    "files": {
        "/usr/local/bin/hello": {"content": "#!/bin/bash\necho \"Hello from /usr/local/bin\"\n", "owner": "root", "mode": "755"},
        "/opt/shopapp/": None,
        "/opt/shopapp/app.py": {"content": "print('shop')\n", "owner": "root"},
        "/etc/shopapp.conf": {"content": "port=8080\nlog=/var/log/shopapp.log\ndebug=false\n", "owner": "root"},
        "/var/log/shopapp.log": {"content": "2026-10-31 09:00 started on port 8080\n2026-10-31 09:05 GET / 200\n", "owner": "root"},
        "/tmp/upload-7f3a.tmp": {"content": "partial upload\n", "owner": "www-data"},
        "/srv/ftp/": None,
        "/mnt/usb/": None,
    },
    "users": [{"name": "www-data", "uid": 33, "home": "/var/www"}],
}

fhs = [
    lesson('fhs-tree', L('A map of the filesystem', 'Карта файловой системы', 'Мапа файлової системи'), ['ls', 'tree'], setup=FHS, steps=[
        reading(L(
            """## One tree, one root
Linux has no drives C: and D:. Everything hangs from **one root** `/`. Disks and USB sticks are *mounted* into folders of this tree.

| folder | what lives there |
|---|---|
| `/etc` | **configuration** of the system and programs (text files) |
| `/home` | the users' personal folders (`/home/student`) |
| `/root` | the home of the root user |
| `/var` | **variable** data: logs (`/var/log`), databases, mail, caches |
| `/tmp` | temporary files, cleared on reboot |
| `/usr` | installed programs and libraries (`/usr/bin`, `/usr/lib`) |
| `/usr/local` | programs you installed by hand |
| `/opt` | big third-party applications |
| `/bin`, `/sbin` | basic commands (today links to `/usr/bin`, `/usr/sbin`) |
| `/dev` | devices as files (`/dev/sda`, `/dev/null`) |
| `/proc`, `/sys` | windows into the running kernel |
| `/mnt`, `/media` | mount points for disks and USB |
| `/srv` | data that the server serves (sites, FTP) |
| `/boot` | the kernel and the boot loader |

> Rule of thumb: **settings → /etc, logs → /var/log, programs → /usr/bin, your stuff → /home.**""",
            """## Одно дерево, один корень
В Linux нет дисков C: и D:. Всё висит на **одном корне** `/`. Диски и флешки *монтируются* в папки этого дерева.

| папка | что там живёт |
|---|---|
| `/etc` | **настройки** системы и программ (текстовые файлы) |
| `/home` | личные папки пользователей (`/home/student`) |
| `/root` | домашняя папка пользователя root |
| `/var` | **изменяемые** данные: логи (`/var/log`), базы, почта, кэши |
| `/tmp` | временные файлы, очищаются при перезагрузке |
| `/usr` | установленные программы и библиотеки (`/usr/bin`, `/usr/lib`) |
| `/usr/local` | программы, установленные вручную |
| `/opt` | крупные сторонние приложения |
| `/bin`, `/sbin` | базовые команды (сейчас — ссылки на `/usr/bin`, `/usr/sbin`) |
| `/dev` | устройства в виде файлов (`/dev/sda`, `/dev/null`) |
| `/proc`, `/sys` | окна в работающее ядро |
| `/mnt`, `/media` | точки монтирования дисков и флешек |
| `/srv` | данные, которые раздаёт сервер (сайты, FTP) |
| `/boot` | ядро и загрузчик |

> Правило: **настройки → /etc, логи → /var/log, программы → /usr/bin, ваше → /home.**""",
            """## Одне дерево, один корінь
У Linux немає дисків C: і D:. Усе висить на **одному корені** `/`. Диски й флешки *монтуються* в папки цього дерева.

| папка | що там живе |
|---|---|
| `/etc` | **налаштування** системи й програм (текстові файли) |
| `/home` | особисті папки користувачів (`/home/student`) |
| `/root` | домашня папка користувача root |
| `/var` | **змінні** дані: логи (`/var/log`), бази, пошта, кеші |
| `/tmp` | тимчасові файли, очищуються під час перезавантаження |
| `/usr` | установлені програми й бібліотеки (`/usr/bin`, `/usr/lib`) |
| `/usr/local` | програми, установлені вручну |
| `/opt` | великі сторонні застосунки |
| `/bin`, `/sbin` | базові команди (зараз — посилання на `/usr/bin`, `/usr/sbin`) |
| `/dev` | пристрої у вигляді файлів (`/dev/sda`, `/dev/null`) |
| `/proc`, `/sys` | вікна в робоче ядро |
| `/mnt`, `/media` | точки монтування дисків і флешок |
| `/srv` | дані, які роздає сервер (сайти, FTP) |
| `/boot` | ядро й завантажувач |

> Правило: **налаштування → /etc, логи → /var/log, програми → /usr/bin, ваше → /home.**"""),
            title=L('Filesystem Hierarchy Standard', 'Стандарт иерархии (FHS)', 'Стандарт ієрархії (FHS)')),
        task(L('Look at the top level of the tree: list the root directory /.', 'Посмотрите на верхний уровень дерева: выведите содержимое корня /.', 'Подивіться на верхній рівень дерева: виведіть вміст кореня /.'),
             [used('ls', L('ls /', 'ls /', 'ls /'), args=['/']), out(L('etc and var are visible', 'Видны etc и var', 'Видно etc і var'), regex='etc')],
             L('ls /', 'ls /', 'ls /'), 'ls', ['ls /']),
        task(L('A colleague installed "shopapp" by hand into /opt. Show what is inside /opt (two levels deep).', 'Коллега вручную поставил «shopapp» в /opt. Покажите, что внутри /opt (на два уровня).', 'Колега вручну встановив «shopapp» в /opt. Покажіть, що всередині /opt (на два рівні).'),
             [used('tree', L('tree -L 2', 'tree -L 2', 'tree -L 2')), out(L('app.py is visible', 'Виден app.py', 'Видно app.py'), text='app.py')],
             L('tree -L 2 /opt', 'tree -L 2 /opt', 'tree -L 2 /opt'), 'tree', ['tree -L 2 /opt']),
        quiz(L('Where would you look for the configuration of the SSH server?', 'Где искать настройки SSH-сервера?', 'Де шукати налаштування SSH-сервера?'),
             [L('/etc/ssh/', '/etc/ssh/', '/etc/ssh/'), L('/var/ssh/', '/var/ssh/', '/var/ssh/'), L('/home/ssh/', '/home/ssh/', '/home/ssh/'), L('/usr/bin/ssh', '/usr/bin/ssh', '/usr/bin/ssh')], 0),
        quiz(L('A database grows every day. In which top-level folder does it most likely live?', 'База данных растёт каждый день. В какой папке верхнего уровня она скорее всего живёт?', 'База даних росте щодня. У якій папці верхнього рівня вона найімовірніше живе?'),
             [L('/var (variable data)', '/var (изменяемые данные)', '/var (змінні дані)'), L('/etc', '/etc', '/etc'), L('/boot', '/boot', '/boot'), L('/usr', '/usr', '/usr')], 0),
    ]),

    lesson('fhs-etc', L('/etc: the settings', '/etc: настройки', '/etc: налаштування'), ['cat', 'cut', 'grep'], setup=FHS, steps=[
        theory(L(
            """## Everything is a text file
Linux keeps its settings in **plain text** in `/etc` — you can read and back them up with ordinary commands.
```
$ cat /etc/hostname
$ cat /etc/os-release
$ cat /etc/hosts
```
## /etc/passwd — the list of accounts
```
student:x:1000:1000:student:/home/student:/bin/bash
```
| field | meaning |
|---|---|
| 1 | login name |
| 2 | `x` = the password is in /etc/shadow |
| 3, 4 | UID and GID |
| 6 | home directory |
| 7 | login shell |

Fields are separated by `:` — perfect for `cut -d: -f1`.

> Before editing anything in /etc: `sudo cp file file.bak`. One typo can stop a service.""",
            """## Всё — текстовые файлы
Linux хранит настройки **простым текстом** в `/etc` — их можно читать и сохранять обычными командами.
```
$ cat /etc/hostname
$ cat /etc/os-release
$ cat /etc/hosts
```
## /etc/passwd — список учётных записей
```
student:x:1000:1000:student:/home/student:/bin/bash
```
| поле | значение |
|---|---|
| 1 | имя входа |
| 2 | `x` = пароль хранится в /etc/shadow |
| 3, 4 | UID и GID |
| 6 | домашняя папка |
| 7 | оболочка входа |

Поля разделены `:` — идеально для `cut -d: -f1`.

> Перед любой правкой в /etc: `sudo cp файл файл.bak`. Одна опечатка может остановить сервис.""",
            """## Усе — текстові файли
Linux зберігає налаштування **простим текстом** у `/etc` — їх можна читати й зберігати звичайними командами.
```
$ cat /etc/hostname
$ cat /etc/os-release
$ cat /etc/hosts
```
## /etc/passwd — список облікових записів
```
student:x:1000:1000:student:/home/student:/bin/bash
```
| поле | значення |
|---|---|
| 1 | ім’я входу |
| 2 | `x` = пароль зберігається в /etc/shadow |
| 3, 4 | UID і GID |
| 6 | домашня папка |
| 7 | оболонка входу |

Поля розділено `:` — ідеально для `cut -d: -f1`.

> Перед будь-якою правкою в /etc: `sudo cp файл файл.bak`. Одна друкарська помилка може зупинити сервіс."""),
            title=L('Reading the configuration', 'Читаем настройки', 'Читаємо налаштування'), demo=['cat /etc/hostname']),
        task(L('Which Linux distribution and version is this? Read /etc/os-release.', 'Какой это дистрибутив и версия? Прочитайте /etc/os-release.', 'Який це дистрибутив і версія? Прочитайте /etc/os-release.'),
             [used('cat', L('cat /etc/os-release', 'cat /etc/os-release', 'cat /etc/os-release')), out(L('Ubuntu', 'Ubuntu', 'Ubuntu'), text='Ubuntu')],
             L('cat /etc/os-release', 'cat /etc/os-release', 'cat /etc/os-release'), 'cat', ['cat /etc/os-release']),
        task(L('Print only the login names of all accounts (first field of /etc/passwd).', 'Выведите только имена всех учётных записей (первое поле /etc/passwd).', 'Виведіть лише імена всіх облікових записів (перше поле /etc/passwd).'),
             [used('cut', L('cut -d: -f1', 'cut -d: -f1', 'cut -d: -f1')), out(L('www-data is listed', 'Есть www-data', 'Є www-data'), regex='^www-data$'), out(L('No other fields', 'Других полей нет', 'Інших полів немає'), regex='^root$')],
             L('cut -d: -f1 /etc/passwd', 'cut -d: -f1 /etc/passwd', 'cut -d: -f1 /etc/passwd'), 'cut', ['cut -d: -f1 /etc/passwd']),
        task(L('On which port does shopapp listen? Find it in /etc/shopapp.conf.', 'На каком порту слушает shopapp? Найдите в /etc/shopapp.conf.', 'На якому порту слухає shopapp? Знайдіть у /etc/shopapp.conf.'),
             [used('grep', L('grep port', 'grep port', 'grep port')), out(L('port=8080', 'port=8080', 'port=8080'), text='port=8080')],
             L('grep port /etc/shopapp.conf', 'grep port /etc/shopapp.conf', 'grep port /etc/shopapp.conf'), 'grep', ['grep port /etc/shopapp.conf']),
        predict('cut -d: -f7 /etc/passwd | sort -u', ['/bin/bash', '/bin/bash\n/usr/sbin/nologin', 'bash', 'x'], 0,
                L('Field 7 is the shell; every account here uses /bin/bash and sort -u removes duplicates.', 'Поле 7 — оболочка; у всех учёток здесь /bin/bash, а sort -u убирает повторы.', 'Поле 7 — оболонка; у всіх облікових записів тут /bin/bash, а sort -u прибирає повтори.'), setup=FHS, context=['cat /etc/passwd']),
    ]),

    lesson('fhs-var-tmp', L('/var and /tmp', '/var и /tmp', '/var і /tmp'), ['ls', 'du', 'touch'], setup=FHS, steps=[
        theory(L(
            """## /var — data that changes
- `/var/log` — logs
- `/var/lib` — program state: databases, package lists
- `/var/cache` — caches that can be rebuilt
- `/var/www` — classic place for websites
- `/var/spool` — queues: mail, print, cron jobs

When "the disk is full", the culprit is usually in /var.
```
$ sudo du -sh /var/* | sort -h
```
## /tmp — for everyone, but carefully
`/tmp` is writable by **all** users, yet nobody can delete other people's files there. That is the **sticky bit** — the `t` at the end of `drwxrwxrwt`.

> Never keep anything important in /tmp: it is wiped on reboot.""",
            """## /var — данные, которые меняются
- `/var/log` — логи
- `/var/lib` — состояние программ: базы, списки пакетов
- `/var/cache` — кэши, которые можно пересоздать
- `/var/www` — классическое место для сайтов
- `/var/spool` — очереди: почта, печать, задания cron

Когда «кончилось место на диске», виновник обычно в /var.
```
$ sudo du -sh /var/* | sort -h
```
## /tmp — для всех, но аккуратно
В `/tmp` могут писать **все** пользователи, но удалить чужой файл там нельзя. Это **sticky bit** — буква `t` в конце `drwxrwxrwt`.

> Ничего важного в /tmp не держите: при перезагрузке он очищается.""",
            """## /var — дані, що змінюються
- `/var/log` — логи
- `/var/lib` — стан програм: бази, списки пакетів
- `/var/cache` — кеші, які можна перестворити
- `/var/www` — класичне місце для сайтів
- `/var/spool` — черги: пошта, друк, завдання cron

Коли «скінчилося місце на диску», винуватець зазвичай у /var.
```
$ sudo du -sh /var/* | sort -h
```
## /tmp — для всіх, але обережно
У `/tmp` можуть писати **усі** користувачі, але видалити чужий файл там не можна. Це **sticky bit** — літера `t` наприкінці `drwxrwxrwt`.

> Нічого важливого в /tmp не тримайте: під час перезавантаження він очищується."""),
            title=L('Changing data and temp files', 'Изменяемые данные и временные файлы', 'Змінні дані й тимчасові файли'), demo=['ls -ld /tmp']),
        task(L('Show the size of every folder in /var, sorted from small to big.', 'Покажите размер каждой папки в /var, от маленьких к большим.', 'Покажіть розмір кожної папки в /var, від малих до великих.'),
             [used('du', L('du -sh', 'du -sh', 'du -sh'), flags=['-s']), used('sort', L('sort -h', 'sort -h', 'sort -h'), flags=['-h'])],
             L('sudo du -sh /var/* | sort -h', 'sudo du -sh /var/* | sort -h', 'sudo du -sh /var/* | sort -h'), 'du', ['sudo du -sh /var/* | sort -h']),
        task(L('Try to delete /tmp/upload-7f3a.tmp — it belongs to www-data. What happens?', 'Попробуйте удалить /tmp/upload-7f3a.tmp — он принадлежит www-data. Что произойдёт?', 'Спробуйте видалити /tmp/upload-7f3a.tmp — він належить www-data. Що станеться?'),
             [used('rm', L('rm the file', 'rm файла', 'rm файлу')), out(L('Operation not permitted', 'Operation not permitted', 'Operation not permitted'), text='Operation not permitted'), fexists('/tmp/upload-7f3a.tmp', L('The file survived', 'Файл уцелел', 'Файл уцілів'))],
             L('rm -f /tmp/upload-7f3a.tmp', 'rm -f /tmp/upload-7f3a.tmp', 'rm -f /tmp/upload-7f3a.tmp'), 'rm', ['rm -f /tmp/upload-7f3a.tmp']),
        quiz(L('Why can you NOT delete other users\' files in /tmp, though everyone may write there?', 'Почему нельзя удалить чужие файлы в /tmp, хотя писать туда могут все?', 'Чому не можна видалити чужі файли в /tmp, хоча писати туди можуть усі?'),
             [L('The sticky bit (t) on /tmp', 'Sticky bit (t) на /tmp', 'Sticky bit (t) на /tmp'), L('/tmp is read-only', '/tmp только для чтения', '/tmp лише для читання'), L('Files in /tmp are encrypted', 'Файлы в /tmp зашифрованы', 'Файли в /tmp зашифровано')], 0),
    ]),

    lesson('fhs-bin-path', L('Where commands live: PATH', 'Где живут команды: PATH', 'Де живуть команди: PATH'), ['which', 'echo', 'type'], setup=FHS, steps=[
        theory(L(
            """## How the shell finds `ls`
When you type `ls`, bash looks through the folders listed in **$PATH**, left to right, and runs the first `ls` it finds.
```
$ echo $PATH
$ which ls
$ type cd
```
- `which` — where the program file is
- `type` — also tells about builtins and aliases (`cd` is built into bash, there is no file)
- `/usr/local/bin` comes **before** `/usr/bin`, so your own scripts there win

## Running a script that is not in PATH
`./script.sh` — the `./` says "from the current folder". Without it bash searches only PATH.

> Security: never put `.` (the current folder) into PATH.""",
            """## Как оболочка находит `ls`
Когда вы набираете `ls`, bash просматривает папки из **$PATH** слева направо и запускает первый найденный `ls`.
```
$ echo $PATH
$ which ls
$ type cd
```
- `which` — где лежит файл программы
- `type` — сообщает и о встроенных командах и алиасах (`cd` встроен в bash, файла нет)
- `/usr/local/bin` стоит **раньше** `/usr/bin`, поэтому ваши скрипты там побеждают

## Запуск скрипта не из PATH
`./script.sh` — `./` означает «из текущей папки». Без этого bash ищет только по PATH.

> Безопасность: никогда не добавляйте `.` (текущую папку) в PATH.""",
            """## Як оболонка знаходить `ls`
Коли ви набираєте `ls`, bash переглядає папки з **$PATH** зліва направо й запускає перший знайдений `ls`.
```
$ echo $PATH
$ which ls
$ type cd
```
- `which` — де лежить файл програми
- `type` — повідомляє й про вбудовані команди та аліаси (`cd` вбудовано в bash, файлу немає)
- `/usr/local/bin` стоїть **раніше** за `/usr/bin`, тому ваші скрипти там перемагають

## Запуск скрипта не з PATH
`./script.sh` — `./` означає «з поточної папки». Без цього bash шукає лише за PATH.

> Безпека: ніколи не додавайте `.` (поточну папку) в PATH."""),
            title=L('$PATH', '$PATH', '$PATH'), demo=['echo $PATH', 'which ls']),
        task(L('Find out where the program "hello" lives.', 'Узнайте, где лежит программа «hello».', 'Дізнайтеся, де лежить програма «hello».'),
             [used('which', L('which hello', 'which hello', 'which hello')), out(L('/usr/local/bin/hello', '/usr/local/bin/hello', '/usr/local/bin/hello'), text='/usr/local/bin/hello')],
             L('which hello', 'which hello', 'which hello'), 'which', ['which hello']),
        task(L('Run it — just by its name.', 'Запустите её — просто по имени.', 'Запустіть її — просто за назвою.'),
             [used('hello', L('hello', 'hello', 'hello')), out(L('Hello from /usr/local/bin', 'Hello from /usr/local/bin', 'Hello from /usr/local/bin'), text='Hello from')],
             L('hello', 'hello', 'hello'), 'hello', ['hello']),
        task(L('Is "cd" a file or part of bash? Ask the shell.', '«cd» — это файл или часть bash? Спросите оболочку.', '«cd» — це файл чи частина bash? Запитайте оболонку.'),
             [used('type', L('type cd', 'type cd', 'type cd')), out(L('shell builtin', 'shell builtin', 'shell builtin'), text='builtin')],
             L('type cd', 'type cd', 'type cd'), 'type', ['type cd']),
        quiz(L('You created ~/bin/deploy.sh. Why does "deploy.sh" say "command not found" while "./deploy.sh" works inside ~/bin?', 'Вы создали ~/bin/deploy.sh. Почему «deploy.sh» пишет «command not found», а «./deploy.sh» в ~/bin работает?', 'Ви створили ~/bin/deploy.sh. Чому «deploy.sh» пише «command not found», а «./deploy.sh» у ~/bin працює?'),
             [L('~/bin is not in $PATH', '~/bin нет в $PATH', '~/bin немає в $PATH'), L('The file is too big', 'Файл слишком большой', 'Файл завеликий'), L('Bash does not run .sh files', 'Bash не запускает .sh', 'Bash не запускає .sh')], 0),
    ]),

    lesson('fhs-types', L('File types and stat', 'Типы файлов и stat', 'Типи файлів і stat'), ['file', 'stat', 'ls'], setup=FHS, steps=[
        theory(L(
            """## The first letter of ls -l
| letter | type |
|---|---|
| `-` | regular file |
| `d` | directory |
| `l` | symbolic link |
| `c`, `b` | character / block device (`/dev`) |
| `s`, `p` | socket, named pipe |

## Extensions mean nothing
Linux does not care about `.txt` or `.jpg`. To know what a file really is:
```
$ file /usr/bin/ls
$ file /etc/shopapp.conf
```
## stat — everything about a file
Size, permissions in numbers (0644), owner, times of access and modification.
```
$ stat /etc/hostname
```""",
            """## Первая буква в ls -l
| буква | тип |
|---|---|
| `-` | обычный файл |
| `d` | каталог |
| `l` | символическая ссылка |
| `c`, `b` | символьное / блочное устройство (`/dev`) |
| `s`, `p` | сокет, именованный канал |

## Расширения ничего не значат
Linux всё равно, `.txt` или `.jpg`. Чтобы узнать, что за файл на самом деле:
```
$ file /usr/bin/ls
$ file /etc/shopapp.conf
```
## stat — всё о файле
Размер, права числом (0644), владелец, время доступа и изменения.
```
$ stat /etc/hostname
```""",
            """## Перша літера в ls -l
| літера | тип |
|---|---|
| `-` | звичайний файл |
| `d` | каталог |
| `l` | символьне посилання |
| `c`, `b` | символьний / блоковий пристрій (`/dev`) |
| `s`, `p` | сокет, іменований канал |

## Розширення нічого не означають
Linux байдуже, `.txt` чи `.jpg`. Щоб дізнатися, що за файл насправді:
```
$ file /usr/bin/ls
$ file /etc/shopapp.conf
```
## stat — усе про файл
Розмір, права числом (0644), власник, час доступу й змін.
```
$ stat /etc/hostname
```"""),
            title=L('What is this file?', 'Что это за файл?', 'Що це за файл?'), demo=['ls -l /', 'file /usr/bin/ls']),
        task(L('What kind of file is /usr/local/bin/hello?', 'Что за файл /usr/local/bin/hello?', 'Що за файл /usr/local/bin/hello?'),
             [used('file', L('file', 'file', 'file')), out(L('a script', 'скрипт', 'скрипт'), regex='script|text')],
             L('file /usr/local/bin/hello', 'file /usr/local/bin/hello', 'file /usr/local/bin/hello'), 'file', ['file /usr/local/bin/hello']),
        task(L('Show the permissions of /etc/shopapp.conf as a number with stat.', 'Покажите права /etc/shopapp.conf числом через stat.', 'Покажіть права /etc/shopapp.conf числом через stat.'),
             [used('stat', L('stat', 'stat', 'stat')), out(L('0644', '0644', '0644'), text='0644')],
             L('stat /etc/shopapp.conf', 'stat /etc/shopapp.conf', 'stat /etc/shopapp.conf'), 'stat', ['stat /etc/shopapp.conf']),
        quiz(L('ls -l shows "lrwxrwxrwx 1 root root 7 ... bin -> usr/bin". What is /bin?', 'ls -l показывает «lrwxrwxrwx 1 root root 7 ... bin -> usr/bin». Что такое /bin?', 'ls -l показує «lrwxrwxrwx 1 root root 7 ... bin -> usr/bin». Що таке /bin?'),
             [L('A symbolic link to /usr/bin', 'Символическая ссылка на /usr/bin', 'Символьне посилання на /usr/bin'), L('A copy of /usr/bin', 'Копия /usr/bin', 'Копія /usr/bin'), L('A device', 'Устройство', 'Пристрій')], 0),
        quiz(L('photo.jpg was renamed to photo.txt. What does "file photo.txt" say?', 'photo.jpg переименовали в photo.txt. Что скажет «file photo.txt»?', 'photo.jpg перейменували на photo.txt. Що скаже «file photo.txt»?'),
             [L('JPEG image data — file looks at the content', 'JPEG image data — file смотрит на содержимое', 'JPEG image data — file дивиться на вміст'), L('ASCII text', 'ASCII text', 'ASCII text'), L('An error', 'Ошибку', 'Помилку')], 0),
    ]),
]

module('13-fhs.json', 'fhs', '/linux/fhs', 'map',
       L('Linux filesystem tour', 'Устройство файловой системы', 'Будова файлової системи'),
       L('/etc, /var, /tmp, /usr and friends; PATH and file types.', '/etc, /var, /tmp, /usr и компания; PATH и типы файлов.', '/etc, /var, /tmp, /usr і компанія; PATH і типи файлів.'),
       fhs)

# ---------------------------------------------------------------- users

USERS = {"hostname": "trainer", "users": [{"name": "www-data", "uid": 33, "home": "/var/www"}, {"name": "olena", "uid": 1001, "groups": ["olena", "developers"]}],
         "files": {"/srv/": None}}

users = [
    lesson('users-id', L('Who am I, really?', 'Кто я на самом деле?', 'Хто я насправді?'), ['id', 'groups', 'whoami'], setup=USERS, steps=[
        theory(L(
            """## Users and groups
Every process runs **as a user**. Each user has:
- a **UID** — the number the kernel actually uses (root = 0)
- a **primary group** and any number of **supplementary groups**

Groups give shared rights: everyone in `developers` can write to the project folder; everyone in `sudo` may become root.
```
$ whoami
$ id
$ groups
$ id olena
```
## System users
`www-data`, `postgres`, `syslog`… are not people. Services run under them so that a hacked web server cannot read your home folder.""",
            """## Пользователи и группы
Каждый процесс работает **от имени пользователя**. У пользователя есть:
- **UID** — число, которым на самом деле оперирует ядро (root = 0)
- **основная группа** и сколько угодно **дополнительных групп**

Группы дают общие права: все из `developers` могут писать в папку проекта; все из `sudo` могут стать root.
```
$ whoami
$ id
$ groups
$ id olena
```
## Системные пользователи
`www-data`, `postgres`, `syslog`… — не люди. Сервисы работают от их имени, чтобы взломанный веб-сервер не мог прочитать вашу домашнюю папку.""",
            """## Користувачі та групи
Кожен процес працює **від імені користувача**. У користувача є:
- **UID** — число, яким насправді оперує ядро (root = 0)
- **основна група** і скільки завгодно **додаткових груп**

Групи дають спільні права: усі з `developers` можуть писати в папку проєкту; усі з `sudo` можуть стати root.
```
$ whoami
$ id
$ groups
$ id olena
```
## Системні користувачі
`www-data`, `postgres`, `syslog`… — не люди. Сервіси працюють від їхнього імені, щоб зламаний вебсервер не міг прочитати вашу домашню папку."""),
            title=L('Identity', 'Идентичность', 'Ідентичність'), demo=['id']),
        task(L('Show your UID and all your groups with one command.', 'Покажите свой UID и все группы одной командой.', 'Покажіть свій UID і всі групи однією командою.'),
             [used('id', L('id', 'id', 'id')), out(L('uid=1000', 'uid=1000', 'uid=1000'), text='uid=1000')],
             L('id', 'id', 'id'), 'id', ['id']),
        task(L('Which groups is olena in?', 'В каких группах состоит olena?', 'У яких групах перебуває olena?'),
             [used('groups', L('groups olena (or id olena)', 'groups olena (или id olena)', 'groups olena (або id olena)')), out(L('developers', 'developers', 'developers'), text='developers')],
             L('groups olena', 'groups olena', 'groups olena'), 'groups', ['groups olena']),
        quiz(L('What does UID 0 mean?', 'Что означает UID 0?', 'Що означає UID 0?'),
             [L('root — the all-powerful administrator', 'root — всемогущий администратор', 'root — всемогутній адміністратор'), L('a deleted user', 'удалённый пользователь', 'видалений користувач'), L('a guest', 'гость', 'гість')], 0),
        quiz(L('Why does nginx run as www-data and not as root?', 'Почему nginx работает от www-data, а не от root?', 'Чому nginx працює від www-data, а не від root?'),
             [L('If it is hacked, the attacker gets only www-data\'s limited rights', 'Если его взломают, атакующий получит лишь ограниченные права www-data', 'Якщо його зламають, атакувальник отримає лише обмежені права www-data'), L('root is slower', 'root медленнее', 'root повільніший'), L('It is a tradition only', 'Это просто традиция', 'Це просто традиція')], 0),
    ]),

    lesson('users-add', L('Creating users', 'Создание пользователей', 'Створення користувачів'), ['useradd', 'passwd', 'sudo'], setup=USERS, steps=[
        theory(L(
            """## useradd
```
$ sudo useradd -m -s /bin/bash anna
$ sudo passwd anna
$ id anna
```
- `-m` — create the home folder `/home/anna` (without it there is none!)
- `-s /bin/bash` — the login shell
- `-G developers` — extra groups right away

On Debian/Ubuntu there is also the friendly `adduser`, which asks questions interactively.

## Deleting
```
$ sudo userdel -r anna
```
`-r` removes the home folder too — think twice.

> All these commands change /etc/passwd and /etc/group, so they need **sudo**.""",
            """## useradd
```
$ sudo useradd -m -s /bin/bash anna
$ sudo passwd anna
$ id anna
```
- `-m` — создать домашнюю папку `/home/anna` (без него её не будет!)
- `-s /bin/bash` — оболочка входа
- `-G developers` — сразу дополнительные группы

В Debian/Ubuntu есть ещё дружелюбный `adduser`, который задаёт вопросы интерактивно.

## Удаление
```
$ sudo userdel -r anna
```
`-r` удаляет и домашнюю папку — подумайте дважды.

> Все эти команды меняют /etc/passwd и /etc/group, поэтому им нужен **sudo**.""",
            """## useradd
```
$ sudo useradd -m -s /bin/bash anna
$ sudo passwd anna
$ id anna
```
- `-m` — створити домашню папку `/home/anna` (без нього її не буде!)
- `-s /bin/bash` — оболонка входу
- `-G developers` — одразу додаткові групи

У Debian/Ubuntu є ще дружній `adduser`, який ставить питання інтерактивно.

## Видалення
```
$ sudo userdel -r anna
```
`-r` видаляє й домашню папку — подумайте двічі.

> Усі ці команди змінюють /etc/passwd і /etc/group, тому їм потрібен **sudo**."""),
            title=L('New colleague', 'Новый коллега', 'Новий колега')),
        task(L('A new colleague, anna, starts today. Create her account with a home folder and bash as the shell.', 'Сегодня выходит новая коллега anna. Создайте ей учётную запись с домашней папкой и оболочкой bash.', 'Сьогодні виходить нова колега anna. Створіть їй обліковий запис із домашньою папкою та оболонкою bash.'),
             [uexists('anna', L('User anna exists', 'Пользователь anna создан', 'Користувача anna створено')), dexists('/home/anna', L('/home/anna exists', '/home/anna создана', '/home/anna створено')), fcontains('/etc/passwd', L('Her shell is /bin/bash', 'Её оболочка /bin/bash', 'Її оболонка /bin/bash'), regex='^anna:.*:/bin/bash$')],
             L('sudo useradd -m -s /bin/bash anna', 'sudo useradd -m -s /bin/bash anna', 'sudo useradd -m -s /bin/bash anna'), 'useradd', ['sudo useradd -m -s /bin/bash anna']),
        task(L('Set a password for anna.', 'Задайте пароль для anna.', 'Задайте пароль для anna.'),
             [used('passwd', L('sudo passwd anna', 'sudo passwd anna', 'sudo passwd anna'), success=True), out(L('password updated', 'password updated', 'password updated'), text='updated successfully')],
             L('sudo passwd anna', 'sudo passwd anna', 'sudo passwd anna'), 'passwd', ['sudo passwd anna'], prepare=['sudo useradd -m -s /bin/bash anna']),
        task(L('An intern account "intern1" is no longer needed. Delete it together with its home folder.', 'Учётка стажёра «intern1» больше не нужна. Удалите её вместе с домашней папкой.', 'Обліковий запис стажера «intern1» більше не потрібен. Видаліть його разом із домашньою папкою.'),
             [uexists('intern1', L('intern1 is gone', 'intern1 удалён', 'intern1 видалено'), exists=False), gone('/home/intern1', L('/home/intern1 is gone', '/home/intern1 удалена', '/home/intern1 видалено'))],
             L('sudo userdel -r intern1', 'sudo userdel -r intern1', 'sudo userdel -r intern1'), 'userdel', ['sudo userdel -r intern1'], prepare=['sudo useradd -m intern1']),
        quiz(L('You ran "sudo useradd bob" (without -m). What is missing?', 'Вы выполнили «sudo useradd bob» (без -m). Чего не хватает?', 'Ви виконали «sudo useradd bob» (без -m). Чого бракує?'),
             [L('His home folder /home/bob', 'Его домашней папки /home/bob', 'Його домашньої папки /home/bob'), L('His UID', 'Его UID', 'Його UID'), L('Nothing', 'Ничего', 'Нічого')], 0),
    ]),

    lesson('users-groups', L('Groups and a shared folder', 'Группы и общая папка', 'Групи та спільна папка'), ['groupadd', 'usermod', 'chown', 'chmod'], setup=USERS, steps=[
        reading(L(
            """## The classic task: a team folder
"Anna and Olena must both edit files in /srv/project, others must not."
1. Create a group: `sudo groupadd webteam`
2. Add the people: `sudo usermod -aG webteam olena`
3. Give the folder to the group: `sudo chown :webteam /srv/project`
4. Rights: `sudo chmod 2770 /srv/project`

## What is 2770?
- `770` — owner and group: everything; others: nothing
- `2` — the **setgid** bit on a folder: new files inside automatically get the folder's group

## -aG, not -G!
`usermod -G webteam olena` **replaces** all her groups — she may lose `sudo` or `developers`. Always `-aG` (append).

> Group changes apply at the **next login** of that user.""",
            """## Классическая задача: папка команды
«Анна и Олена обе должны редактировать файлы в /srv/project, остальные — нет.»
1. Создайте группу: `sudo groupadd webteam`
2. Добавьте людей: `sudo usermod -aG webteam olena`
3. Отдайте папку группе: `sudo chown :webteam /srv/project`
4. Права: `sudo chmod 2770 /srv/project`

## Что такое 2770?
- `770` — владелец и группа: всё; остальные: ничего
- `2` — бит **setgid** на папке: новые файлы внутри автоматически получают группу папки

## -aG, а не -G!
`usermod -G webteam olena` **заменяет** все её группы — она может потерять `sudo` или `developers`. Всегда `-aG` (append — добавить).

> Изменения групп вступают в силу при **следующем входе** пользователя.""",
            """## Класичне завдання: папка команди
«Анна та Олена обидві мають редагувати файли в /srv/project, інші — ні.»
1. Створіть групу: `sudo groupadd webteam`
2. Додайте людей: `sudo usermod -aG webteam olena`
3. Віддайте папку групі: `sudo chown :webteam /srv/project`
4. Права: `sudo chmod 2770 /srv/project`

## Що таке 2770?
- `770` — власник і група: усе; інші: нічого
- `2` — біт **setgid** на папці: нові файли всередині автоматично отримують групу папки

## -aG, а не -G!
`usermod -G webteam olena` **замінює** всі її групи — вона може втратити `sudo` або `developers`. Завжди `-aG` (append — додати).

> Зміни груп набувають чинності під час **наступного входу** користувача."""),
            title=L('Team access', 'Доступ для команды', 'Доступ для команди')),
        task(L('Create the group webteam and add olena and yourself (student) to it.', 'Создайте группу webteam и добавьте в неё olena и себя (student).', 'Створіть групу webteam і додайте до неї olena та себе (student).'),
             [uexists('olena', L('olena is in webteam', 'olena в webteam', 'olena у webteam'), group='webteam'), uexists('olena', L('olena kept developers', 'olena осталась в developers', 'olena лишилася в developers'), group='developers'), uexists('student', L('student is in webteam', 'student в webteam', 'student у webteam'), group='webteam'), uexists('student', L('student kept sudo', 'student остался в sudo', 'student лишився в sudo'), group='sudo')],
             L('sudo groupadd webteam; sudo usermod -aG webteam olena; ...', 'sudo groupadd webteam; sudo usermod -aG webteam olena; ...', 'sudo groupadd webteam; sudo usermod -aG webteam olena; ...'), 'usermod',
             ['sudo groupadd webteam', 'sudo usermod -aG webteam olena', 'sudo usermod -aG webteam student'],
             instructions=L('1. `sudo groupadd webteam`\n2. `sudo usermod -aG webteam olena`\n3. `sudo usermod -aG webteam student`\n4. Check: `groups olena`', '1. `sudo groupadd webteam`\n2. `sudo usermod -aG webteam olena`\n3. `sudo usermod -aG webteam student`\n4. Проверка: `groups olena`', '1. `sudo groupadd webteam`\n2. `sudo usermod -aG webteam olena`\n3. `sudo usermod -aG webteam student`\n4. Перевірка: `groups olena`')),
        task(L('Create /srv/project, give it to the group webteam and set permissions 2770.', 'Создайте /srv/project, отдайте её группе webteam и выставьте права 2770.', 'Створіть /srv/project, віддайте її групі webteam і виставте права 2770.'),
             [dexists('/srv/project', L('/srv/project exists', '/srv/project создана', '/srv/project створено')), owner('/srv/project', L('Group is webteam', 'Группа webteam', 'Група webteam'), group='webteam'), mode('/srv/project', '2770', L('Mode 2770 (drwxrws---)', 'Права 2770 (drwxrws---)', 'Права 2770 (drwxrws---)'))],
             L('sudo mkdir, sudo chown :webteam, sudo chmod 2770', 'sudo mkdir, sudo chown :webteam, sudo chmod 2770', 'sudo mkdir, sudo chown :webteam, sudo chmod 2770'), 'chmod',
             ['sudo mkdir /srv/project', 'sudo chown :webteam /srv/project', 'sudo chmod 2770 /srv/project'], prepare=['sudo groupadd webteam'], xp=30),
        predict('ls -ld /srv/project', ['drwxrws--- 2 root webteam 4096 Oct 31 12:00 /srv/project', 'drwxrwx--- 2 root webteam 4096 Oct 31 12:00 /srv/project', 'drwxr-xr-x 2 root root 4096 Oct 31 12:00 /srv/project'], 0,
                L('The setgid bit shows as "s" in place of the group x.', 'Бит setgid показывается как «s» на месте x группы.', 'Біт setgid показується як «s» на місці x групи.'), setup=USERS, prepare=['sudo groupadd webteam', 'sudo mkdir /srv/project', 'sudo chown :webteam /srv/project', 'sudo chmod 2770 /srv/project'], context=['ls /srv']),
        quiz(L('What happens after "sudo usermod -G webteam student" (no -a)?', 'Что будет после «sudo usermod -G webteam student» (без -a)?', 'Що буде після «sudo usermod -G webteam student» (без -a)?'),
             [L('student loses all other supplementary groups, including sudo', 'student теряет все остальные доп. группы, включая sudo', 'student втрачає всі інші додаткові групи, зокрема sudo'), L('Nothing different from -aG', 'То же, что -aG', 'Те саме, що -aG'), L('An error', 'Ошибка', 'Помилка')], 0),
    ]),

    lesson('users-switch', L('su, sudo and root', 'su, sudo и root', 'su, sudo і root'), ['sudo', 'su', 'exit'], setup=USERS, steps=[
        theory(L(
            """## Becoming another user
| command | what it does |
|---|---|
| `sudo CMD` | run one command as root (asks **your** password) |
| `sudo -i` | an interactive root shell; leave with `exit` |
| `sudo -u olena CMD` | run a command as olena |
| `su - olena` | log in as olena (asks **her** password) |
| `sudo -l` | what am I allowed to do with sudo? |

Who may use sudo is decided by the `sudo` group (Ubuntu) or `wheel` (RHEL) and by the file `/etc/sudoers` (edit only with `visudo`!).

> Work as a normal user, use sudo for single commands. A root shell left open is an accident waiting to happen. Every sudo is written to /var/log/auth.log.""",
            """## Стать другим пользователем
| команда | что делает |
|---|---|
| `sudo CMD` | выполнить одну команду от root (спрашивает **ваш** пароль) |
| `sudo -i` | интерактивная оболочка root; выход — `exit` |
| `sudo -u olena CMD` | выполнить команду от olena |
| `su - olena` | войти как olena (спрашивает **её** пароль) |
| `sudo -l` | что мне разрешено через sudo? |

Кто может пользоваться sudo, решает группа `sudo` (Ubuntu) или `wheel` (RHEL) и файл `/etc/sudoers` (правьте только через `visudo`!).

> Работайте обычным пользователем, sudo — для отдельных команд. Забытая открытая root-оболочка — авария, которая ждёт своего часа. Каждый sudo записывается в /var/log/auth.log.""",
            """## Стати іншим користувачем
| команда | що робить |
|---|---|
| `sudo CMD` | виконати одну команду від root (питає **ваш** пароль) |
| `sudo -i` | інтерактивна оболонка root; вихід — `exit` |
| `sudo -u olena CMD` | виконати команду від olena |
| `su - olena` | увійти як olena (питає **її** пароль) |
| `sudo -l` | що мені дозволено через sudo? |

Хто може користуватися sudo, вирішує група `sudo` (Ubuntu) або `wheel` (RHEL) і файл `/etc/sudoers` (правте лише через `visudo`!).

> Працюйте звичайним користувачем, sudo — для окремих команд. Забута відкрита root-оболонка — аварія, що чекає свого часу. Кожен sudo записується в /var/log/auth.log."""),
            title=L('Switching users', 'Смена пользователя', 'Зміна користувача'), demo=['sudo -l']),
        task(L('Open a root shell, check who you are, and then leave it again.', 'Откройте оболочку root, проверьте, кто вы, и выйдите из неё.', 'Відкрийте оболонку root, перевірте, хто ви, і вийдіть із неї.'),
             [used('sudo', L('sudo -i', 'sudo -i', 'sudo -i'), flags=['-i']), used('whoami', L('whoami as root', 'whoami под root', 'whoami під root')), used('exit', L('exit', 'exit', 'exit')), _c({"type": "userIs", "user": "student"}, L('You are student again', 'Вы снова student', 'Ви знову student'))],
             L('sudo -i, whoami, exit', 'sudo -i, whoami, exit', 'sudo -i, whoami, exit'), 'sudo', ['sudo -i', 'whoami', 'exit'],
             instructions=L('1. `sudo -i`\n2. `whoami` → root\n3. `exit`', '1. `sudo -i`\n2. `whoami` → root\n3. `exit`', '1. `sudo -i`\n2. `whoami` → root\n3. `exit`')),
        task(L('Run "whoami" as the user www-data — without becoming root.', 'Выполните «whoami» от имени www-data — не становясь root.', 'Виконайте «whoami» від імені www-data — не стаючи root.'),
             [used('sudo', L('sudo -u www-data', 'sudo -u www-data', 'sudo -u www-data'), flags=['-u']), out(L('www-data', 'www-data', 'www-data'), regex='^www-data$')],
             L('sudo -u USER COMMAND', 'sudo -u ПОЛЬЗОВАТЕЛЬ КОМАНДА', 'sudo -u КОРИСТУВАЧ КОМАНДА'), 'sudo', ['sudo -u www-data whoami']),
        quiz(L('sudo asks for a password. Whose?', 'sudo спрашивает пароль. Чей?', 'sudo питає пароль. Чий?'),
             [L('Yours', 'Ваш', 'Ваш'), L('root\'s', 'root', 'root'), L('The target user\'s', 'Целевого пользователя', 'Цільового користувача')], 0),
        quiz(L('Why edit /etc/sudoers only with visudo?', 'Почему /etc/sudoers правят только через visudo?', 'Чому /etc/sudoers правлять лише через visudo?'),
             [L('It checks the syntax: a broken sudoers can lock everyone out of sudo', 'Он проверяет синтаксис: сломанный sudoers может отрезать всех от sudo', 'Він перевіряє синтаксис: зламаний sudoers може відрізати всіх від sudo'), L('It is faster', 'Так быстрее', 'Так швидше'), L('nano cannot open it', 'nano не может его открыть', 'nano не може його відкрити')], 0),
    ]),
]

module('14-users.json', 'users', '/linux/users', 'users',
       L('Users and groups', 'Пользователи и группы', 'Користувачі та групи'),
       L('id, useradd, groups, a shared team folder, sudo and su.', 'id, useradd, группы, общая папка команды, sudo и su.', 'id, useradd, групи, спільна папка команди, sudo і su.'),
       users)

# ---------------------------------------------------------------- processes

P = lambda pid, user, cmd, cpu, mem, rss, stat='S', start='09:00': {"pid": pid, "user": user, "command": cmd, "cpu": cpu, "mem": mem, "rss": rss, "stat": stat, "start": start}
PROCS = {"hostname": "trainer", "users": [{"name": "www-data", "uid": 33, "home": "/var/www"}, {"name": "postgres", "uid": 114, "home": "/var/lib/postgresql"}],
         "processes": [
             P(1, 'root', '/sbin/init', 0.0, 0.3, 12400, 'Ss'),
             P(412, 'root', '/usr/sbin/cron -f', 0.0, 0.1, 2800, 'Ss'),
             P(538, 'root', 'sshd: /usr/sbin/sshd -D', 0.0, 0.2, 8100, 'Ss'),
             P(700, 'postgres', '/usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main', 1.5, 6.2, 250000, 'Ss'),
             P(901, 'root', 'nginx: master process /usr/sbin/nginx', 0.0, 0.2, 7000, 'Ss'),
             P(902, 'www-data', 'nginx: worker process', 0.3, 0.4, 9100),
             P(903, 'www-data', 'nginx: worker process', 0.2, 0.4, 9050),
             P(1200, 'student', '-bash', 0.0, 0.1, 5200, 'Ss', '09:05'),
             P(3100, 'student', 'python3 resize_photos.py', 96.0, 9.5, 380000, 'R', '10:20'),
             P(3150, 'student', 'tail -f /var/log/syslog', 0.0, 0.0, 1800, 'S', '10:25'),
             P(3160, 'student', 'sleep 3600', 0.0, 0.0, 900, 'S', '10:26'),
             P(3161, 'student', 'sleep 7200', 0.0, 0.0, 900, 'S', '10:26'),
         ]}

procs = [
    lesson('proc-basics', L('What is a process', 'Что такое процесс', 'Що таке процес'), ['ps'], setup=PROCS, steps=[
        theory(L(
            """## Program vs process
A **program** is a file on disk (`/usr/bin/python3`). A **process** is a running copy of it with its own number — **PID**, owner, memory and state.

## ps aux — every process
| column | meaning |
|---|---|
| USER | who runs it |
| PID | process ID |
| %CPU, %MEM | share of CPU / memory |
| RSS | real memory in KiB |
| STAT | state: `R` running, `S` sleeping, `D` waiting for disk, `Z` zombie, `T` stopped |
| START, TIME | when started, CPU time used |
| COMMAND | the command line |

```
$ ps aux
$ ps -ef
$ ps -u student
```
> PID 1 (`init` / `systemd`) is the ancestor of all processes. Every process has a parent (PPID).""",
            """## Программа и процесс
**Программа** — файл на диске (`/usr/bin/python3`). **Процесс** — её запущенная копия со своим номером — **PID**, владельцем, памятью и состоянием.

## ps aux — все процессы
| колонка | значение |
|---|---|
| USER | кто запустил |
| PID | идентификатор процесса |
| %CPU, %MEM | доля процессора / памяти |
| RSS | реальная память в КиБ |
| STAT | состояние: `R` работает, `S` спит, `D` ждёт диск, `Z` зомби, `T` остановлен |
| START, TIME | когда запущен, сколько процессорного времени съел |
| COMMAND | командная строка |

```
$ ps aux
$ ps -ef
$ ps -u student
```
> PID 1 (`init` / `systemd`) — предок всех процессов. У каждого процесса есть родитель (PPID).""",
            """## Програма і процес
**Програма** — файл на диску (`/usr/bin/python3`). **Процес** — її запущена копія зі своїм номером — **PID**, власником, пам’яттю та станом.

## ps aux — усі процеси
| колонка | значення |
|---|---|
| USER | хто запустив |
| PID | ідентифікатор процесу |
| %CPU, %MEM | частка процесора / пам’яті |
| RSS | реальна пам’ять у КіБ |
| STAT | стан: `R` працює, `S` спить, `D` чекає диск, `Z` зомбі, `T` зупинений |
| START, TIME | коли запущено, скільки процесорного часу з’їв |
| COMMAND | командний рядок |

```
$ ps aux
$ ps -ef
$ ps -u student
```
> PID 1 (`init` / `systemd`) — предок усіх процесів. Кожен процес має батька (PPID)."""),
            title=L('Processes', 'Процессы', 'Процеси'), demo=['ps aux']),
        task(L('Show only your own processes.', 'Покажите только свои процессы.', 'Покажіть лише свої процеси.'),
             [used('ps', L('ps -u student', 'ps -u student', 'ps -u student'), flags=['-u']), out(L('resize_photos.py is visible', 'Виден resize_photos.py', 'Видно resize_photos.py'), text='python3'), out(L('No postgres lines', 'Нет строк postgres', 'Немає рядків postgres'), regex='^(?![\\s\\S]*postgres)')],
             L('ps -u student', 'ps -u student', 'ps -u student'), 'ps', ['ps -u student']),
        task(L('Show all processes of the postgres user in full BSD format (with %CPU and %MEM).', 'Покажите все процессы пользователя postgres в полном BSD-формате (с %CPU и %MEM).', 'Покажіть усі процеси користувача postgres у повному BSD-форматі (з %CPU і %MEM).'),
             [used('ps', L('ps u -U postgres', 'ps u -U postgres', 'ps u -U postgres')), out(L('%MEM header', 'Заголовок %MEM', 'Заголовок %MEM'), text='%MEM'), out(L('The postgres server', 'Сервер postgres', 'Сервер postgres'), text='postgresql/16')],
             L('ps u -U postgres', 'ps u -U postgres', 'ps u -U postgres'), 'ps', ['ps u -U postgres']),
        quiz(L('A process has STAT "D" for a long time. What is it doing?', 'У процесса долго STAT «D». Что он делает?', 'У процесу довго STAT «D». Що він робить?'),
             [L('Waiting for disk / I/O — it cannot even be killed until the I/O ends', 'Ждёт диск / ввод-вывод — его не убить, пока I/O не закончится', 'Чекає диск / ввід-вивід — його не вбити, доки I/O не закінчиться'), L('Running at full speed', 'Работает на полной скорости', 'Працює на повній швидкості'), L('It is dead', 'Он мёртв', 'Він мертвий')], 0),
    ]),

    lesson('proc-find', L('Finding processes', 'Поиск процессов', 'Пошук процесів'), ['pgrep', 'ps', 'grep'], setup=PROCS, steps=[
        theory(L(
            """## Three ways
```
$ ps aux | grep nginx
$ pgrep -a nginx
$ pgrep -u www-data -l nginx
```
`ps aux | grep` also finds **the grep itself** — a classic trap. `pgrep` does not.

## pgrep options
- `-a` — show the full command line
- `-l` — show the name
- `-f` — search in the whole command line, not just the name (`pgrep -f resize_photos`)
- `-u USER` — only this user's processes
- `-c` — count

> Before killing by name, always look first with `pgrep -a`.""",
            """## Три способа
```
$ ps aux | grep nginx
$ pgrep -a nginx
$ pgrep -u www-data -l nginx
```
`ps aux | grep` находит и **сам grep** — классическая ловушка. `pgrep` — нет.

## Опции pgrep
- `-a` — полная командная строка
- `-l` — имя
- `-f` — искать по всей командной строке, а не только по имени (`pgrep -f resize_photos`)
- `-u USER` — только процессы этого пользователя
- `-c` — посчитать

> Прежде чем убивать по имени, всегда сначала посмотрите через `pgrep -a`.""",
            """## Три способи
```
$ ps aux | grep nginx
$ pgrep -a nginx
$ pgrep -u www-data -l nginx
```
`ps aux | grep` знаходить і **сам grep** — класична пастка. `pgrep` — ні.

## Опції pgrep
- `-a` — повний командний рядок
- `-l` — ім’я
- `-f` — шукати по всьому командному рядку, а не лише за ім’ям (`pgrep -f resize_photos`)
- `-u USER` — лише процеси цього користувача
- `-c` — порахувати

> Перш ніж убивати за ім’ям, завжди спершу подивіться через `pgrep -a`."""),
            title=L('pgrep', 'pgrep', 'pgrep'), demo=['pgrep -a nginx']),
        task(L('Find the PIDs of all nginx processes with their command lines.', 'Найдите PID всех процессов nginx с их командными строками.', 'Знайдіть PID усіх процесів nginx з їхніми командними рядками.'),
             [used('pgrep', L('pgrep -a', 'pgrep -a', 'pgrep -a'), flags=['-a']), lines(L('3 nginx processes', '3 процесса nginx', '3 процеси nginx'), eq=3)],
             L('pgrep -a nginx', 'pgrep -a nginx', 'pgrep -a nginx'), 'pgrep', ['pgrep -a nginx']),
        task(L('How many nginx WORKER processes run as www-data?', 'Сколько рабочих (worker) процессов nginx работает от www-data?', 'Скільки робочих (worker) процесів nginx працює від www-data?'),
             [used('pgrep', L('pgrep -c -u www-data', 'pgrep -c -u www-data', 'pgrep -c -u www-data'), flags=['-c']), out(L('2', '2', '2'), regex='^2$')],
             L('pgrep -c -u www-data nginx', 'pgrep -c -u www-data nginx', 'pgrep -c -u www-data nginx'), 'pgrep', ['pgrep -c -u www-data nginx']),
        task(L('Find the PID of the photo script by a part of its file name: resize_photos.', 'Найдите PID скрипта с фото по части имени файла: resize_photos.', 'Знайдіть PID скрипта з фото за частиною назви файлу: resize_photos.'),
             [used('pgrep', L('pgrep -f', 'pgrep -f', 'pgrep -f'), flags=['-f']), out(L('3100', '3100', '3100'), regex='3100')],
             L('Its name is python3 — so search the full command line with -f.', 'Его имя — python3, поэтому ищите по всей строке через -f.', 'Його ім’я — python3, тому шукайте по всьому рядку через -f.'), 'pgrep', ['pgrep -f resize_photos']),
        predict('ps aux | grep -c sleep', ['3', '2', '1'], 0,
                L('Two sleep processes plus the grep itself — its command line "grep -c sleep" also contains "sleep".', 'Два процесса sleep плюс сам grep, в чьей командной строке тоже есть «sleep».', 'Два процеси sleep плюс сам grep, у командному рядку якого теж є «sleep».'), setup=PROCS, context=['pgrep -a sleep']),
    ]),

    lesson('proc-signals', L('Signals: TERM and KILL', 'Сигналы: TERM и KILL', 'Сигнали: TERM і KILL'), ['kill', 'pkill', 'killall'], setup=PROCS, steps=[
        theory(L(
            """## kill sends signals
`kill` does not necessarily kill — it sends a **signal**.

| signal | number | meaning |
|---|---|---|
| SIGTERM | 15 | "please finish" — the default, the process can clean up |
| SIGKILL | 9 | immediate death by the kernel, no cleanup |
| SIGHUP | 1 | "reload the config" for many daemons |
| SIGINT | 2 | what **Ctrl+C** sends |
| SIGSTOP / SIGCONT | 19 / 18 | pause / resume (Ctrl+Z) |

```
$ kill 3100
$ kill -9 3100
$ pkill -f resize_photos
$ killall sleep
```
## The right order
1. `kill PID` (TERM) and wait a few seconds
2. only if it ignores you — `kill -9 PID`

> `kill -9` on a database may corrupt data: it has no chance to write its buffers.""",
            """## kill отправляет сигналы
`kill` не обязательно убивает — он отправляет **сигнал**.

| сигнал | номер | значение |
|---|---|---|
| SIGTERM | 15 | «пожалуйста, завершись» — по умолчанию, процесс может прибраться |
| SIGKILL | 9 | мгновенная смерть от ядра, без уборки |
| SIGHUP | 1 | для многих демонов — «перечитай конфиг» |
| SIGINT | 2 | то, что отправляет **Ctrl+C** |
| SIGSTOP / SIGCONT | 19 / 18 | пауза / продолжение (Ctrl+Z) |

```
$ kill 3100
$ kill -9 3100
$ pkill -f resize_photos
$ killall sleep
```
## Правильный порядок
1. `kill PID` (TERM) и подождать несколько секунд
2. только если не реагирует — `kill -9 PID`

> `kill -9` для базы данных может испортить данные: она не успеет записать буферы.""",
            """## kill надсилає сигнали
`kill` не обов’язково вбиває — він надсилає **сигнал**.

| сигнал | номер | значення |
|---|---|---|
| SIGTERM | 15 | «будь ласка, завершися» — за замовчуванням, процес може прибрати |
| SIGKILL | 9 | миттєва смерть від ядра, без прибирання |
| SIGHUP | 1 | для багатьох демонів — «перечитай конфіг» |
| SIGINT | 2 | те, що надсилає **Ctrl+C** |
| SIGSTOP / SIGCONT | 19 / 18 | пауза / продовження (Ctrl+Z) |

```
$ kill 3100
$ kill -9 3100
$ pkill -f resize_photos
$ killall sleep
```
## Правильний порядок
1. `kill PID` (TERM) і зачекати кілька секунд
2. лише якщо не реагує — `kill -9 PID`

> `kill -9` для бази даних може зіпсувати дані: вона не встигне записати буфери."""),
            title=L('Stopping processes', 'Остановка процессов', 'Зупинка процесів'), demo=['kill -l']),
        task(L('The photo script eats the CPU. Stop it politely (SIGTERM) by its PID.', 'Скрипт с фото съедает процессор. Остановите его вежливо (SIGTERM) по PID.', 'Скрипт із фото з’їдає процесор. Зупиніть його ввічливо (SIGTERM) за PID.'),
             [used('kill', L('kill PID (no -9)', 'kill PID (без -9)', 'kill PID (без -9)')), proc_gone('resize_photos', L('The script is stopped', 'Скрипт остановлен', 'Скрипт зупинено'))],
             L('pgrep -f resize_photos, then kill PID', 'pgrep -f resize_photos, затем kill PID', 'pgrep -f resize_photos, потім kill PID'), 'kill', ['kill 3100']),
        task(L('Stop all "sleep" processes at once by name.', 'Остановите все процессы «sleep» разом по имени.', 'Зупиніть усі процеси «sleep» разом за назвою.'),
             [proc_gone('sleep', L('No sleep processes left', 'Процессов sleep не осталось', 'Процесів sleep не лишилося'))],
             L('killall sleep  or  pkill sleep', 'killall sleep  или  pkill sleep', 'killall sleep  або  pkill sleep'), 'killall', ['killall sleep']),
        task(L('Try to stop the nginx worker 902 as yourself. What does Linux say?', 'Попробуйте остановить воркер nginx 902 от своего имени. Что ответит Linux?', 'Спробуйте зупинити воркер nginx 902 від свого імені. Що відповість Linux?'),
             [used('kill', L('kill 902', 'kill 902', 'kill 902')), out(L('Operation not permitted', 'Operation not permitted', 'Operation not permitted'), text='Operation not permitted')],
             L('kill 902', 'kill 902', 'kill 902'), 'kill', ['kill 902']),
        quiz(L('What do you press to send SIGINT to the program running in your terminal?', 'Что нажать, чтобы отправить SIGINT программе в вашем терминале?', 'Що натиснути, щоб надіслати SIGINT програмі у вашому терміналі?'),
             [L('Ctrl+C', 'Ctrl+C', 'Ctrl+C'), L('Ctrl+D', 'Ctrl+D', 'Ctrl+D'), L('Ctrl+S', 'Ctrl+S', 'Ctrl+S')], 0),
        quiz(L('"pkill a" — why is it dangerous?', '«pkill a» — чем опасно?', '«pkill a» — чим небезпечно?'),
             [L('It matches every process with "a" in its name', 'Совпадёт с каждым процессом, у которого в имени есть «a»', 'Збіжиться з кожним процесом, у назві якого є «a»'), L('It kills only process "a"', 'Убьёт только процесс «a»', 'Уб’є лише процес «a»'), L('It reboots', 'Перезагрузит', 'Перезавантажить')], 0),
    ]),

    lesson('proc-top', L('Who uses the resources', 'Кто потребляет ресурсы', 'Хто споживає ресурси'), ['top', 'ps'], setup=PROCS, steps=[
        theory(L(
            """## top — live view
```
$ top
```
In top: `P` — sort by CPU, `M` — by memory, `k` — kill, `q` — quit. `htop` is the colorful friend (if installed).

## Snapshots with ps
```
$ ps aux --sort=-%cpu | head -5
$ ps aux --sort=-%mem | head -5
$ ps aux --sort=-rss | head
```
`-` before the field = descending.

## 100% CPU — is that bad?
On a 4-core machine one process can show up to **400%**. A single busy process at 100% uses one core fully — fine for a batch job, a problem for a web server that should be idle.""",
            """## top — живой вид
```
$ top
```
В top: `P` — сортировка по CPU, `M` — по памяти, `k` — убить, `q` — выход. `htop` — цветной друг (если установлен).

## Снимки через ps
```
$ ps aux --sort=-%cpu | head -5
$ ps aux --sort=-%mem | head -5
$ ps aux --sort=-rss | head
```
`-` перед полем = по убыванию.

## 100% CPU — это плохо?
На 4-ядерной машине один процесс может показывать до **400%**. Процесс на 100% полностью занимает одно ядро — нормально для пакетной задачи, проблема для веб-сервера, который должен простаивать.""",
            """## top — живий вигляд
```
$ top
```
У top: `P` — сортування за CPU, `M` — за пам’яттю, `k` — убити, `q` — вихід. `htop` — кольоровий друг (якщо встановлено).

## Знімки через ps
```
$ ps aux --sort=-%cpu | head -5
$ ps aux --sort=-%mem | head -5
$ ps aux --sort=-rss | head
```
`-` перед полем = за спаданням.

## 100% CPU — це погано?
На 4-ядерній машині один процес може показувати до **400%**. Процес на 100% повністю займає одне ядро — нормально для пакетного завдання, проблема для вебсервера, який має простоювати."""),
            title=L('Resource hogs', 'Пожиратели ресурсов', 'Пожирачі ресурсів'), demo=['ps aux --sort=-%cpu | head -3']),
        task(L('Show the top 3 processes by CPU (plus the header line).', 'Покажите топ-3 процесса по CPU (плюс строка заголовка).', 'Покажіть топ-3 процеси за CPU (плюс рядок заголовка).'),
             [used('ps', L('ps --sort=-%cpu', 'ps --sort=-%cpu', 'ps --sort=-%cpu')), lines(L('4 lines', '4 строки', '4 рядки'), eq=4), out(L('python3 first', 'python3 первым', 'python3 першим'), regex='^student\\s+3100')],
             L('ps aux --sort=-%cpu | head -4', 'ps aux --sort=-%cpu | head -4', 'ps aux --sort=-%cpu | head -4'), 'ps', ['ps aux --sort=-%cpu | head -4']),
        task(L('Which process uses the most memory? Show the header and the first line.', 'Какой процесс использует больше всего памяти? Покажите заголовок и первую строку.', 'Який процес використовує найбільше пам’яті? Покажіть заголовок і перший рядок.'),
             [used('ps', L('ps --sort=-%mem', 'ps --sort=-%mem', 'ps --sort=-%mem')), lines(L('2 lines', '2 строки', '2 рядки'), eq=2), out(L('python3 (9.5%)', 'python3 (9.5%)', 'python3 (9.5%)'), text='resize_photos')],
             L('ps aux --sort=-%mem | head -2', 'ps aux --sort=-%mem | head -2', 'ps aux --sort=-%mem | head -2'), 'ps', ['ps aux --sort=-%mem | head -2']),
        quiz(L('top shows a process at 180% CPU. Possible?', 'top показывает процесс со 180% CPU. Такое возможно?', 'top показує процес зі 180% CPU. Таке можливо?'),
             [L('Yes, on a multi-core machine it uses almost two cores', 'Да, на многоядерной машине он занимает почти два ядра', 'Так, на багатоядерній машині він займає майже два ядра'), L('No, the maximum is 100%', 'Нет, максимум 100%', 'Ні, максимум 100%'), L('Only for root', 'Только для root', 'Лише для root')], 0),
    ]),

    lesson('proc-daemons', L('Daemons and services', 'Демоны и сервисы', 'Демони та сервіси'), ['systemctl'], steps=[
        theory(L(
            """## A daemon is a background process
cron, sshd, nginx, postgres — they start at boot and wait for work. On modern Linux **systemd** (PID 1) starts and supervises them.
```
$ systemctl status cron
$ systemctl list-units --type=service
$ sudo systemctl restart ssh
$ sudo systemctl enable nginx
```
- `start` / `stop` / `restart` — now
- `enable` / `disable` — at boot
- `status` — state + the latest log lines

> Do not kill a daemon's PID by hand — systemd may simply start it again. Use systemctl.""",
            """## Демон — фоновый процесс
cron, sshd, nginx, postgres — запускаются при загрузке и ждут работы. В современном Linux их запускает и контролирует **systemd** (PID 1).
```
$ systemctl status cron
$ systemctl list-units --type=service
$ sudo systemctl restart ssh
$ sudo systemctl enable nginx
```
- `start` / `stop` / `restart` — сейчас
- `enable` / `disable` — при загрузке
- `status` — состояние + последние строки лога

> Не убивайте PID демона руками — systemd может просто запустить его снова. Используйте systemctl.""",
            """## Демон — фоновий процес
cron, sshd, nginx, postgres — запускаються під час завантаження й чекають роботи. У сучасному Linux їх запускає й контролює **systemd** (PID 1).
```
$ systemctl status cron
$ systemctl list-units --type=service
$ sudo systemctl restart ssh
$ sudo systemctl enable nginx
```
- `start` / `stop` / `restart` — зараз
- `enable` / `disable` — під час завантаження
- `status` — стан + останні рядки логу

> Не вбивайте PID демона вручну — systemd може просто запустити його знову. Використовуйте systemctl."""),
            title=L('systemd', 'systemd', 'systemd'), demo=['systemctl status cron']),
        task(L('List all services on this machine.', 'Выведите все сервисы на этой машине.', 'Виведіть усі сервіси на цій машині.'),
             [used('systemctl', L('systemctl list-units', 'systemctl list-units', 'systemctl list-units')), out(L('cron.service is listed', 'Есть cron.service', 'Є cron.service'), text='cron.service')],
             L('systemctl list-units --type=service', 'systemctl list-units --type=service', 'systemctl list-units --type=service'), 'systemctl', ['systemctl list-units --type=service']),
        task(L('Restart the ssh service and check that it is active.', 'Перезапустите сервис ssh и проверьте, что он активен.', 'Перезапустіть сервіс ssh і перевірте, що він активний.'),
             [used('systemctl', L('sudo systemctl restart ssh', 'sudo systemctl restart ssh', 'sudo systemctl restart ssh'), args=['restart'], success=True), svc('ssh', 'active', L('ssh is active', 'ssh активен', 'ssh активний'))],
             L('sudo systemctl restart ssh', 'sudo systemctl restart ssh', 'sudo systemctl restart ssh'), 'systemctl', ['sudo systemctl restart ssh', 'systemctl is-active ssh']),
        quiz(L('A service must start automatically after every reboot. Which command?', 'Сервис должен запускаться сам после каждой перезагрузки. Какая команда?', 'Сервіс має запускатися сам після кожного перезавантаження. Яка команда?'),
             [L('sudo systemctl enable NAME', 'sudo systemctl enable ИМЯ', 'sudo systemctl enable НАЗВА'), L('sudo systemctl start NAME', 'sudo systemctl start ИМЯ', 'sudo systemctl start НАЗВА'), L('sudo systemctl restart NAME', 'sudo systemctl restart ИМЯ', 'sudo systemctl restart НАЗВА')], 0),
    ]),
]

module('15-processes.json', 'processes', '/linux/processes', 'activity',
       L('Processes and services', 'Процессы и сервисы', 'Процеси та сервіси'),
       L('ps, pgrep, signals, kill and pkill, resource hogs, systemd.', 'ps, pgrep, сигналы, kill и pkill, пожиратели ресурсов, systemd.', 'ps, pgrep, сигнали, kill і pkill, пожирачі ресурсів, systemd.'),
       procs)
