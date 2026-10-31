"""Glossary: terms with definitions; `match` lists word stems that get underlined in theory texts."""
import json, os
from lib import ROOT

G = []


def g(id, cat, term, definition, ru=(), uk=(), en=(), cmd=None):
    d = {"id": id, "category": cat, "term": {"en": term[0], "ru": term[1], "uk": term[2]},
         "definition": {"en": definition[0], "ru": definition[1], "uk": definition[2]},
         "match": {"en": [x.lower() for x in en] or [term[0].lower()], "ru": list(ru), "uk": list(uk)}}
    if cmd: d["command"] = cmd
    G.append(d)


# ---------------------------------------------------------------- basics
g('terminal', 'basics', ('Terminal', 'Терминал', 'Термінал'),
  ('A text window where you type commands and read the answers of the computer.', 'Текстовое окно, в котором вы вводите команды и читаете ответы компьютера.', 'Текстове вікно, у якому ви вводите команди й читаєте відповіді комп’ютера.'),
  ru=['терминал'], uk=['термінал'])
g('shell', 'basics', ('Shell', 'Оболочка (shell)', 'Оболонка (shell)'),
  ('The program that reads your commands, expands variables and patterns and starts other programs. On Ubuntu it is bash.', 'Программа, которая читает ваши команды, раскрывает переменные и шаблоны и запускает другие программы. В Ubuntu это bash.', 'Програма, що читає ваші команди, розгортає змінні й шаблони та запускає інші програми. В Ubuntu це bash.'),
  ru=['оболочк'], uk=['оболонк'], en=['shell'], cmd='bash')
g('bash', 'basics', ('bash', 'bash', 'bash'),
  ('Bourne-Again SHell — the most popular Linux shell and scripting language.', 'Bourne-Again SHell — самая популярная оболочка Linux и язык скриптов.', 'Bourne-Again SHell — найпопулярніша оболонка Linux і мова скриптів.'), cmd='bash')
g('command', 'basics', ('Command', 'Команда', 'Команда'),
  ('A program name plus arguments, e.g. ls -la /tmp. The first word is the program, the rest are options and arguments.', 'Имя программы плюс аргументы, например ls -la /tmp. Первое слово — программа, остальные — опции и аргументы.', 'Назва програми плюс аргументи, наприклад ls -la /tmp. Перше слово — програма, решта — опції та аргументи.'),
  ru=['команд'], uk=['команд'])
g('argument', 'basics', ('Argument', 'Аргумент', 'Аргумент'),
  ('A word passed to a command after its name: a file name, text or number.', 'Слово, переданное команде после её имени: имя файла, текст или число.', 'Слово, передане команді після її назви: назва файлу, текст або число.'),
  ru=['аргумент'], uk=['аргумент'])
g('option', 'basics', ('Option (flag)', 'Опция (флаг)', 'Опція (прапорець)'),
  ('A switch that changes how a command works. Short form -l, long form --long. Short flags can be glued: -la.', 'Переключатель, меняющий работу команды. Короткая форма -l, длинная --long. Короткие флаги можно склеивать: -la.', 'Перемикач, що змінює роботу команди. Коротка форма -l, довга --long. Короткі прапорці можна склеювати: -la.'),
  ru=['флаг', 'опци'], uk=['прапор', 'опці'], en=['flag', 'option'])
g('prompt', 'basics', ('Prompt', 'Приглашение (prompt)', 'Запрошення (prompt)'),
  ('The text before the cursor: user@host:path$. # instead of $ means you are root.', 'Текст перед курсором: user@host:путь$. # вместо $ означает, что вы root.', 'Текст перед курсором: user@host:шлях$. # замість $ означає, що ви root.'),
  ru=['приглашени'], uk=['запрошенн'], en=['prompt'])
g('exit-code', 'basics', ('Exit code', 'Код возврата', 'Код повернення'),
  ('A number every command returns: 0 = success, anything else = error. Shown by echo $?.', 'Число, которое возвращает каждая команда: 0 — успех, всё остальное — ошибка. Показывает echo $?.', 'Число, яке повертає кожна команда: 0 — успіх, усе інше — помилка. Показує echo $?.'),
  ru=['код возврата'], uk=['код повернення'], en=['exit code', 'exit status'])
g('man-page', 'basics', ('Manual page', 'Страница руководства (man)', 'Сторінка посібника (man)'),
  ('Built-in documentation of a command: man ls. Short help: ls --help.', 'Встроенная документация команды: man ls. Короткая справка: ls --help.', 'Вбудована документація команди: man ls. Коротка довідка: ls --help.'),
  ru=['руководств'], uk=['посібник'], en=['manual'], cmd='man')
g('distribution', 'basics', ('Distribution', 'Дистрибутив', 'Дистрибутив'),
  ('A complete Linux system: kernel + programs + package manager (Ubuntu, Debian, Fedora, Arch).', 'Готовая система Linux: ядро + программы + менеджер пакетов (Ubuntu, Debian, Fedora, Arch).', 'Готова система Linux: ядро + програми + менеджер пакетів (Ubuntu, Debian, Fedora, Arch).'),
  ru=['дистрибутив'], uk=['дистрибутив'])
g('kernel', 'basics', ('Kernel', 'Ядро', 'Ядро'),
  ('The core of the OS: manages memory, processes, disks and network. Linux is, strictly speaking, the kernel.', 'Сердце ОС: управляет памятью, процессами, дисками и сетью. Linux, строго говоря, — это ядро.', 'Серце ОС: керує пам’яттю, процесами, дисками та мережею. Linux, строго кажучи, — це ядро.'),
  ru=['ядр'], uk=['ядр'], en=['kernel'], cmd='uname')
g('tab-completion', 'basics', ('Tab completion', 'Автодополнение (Tab)', 'Автодоповнення (Tab)'),
  ('Press Tab to complete a command or file name; press it twice to see all variants.', 'Нажмите Tab, чтобы дописать имя команды или файла; дважды — увидеть все варианты.', 'Натисніть Tab, щоб дописати назву команди чи файлу; двічі — побачити всі варіанти.'),
  ru=['автодополнени'], uk=['автодоповненн'], en=['completion'])

# ---------------------------------------------------------------- files
g('directory', 'files', ('Directory', 'Директория (папка)', 'Директорія (тека)'),
  ('A container for files and other directories. In Linux a directory is also a special kind of file.', 'Контейнер для файлов и других директорий. В Linux директория — тоже особый вид файла.', 'Контейнер для файлів та інших директорій. У Linux директорія — теж особливий вид файлу.'),
  ru=['директори'], uk=['директорі'], en=['directory', 'directories'], cmd='mkdir')
g('home-dir', 'files', ('Home directory', 'Домашняя директория', 'Домашня директорія'),
  ('Your personal directory, /home/<name>, written as ~. cd without arguments takes you there.', 'Ваша личная директория /home/<имя>, сокращённо ~. cd без аргументов ведёт туда.', 'Ваша особиста директорія /home/<ім’я>, скорочено ~. cd без аргументів веде туди.'),
  ru=['домашн'], uk=['домашн'], en=['home directory'])
g('root-dir', 'files', ('Root directory /', 'Корень /', 'Корінь /'),
  ('The top of the file system tree. Every absolute path starts with /.', 'Вершина дерева файловой системы. Каждый абсолютный путь начинается с /.', 'Вершина дерева файлової системи. Кожен абсолютний шлях починається з /.'),
  ru=['корн', 'корень'], uk=['корін', 'корен'], en=['root directory'])
g('path', 'files', ('Path', 'Путь', 'Шлях'),
  ('The address of a file: directories separated by /. Absolute (from /) or relative (from the current directory).', 'Адрес файла: директории через /. Абсолютный (от /) или относительный (от текущей директории).', 'Адреса файлу: директорії через /. Абсолютний (від /) або відносний (від поточної директорії).'),
  ru=['пут'], uk=['шлях'], en=['path'])
g('abs-path', 'files', ('Absolute path', 'Абсолютный путь', 'Абсолютний шлях'),
  ('A path starting at the root /: /home/student/docs. Works from anywhere.', 'Путь от корня /: /home/student/docs. Работает откуда угодно.', 'Шлях від кореня /: /home/student/docs. Працює звідусіль.'),
  ru=['абсолютн'], uk=['абсолютн'], en=['absolute'])
g('rel-path', 'files', ('Relative path', 'Относительный путь', 'Відносний шлях'),
  ('A path from where you are: docs/report.txt, ../music.', 'Путь от текущего места: docs/report.txt, ../music.', 'Шлях від поточного місця: docs/report.txt, ../music.'),
  ru=['относительн'], uk=['відносн'], en=['relative'])
g('cwd', 'files', ('Working directory', 'Текущая директория', 'Поточна директорія'),
  ('The directory you are in right now; relative paths start here. pwd prints it.', 'Директория, в которой вы сейчас; от неё считаются относительные пути. Показывает pwd.', 'Директорія, у якій ви зараз; від неї рахуються відносні шляхи. Показує pwd.'),
  ru=['текущ'], uk=['поточн'], en=['working directory'], cmd='pwd')
g('hidden-file', 'files', ('Hidden file', 'Скрытый файл', 'Прихований файл'),
  ('A file whose name starts with a dot (.bashrc). ls shows it only with -a.', 'Файл, имя которого начинается с точки (.bashrc). ls показывает его только с -a.', 'Файл, назва якого починається з крапки (.bashrc). ls показує його лише з -a.'),
  ru=['скрыт'], uk=['прихован'], en=['hidden'])
g('symlink', 'files', ('Symbolic link', 'Символьная ссылка', 'Символьне посилання'),
  ('A shortcut pointing to another path: ln -s target name. Breaks if the target is removed.', 'Ярлык, указывающий на другой путь: ln -s цель имя. Ломается, если цель удалить.', 'Ярлик, що вказує на інший шлях: ln -s ціль назва. Ламається, якщо ціль видалити.'),
  ru=['ссылк', 'симлинк'], uk=['посиланн', 'симлінк'], en=['symlink', 'symbolic link'], cmd='ln')
g('wildcard', 'files', ('Wildcard (glob)', 'Шаблон (glob)', 'Шаблон (glob)'),
  ('Pattern characters * ? [abc] that the shell expands into matching file names.', 'Символы * ? [abc], которые оболочка заменяет подходящими именами файлов.', 'Символи * ? [abc], які оболонка замінює відповідними назвами файлів.'),
  ru=['шаблон'], uk=['шаблон'], en=['wildcard', 'glob'])
g('fhs', 'files', ('Filesystem hierarchy (FHS)', 'Иерархия ФС (FHS)', 'Ієрархія ФС (FHS)'),
  ('The standard layout: /etc configs, /var changing data and logs, /home users, /usr programs, /tmp temporary files.', 'Стандартная раскладка: /etc — настройки, /var — изменяемые данные и логи, /home — пользователи, /usr — программы, /tmp — временные файлы.', 'Стандартне розташування: /etc — налаштування, /var — змінні дані й логи, /home — користувачі, /usr — програми, /tmp — тимчасові файли.'),
  ru=['иерархи'], uk=['ієрархі'], en=['hierarchy'])
g('etc', 'files', ('/etc', '/etc', '/etc'),
  ('The directory with system-wide configuration files: /etc/hosts, /etc/passwd, /etc/nginx/...', 'Директория с системными настройками: /etc/hosts, /etc/passwd, /etc/nginx/...', 'Директорія із системними налаштуваннями: /etc/hosts, /etc/passwd, /etc/nginx/...'), en=['/etc'])
g('var-log', 'files', ('/var/log', '/var/log', '/var/log'),
  ('Where logs live: syslog, auth.log, nginx/access.log, ...', 'Место, где живут логи: syslog, auth.log, nginx/access.log, ...', 'Місце, де живуть логи: syslog, auth.log, nginx/access.log, ...'), en=['/var/log'])
g('dev-null', 'files', ('/dev/null', '/dev/null', '/dev/null'),
  ('A black hole: everything written there disappears. 2>/dev/null hides errors.', 'Чёрная дыра: всё, что туда записано, исчезает. 2>/dev/null прячет ошибки.', 'Чорна діра: усе, що туди записано, зникає. 2>/dev/null ховає помилки.'), en=['/dev/null'])
g('inode-size', 'files', ('Disk usage', 'Занятое место', 'Зайняте місце'),
  ('How much space files take on disk. du shows it per directory, df per file system.', 'Сколько места файлы занимают на диске. du показывает по директориям, df — по файловым системам.', 'Скільки місця файли займають на диску. du показує по директоріях, df — по файлових системах.'),
  ru=['занятое место'], uk=['зайняте місце'], en=['disk usage'], cmd='du')
g('filesystem', 'files', ('File system', 'Файловая система', 'Файлова система'),
  ('The way data is organised on a disk (ext4, xfs). A disk partition with a file system is mounted at a directory.', 'Способ организации данных на диске (ext4, xfs). Раздел с файловой системой монтируется в директорию.', 'Спосіб організації даних на диску (ext4, xfs). Розділ із файловою системою монтується в директорію.'),
  ru=['файловой систем', 'файловая систем', 'файловую систем'], uk=['файлової систем', 'файлова систем', 'файлову систем'], en=['file system', 'filesystem'], cmd='df')
g('mount', 'files', ('Mount point', 'Точка монтирования', 'Точка монтування'),
  ('The directory where a disk or partition is attached, e.g. / or /var/lib/postgresql.', 'Директория, к которой подключён диск или раздел, например / или /var/lib/postgresql.', 'Директорія, до якої підключено диск чи розділ, наприклад / або /var/lib/postgresql.'),
  ru=['монтировани'], uk=['монтуванн'], en=['mount'])

# ---------------------------------------------------------------- text
g('stdout', 'text', ('Standard output (stdout)', 'Стандартный вывод (stdout)', 'Стандартний вивід (stdout)'),
  ('Stream 1: the normal output of a command. Redirect with > or pass on with |.', 'Поток 1: обычный вывод команды. Перенаправляется > или передаётся дальше через |.', 'Потік 1: звичайний вивід команди. Перенаправляється > або передається далі через |.'),
  ru=['стандартный вывод'], uk=['стандартний вивід'], en=['stdout', 'standard output'])
g('stderr', 'text', ('Standard error (stderr)', 'Поток ошибок (stderr)', 'Потік помилок (stderr)'),
  ('Stream 2: error messages. Redirect with 2> file or hide with 2>/dev/null.', 'Поток 2: сообщения об ошибках. Перенаправляется 2> файл или прячется 2>/dev/null.', 'Потік 2: повідомлення про помилки. Перенаправляється 2> файл або ховається 2>/dev/null.'),
  ru=['поток ошибок'], uk=['потік помилок'], en=['stderr'])
g('stdin', 'text', ('Standard input (stdin)', 'Стандартный ввод (stdin)', 'Стандартне введення (stdin)'),
  ('Stream 0: where a command reads data. Fill it from a file with < or from a pipe.', 'Поток 0: откуда команда читает данные. Заполняется из файла через < или из конвейера.', 'Потік 0: звідки команда читає дані. Заповнюється з файлу через < або з конвеєра.'),
  ru=['стандартный ввод'], uk=['стандартне введенн'], en=['stdin'])
g('pipe', 'text', ('Pipe |', 'Конвейер |', 'Конвеєр |'),
  ('Connects commands: the output of the left one becomes the input of the right one. grep ERROR log | wc -l.', 'Соединяет команды: вывод левой становится входом правой. grep ERROR log | wc -l.', 'З’єднує команди: вивід лівої стає входом правої. grep ERROR log | wc -l.'),
  ru=['конвейер'], uk=['конвеєр'], en=['pipe', 'pipeline'])
g('redirect', 'text', ('Redirection', 'Перенаправление', 'Перенаправлення'),
  ('Sending output to a file (> overwrite, >> append) or reading input from a file (<).', 'Отправка вывода в файл (> перезапись, >> дописать) или чтение ввода из файла (<).', 'Надсилання виводу у файл (> перезапис, >> дописати) або читання вводу з файлу (<).'),
  ru=['перенаправлени'], uk=['перенаправленн'], en=['redirect'])
g('regex', 'text', ('Regular expression', 'Регулярное выражение', 'Регулярний вираз'),
  ('A search pattern for text: ^ start of line, $ end, . any char, * repeat. Used by grep, sed, awk.', 'Шаблон поиска текста: ^ начало строки, $ конец, . любой символ, * повтор. Используют grep, sed, awk.', 'Шаблон пошуку тексту: ^ початок рядка, $ кінець, . будь-який символ, * повтор. Використовують grep, sed, awk.'),
  ru=['регулярн'], uk=['регулярн'], en=['regex', 'regular expression'], cmd='grep')
g('csv', 'text', ('CSV', 'CSV', 'CSV'),
  ('Comma-separated values: a text table, one row per line. cut -d, and awk -F, read it.', 'Значения через запятую: текстовая таблица, одна строка — одна запись. Читается cut -d, и awk -F,.', 'Значення через кому: текстова таблиця, один рядок — один запис. Читається cut -d, і awk -F,.'), en=['csv'], cmd='cut')
g('field', 'text', ('Field (column)', 'Поле (колонка)', 'Поле (колонка)'),
  ('A part of a line between separators. awk calls them $1, $2...; cut selects them with -f.', 'Часть строки между разделителями. В awk это $1, $2...; cut выбирает их через -f.', 'Частина рядка між роздільниками. В awk це $1, $2...; cut вибирає їх через -f.'),
  ru=['колонк'], uk=['колонк'], en=['column'], cmd='awk')
g('editor', 'text', ('Text editor', 'Текстовый редактор', 'Текстовий редактор'),
  ('A program to edit files in the terminal: nano (simple), vim (powerful).', 'Программа для правки файлов в терминале: nano (простой), vim (мощный).', 'Програма для редагування файлів у терміналі: nano (простий), vim (потужний).'),
  ru=['редактор'], uk=['редактор'], en=['editor'], cmd='nano')

# ---------------------------------------------------------------- permissions
g('permissions', 'permissions', ('Permissions (rwx)', 'Права доступа (rwx)', 'Права доступу (rwx)'),
  ('Who may read (r), write (w) and execute (x) a file — for the owner, the group and others.', 'Кто может читать (r), писать (w) и выполнять (x) файл — для владельца, группы и остальных.', 'Хто може читати (r), писати (w) і виконувати (x) файл — для власника, групи та інших.'),
  ru=['права доступа', 'прав доступа'], uk=['права доступу', 'прав доступу'], en=['permission'], cmd='chmod')
g('owner', 'permissions', ('Owner', 'Владелец', 'Власник'),
  ('The user a file belongs to. Only the owner (or root) can change its permissions.', 'Пользователь, которому принадлежит файл. Менять права может только владелец (или root).', 'Користувач, якому належить файл. Змінювати права може лише власник (або root).'),
  ru=['владел'], uk=['власник'], en=['owner'], cmd='chown')
g('group', 'permissions', ('Group', 'Группа', 'Група'),
  ('A set of users sharing permissions, e.g. sudo, adm, www-data.', 'Набор пользователей с общими правами, например sudo, adm, www-data.', 'Набір користувачів зі спільними правами, наприклад sudo, adm, www-data.'),
  ru=['групп'], uk=['груп'], en=['group'], cmd='groups')
g('root-user', 'permissions', ('root', 'root (суперпользователь)', 'root (суперкористувач)'),
  ('The administrator account with uid 0. Permission checks do not apply to it.', 'Учётная запись администратора с uid 0. Проверки прав на неё не действуют.', 'Обліковий запис адміністратора з uid 0. Перевірки прав на нього не діють.'),
  ru=['суперпользовател'], uk=['суперкористувач'], en=['superuser'])
g('sudo', 'permissions', ('sudo', 'sudo', 'sudo'),
  ('Run one command as root: sudo systemctl restart nginx. Your user must be in the sudo group.', 'Выполнить одну команду от root: sudo systemctl restart nginx. Пользователь должен быть в группе sudo.', 'Виконати одну команду від root: sudo systemctl restart nginx. Користувач має бути в групі sudo.'), cmd='sudo')
g('octal-mode', 'permissions', ('Octal mode (755)', 'Числовые права (755)', 'Числові права (755)'),
  ('Permissions as three digits, r=4 w=2 x=1 summed for owner, group, others. 644 = rw-r--r--, 755 = rwxr-xr-x.', 'Права тремя цифрами: r=4 w=2 x=1, сумма для владельца, группы, остальных. 644 = rw-r--r--, 755 = rwxr-xr-x.', 'Права трьома цифрами: r=4 w=2 x=1, сума для власника, групи, інших. 644 = rw-r--r--, 755 = rwxr-xr-x.'),
  ru=['числов'], uk=['числов'], en=['octal'], cmd='chmod')
g('uid', 'permissions', ('UID', 'UID', 'UID'),
  ('User ID — the number behind a user name. root is 0, normal users start at 1000.', 'Идентификатор пользователя — число за именем. У root 0, обычные пользователи с 1000.', 'Ідентифікатор користувача — число за іменем. У root 0, звичайні користувачі з 1000.'), en=['uid'], cmd='id')
g('passwd-file', 'permissions', ('/etc/passwd', '/etc/passwd', '/etc/passwd'),
  ('The list of users: name:x:uid:gid:comment:home:shell. Passwords themselves are in /etc/shadow.', 'Список пользователей: имя:x:uid:gid:комментарий:дом:оболочка. Сами пароли — в /etc/shadow.', 'Список користувачів: ім’я:x:uid:gid:коментар:дім:оболонка. Самі паролі — в /etc/shadow.'), en=['/etc/passwd'])

# ---------------------------------------------------------------- processes
g('process', 'processes', ('Process', 'Процесс', 'Процес'),
  ('A running program with its own number (PID), owner, memory and CPU usage.', 'Запущенная программа со своим номером (PID), владельцем, памятью и загрузкой CPU.', 'Запущена програма зі своїм номером (PID), власником, пам’яттю та навантаженням CPU.'),
  ru=['процесс'], uk=['процес'], en=['process'], cmd='ps')
g('pid', 'processes', ('PID', 'PID', 'PID'),
  ('Process ID — the number used to manage a process: kill 1234.', 'Идентификатор процесса — номер для управления им: kill 1234.', 'Ідентифікатор процесу — номер для керування ним: kill 1234.'), en=['pid'], cmd='kill')
g('signal', 'processes', ('Signal', 'Сигнал', 'Сигнал'),
  ('A message to a process: SIGTERM (15) asks to stop, SIGKILL (9) kills immediately, SIGHUP (1) often means reload.', 'Сообщение процессу: SIGTERM (15) просит завершиться, SIGKILL (9) убивает сразу, SIGHUP (1) часто означает перечитать настройки.', 'Повідомлення процесу: SIGTERM (15) просить завершитися, SIGKILL (9) вбиває одразу, SIGHUP (1) часто означає перечитати налаштування.'),
  ru=['сигнал'], uk=['сигнал'], en=['signal', 'sigterm', 'sigkill'], cmd='kill')
g('daemon', 'processes', ('Daemon', 'Демон', 'Демон'),
  ('A background program serving requests: sshd, nginx, cron. Usually managed by systemd as a service.', 'Фоновая программа, обслуживающая запросы: sshd, nginx, cron. Обычно управляется systemd как сервис.', 'Фонова програма, що обслуговує запити: sshd, nginx, cron. Зазвичай керується systemd як сервіс.'),
  ru=['демон'], uk=['демон'], en=['daemon'])
g('service', 'processes', ('Service (unit)', 'Сервис (юнит)', 'Сервіс (юніт)'),
  ('A daemon managed by systemd: systemctl status|start|stop|restart NAME.', 'Демон под управлением systemd: systemctl status|start|stop|restart ИМЯ.', 'Демон під керуванням systemd: systemctl status|start|stop|restart НАЗВА.'),
  ru=['сервис'], uk=['сервіс'], en=['service', 'unit'], cmd='systemctl')
g('systemd', 'processes', ('systemd', 'systemd', 'systemd'),
  ('The init system of modern Linux: starts services at boot, restarts them and collects their logs (journal).', 'Система инициализации современного Linux: запускает сервисы при загрузке, перезапускает их и собирает их логи (журнал).', 'Система ініціалізації сучасного Linux: запускає сервіси під час завантаження, перезапускає їх і збирає їхні логи (журнал).'), cmd='systemctl')
g('journal', 'processes', ('Journal (journald)', 'Журнал (journald)', 'Журнал (journald)'),
  ('The systemd log of all services. Read with journalctl -u SERVICE.', 'Лог systemd для всех сервисов. Читается через journalctl -u СЕРВИС.', 'Лог systemd для всіх сервісів. Читається через journalctl -u СЕРВІС.'),
  ru=['журнал'], uk=['журнал'], en=['journal'], cmd='journalctl')
g('load-average', 'processes', ('Load average', 'Load average (средняя нагрузка)', 'Load average (середнє навантаження)'),
  ('Average number of processes running or waiting for CPU over 1, 5 and 15 minutes. Compare with the number of cores (nproc).', 'Среднее число процессов, работающих или ждущих CPU, за 1, 5 и 15 минут. Сравнивайте с числом ядер (nproc).', 'Середня кількість процесів, що працюють або чекають CPU, за 1, 5 і 15 хвилин. Порівнюйте з кількістю ядер (nproc).'),
  ru=['средняя нагрузк', 'load average'], uk=['середнє навантаженн', 'load average'], en=['load average'], cmd='uptime')
g('cpu', 'processes', ('CPU', 'Процессор (CPU)', 'Процесор (CPU)'),
  ('The processor. %CPU in ps/top shows how much of one core a process uses (200% = two full cores).', 'Процессор. %CPU в ps/top — сколько одного ядра занимает процесс (200% = два ядра целиком).', 'Процесор. %CPU у ps/top — скільки одного ядра займає процес (200% = два ядра повністю).'),
  ru=['процессор'], uk=['процесор'], en=['cpu'], cmd='top')
g('ram', 'processes', ('RAM', 'Оперативная память (RAM)', 'Оперативна пам’ять (RAM)'),
  ('Working memory. "available" in free -h is what programs can still get.', 'Рабочая память. «available» в free -h — сколько ещё могут получить программы.', 'Робоча пам’ять. «available» у free -h — скільки ще можуть отримати програми.'),
  ru=['оперативн'], uk=['оперативн'], en=['ram', 'memory'], cmd='free')
g('swap', 'processes', ('Swap', 'Своп (swap)', 'Своп (swap)'),
  ('Disk space used as overflow memory. Heavy swap use makes the server very slow.', 'Место на диске, используемое как запасная память. Активный своп сильно замедляет сервер.', 'Місце на диску, що використовується як запасна пам’ять. Активний своп сильно сповільнює сервер.'),
  ru=['своп'], uk=['своп'], en=['swap'], cmd='free')
g('oom', 'processes', ('OOM killer', 'OOM killer', 'OOM killer'),
  ('When memory runs out, the kernel kills a big process ("Out of memory: Killed process ..."). Look for it in the logs.', 'Когда память кончается, ядро убивает крупный процесс («Out of memory: Killed process ...»). Ищите это в логах.', 'Коли пам’ять закінчується, ядро вбиває великий процес («Out of memory: Killed process ...»). Шукайте це в логах.'),
  en=['oom', 'out of memory'])
g('cron', 'processes', ('cron', 'cron', 'cron'),
  ('The scheduler that runs commands at set times (backups at 03:00). Its runs appear in syslog as CRON.', 'Планировщик, запускающий команды по расписанию (бэкап в 03:00). Его запуски видны в syslog как CRON.', 'Планувальник, що запускає команди за розкладом (бекап о 03:00). Його запуски видно в syslog як CRON.'), en=['cron'])

# ---------------------------------------------------------------- shell
g('variable', 'shell', ('Variable', 'Переменная', 'Змінна'),
  ('A named value: NAME=value, read as $NAME. export makes it visible to started programs.', 'Именованное значение: NAME=значение, читается как $NAME. export делает её видимой запускаемым программам.', 'Іменоване значення: NAME=значення, читається як $NAME. export робить її видимою для запущених програм.'),
  ru=['переменн'], uk=['змінн'], en=['variable'], cmd='export')
g('env-var', 'shell', ('Environment variable', 'Переменная окружения', 'Змінна оточення'),
  ('An exported variable inherited by programs: HOME, USER, PATH, LANG.', 'Экспортированная переменная, которую наследуют программы: HOME, USER, PATH, LANG.', 'Експортована змінна, яку успадковують програми: HOME, USER, PATH, LANG.'),
  ru=['окружени'], uk=['оточенн'], en=['environment'], cmd='env')
g('path-var', 'shell', ('$PATH', '$PATH', '$PATH'),
  ('The list of directories where the shell looks for programs. That is why a script in the current directory needs ./', 'Список директорий, где оболочка ищет программы. Поэтому скрипту в текущей директории нужен ./', 'Список директорій, де оболонка шукає програми. Тому скрипту в поточній директорії потрібен ./'), en=['$path'])
g('alias', 'shell', ('Alias', 'Алиас', 'Аліас'),
  ('A short name for a longer command: alias ll=\'ls -alF\'. Put it in ~/.bashrc to keep it.', 'Короткое имя для длинной команды: alias ll=\'ls -alF\'. Чтобы сохранить — в ~/.bashrc.', 'Коротка назва для довгої команди: alias ll=\'ls -alF\'. Щоб зберегти — у ~/.bashrc.'),
  ru=['алиас'], uk=['аліас'], en=['alias'], cmd='alias')
g('script', 'shell', ('Script', 'Скрипт', 'Скрипт'),
  ('A text file with commands, run line by line. Starts with #!/bin/bash, needs chmod +x.', 'Текстовый файл с командами, выполняемыми построчно. Начинается с #!/bin/bash, нужен chmod +x.', 'Текстовий файл із командами, що виконуються рядок за рядком. Починається з #!/bin/bash, потрібен chmod +x.'),
  ru=['скрипт'], uk=['скрипт'], en=['script'], cmd='bash')
g('shebang', 'shell', ('Shebang #!', 'Шебанг #!', 'Шебанг #!'),
  ('The first line of a script that names its interpreter: #!/bin/bash.', 'Первая строка скрипта, называющая интерпретатор: #!/bin/bash.', 'Перший рядок скрипта, що називає інтерпретатор: #!/bin/bash.'),
  ru=['шебанг'], uk=['шебанг'], en=['shebang'])
g('bashrc', 'shell', ('~/.bashrc', '~/.bashrc', '~/.bashrc'),
  ('Your shell settings file, read at every start: aliases, variables, prompt. Apply changes with source ~/.bashrc.', 'Файл настроек оболочки, читается при каждом запуске: алиасы, переменные, приглашение. Применить изменения: source ~/.bashrc.', 'Файл налаштувань оболонки, читається під час кожного запуску: аліаси, змінні, запрошення. Застосувати зміни: source ~/.bashrc.'), en=['.bashrc'], cmd='source')
g('history', 'shell', ('Command history', 'История команд', 'Історія команд'),
  ('Your past commands: ↑/↓ to walk, history to list, !! repeats the last one.', 'Ваши прошлые команды: ↑/↓ листают, history показывает список, !! повторяет последнюю.', 'Ваші минулі команди: ↑/↓ гортають, history показує список, !! повторює останню.'),
  ru=['истори'], uk=['історі'], en=['history'], cmd='history')
g('cmd-subst', 'shell', ('Command substitution $( )', 'Подстановка команды $( )', 'Підстановка команди $( )'),
  ('Puts the output of a command into another command: echo "today is $(date +%F)".', 'Вставляет вывод одной команды в другую: echo "today is $(date +%F)".', 'Вставляє вивід однієї команди в іншу: echo "today is $(date +%F)".'),
  ru=['подстановк'], uk=['підстановк'], en=['substitution'])

# ---------------------------------------------------------------- network
g('ip-address', 'network', ('IP address', 'IP-адрес', 'IP-адреса'),
  ('The address of a machine in a network, e.g. 10.0.2.15. IPv4 = four numbers 0–255.', 'Адрес машины в сети, например 10.0.2.15. IPv4 — четыре числа от 0 до 255.', 'Адреса машини в мережі, наприклад 10.0.2.15. IPv4 — чотири числа від 0 до 255.'),
  ru=['ip-адрес', 'ip адрес'], uk=['ip-адрес', 'ip адрес'], en=['ip address'], cmd='ip')
g('subnet', 'network', ('Subnet / CIDR', 'Подсеть / CIDR', 'Підмережа / CIDR'),
  ('A range of addresses written as 10.0.2.0/24: the first 24 bits are the network, the rest are hosts (256 addresses).', 'Диапазон адресов в виде 10.0.2.0/24: первые 24 бита — сеть, остальные — хосты (256 адресов).', 'Діапазон адрес у вигляді 10.0.2.0/24: перші 24 біти — мережа, решта — хости (256 адрес).'),
  ru=['подсет'], uk=['підмереж'], en=['subnet', 'cidr'])
g('private-ip', 'network', ('Private address', 'Частный (приватный) адрес', 'Приватна адреса'),
  ('Addresses for internal networks, not routed on the internet: 10.x.x.x, 172.16–31.x.x, 192.168.x.x.', 'Адреса для внутренних сетей, не маршрутизируются в интернете: 10.x.x.x, 172.16–31.x.x, 192.168.x.x.', 'Адреси для внутрішніх мереж, не маршрутизуються в інтернеті: 10.x.x.x, 172.16–31.x.x, 192.168.x.x.'),
  ru=['приватн'], uk=['приватн'], en=['private'])
g('gateway', 'network', ('Gateway', 'Шлюз', 'Шлюз'),
  ('The router that leads out of your network. ip r shows it as "default via ...".', 'Маршрутизатор, ведущий из вашей сети наружу. ip r показывает его как «default via ...».', 'Маршрутизатор, що веде з вашої мережі назовні. ip r показує його як «default via ...».'),
  ru=['шлюз'], uk=['шлюз'], en=['gateway'], cmd='ip')
g('interface', 'network', ('Network interface', 'Сетевой интерфейс', 'Мережевий інтерфейс'),
  ('A network card (real or virtual): lo, eth0, ens3. ip a lists them with addresses and state UP/DOWN.', 'Сетевая карта (настоящая или виртуальная): lo, eth0, ens3. ip a показывает их адреса и состояние UP/DOWN.', 'Мережева карта (справжня чи віртуальна): lo, eth0, ens3. ip a показує їхні адреси та стан UP/DOWN.'),
  ru=['интерфейс'], uk=['інтерфейс'], en=['interface'], cmd='ip')
g('localhost', 'network', ('localhost (127.0.0.1)', 'localhost (127.0.0.1)', 'localhost (127.0.0.1)'),
  ('The machine itself. A service bound to 127.0.0.1 is reachable only from the same machine.', 'Сама машина. Сервис, привязанный к 127.0.0.1, доступен только с этой же машины.', 'Сама машина. Сервіс, прив’язаний до 127.0.0.1, доступний лише з цієї ж машини.'), en=['localhost', '127.0.0.1'])
g('port', 'network', ('Port', 'Порт', 'Порт'),
  ('A number 1–65535 that selects a service on a machine: 22 ssh, 80 http, 443 https, 5432 postgresql.', 'Число 1–65535, выбирающее сервис на машине: 22 ssh, 80 http, 443 https, 5432 postgresql.', 'Число 1–65535, що вибирає сервіс на машині: 22 ssh, 80 http, 443 https, 5432 postgresql.'),
  ru=['порт'], uk=['порт'], en=['port'], cmd='ss')
g('tcp-udp', 'network', ('TCP / UDP', 'TCP / UDP', 'TCP / UDP'),
  ('TCP: reliable connection with delivery checks (web, ssh, databases). UDP: fast messages without guarantees (DNS, video, VoIP).', 'TCP — надёжное соединение с проверкой доставки (веб, ssh, базы). UDP — быстрые сообщения без гарантий (DNS, видео, VoIP).', 'TCP — надійне з’єднання з перевіркою доставки (веб, ssh, бази). UDP — швидкі повідомлення без гарантій (DNS, відео, VoIP).'), en=['tcp', 'udp'])
g('icmp', 'network', ('ICMP / ping', 'ICMP / ping', 'ICMP / ping'),
  ('Service messages of IP. ping sends ICMP echo and measures the round trip time (RTT).', 'Служебные сообщения IP. ping отправляет ICMP echo и меряет время туда-обратно (RTT).', 'Службові повідомлення IP. ping надсилає ICMP echo й вимірює час туди-назад (RTT).'), en=['icmp'], cmd='ping')
g('latency', 'network', ('Latency (RTT)', 'Задержка (RTT)', 'Затримка (RTT)'),
  ('Time for a packet to go and come back, in ms. In a LAN < 1 ms, across Europe 20–50 ms.', 'Время, за которое пакет идёт туда и обратно, в мс. В локальной сети < 1 мс, по Европе 20–50 мс.', 'Час, за який пакет іде туди й назад, у мс. У локальній мережі < 1 мс, Європою 20–50 мс.'),
  ru=['задержк'], uk=['затримк'], en=['latency', 'rtt'], cmd='ping')
g('packet-loss', 'network', ('Packet loss', 'Потеря пакетов', 'Втрата пакетів'),
  ('Percentage of packets that never came back. Anything above 1% hurts voice, video and APIs.', 'Доля пакетов, которые не вернулись. Больше 1% уже бьёт по голосу, видео и API.', 'Частка пакетів, що не повернулися. Понад 1% уже б’є по голосу, відео та API.'),
  ru=['потер'], uk=['втрат'], en=['packet loss'], cmd='ping')
g('hop', 'network', ('Hop', 'Хоп (переход)', 'Хоп (перехід)'),
  ('One router on the way to a host. traceroute lists the hops; * * * means a hop did not answer.', 'Один маршрутизатор на пути к хосту. traceroute перечисляет хопы; * * * — хоп не ответил.', 'Один маршрутизатор на шляху до хоста. traceroute перелічує хопи; * * * — хоп не відповів.'),
  ru=['хоп'], uk=['хоп'], en=['hop'], cmd='traceroute')
g('dns', 'network', ('DNS', 'DNS', 'DNS'),
  ('The internet phone book: turns names (example.com) into IP addresses. Query with dig or nslookup.', 'Телефонная книга интернета: превращает имена (example.com) в IP-адреса. Запросы — dig или nslookup.', 'Телефонна книга інтернету: перетворює імена (example.com) на IP-адреси. Запити — dig або nslookup.'), en=['dns'], cmd='dig')
g('a-record', 'network', ('A record', 'A-запись', 'A-запис'),
  ('A DNS record that maps a name to an IPv4 address. AAAA is the same for IPv6.', 'Запись DNS, связывающая имя с IPv4-адресом. AAAA — то же для IPv6.', 'Запис DNS, що зв’язує ім’я з IPv4-адресою. AAAA — те саме для IPv6.'), ru=['a-запис'], uk=['a-запис'], en=['a record'])
g('nxdomain', 'network', ('NXDOMAIN', 'NXDOMAIN', 'NXDOMAIN'),
  ('DNS answer "no such domain": the name does not exist (or a typo).', 'Ответ DNS «нет такого домена»: имя не существует (или опечатка).', 'Відповідь DNS «немає такого домену»: ім’я не існує (або друкарська помилка).'), en=['nxdomain'])
g('hosts-file', 'network', ('/etc/hosts', '/etc/hosts', '/etc/hosts'),
  ('A local list name → IP checked before DNS by ping, curl and most programs (but not by dig).', 'Локальный список имя → IP, который ping, curl и большинство программ проверяют раньше DNS (а dig — нет).', 'Локальний список ім’я → IP, який ping, curl і більшість програм перевіряють раніше за DNS (а dig — ні).'), en=['/etc/hosts'])
g('http', 'network', ('HTTP / HTTPS', 'HTTP / HTTPS', 'HTTP / HTTPS'),
  ('The protocol of the web. A client sends a request (GET /path), the server answers with a status code, headers and a body. HTTPS = HTTP over TLS encryption, port 443.', 'Протокол веба. Клиент шлёт запрос (GET /путь), сервер отвечает кодом статуса, заголовками и телом. HTTPS — HTTP с шифрованием TLS, порт 443.', 'Протокол вебу. Клієнт надсилає запит (GET /шлях), сервер відповідає кодом статусу, заголовками й тілом. HTTPS — HTTP із шифруванням TLS, порт 443.'), en=['http', 'https'], cmd='curl')
g('status-code', 'network', ('HTTP status code', 'Код ответа HTTP', 'Код відповіді HTTP'),
  ('2xx success (200 OK), 3xx redirect (301), 4xx client error (404 Not Found, 403), 5xx server error (500, 502 Bad Gateway, 503, 504).', '2xx — успех (200 OK), 3xx — редирект (301), 4xx — ошибка клиента (404 Not Found, 403), 5xx — ошибка сервера (500, 502 Bad Gateway, 503, 504).', '2xx — успіх (200 OK), 3xx — редирект (301), 4xx — помилка клієнта (404 Not Found, 403), 5xx — помилка сервера (500, 502 Bad Gateway, 503, 504).'),
  ru=['код ответа', 'кода ответа', 'коды ответа'], uk=['код відповіді', 'коди відповіді'], en=['status code'], cmd='curl')
g('502', 'network', ('502 Bad Gateway', '502 Bad Gateway', '502 Bad Gateway'),
  ('The proxy (nginx) is alive, but the application behind it does not answer — check the backend service.', 'Прокси (nginx) жив, но приложение за ним не отвечает — проверяйте бэкенд-сервис.', 'Проксі (nginx) живий, але застосунок за ним не відповідає — перевіряйте бекенд-сервіс.'), en=['502', 'bad gateway'])
g('proxy', 'network', ('Reverse proxy', 'Обратный прокси', 'Зворотний проксі'),
  ('A server (nginx) that receives client requests and passes them to applications behind it.', 'Сервер (nginx), принимающий запросы клиентов и передающий их приложениям за собой.', 'Сервер (nginx), що приймає запити клієнтів і передає їх застосункам за собою.'),
  ru=['прокси'], uk=['проксі'], en=['proxy'])
g('firewall', 'network', ('Firewall', 'Файрвол', 'Файрвол'),
  ('A filter that allows or drops network traffic. Dropped packets look like timeouts; rejected ones like "connection refused".', 'Фильтр, пропускающий или отбрасывающий трафик. Отброшенные пакеты выглядят как таймаут, отклонённые — как «connection refused».', 'Фільтр, що пропускає або відкидає трафік. Відкинуті пакети виглядають як таймаут, відхилені — як «connection refused».'),
  ru=['файрвол', 'брандмауэр'], uk=['файрвол', 'брандмауер'], en=['firewall'])
g('conn-refused', 'network', ('Connection refused', 'Connection refused', 'Connection refused'),
  ('The host is reachable but nothing listens on that port (service stopped or wrong port).', 'Хост доступен, но на этом порту никто не слушает (сервис остановлен или порт неверный).', 'Хост доступний, але на цьому порту ніхто не слухає (сервіс зупинено або порт хибний).'), en=['connection refused'])
g('timeout', 'network', ('Timeout', 'Таймаут', 'Таймаут'),
  ('No answer at all within the waiting time: the host is down, unreachable or a firewall drops packets.', 'Ответа нет вовсе за время ожидания: хост выключен, недоступен или пакеты режет файрвол.', 'Відповіді немає взагалі за час очікування: хост вимкнено, недоступний або пакети ріже файрвол.'),
  ru=['таймаут'], uk=['таймаут'], en=['timeout', 'timed out'])
g('ssh', 'network', ('SSH', 'SSH', 'SSH'),
  ('Secure shell: encrypted remote login to servers, port 22: ssh user@host.', 'Защищённая оболочка: зашифрованный удалённый вход на сервер, порт 22: ssh user@host.', 'Захищена оболонка: зашифрований віддалений вхід на сервер, порт 22: ssh user@host.'), en=['ssh'])

# ---------------------------------------------------------------- NOC
g('noc', 'noc', ('NOC', 'NOC (центр управления сетью)', 'NOC (центр керування мережею)'),
  ('Network Operations Center: the team that watches monitoring 24/7, reacts to alerts and coordinates incidents.', 'Network Operations Center: команда, которая 24/7 следит за мониторингом, реагирует на алерты и координирует инциденты.', 'Network Operations Center: команда, що 24/7 стежить за моніторингом, реагує на алерти й координує інциденти.'), en=['noc'])
g('monitoring', 'noc', ('Monitoring', 'Мониторинг', 'Моніторинг'),
  ('Continuous collection of metrics and checks (CPU, disk, HTTP status) with alerts when something goes wrong.', 'Постоянный сбор метрик и проверок (CPU, диск, HTTP-статус) с алертами, когда что-то идёт не так.', 'Постійний збір метрик і перевірок (CPU, диск, HTTP-статус) з алертами, коли щось іде не так.'),
  ru=['мониторинг'], uk=['моніторинг'], en=['monitoring'])
g('metric', 'noc', ('Metric', 'Метрика', 'Метрика'),
  ('A number measured over time: CPU %, free disk, requests per second, error rate.', 'Число, измеряемое во времени: CPU %, свободный диск, запросы в секунду, доля ошибок.', 'Число, що вимірюється в часі: CPU %, вільний диск, запити за секунду, частка помилок.'),
  ru=['метрик'], uk=['метрик'], en=['metric'])
g('alert', 'noc', ('Alert', 'Алерт (оповещение)', 'Алерт (сповіщення)'),
  ('A notification that a metric crossed a threshold: "disk / > 90% on web01".', 'Уведомление, что метрика пересекла порог: «disk / > 90% on web01».', 'Сповіщення, що метрика перетнула поріг: «disk / > 90% on web01».'),
  ru=['алерт'], uk=['алерт'], en=['alert'])
g('threshold', 'noc', ('Threshold', 'Порог', 'Поріг'),
  ('The value at which an alert fires: warning at 80%, critical at 90%.', 'Значение, при котором срабатывает алерт: warning на 80%, critical на 90%.', 'Значення, за якого спрацьовує алерт: warning на 80%, critical на 90%.'),
  ru=['порог'], uk=['поріг', 'порог'], en=['threshold'])
g('false-positive', 'noc', ('False positive', 'Ложное срабатывание', 'Хибне спрацювання'),
  ('An alert without a real problem. Too many of them cause alert fatigue — people start ignoring alerts.', 'Алерт без реальной проблемы. Если их много, наступает «усталость от алертов» — их начинают игнорировать.', 'Алерт без реальної проблеми. Якщо їх багато, настає «втома від алертів» — їх починають ігнорувати.'),
  ru=['ложн'], uk=['хибн'], en=['false positive'])
g('incident', 'noc', ('Incident', 'Инцидент', 'Інцидент'),
  ('An unplanned interruption or degradation of a service that users notice or will notice soon.', 'Незапланированный сбой или деградация сервиса, которую замечают (или скоро заметят) пользователи.', 'Незапланований збій або деградація сервісу, яку помічають (або скоро помітять) користувачі.'),
  ru=['инцидент'], uk=['інцидент'], en=['incident'])
g('severity', 'noc', ('Severity (P1–P4)', 'Приоритет (P1–P4)', 'Пріоритет (P1–P4)'),
  ('How bad an incident is. P1: everything down for everyone; P2: major feature broken; P3: minor, workaround exists; P4: cosmetic.', 'Насколько всё плохо. P1 — всё лежит у всех; P2 — сломана важная функция; P3 — мелочь, есть обходной путь; P4 — косметика.', 'Наскільки все погано. P1 — усе лежить у всіх; P2 — зламано важливу функцію; P3 — дрібниця, є обхідний шлях; P4 — косметика.'),
  ru=['приоритет'], uk=['пріоритет'], en=['severity', 'priority'])
g('escalation', 'noc', ('Escalation', 'Эскалация', 'Ескалація'),
  ('Handing an incident to a more experienced or specialised team (L1 → L2 → L3) or informing management.', 'Передача инцидента более опытной или профильной команде (L1 → L2 → L3) или информирование руководства.', 'Передача інциденту досвідченішій чи профільній команді (L1 → L2 → L3) або інформування керівництва.'),
  ru=['эскалац'], uk=['ескалац'], en=['escalat'])
g('runbook', 'noc', ('Runbook', 'Ранбук (инструкция)', 'Ранбук (інструкція)'),
  ('A step-by-step instruction for a known problem: what to check, what to run, when to escalate.', 'Пошаговая инструкция для известной проблемы: что проверить, что выполнить, когда эскалировать.', 'Покрокова інструкція для відомої проблеми: що перевірити, що виконати, коли ескалювати.'),
  ru=['ранбук'], uk=['ранбук'], en=['runbook'])
g('sla', 'noc', ('SLA', 'SLA (соглашение об уровне сервиса)', 'SLA (угода про рівень сервісу)'),
  ('A promise to customers, e.g. 99.9% availability per month, with penalties if broken.', 'Обещание клиентам, например доступность 99,9% в месяц, со штрафами при нарушении.', 'Обіцянка клієнтам, наприклад доступність 99,9% на місяць, зі штрафами в разі порушення.'), en=['sla'])
g('slo', 'noc', ('SLO / SLI', 'SLO / SLI', 'SLO / SLI'),
  ('SLI is a measured indicator (share of successful requests); SLO is the internal target for it (99.95%).', 'SLI — измеряемый показатель (доля успешных запросов); SLO — внутренняя цель для него (99,95%).', 'SLI — вимірюваний показник (частка успішних запитів); SLO — внутрішня ціль для нього (99,95%).'), en=['slo', 'sli'])
g('uptime-pct', 'noc', ('Availability (uptime %)', 'Доступность (uptime %)', 'Доступність (uptime %)'),
  ('Share of time a service works. 99.9% ≈ 43 min of downtime per month, 99.99% ≈ 4.3 min.', 'Доля времени, когда сервис работает. 99,9% ≈ 43 минуты простоя в месяц, 99,99% ≈ 4,3 минуты.', 'Частка часу, коли сервіс працює. 99,9% ≈ 43 хвилини простою на місяць, 99,99% ≈ 4,3 хвилини.'),
  ru=['доступност'], uk=['доступніст'], en=['availability'])
g('mttr', 'noc', ('MTTA / MTTR', 'MTTA / MTTR', 'MTTA / MTTR'),
  ('Mean time to acknowledge an alert / to restore the service. The main speed metrics of a NOC.', 'Среднее время до подтверждения алерта / до восстановления сервиса. Главные метрики скорости NOC.', 'Середній час до підтвердження алерту / до відновлення сервісу. Головні метрики швидкості NOC.'), en=['mttr', 'mtta'])
g('ticket', 'noc', ('Ticket', 'Тикет (заявка)', 'Тікет (заявка)'),
  ('A record in a tracking system (Jira, ServiceNow) with the timeline, actions and status of an issue.', 'Запись в системе учёта (Jira, ServiceNow) с хронологией, действиями и статусом проблемы.', 'Запис у системі обліку (Jira, ServiceNow) з хронологією, діями та статусом проблеми.'),
  ru=['тикет'], uk=['тікет'], en=['ticket'])
g('postmortem', 'noc', ('Postmortem', 'Постмортем (разбор инцидента)', 'Постмортем (розбір інциденту)'),
  ('A blameless write-up after an incident: timeline, root cause, impact and actions so it does not happen again.', 'Разбор после инцидента без поиска виноватых: хронология, корневая причина, влияние и действия, чтобы не повторилось.', 'Розбір після інциденту без пошуку винних: хронологія, коренева причина, вплив і дії, щоб не повторилося.'),
  ru=['постмортем'], uk=['постмортем'], en=['postmortem', 'post-mortem'])
g('root-cause', 'noc', ('Root cause', 'Корневая причина', 'Коренева причина'),
  ('The real reason behind the symptoms (a full disk, not "the site is slow"). Found with the 5 whys.', 'Настоящая причина за симптомами (переполненный диск, а не «сайт тормозит»). Ищется методом «5 почему».', 'Справжня причина за симптомами (переповнений диск, а не «сайт гальмує»). Шукається методом «5 чому».'),
  ru=['корнев'], uk=['коренев'], en=['root cause'])
g('mitigation', 'noc', ('Mitigation', 'Митигация (смягчение)', 'Мітигація (пом’якшення)'),
  ('A quick action that reduces impact now (restart, failover, rollback), before the root cause is fixed.', 'Быстрое действие, уменьшающее ущерб прямо сейчас (рестарт, переключение, откат), до устранения корневой причины.', 'Швидка дія, що зменшує шкоду просто зараз (рестарт, перемикання, відкат), до усунення кореневої причини.'),
  ru=['митигац'], uk=['мітигац'], en=['mitigation', 'mitigate'])
g('rollback', 'noc', ('Rollback', 'Откат', 'Відкат'),
  ('Returning to the previous working version after a bad deploy or config change.', 'Возврат к предыдущей рабочей версии после неудачного деплоя или изменения настроек.', 'Повернення до попередньої робочої версії після невдалого деплою чи зміни налаштувань.'),
  ru=['откат'], uk=['відкат'], en=['rollback'])
g('on-call', 'noc', ('On-call', 'Дежурство (on-call)', 'Чергування (on-call)'),
  ('The engineer responsible for answering alerts at a given time, also at night.', 'Инженер, отвечающий за реакцию на алерты в определённое время, в том числе ночью.', 'Інженер, відповідальний за реакцію на алерти в певний час, зокрема вночі.'),
  ru=['дежурств'], uk=['чергуванн'], en=['on-call'])
g('change', 'noc', ('Change (deploy)', 'Изменение (деплой)', 'Зміна (деплой)'),
  ('Any planned modification: release, config edit, upgrade. Most incidents start right after a change — always ask "what changed?".', 'Любая плановая модификация: релиз, правка конфига, обновление. Большинство инцидентов начинаются сразу после изменения — всегда спрашивайте «что поменялось?».', 'Будь-яка планова модифікація: реліз, правка конфігу, оновлення. Більшість інцидентів починаються одразу після зміни — завжди питайте «що змінилося?».'),
  ru=['деплой'], uk=['деплой'], en=['deploy'])
g('health-check', 'noc', ('Health check', 'Проверка здоровья (health check)', 'Перевірка здоров’я (health check)'),
  ('A special URL or command that says whether a service works: curl localhost:3000/health.', 'Специальный URL или команда, говорящие, работает ли сервис: curl localhost:3000/health.', 'Спеціальний URL або команда, що каже, чи працює сервіс: curl localhost:3000/health.'), en=['health check', 'healthcheck'])
g('dashboard', 'noc', ('Dashboard', 'Дашборд', 'Дашборд'),
  ('A screen with graphs of key metrics (Grafana). The first place a NOC engineer looks.', 'Экран с графиками ключевых метрик (Grafana). Первое, куда смотрит NOC-инженер.', 'Екран із графіками ключових метрик (Grafana). Перше, куди дивиться NOC-інженер.'),
  ru=['дашборд'], uk=['дашборд'], en=['dashboard'])
g('l1l2', 'noc', ('L1 / L2 / L3 support', 'Линии поддержки L1 / L2 / L3', 'Лінії підтримки L1 / L2 / L3'),
  ('L1 (NOC) detects, triages and follows runbooks; L2 are system/service experts; L3 are developers of the product.', 'L1 (NOC) обнаруживает, сортирует и действует по ранбукам; L2 — эксперты по системам и сервисам; L3 — разработчики продукта.', 'L1 (NOC) виявляє, сортує та діє за ранбуками; L2 — експерти із систем і сервісів; L3 — розробники продукту.'), en=['l1', 'l2', 'l3'])
g('triage', 'noc', ('Triage', 'Триаж (сортировка)', 'Тріаж (сортування)'),
  ('Quickly deciding how serious an alert is, who is affected and who should handle it.', 'Быстрое решение: насколько серьёзен алерт, кого затронуло и кто должен заниматься.', 'Швидке рішення: наскільки серйозний алерт, кого зачепило і хто має цим займатися.'),
  ru=['триаж'], uk=['тріаж'], en=['triage'])
g('log', 'noc', ('Log', 'Лог (журнал событий)', 'Лог (журнал подій)'),
  ('A text file or stream where programs write what happens: time, level (INFO/WARN/ERROR) and message.', 'Текстовый файл или поток, куда программы пишут происходящее: время, уровень (INFO/WARN/ERROR) и сообщение.', 'Текстовий файл або потік, куди програми пишуть, що відбувається: час, рівень (INFO/WARN/ERROR) і повідомлення.'),
  ru=['лог'], uk=['лог'], en=['log'], cmd='tail')
g('log-rotation', 'noc', ('Log rotation', 'Ротация логов', 'Ротація логів'),
  ('Regularly renaming and compressing old logs (access.log.1, .2.gz) so they do not fill the disk.', 'Регулярное переименование и сжатие старых логов (access.log.1, .2.gz), чтобы они не заполнили диск.', 'Регулярне перейменування та стискання старих логів (access.log.1, .2.gz), щоб вони не заповнили диск.'),
  ru=['ротаци'], uk=['ротаці'], en=['rotation'])

out = os.path.join(ROOT, 'glossary.json')
with open(out, 'w') as f:
    json.dump(G, f, indent=2, ensure_ascii=False)
    f.write('\n')
print(len(G), 'terms')
