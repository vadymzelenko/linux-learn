"""Linux course: shell like a pro (chaining, quoting, braces, loops, conditions) and text processing."""
from lib import *

SH = {
    "hostname": "trainer",
    "files": {
        "~/servers.txt": "web01\nweb02\ndb01\n",
        "~/photos/IMG_001.JPG": {"content": "jpg", "size": 2400000},
        "~/photos/IMG_002.JPG": {"content": "jpg", "size": 3100000},
        "~/photos/IMG_003.JPG": {"content": "jpg", "size": 2800000},
        "~/photos/notes.txt": "trip to Lviv\n",
        "~/report.txt": "Q3 report\n",
    },
}

shell = [
    lesson('sp-chain', L('Chaining commands', 'Цепочки команд', 'Ланцюжки команд'), ['echo', 'mkdir', 'cd'], setup=SH, steps=[
        theory(L(
            """## Exit codes
Every command returns a number: **0 = success**, anything else = an error. The last one is in `$?`.
```
$ ls /nope
$ echo $?
```
## Four connectors
| syntax | runs the second command… |
|---|---|
| `a ; b` | always |
| `a && b` | only if a **succeeded** |
| `a \\|\\| b` | only if a **failed** |
| `a \\| b` | at the same time, a's output goes into b |

```
$ mkdir -p backup && cp report.txt backup/
$ grep -q web servers.txt && echo "found" || echo "missing"
```
> `&&` is a safety belt: `cd /var/www && rm -rf old` — if the cd fails, rm never runs in the wrong folder.""",
            """## Коды завершения
Каждая команда возвращает число: **0 = успех**, всё остальное — ошибка. Код последней — в `$?`.
```
$ ls /nope
$ echo $?
```
## Четыре соединителя
| синтаксис | вторая команда выполняется… |
|---|---|
| `a ; b` | всегда |
| `a && b` | только если a **успешна** |
| `a \\|\\| b` | только если a **упала** |
| `a \\| b` | одновременно, вывод a идёт в b |

```
$ mkdir -p backup && cp report.txt backup/
$ grep -q web servers.txt && echo "found" || echo "missing"
```
> `&&` — ремень безопасности: `cd /var/www && rm -rf old` — если cd не удался, rm не выполнится в чужой папке.""",
            """## Коди завершення
Кожна команда повертає число: **0 = успіх**, усе інше — помилка. Код останньої — у `$?`.
```
$ ls /nope
$ echo $?
```
## Чотири з’єднувачі
| синтаксис | друга команда виконується… |
|---|---|
| `a ; b` | завжди |
| `a && b` | лише якщо a **успішна** |
| `a \\|\\| b` | лише якщо a **впала** |
| `a \\| b` | одночасно, вивід a йде в b |

```
$ mkdir -p backup && cp report.txt backup/
$ grep -q web servers.txt && echo "found" || echo "missing"
```
> `&&` — пасок безпеки: `cd /var/www && rm -rf old` — якщо cd не вдався, rm не виконається в чужій папці."""),
            title=L('Exit codes and connectors', 'Коды завершения и соединители', 'Коди завершення та з’єднувачі'), demo=['ls /nope; echo "exit code: $?"']),
        task(L('Create ~/backup and copy ~/report.txt into it — in ONE line, the copy only if mkdir succeeded.', 'Создайте ~/backup и скопируйте туда ~/report.txt — ОДНОЙ строкой, копирование только если mkdir удался.', 'Створіть ~/backup і скопіюйте туди ~/report.txt — ОДНИМ рядком, копіювання лише якщо mkdir вдався.'),
             [fexists('~/backup/report.txt', L('~/backup/report.txt exists', '~/backup/report.txt есть', '~/backup/report.txt є')), used('cp', L('cp after &&', 'cp после &&', 'cp після &&'))],
             L('mkdir -p ~/backup && cp ~/report.txt ~/backup/', 'mkdir -p ~/backup && cp ~/report.txt ~/backup/', 'mkdir -p ~/backup && cp ~/report.txt ~/backup/'), 'mkdir', ['mkdir -p ~/backup && cp ~/report.txt ~/backup/']),
        task(L('Print "found" if db01 is in ~/servers.txt, otherwise "missing". Use grep -q, && and ||.', 'Выведите «found», если db01 есть в ~/servers.txt, иначе «missing». Используйте grep -q, && и ||.', 'Виведіть «found», якщо db01 є в ~/servers.txt, інакше «missing». Використайте grep -q, && і ||.'),
             [used('grep', L('grep -q', 'grep -q', 'grep -q'), flags=['-q']), out(L('found', 'found', 'found'), regex='^found$')],
             L('grep -q db01 ~/servers.txt && echo found || echo missing', 'grep -q db01 ~/servers.txt && echo found || echo missing', 'grep -q db01 ~/servers.txt && echo found || echo missing'), 'grep', ['grep -q db01 ~/servers.txt && echo found || echo missing']),
        predict('ls /nope; echo $?', ["ls: cannot access '/nope': No such file or directory\n2", "ls: cannot access '/nope': No such file or directory\n0", '2'], 0,
                L('ls returns 2 for "serious trouble" such as a missing argument path.', 'ls возвращает 2 при «серьёзной проблеме», например несуществующем пути.', 'ls повертає 2 у разі «серйозної проблеми», наприклад неіснуючого шляху.'), setup=SH, context=[]),
        quiz(L('"cd /data && rm -rf tmp" — what if /data does not exist?', '«cd /data && rm -rf tmp» — что будет, если /data нет?', '«cd /data && rm -rf tmp» — що буде, якщо /data немає?'),
             [L('cd fails, rm does not run — safe', 'cd падает, rm не выполняется — безопасно', 'cd падає, rm не виконується — безпечно'), L('rm deletes tmp in the current folder', 'rm удалит tmp в текущей папке', 'rm видалить tmp у поточній папці'), L('Both run', 'Выполнятся обе', 'Виконаються обидві')], 0),
    ]),

    lesson('sp-quotes', L('Quotes and substitution', 'Кавычки и подстановка', 'Лапки та підстановка'), ['echo'], setup=SH, steps=[
        theory(L(
            """## Three kinds of quoting
| form | `$VAR` and `$(cmd)` | spaces |
|---|---|---|
| `"double"` | **expanded** | kept, one word |
| `'single'` | literally, as typed | kept, one word |
| `\\` before a char | that char is literal | — |

```
$ echo "Home: $HOME"
$ echo 'Home: $HOME'
$ echo "Today is $(date +%A)"
$ echo "Files: $(ls | wc -l)"
```
## Command substitution
`$(command)` is replaced by the command's output. Old style: backticks `` `command` ``.

> Rule: put variables in **double quotes** — `rm "$file"` — otherwise a file name with spaces becomes two arguments.""",
            """## Три вида кавычек
| форма | `$VAR` и `$(cmd)` | пробелы |
|---|---|---|
| `"двойные"` | **подставляются** | сохраняются, одно слово |
| `'одинарные'` | буквально, как написано | сохраняются, одно слово |
| `\\` перед символом | этот символ буквальный | — |

```
$ echo "Home: $HOME"
$ echo 'Home: $HOME'
$ echo "Today is $(date +%A)"
$ echo "Files: $(ls | wc -l)"
```
## Подстановка команд
`$(команда)` заменяется выводом команды. Старый стиль: обратные кавычки `` `команда` ``.

> Правило: переменные — в **двойных кавычках** — `rm "$file"` — иначе имя файла с пробелами станет двумя аргументами.""",
            """## Три види лапок
| форма | `$VAR` і `$(cmd)` | пробіли |
|---|---|---|
| `"подвійні"` | **підставляються** | зберігаються, одне слово |
| `'одинарні'` | буквально, як написано | зберігаються, одне слово |
| `\\` перед символом | цей символ буквальний | — |

```
$ echo "Home: $HOME"
$ echo 'Home: $HOME'
$ echo "Today is $(date +%A)"
$ echo "Files: $(ls | wc -l)"
```
## Підстановка команд
`$(команда)` замінюється виводом команди. Старий стиль: зворотні лапки `` `команда` ``.

> Правило: змінні — у **подвійних лапках** — `rm "$file"` — інакше назва файлу з пробілами стане двома аргументами."""),
            title=L('"…" vs \'…\'', '"…" и \'…\'', '"…" і \'…\''), demo=['echo "Home: $HOME"', "echo 'Home: $HOME'"]),
        predict("echo 'I am $USER'", ['I am $USER', 'I am student', 'I am'], 0,
                L('Single quotes keep everything literally.', 'Одинарные кавычки сохраняют всё буквально.', 'Одинарні лапки зберігають усе буквально.'), setup=SH, context=[]),
        task(L('Print exactly: "There are 3 servers" — the number must come from counting the lines of ~/servers.txt.', 'Выведите ровно: «There are 3 servers» — число должно получиться подсчётом строк ~/servers.txt.', 'Виведіть рівно: «There are 3 servers» — число має вийти з підрахунку рядків ~/servers.txt.'),
             [used('wc', L('wc -l inside $( )', 'wc -l внутри $( )', 'wc -l усередині $( )')), out(L('There are 3 servers', 'There are 3 servers', 'There are 3 servers'), regex='^There are 3 servers$')],
             L('echo "There are $(wc -l < ~/servers.txt) servers"', 'echo "There are $(wc -l < ~/servers.txt) servers"', 'echo "There are $(wc -l < ~/servers.txt) servers"'), 'echo', ['echo "There are $(wc -l < ~/servers.txt) servers"']),
        task(L('Create a file whose name contains a space: "~/my notes.txt".', 'Создайте файл с пробелом в имени: «~/my notes.txt».', 'Створіть файл із пробілом у назві: «~/my notes.txt».'),
             [fexists('~/my notes.txt', L('"my notes.txt" exists', '«my notes.txt» есть', '«my notes.txt» є')), gone('~/my', L('No stray file "my"', 'Нет лишнего файла «my»', 'Немає зайвого файлу «my»'))],
             L('touch ~/"my notes.txt"', 'touch ~/"my notes.txt"', 'touch ~/"my notes.txt"'), 'touch', ['touch ~/"my notes.txt"']),
        quiz(L('FILE="my notes.txt"; rm $FILE — what does rm try to delete?', 'FILE="my notes.txt"; rm $FILE — что попытается удалить rm?', 'FILE="my notes.txt"; rm $FILE — що спробує видалити rm?'),
             [L('Two files: "my" and "notes.txt"', 'Два файла: «my» и «notes.txt»', 'Два файли: «my» і «notes.txt»'), L('"my notes.txt"', '«my notes.txt»', '«my notes.txt»'), L('Nothing', 'Ничего', 'Нічого')], 0,
             L('Without quotes the value is split on spaces. Use rm "$FILE".', 'Без кавычек значение разбивается по пробелам. Пишите rm "$FILE".', 'Без лапок значення розбивається за пробілами. Пишіть rm "$FILE".')),
    ]),

    lesson('sp-braces', L('Brace expansion', 'Фигурные скобки', 'Фігурні дужки'), ['mkdir', 'touch', 'cp'], setup=SH, steps=[
        theory(L(
            """## Bash writes the list for you
```
$ echo file{1,2,3}.txt
file1.txt file2.txt file3.txt
$ echo {1..5}
$ echo {a..e}
$ echo log-{01..12}
```
## Real uses
```
$ mkdir -p project/{src,docs,tests}
$ touch project/src/{main,utils}.py
$ cp config.yml{,.bak}
```
The last one is a favourite: `{,.bak}` expands to `config.yml config.yml.bak` — a backup in 12 characters.

> Braces are expanded **before** anything else and do not look at the disk — unlike `*`, they create names that do not exist yet.""",
            """## Bash пишет список за вас
```
$ echo file{1,2,3}.txt
file1.txt file2.txt file3.txt
$ echo {1..5}
$ echo {a..e}
$ echo log-{01..12}
```
## Реальное применение
```
$ mkdir -p project/{src,docs,tests}
$ touch project/src/{main,utils}.py
$ cp config.yml{,.bak}
```
Последнее — любимый трюк: `{,.bak}` раскрывается в `config.yml config.yml.bak` — бэкап в 12 символов.

> Скобки раскрываются **раньше** всего остального и не смотрят на диск — в отличие от `*`, они создают имена, которых ещё нет.""",
            """## Bash пише список за вас
```
$ echo file{1,2,3}.txt
file1.txt file2.txt file3.txt
$ echo {1..5}
$ echo {a..e}
$ echo log-{01..12}
```
## Реальне застосування
```
$ mkdir -p project/{src,docs,tests}
$ touch project/src/{main,utils}.py
$ cp config.yml{,.bak}
```
Останнє — улюблений трюк: `{,.bak}` розкривається в `config.yml config.yml.bak` — бекап у 12 символів.

> Дужки розкриваються **раніше** за все інше й не дивляться на диск — на відміну від `*`, вони створюють назви, яких ще немає."""),
            title=L('{a,b} and {1..9}', '{a,b} и {1..9}', '{a,b} і {1..9}'), demo=['echo file{1,2,3}.txt', 'echo {1..5}']),
        task(L('Create the project skeleton ~/site with folders css, js and img — in one command.', 'Создайте каркас проекта ~/site с папками css, js и img — одной командой.', 'Створіть каркас проєкту ~/site з папками css, js і img — однією командою.'),
             [dexists('~/site/css', L('css', 'css', 'css')), dexists('~/site/js', L('js', 'js', 'js')), dexists('~/site/img', L('img', 'img', 'img')), used('mkdir', L('one mkdir with braces', 'один mkdir со скобками', 'один mkdir з дужками'))],
             L('mkdir -p ~/site/{css,js,img}', 'mkdir -p ~/site/{css,js,img}', 'mkdir -p ~/site/{css,js,img}'), 'mkdir', ['mkdir -p ~/site/{css,js,img}']),
        task(L('Create 7 empty daily logs ~/logs/day1.log … ~/logs/day7.log.', 'Создайте 7 пустых дневных логов ~/logs/day1.log … ~/logs/day7.log.', 'Створіть 7 порожніх денних логів ~/logs/day1.log … ~/logs/day7.log.'),
             [count('~/logs', L('7 files', '7 файлов', '7 файлів'), eq=7), fexists('~/logs/day7.log', L('day7.log', 'day7.log', 'day7.log'))],
             L('mkdir -p ~/logs && touch ~/logs/day{1..7}.log', 'mkdir -p ~/logs && touch ~/logs/day{1..7}.log', 'mkdir -p ~/logs && touch ~/logs/day{1..7}.log'), 'touch', ['mkdir -p ~/logs && touch ~/logs/day{1..7}.log']),
        task(L('Back up ~/report.txt to ~/report.txt.bak using the {,.bak} trick.', 'Сделайте копию ~/report.txt в ~/report.txt.bak трюком {,.bak}.', 'Зробіть копію ~/report.txt у ~/report.txt.bak трюком {,.bak}.'),
             [fexists('~/report.txt.bak', L('report.txt.bak exists', 'report.txt.bak есть', 'report.txt.bak є')), fexists('~/report.txt', L('The original stays', 'Оригинал на месте', 'Оригінал на місці'))],
             L('cp ~/report.txt{,.bak}', 'cp ~/report.txt{,.bak}', 'cp ~/report.txt{,.bak}'), 'cp', ['cp ~/report.txt{,.bak}']),
        predict('echo {a,b}{1,2}', ['a1 a2 b1 b2', 'a1 b2', '{a,b}{1,2}', 'ab12'], 0,
                L('Two brace groups give every combination.', 'Две группы скобок дают все комбинации.', 'Дві групи дужок дають усі комбінації.'), setup=SH, context=[]),
    ]),

    lesson('sp-loops', L('Loops: for and while', 'Циклы: for и while', 'Цикли: for і while'), ['read', 'echo', 'basename'], setup=SH, steps=[
        theory(L(
            """## for — repeat for each item
```
$ for s in web01 web02 db01; do echo "checking $s"; done
$ for f in ~/photos/*.JPG; do echo "$f"; done
$ for i in {1..3}; do echo "try $i"; done
```
Structure: `for NAME in LIST; do COMMANDS; done`.

## while read — line by line
```
$ while read host; do echo "ping $host"; done < servers.txt
```
`read` takes one line per round; the loop stops at the end of the file.

## Arithmetic
```
$ i=0; while [ $i -lt 3 ]; do echo $i; i=$((i+1)); done
```
> One line in the terminal or many lines in a script — both work. In a script put `do` and `done` on their own lines.""",
            """## for — повторить для каждого элемента
```
$ for s in web01 web02 db01; do echo "checking $s"; done
$ for f in ~/photos/*.JPG; do echo "$f"; done
$ for i in {1..3}; do echo "try $i"; done
```
Структура: `for ИМЯ in СПИСОК; do КОМАНДЫ; done`.

## while read — строка за строкой
```
$ while read host; do echo "ping $host"; done < servers.txt
```
`read` берёт по одной строке за круг; цикл останавливается в конце файла.

## Арифметика
```
$ i=0; while [ $i -lt 3 ]; do echo $i; i=$((i+1)); done
```
> Одной строкой в терминале или многими строками в скрипте — работает и так, и так. В скрипте пишите `do` и `done` на отдельных строках.""",
            """## for — повторити для кожного елемента
```
$ for s in web01 web02 db01; do echo "checking $s"; done
$ for f in ~/photos/*.JPG; do echo "$f"; done
$ for i in {1..3}; do echo "try $i"; done
```
Структура: `for НАЗВА in СПИСОК; do КОМАНДИ; done`.

## while read — рядок за рядком
```
$ while read host; do echo "ping $host"; done < servers.txt
```
`read` бере по одному рядку за коло; цикл зупиняється наприкінці файлу.

## Арифметика
```
$ i=0; while [ $i -lt 3 ]; do echo $i; i=$((i+1)); done
```
> Одним рядком у терміналі чи багатьма рядками в скрипті — працює і так, і так. У скрипті пишіть `do` і `done` на окремих рядках."""),
            title=L('Repeat without copy-paste', 'Повтор без копипаста', 'Повтор без копіпасту'), demo=['for i in 1 2 3; do echo "try $i"; done']),
        task(L('For each server in ~/servers.txt print "ok: NAME".', 'Для каждого сервера из ~/servers.txt выведите «ok: ИМЯ».', 'Для кожного сервера з ~/servers.txt виведіть «ok: НАЗВА».'),
             [out(L('ok: web01', 'ok: web01', 'ok: web01'), regex='^ok: web01$'), out(L('ok: db01', 'ok: db01', 'ok: db01'), regex='^ok: db01$'), lines(L('3 lines', '3 строки', '3 рядки'), eq=3)],
             L('while read s; do echo "ok: $s"; done < ~/servers.txt', 'while read s; do echo "ok: $s"; done < ~/servers.txt', 'while read s; do echo "ok: $s"; done < ~/servers.txt'), 'while', ['while read s; do echo "ok: $s"; done < ~/servers.txt']),
        task(L('Rename every ~/photos/*.JPG to lowercase .jpg (IMG_001.JPG → IMG_001.jpg).', 'Переименуйте все ~/photos/*.JPG в .jpg строчными (IMG_001.JPG → IMG_001.jpg).', 'Перейменуйте всі ~/photos/*.JPG на .jpg малими (IMG_001.JPG → IMG_001.jpg).'),
             [fexists('~/photos/IMG_001.jpg', L('IMG_001.jpg', 'IMG_001.jpg', 'IMG_001.jpg')), fexists('~/photos/IMG_003.jpg', L('IMG_003.jpg', 'IMG_003.jpg', 'IMG_003.jpg')), count('~/photos', L('No .JPG left', 'Не осталось .JPG', 'Не лишилося .JPG'), eq=0, pattern='*.JPG')],
             L('for f in ~/photos/*.JPG; do mv "$f" "${f%.JPG}.jpg"; done — or use basename', 'for f in ~/photos/*.JPG; do mv "$f" "$(dirname $f)/$(basename $f .JPG).jpg"; done', 'for f in ~/photos/*.JPG; do mv "$f" "$(dirname $f)/$(basename $f .JPG).jpg"; done'), 'for',
             ['for f in ~/photos/*.JPG; do mv "$f" "$(dirname "$f")/$(basename "$f" .JPG).jpg"; done'], xp=30,
             instructions=L('1. `for f in ~/photos/*.JPG; do … done` walks over the files\n2. `basename "$f" .JPG` → IMG_001 (name without extension)\n3. `mv "$f" ~/photos/NAME.jpg`', '1. `for f in ~/photos/*.JPG; do … done` перебирает файлы\n2. `basename "$f" .JPG` → IMG_001 (имя без расширения)\n3. `mv "$f" ~/photos/ИМЯ.jpg`', '1. `for f in ~/photos/*.JPG; do … done` перебирає файли\n2. `basename "$f" .JPG` → IMG_001 (назва без розширення)\n3. `mv "$f" ~/photos/НАЗВА.jpg`')),
        predict('for i in 1 2 3; do echo $((i * 10)); done', ['10\n20\n30', '1 2 3', '10 20 30', '$((i * 10))'], 0,
                L('$(( )) does integer arithmetic, echo prints each result on its own line.', '$(( )) — целочисленная арифметика, echo печатает каждый результат на новой строке.', '$(( )) — цілочисельна арифметика, echo друкує кожен результат на новому рядку.'), setup=SH, context=[]),
        quiz(L('Which loop reads ~/servers.txt line by line correctly?', 'Какой цикл правильно читает ~/servers.txt построчно?', 'Який цикл правильно читає ~/servers.txt порядково?'),
             [L('while read s; do …; done < ~/servers.txt', 'while read s; do …; done < ~/servers.txt', 'while read s; do …; done < ~/servers.txt'), L('for s in ~/servers.txt; do …; done', 'for s in ~/servers.txt; do …; done', 'for s in ~/servers.txt; do …; done'), L('while ~/servers.txt; do …; done', 'while ~/servers.txt; do …; done', 'while ~/servers.txt; do …; done')], 0,
             L('"for s in FILE" loops once over the file NAME, not its lines.', '«for s in ФАЙЛ» делает один круг — по ИМЕНИ файла, а не по строкам.', '«for s in ФАЙЛ» робить одне коло — за НАЗВОЮ файлу, а не за рядками.')),
    ]),

    lesson('sp-if', L('Conditions: if and test', 'Условия: if и test', 'Умови: if і test'), ['test', 'bash'], setup=SH, steps=[
        theory(L(
            """## if
```
if [ -f ~/report.txt ]; then
  echo "report exists"
elif [ -d ~/reports ]; then
  echo "there is a folder"
else
  echo "nothing"
fi
```
`[ … ]` is the command `test`. **Spaces inside the brackets are required.**

## Most useful tests
| test | true when |
|---|---|
| `-f FILE` / `-d DIR` / `-e PATH` | a file / directory / anything exists |
| `-s FILE` | the file is not empty |
| `-z "$S"` / `-n "$S"` | the string is empty / not empty |
| `"$A" = "$B"` / `!=` | strings equal / differ |
| `N -eq M`, `-ne`, `-lt`, `-le`, `-gt`, `-ge` | numbers: =, ≠, <, ≤, >, ≥ |

Any command can be a condition: `if grep -q error app.log; then …`.""",
            """## if
```
if [ -f ~/report.txt ]; then
  echo "report exists"
elif [ -d ~/reports ]; then
  echo "there is a folder"
else
  echo "nothing"
fi
```
`[ … ]` — это команда `test`. **Пробелы внутри скобок обязательны.**

## Самые полезные проверки
| проверка | истинна, когда |
|---|---|
| `-f ФАЙЛ` / `-d ПАПКА` / `-e ПУТЬ` | есть файл / папка / что угодно |
| `-s ФАЙЛ` | файл не пустой |
| `-z "$S"` / `-n "$S"` | строка пустая / не пустая |
| `"$A" = "$B"` / `!=` | строки равны / различаются |
| `N -eq M`, `-ne`, `-lt`, `-le`, `-gt`, `-ge` | числа: =, ≠, <, ≤, >, ≥ |

Условием может быть любая команда: `if grep -q error app.log; then …`.""",
            """## if
```
if [ -f ~/report.txt ]; then
  echo "report exists"
elif [ -d ~/reports ]; then
  echo "there is a folder"
else
  echo "nothing"
fi
```
`[ … ]` — це команда `test`. **Пробіли всередині дужок обов’язкові.**

## Найкорисніші перевірки
| перевірка | істинна, коли |
|---|---|
| `-f ФАЙЛ` / `-d ПАПКА` / `-e ШЛЯХ` | є файл / папка / будь-що |
| `-s ФАЙЛ` | файл не порожній |
| `-z "$S"` / `-n "$S"` | рядок порожній / не порожній |
| `"$A" = "$B"` / `!=` | рядки рівні / різні |
| `N -eq M`, `-ne`, `-lt`, `-le`, `-gt`, `-ge` | числа: =, ≠, <, ≤, >, ≥ |

Умовою може бути будь-яка команда: `if grep -q error app.log; then …`."""),
            title=L('Making decisions', 'Принимаем решения', 'Ухвалюємо рішення'), demo=['if [ -f ~/report.txt ]; then echo yes; else echo no; fi']),
        task(L('Print "big" if ~/photos has more than 3 entries, else "small".', 'Выведите «big», если в ~/photos больше 3 элементов, иначе «small».', 'Виведіть «big», якщо в ~/photos більше 3 елементів, інакше «small».'),
             [used('if', L('if … then … else … fi', 'if … then … else … fi', 'if … then … else … fi')), out(L('big (4 entries)', 'big (4 элемента)', 'big (4 елементи)'), regex='^big$')],
             L('n=$(ls ~/photos | wc -l); if [ $n -gt 3 ]; then echo big; else echo small; fi', 'n=$(ls ~/photos | wc -l); if [ $n -gt 3 ]; then echo big; else echo small; fi', 'n=$(ls ~/photos | wc -l); if [ $n -gt 3 ]; then echo big; else echo small; fi'), 'if', ['n=$(ls ~/photos | wc -l); if [ $n -gt 3 ]; then echo big; else echo small; fi']),
        task(L('Write ~/check.sh: if ~/report.txt exists it prints "report ok", otherwise "report missing" and exits with code 1. Run it.', 'Напишите ~/check.sh: если ~/report.txt есть — печатает «report ok», иначе «report missing» и выходит с кодом 1. Запустите.', 'Напишіть ~/check.sh: якщо ~/report.txt є — друкує «report ok», інакше «report missing» і виходить із кодом 1. Запустіть.'),
             [fcontains('~/check.sh', L('The script uses if', 'В скрипте есть if', 'У скрипті є if'), regex='^\\s*if '), fcontains('~/check.sh', L('… and fi', '… и fi', '… і fi'), regex='fi\\s*$'), out(L('report ok', 'report ok', 'report ok'), text='report ok')],
             L('Write it with nano, then bash ~/check.sh', 'Напишите через nano, затем bash ~/check.sh', 'Напишіть через nano, потім bash ~/check.sh'), 'bash',
             ["echo 'if [ -f ~/report.txt ]; then echo \"report ok\"; else echo \"report missing\"; exit 1; fi' > ~/check.sh", 'bash ~/check.sh'],
             instructions=L('1. `nano ~/check.sh` (or echo \'…\' > ~/check.sh)\n2. Write: `if [ -f ~/report.txt ]; then echo "report ok"; else echo "report missing"; exit 1; fi`\n3. `bash ~/check.sh`', '1. `nano ~/check.sh` (или echo \'…\' > ~/check.sh)\n2. Напишите: `if [ -f ~/report.txt ]; then echo "report ok"; else echo "report missing"; exit 1; fi`\n3. `bash ~/check.sh`', '1. `nano ~/check.sh` (або echo \'…\' > ~/check.sh)\n2. Напишіть: `if [ -f ~/report.txt ]; then echo "report ok"; else echo "report missing"; exit 1; fi`\n3. `bash ~/check.sh`'), xp=30),
        quiz(L('Why does "[$n -gt 3]" fail with "command not found"?', 'Почему «[$n -gt 3]» падает с «command not found»?', 'Чому «[$n -gt 3]» падає з «command not found»?'),
             [L('No spaces: bash looks for a command named "[4"', 'Нет пробелов: bash ищет команду «[4»', 'Немає пробілів: bash шукає команду «[4»'), L('-gt does not exist', '-gt не существует', '-gt не існує'), L('Variables are not allowed in tests', 'В проверках нельзя переменные', 'У перевірках не можна змінні')], 0),
        quiz(L('Which test is true when the variable NAME is empty?', 'Какая проверка истинна, когда переменная NAME пустая?', 'Яка перевірка істинна, коли змінна NAME порожня?'),
             [L('[ -z "$NAME" ]', '[ -z "$NAME" ]', '[ -z "$NAME" ]'), L('[ -n "$NAME" ]', '[ -n "$NAME" ]', '[ -n "$NAME" ]'), L('[ -f "$NAME" ]', '[ -f "$NAME" ]', '[ -f "$NAME" ]')], 0),
    ]),

    lesson('sp-keys', L('Terminal speed tricks', 'Скорость в терминале', 'Швидкість у терміналі'), ['history'], setup=SH, steps=[
        reading(L(
            """## Keys that save hours
| keys | action |
|---|---|
| **Tab** | complete a command or a file name; Tab Tab — show options |
| **↑ / ↓** | previous / next command |
| **Ctrl+R** | search the history: type a part, Ctrl+R again for older |
| **Ctrl+A / Ctrl+E** | jump to the start / end of the line |
| **Ctrl+W** | delete the word before the cursor |
| **Ctrl+U** | delete everything before the cursor |
| **Ctrl+L** | clear the screen (like `clear`) |
| **Ctrl+C** | stop the running command |
| **Ctrl+D** | end of input / log out |

## History tricks
- `history` — the numbered list
- `!!` — repeat the last command (`sudo !!` — repeat it with sudo)
- `!42` — run command number 42
- `!$` — the last argument of the previous command

> In the trainer: Tab and ↑/↓ work in the terminal, history and !! too.""",
            """## Клавиши, которые экономят часы
| клавиши | действие |
|---|---|
| **Tab** | дополнить команду или имя файла; Tab Tab — показать варианты |
| **↑ / ↓** | предыдущая / следующая команда |
| **Ctrl+R** | поиск по истории: введите часть, Ctrl+R ещё раз — старее |
| **Ctrl+A / Ctrl+E** | в начало / конец строки |
| **Ctrl+W** | удалить слово перед курсором |
| **Ctrl+U** | удалить всё до курсора |
| **Ctrl+L** | очистить экран (как `clear`) |
| **Ctrl+C** | остановить запущенную команду |
| **Ctrl+D** | конец ввода / выход |

## Трюки с историей
- `history` — пронумерованный список
- `!!` — повторить последнюю команду (`sudo !!` — повторить её с sudo)
- `!42` — выполнить команду номер 42
- `!$` — последний аргумент предыдущей команды

> В тренажёре в терминале работают Tab и ↑/↓, history и !! тоже.""",
            """## Клавіші, що заощаджують години
| клавіші | дія |
|---|---|
| **Tab** | доповнити команду чи назву файлу; Tab Tab — показати варіанти |
| **↑ / ↓** | попередня / наступна команда |
| **Ctrl+R** | пошук в історії: введіть частину, Ctrl+R ще раз — старіше |
| **Ctrl+A / Ctrl+E** | на початок / кінець рядка |
| **Ctrl+W** | видалити слово перед курсором |
| **Ctrl+U** | видалити все до курсора |
| **Ctrl+L** | очистити екран (як `clear`) |
| **Ctrl+C** | зупинити запущену команду |
| **Ctrl+D** | кінець введення / вихід |

## Трюки з історією
- `history` — пронумерований список
- `!!` — повторити останню команду (`sudo !!` — повторити її із sudo)
- `!42` — виконати команду номер 42
- `!$` — останній аргумент попередньої команди

> У тренажері в терміналі працюють Tab і ↑/↓, history і !! теж."""),
            title=L('Hotkeys and history', 'Горячие клавиши и история', 'Гарячі клавіші та історія')),
        task(L('Read /etc/shadow with cat (it will be denied), then repeat the same command with sudo — without retyping it.', 'Прочитайте /etc/shadow через cat (будет отказ), затем повторите ту же команду с sudo — не набирая её заново.', 'Прочитайте /etc/shadow через cat (буде відмова), потім повторіть ту саму команду із sudo — не набираючи її знову.'),
             [used('sudo', L('sudo !!', 'sudo !!', 'sudo !!'), success=True)],
             L('sudo !!', 'sudo !!', 'sudo !!'), 'sudo', ['cat /etc/shadow', 'sudo !!'],
             instructions=L('1. `cat /etc/shadow` → Permission denied\n2. `sudo !!` — bash puts the previous command after sudo', '1. `cat /etc/shadow` → Permission denied\n2. `sudo !!` — bash подставит предыдущую команду после sudo', '1. `cat /etc/shadow` → Permission denied\n2. `sudo !!` — bash підставить попередню команду після sudo')),
        quiz(L('You typed half of a very long command and want to find the full one you used yesterday. Fastest way?', 'Вы набрали половину длинной команды и хотите найти полную, которую вводили вчера. Самый быстрый способ?', 'Ви набрали половину довгої команди й хочете знайти повну, яку вводили вчора. Найшвидший спосіб?'),
             [L('Ctrl+R and type a part of it', 'Ctrl+R и ввести её часть', 'Ctrl+R і ввести її частину'), L('Press ↑ 300 times', 'Нажать ↑ 300 раз', 'Натиснути ↑ 300 разів'), L('Retype everything', 'Набрать всё заново', 'Набрати все знову')], 0),
        quiz(L('What does Tab Tab do after "systemctl re"?', 'Что делает Tab Tab после «systemctl re»?', 'Що робить Tab Tab після «systemctl re»?'),
             [L('Shows all possible completions (restart, reload, …)', 'Показывает все варианты (restart, reload, …)', 'Показує всі варіанти (restart, reload, …)'), L('Runs the command', 'Запускает команду', 'Запускає команду'), L('Deletes the line', 'Удаляет строку', 'Видаляє рядок')], 0),
    ]),
]

module('16-shell-pro.json', 'shell-pro', '/linux/shell', 'code',
       L('Shell like a pro', 'Shell как профи', 'Shell як профі'),
       L('&& and ||, quotes, braces, for and while loops, if, hotkeys.', '&& и ||, кавычки, скобки, циклы for и while, if, горячие клавиши.', '&& і ||, лапки, дужки, цикли for і while, if, гарячі клавіші.'),
       shell)

# ---------------------------------------------------------------- text processing

TP = {
    "hostname": "trainer",
    "files": {
        "~/data/sales.csv": "date,city,product,amount\n2026-10-01,Kyiv,laptop,1200\n2026-10-01,Lviv,phone,600\n2026-10-02,Kyiv,phone,650\n2026-10-02,Odesa,laptop,1150\n2026-10-03,Lviv,laptop,1300\n2026-10-03,Kyiv,tablet,400\n",
        "~/data/contacts.txt": "Olena   Shevchenko    +380501112233\nmarek  Nowak  +48600111222\nIVAN    petrenko +380671234567\n",
        "~/config/app.conf": "# App settings\nport=8080\n\n# database\ndb_host=db01\ndb_port=5432\ndebug=true\n\n# end\n",
        "~/config/app.conf.bak": "# App settings\nport=80\n\n# database\ndb_host=db01\ndb_port=5432\ndebug=false\n\n# end\n",
        "~/data/team_old.txt": "anna\nivan\nmarek\nolena\n",
        "~/data/team_new.txt": "anna\nmarek\nolena\npetro\n",
        "~/data/urls.txt": "https://shop.example.com/cart\nhttps://shop.example.com/login\nhttps://api.example.com/v1/items\n",
    },
}

text = [
    lesson('tp-cut-tr', L('cut and tr', 'cut и tr', 'cut і tr'), ['cut', 'tr'], setup=TP, steps=[
        theory(L(
            """## cut — take columns
```
$ cut -d, -f2 sales.csv
$ cut -d, -f1,4 sales.csv
$ cut -c1-10 sales.csv
```
- `-d,` — the delimiter (comma); `-f2` — field number 2; `-f1,4` or `-f2-3`
- `-c1-10` — characters 1 to 10

## tr — replace or delete characters
```
$ tr a-z A-Z < file
$ tr -s ' ' < contacts.txt
$ tr -d '\\r' < windows.txt > unix.txt
$ tr ',' '\\t' < sales.csv
```
- `-s` — squeeze repeats ("a   b" → "a b")
- `-d` — delete those characters

> tr reads only standard input — use `<` or a pipe, it does not take a file name.""",
            """## cut — взять колонки
```
$ cut -d, -f2 sales.csv
$ cut -d, -f1,4 sales.csv
$ cut -c1-10 sales.csv
```
- `-d,` — разделитель (запятая); `-f2` — поле номер 2; `-f1,4` или `-f2-3`
- `-c1-10` — символы с 1 по 10

## tr — заменить или удалить символы
```
$ tr a-z A-Z < file
$ tr -s ' ' < contacts.txt
$ tr -d '\\r' < windows.txt > unix.txt
$ tr ',' '\\t' < sales.csv
```
- `-s` — сжать повторы («a   b» → «a b»)
- `-d` — удалить эти символы

> tr читает только стандартный ввод — используйте `<` или конвейер, имя файла он не принимает.""",
            """## cut — узяти колонки
```
$ cut -d, -f2 sales.csv
$ cut -d, -f1,4 sales.csv
$ cut -c1-10 sales.csv
```
- `-d,` — роздільник (кома); `-f2` — поле номер 2; `-f1,4` або `-f2-3`
- `-c1-10` — символи з 1 по 10

## tr — замінити чи видалити символи
```
$ tr a-z A-Z < file
$ tr -s ' ' < contacts.txt
$ tr -d '\\r' < windows.txt > unix.txt
$ tr ',' '\\t' < sales.csv
```
- `-s` — стиснути повтори («a   b» → «a b»)
- `-d` — видалити ці символи

> tr читає лише стандартний ввід — використовуйте `<` або конвеєр, назву файлу він не приймає."""),
            title=L('Columns and characters', 'Колонки и символы', 'Колонки та символи'), demo=['cut -d, -f2 ~/data/sales.csv']),
        task(L('Which cities appear in ~/data/sales.csv? Print each city once (no header).', 'Какие города есть в ~/data/sales.csv? Выведите каждый город один раз (без заголовка).', 'Які міста є в ~/data/sales.csv? Виведіть кожне місто один раз (без заголовка).'),
             [used('cut', L('cut -d, -f2', 'cut -d, -f2', 'cut -d, -f2')), lines(L('3 cities', '3 города', '3 міста'), eq=3), out(L('Odesa', 'Odesa', 'Odesa'), regex='^Odesa$')],
             L('tail -n +2 FILE | cut -d, -f2 | sort -u', 'tail -n +2 ФАЙЛ | cut -d, -f2 | sort -u', 'tail -n +2 ФАЙЛ | cut -d, -f2 | sort -u'), 'cut', ['tail -n +2 ~/data/sales.csv | cut -d, -f2 | sort -u']),
        task(L('~/data/contacts.txt has messy spaces. Squeeze them so that there is exactly one space between words, and save it to ~/data/contacts_clean.txt.', 'В ~/data/contacts.txt беспорядок с пробелами. Сожмите их до одного между словами и сохраните в ~/data/contacts_clean.txt.', 'У ~/data/contacts.txt безлад із пробілами. Стисніть їх до одного між словами й збережіть у ~/data/contacts_clean.txt.'),
             [fcontains('~/data/contacts_clean.txt', L('Olena Shevchenko +380…', 'Olena Shevchenko +380…', 'Olena Shevchenko +380…'), text='Olena Shevchenko +380501112233'), fnot('~/data/contacts_clean.txt', L('No double spaces', 'Нет двойных пробелов', 'Немає подвійних пробілів'), text='  ')],
             L("tr -s ' ' < IN > OUT", "tr -s ' ' < ВХОД > ВЫХОД", "tr -s ' ' < ВХІД > ВИХІД"), 'tr', ["tr -s ' ' < ~/data/contacts.txt > ~/data/contacts_clean.txt"]),
        task(L('Print the domain of every URL in ~/data/urls.txt (shop.example.com, …).', 'Выведите домен каждого URL из ~/data/urls.txt (shop.example.com, …).', 'Виведіть домен кожного URL з ~/data/urls.txt (shop.example.com, …).'),
             [used('cut', L('cut -d/ -f3', 'cut -d/ -f3', 'cut -d/ -f3')), out(L('api.example.com', 'api.example.com', 'api.example.com'), regex='^api\\.example\\.com$'), lines(L('3 lines', '3 строки', '3 рядки'), eq=3)],
             L('"https://shop…/cart" split by "/" → field 3 is the domain', '«https://shop…/cart» по «/» → поле 3 — домен', '«https://shop…/cart» за «/» → поле 3 — домен'), 'cut', ['cut -d/ -f3 ~/data/urls.txt']),
        predict("echo 'Hello World' | tr a-z A-Z", ['HELLO WORLD', 'hello world', 'Hello World', 'HELLO world'], 0,
                L('tr maps every lowercase letter to its uppercase twin.', 'tr заменяет каждую строчную букву её заглавной парой.', 'tr замінює кожну малу літеру її великою парою.'), setup=TP, context=[]),
    ]),

    lesson('tp-sed', L('sed: search and replace', 'sed: поиск и замена', 'sed: пошук і заміна'), ['sed'], setup=TP, steps=[
        theory(L(
            """## The famous s///
```
$ sed 's/old/new/' file
$ sed 's/old/new/g' file
$ sed -i 's/port=8080/port=80/' app.conf
```
- without `g` — only the first match **in each line**
- `-i` — edit the file **in place** (without it sed only prints)
- `-i.bak` — in place, keeping a backup

## Other everyday commands
```
$ sed -n '2,4p' file
$ sed '/^#/d' app.conf
$ sed '/^$/d' app.conf
$ sed -n '/database/,/^$/p' app.conf
```
- `-n …p` — print only selected lines
- `/regex/d` — delete matching lines

> Test without `-i` first. When the output looks right, add `-i`.""",
            """## Знаменитый s///
```
$ sed 's/old/new/' file
$ sed 's/old/new/g' file
$ sed -i 's/port=8080/port=80/' app.conf
```
- без `g` — только первое совпадение **в каждой строке**
- `-i` — править файл **на месте** (без него sed только печатает)
- `-i.bak` — на месте, с резервной копией

## Другие ежедневные команды
```
$ sed -n '2,4p' file
$ sed '/^#/d' app.conf
$ sed '/^$/d' app.conf
$ sed -n '/database/,/^$/p' app.conf
```
- `-n …p` — печатать только выбранные строки
- `/regex/d` — удалить совпадающие строки

> Сначала проверьте без `-i`. Когда вывод правильный — добавьте `-i`.""",
            """## Знаменитий s///
```
$ sed 's/old/new/' file
$ sed 's/old/new/g' file
$ sed -i 's/port=8080/port=80/' app.conf
```
- без `g` — лише перший збіг **у кожному рядку**
- `-i` — правити файл **на місці** (без нього sed лише друкує)
- `-i.bak` — на місці, з резервною копією

## Інші щоденні команди
```
$ sed -n '2,4p' file
$ sed '/^#/d' app.conf
$ sed '/^$/d' app.conf
$ sed -n '/database/,/^$/p' app.conf
```
- `-n …p` — друкувати лише вибрані рядки
- `/regex/d` — видалити рядки, що збігаються

> Спершу перевірте без `-i`. Коли вивід правильний — додайте `-i`."""),
            title=L('Stream editor', 'Потоковый редактор', 'Потоковий редактор'), demo=["sed '/^#/d' ~/config/app.conf"]),
        task(L('Show ~/config/app.conf without comments and without empty lines — only the real settings.', 'Покажите ~/config/app.conf без комментариев и пустых строк — только настройки.', 'Покажіть ~/config/app.conf без коментарів і порожніх рядків — лише налаштування.'),
             [used('sed', L('sed with /d', 'sed с /d', 'sed з /d')), lines(L('4 settings', '4 настройки', '4 налаштування'), eq=4), out(L('db_host=db01', 'db_host=db01', 'db_host=db01'), text='db_host=db01')],
             L("sed '/^#/d; /^$/d' FILE", "sed '/^#/d; /^$/d' ФАЙЛ", "sed '/^#/d; /^$/d' ФАЙЛ"), 'sed', ["sed '/^#/d; /^$/d' ~/config/app.conf"]),
        task(L('Turn debug off in ~/config/app.conf (debug=true → debug=false), editing the file in place.', 'Выключите debug в ~/config/app.conf (debug=true → debug=false), правкой файла на месте.', 'Вимкніть debug у ~/config/app.conf (debug=true → debug=false), правкою файлу на місці.'),
             [fcontains('~/config/app.conf', L('debug=false', 'debug=false', 'debug=false'), text='debug=false'), fnot('~/config/app.conf', L('No debug=true', 'Нет debug=true', 'Немає debug=true'), text='debug=true'), fcontains('~/config/app.conf', L('The rest is intact', 'Остальное не тронуто', 'Решту не зачеплено'), text='db_port=5432')],
             L("sed -i 's/debug=true/debug=false/' FILE", "sed -i 's/debug=true/debug=false/' ФАЙЛ", "sed -i 's/debug=true/debug=false/' ФАЙЛ"), 'sed', ["sed -i 's/debug=true/debug=false/' ~/config/app.conf"]),
        task(L('Print only lines 2 to 4 of ~/data/sales.csv.', 'Выведите только строки 2–4 файла ~/data/sales.csv.', 'Виведіть лише рядки 2–4 файлу ~/data/sales.csv.'),
             [used('sed', L("sed -n '2,4p'", "sed -n '2,4p'", "sed -n '2,4p'"), flags=['-n']), lines(L('3 lines', '3 строки', '3 рядки'), eq=3), out(L('starts with 2026-10-01,Kyiv', 'начинается с 2026-10-01,Kyiv', 'починається з 2026-10-01,Kyiv'), regex='^2026-10-01,Kyiv')],
             L("sed -n '2,4p' FILE", "sed -n '2,4p' ФАЙЛ", "sed -n '2,4p' ФАЙЛ"), 'sed', ["sed -n '2,4p' ~/data/sales.csv"]),
        predict("echo 'aaa' | sed 's/a/b/'", ['baa', 'bbb', 'aab', 'aaa'], 0,
                L('Without g only the first match in the line is replaced.', 'Без g заменяется только первое совпадение в строке.', 'Без g замінюється лише перший збіг у рядку.'), setup=TP, context=[]),
    ]),

    lesson('tp-awk', L('awk: reports in one line', 'awk: отчёт одной строкой', 'awk: звіт одним рядком'), ['awk'], setup=TP, steps=[
        theory(L(
            """## Sums, averages, groups
```
$ awk -F, 'NR>1 {s += $4} END {print s}' sales.csv
$ awk -F, 'NR>1 {s += $4; n++} END {print s/n}' sales.csv
$ awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' sales.csv
$ awk -F, '$4 > 1000' sales.csv
$ awk -F, 'NR>1 {printf "%-6s %5d\\n", $2, $4}' sales.csv
```
- `-F,` — the field separator
- `NR>1` — skip the header (line 1)
- `t[$2] += $4` — an **array**: a separate sum for every city
- `for (c in t)` — walk over the array
- `printf` — aligned columns: `%-6s` left-aligned text, `%5d` number

> `awk '{n[$1]++} END {for (k in n) print n[k], k}'` is the awk version of `sort | uniq -c`.""",
            """## Суммы, средние, группы
```
$ awk -F, 'NR>1 {s += $4} END {print s}' sales.csv
$ awk -F, 'NR>1 {s += $4; n++} END {print s/n}' sales.csv
$ awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' sales.csv
$ awk -F, '$4 > 1000' sales.csv
$ awk -F, 'NR>1 {printf "%-6s %5d\\n", $2, $4}' sales.csv
```
- `-F,` — разделитель полей
- `NR>1` — пропустить заголовок (строку 1)
- `t[$2] += $4` — **массив**: своя сумма для каждого города
- `for (c in t)` — обойти массив
- `printf` — ровные колонки: `%-6s` текст влево, `%5d` число

> `awk '{n[$1]++} END {for (k in n) print n[k], k}'` — это awk-версия `sort | uniq -c`.""",
            """## Суми, середні, групи
```
$ awk -F, 'NR>1 {s += $4} END {print s}' sales.csv
$ awk -F, 'NR>1 {s += $4; n++} END {print s/n}' sales.csv
$ awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' sales.csv
$ awk -F, '$4 > 1000' sales.csv
$ awk -F, 'NR>1 {printf "%-6s %5d\\n", $2, $4}' sales.csv
```
- `-F,` — роздільник полів
- `NR>1` — пропустити заголовок (рядок 1)
- `t[$2] += $4` — **масив**: окрема сума для кожного міста
- `for (c in t)` — обійти масив
- `printf` — рівні колонки: `%-6s` текст ліворуч, `%5d` число

> `awk '{n[$1]++} END {for (k in n) print n[k], k}'` — це awk-версія `sort | uniq -c`."""),
            title=L('Arrays in awk', 'Массивы в awk', 'Масиви в awk'), demo=["awk -F, 'NR>1 {s += $4} END {print s}' ~/data/sales.csv"]),
        task(L('What is the total amount of all sales in ~/data/sales.csv?', 'Какова общая сумма всех продаж в ~/data/sales.csv?', 'Яка загальна сума всіх продажів у ~/data/sales.csv?'),
             [used('awk', L('awk with END', 'awk с END', 'awk з END')), out(L('5300', '5300', '5300'), regex='^5300$')],
             L("awk -F, 'NR>1 {s += $4} END {print s}' FILE", "awk -F, 'NR>1 {s += $4} END {print s}' ФАЙЛ", "awk -F, 'NR>1 {s += $4} END {print s}' ФАЙЛ"), 'awk', ["awk -F, 'NR>1 {s += $4} END {print s}' ~/data/sales.csv"]),
        task(L('Total sales per city, biggest first.', 'Сумма продаж по каждому городу, сначала самые большие.', 'Сума продажів за кожним містом, спершу найбільші.'),
             [used('awk', L('awk array t[$2]', 'awk-массив t[$2]', 'awk-масив t[$2]')), out(L('Kyiv 2250 on top', 'Kyiv 2250 сверху', 'Kyiv 2250 зверху'), regex='^\\s*(Kyiv\\D+2250|2250\\D+Kyiv)'), lines(L('3 cities', '3 города', '3 міста'), eq=3)],
             L("awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' FILE | sort -k2 -rn", "awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' ФАЙЛ | sort -k2 -rn", "awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' ФАЙЛ | sort -k2 -rn"), 'awk',
             ["awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' ~/data/sales.csv | sort -k2 -rn"]),
        task(L('Show only the laptop sales above 1200.', 'Покажите только продажи ноутбуков (laptop) дороже 1200.', 'Покажіть лише продажі ноутбуків (laptop) дорожчих за 1200.'),
             [used('awk', L('awk with && condition', 'awk с условием &&', 'awk з умовою &&')), lines(L('1 line', '1 строка', '1 рядок'), eq=1), out(L('Lviv,laptop,1300', 'Lviv,laptop,1300', 'Lviv,laptop,1300'), text='Lviv,laptop,1300')],
             L("awk -F, '$3 == \"laptop\" && $4 > 1200' FILE", "awk -F, '$3 == \"laptop\" && $4 > 1200' ФАЙЛ", "awk -F, '$3 == \"laptop\" && $4 > 1200' ФАЙЛ"), 'awk', ["awk -F, '$3 == \"laptop\" && $4 > 1200' ~/data/sales.csv"]),
        predict("awk -F, 'NR>1 {n[$3]++} END {print n[\"laptop\"]}' ~/data/sales.csv", ['3', '2', '1', 'laptop'], 0,
                L('Three rows have product = laptop.', 'В трёх строках product = laptop.', 'У трьох рядках product = laptop.'), setup=TP, context=['cat ~/data/sales.csv']),
    ]),

    lesson('tp-compare', L('Comparing files: diff and comm', 'Сравнение файлов: diff и comm', 'Порівняння файлів: diff і comm'), ['diff', 'comm', 'sort'], setup=TP, steps=[
        theory(L(
            """## diff — what changed
```
$ diff app.conf.bak app.conf
2c2
< port=80
---
> port=8080
```
- `2c2` — line 2 **c**hanged (also `a` added, `d` deleted)
- `<` — from the first (old) file, `>` — from the second (new)
- `diff -u` — the "unified" format you know from git: `-` removed, `+` added
- `diff -q` — only "differ / identical"

## comm — sets of lines
Both files must be **sorted**:
```
$ comm team_old.txt team_new.txt
$ comm -23 team_old.txt team_new.txt
$ comm -13 team_old.txt team_new.txt
$ comm -12 team_old.txt team_new.txt
```
Column 1 — only in the first file, 2 — only in the second, 3 — in both. `-23` hides columns 2 and 3.""",
            """## diff — что изменилось
```
$ diff app.conf.bak app.conf
2c2
< port=80
---
> port=8080
```
- `2c2` — строка 2 **и**зменена (ещё `a` — добавлена, `d` — удалена)
- `<` — из первого (старого) файла, `>` — из второго (нового)
- `diff -u` — «унифицированный» формат, как в git: `-` удалено, `+` добавлено
- `diff -q` — только «различаются / одинаковы»

## comm — множества строк
Оба файла должны быть **отсортированы**:
```
$ comm team_old.txt team_new.txt
$ comm -23 team_old.txt team_new.txt
$ comm -13 team_old.txt team_new.txt
$ comm -12 team_old.txt team_new.txt
```
Колонка 1 — только в первом файле, 2 — только во втором, 3 — в обоих. `-23` скрывает колонки 2 и 3.""",
            """## diff — що змінилося
```
$ diff app.conf.bak app.conf
2c2
< port=80
---
> port=8080
```
- `2c2` — рядок 2 **з**мінено (ще `a` — додано, `d` — видалено)
- `<` — з першого (старого) файлу, `>` — з другого (нового)
- `diff -u` — «уніфікований» формат, як у git: `-` видалено, `+` додано
- `diff -q` — лише «різняться / однакові»

## comm — множини рядків
Обидва файли мають бути **відсортовані**:
```
$ comm team_old.txt team_new.txt
$ comm -23 team_old.txt team_new.txt
$ comm -13 team_old.txt team_new.txt
$ comm -12 team_old.txt team_new.txt
```
Колонка 1 — лише в першому файлі, 2 — лише в другому, 3 — в обох. `-23` ховає колонки 2 і 3."""),
            title=L('Spot the difference', 'Найди отличия', 'Знайди відмінності'), demo=['diff ~/config/app.conf.bak ~/config/app.conf; echo "exit code: $?"']),
        task(L('What changed in ~/config/app.conf compared to its .bak? Show the difference in unified format.', 'Что изменилось в ~/config/app.conf по сравнению с .bak? Покажите разницу в унифицированном формате.', 'Що змінилося в ~/config/app.conf порівняно з .bak? Покажіть різницю в уніфікованому форматі.'),
             [used('diff', L('diff -u', 'diff -u', 'diff -u'), flags=['-u']), out(L('+port=8080', '+port=8080', '+port=8080'), regex='^\\+port=8080$'), out(L('-debug=false', '-debug=false', '-debug=false'), regex='^-debug=false$')],
             L('diff -u OLD NEW', 'diff -u СТАРЫЙ НОВЫЙ', 'diff -u СТАРИЙ НОВИЙ'), 'diff', ['diff -u ~/config/app.conf.bak ~/config/app.conf']),
        task(L('Who left the team? Show names that are in team_old.txt but not in team_new.txt.', 'Кто ушёл из команды? Покажите имена, которые есть в team_old.txt, но нет в team_new.txt.', 'Хто пішов із команди? Покажіть імена, які є в team_old.txt, але немає в team_new.txt.'),
             [used('comm', L('comm -23', 'comm -23', 'comm -23')), out(L('ivan', 'ivan', 'ivan'), regex='^ivan$'), lines(L('only ivan', 'только ivan', 'лише ivan'), eq=1)],
             L('comm -23 OLD NEW (both are already sorted)', 'comm -23 СТАРЫЙ НОВЫЙ (оба уже отсортированы)', 'comm -23 СТАРИЙ НОВИЙ (обидва вже відсортовані)'), 'comm', ['comm -23 ~/data/team_old.txt ~/data/team_new.txt']),
        task(L('And who joined?', 'А кто пришёл?', 'А хто прийшов?'),
             [used('comm', L('comm -13', 'comm -13', 'comm -13')), out(L('petro', 'petro', 'petro'), regex='^petro$'), lines(L('only petro', 'только petro', 'лише petro'), eq=1)],
             L('comm -13 OLD NEW', 'comm -13 СТАРЫЙ НОВЫЙ', 'comm -13 СТАРИЙ НОВИЙ'), 'comm', ['comm -13 ~/data/team_old.txt ~/data/team_new.txt']),
        quiz(L('diff prints "5d4". What does it mean?', 'diff печатает «5d4». Что это значит?', 'diff друкує «5d4». Що це означає?'),
             [L('Line 5 of the first file was deleted', 'Строка 5 первого файла удалена', 'Рядок 5 першого файлу видалено'), L('Line 5 was duplicated 4 times', 'Строка 5 повторена 4 раза', 'Рядок 5 повторено 4 рази'), L('Files differ in 5 of 4 lines', 'Файлы различаются в 5 из 4 строк', 'Файли різняться в 5 із 4 рядків')], 0),
    ]),

    lesson('tp-tee-xargs', L('tee and xargs', 'tee и xargs', 'tee і xargs'), ['tee', 'xargs', 'find'], setup=TP, steps=[
        theory(L(
            """## tee — see it and save it
```
$ grep Kyiv sales.csv | tee kyiv.csv
$ df -h | tee -a report.txt
$ echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf
```
`tee` copies the stream to the screen **and** to a file (`-a` appends). The last example is the classic: `sudo echo … > /etc/file` does not work, because the redirection runs as you, not as root.

## xargs — output becomes arguments
```
$ find . -name '*.tmp' | xargs rm
$ cat servers.txt | xargs -n 1 ping -c 1
$ ls *.log | xargs wc -l
```
Many commands (rm, wc, ping) take **arguments**, not standard input. xargs builds the command line for them. `-n 1` — one argument per run.""",
            """## tee — и увидеть, и сохранить
```
$ grep Kyiv sales.csv | tee kyiv.csv
$ df -h | tee -a report.txt
$ echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf
```
`tee` копирует поток на экран **и** в файл (`-a` — дописать). Последний пример — классика: `sudo echo … > /etc/file` не работает, потому что перенаправление выполняется от вас, а не от root.

## xargs — вывод превращается в аргументы
```
$ find . -name '*.tmp' | xargs rm
$ cat servers.txt | xargs -n 1 ping -c 1
$ ls *.log | xargs wc -l
```
Многие команды (rm, wc, ping) принимают **аргументы**, а не стандартный ввод. xargs собирает для них командную строку. `-n 1` — по одному аргументу за запуск.""",
            """## tee — і побачити, і зберегти
```
$ grep Kyiv sales.csv | tee kyiv.csv
$ df -h | tee -a report.txt
$ echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf
```
`tee` копіює потік на екран **і** у файл (`-a` — дописати). Останній приклад — класика: `sudo echo … > /etc/file` не працює, бо перенаправлення виконується від вас, а не від root.

## xargs — вивід стає аргументами
```
$ find . -name '*.tmp' | xargs rm
$ cat servers.txt | xargs -n 1 ping -c 1
$ ls *.log | xargs wc -l
```
Багато команд (rm, wc, ping) приймають **аргументи**, а не стандартний ввід. xargs збирає для них командний рядок. `-n 1` — по одному аргументу за запуск."""),
            title=L('Plumbing', 'Сантехника конвейеров', 'Сантехніка конвеєрів'), demo=['grep Kyiv ~/data/sales.csv | tee /tmp/kyiv.csv']),
        task(L('Show the Lviv sales on the screen AND save them to ~/data/lviv.csv at the same time.', 'Покажите продажи Lviv на экране И одновременно сохраните их в ~/data/lviv.csv.', 'Покажіть продажі Lviv на екрані Й одночасно збережіть їх у ~/data/lviv.csv.'),
             [used('tee', L('tee', 'tee', 'tee')), fcontains('~/data/lviv.csv', L('lviv.csv has the Lviv lines', 'В lviv.csv строки Lviv', 'У lviv.csv рядки Lviv'), text='Lviv,laptop,1300'), out(L('They were printed too', 'И они напечатаны', 'І їх надруковано'), text='Lviv,phone')],
             L('grep Lviv FILE | tee ~/data/lviv.csv', 'grep Lviv ФАЙЛ | tee ~/data/lviv.csv', 'grep Lviv ФАЙЛ | tee ~/data/lviv.csv'), 'tee', ['grep Lviv ~/data/sales.csv | tee ~/data/lviv.csv']),
        task(L('Count the lines of every .txt file in ~/data with ONE wc call via find + xargs.', 'Посчитайте строки каждого .txt в ~/data ОДНИМ вызовом wc через find + xargs.', 'Порахуйте рядки кожного .txt у ~/data ОДНИМ викликом wc через find + xargs.'),
             [used('xargs', L('xargs wc -l', 'xargs wc -l', 'xargs wc -l')), out(L('total line', 'строка total', 'рядок total'), text='total')],
             L("find ~/data -name '*.txt' | xargs wc -l", "find ~/data -name '*.txt' | xargs wc -l", "find ~/data -name '*.txt' | xargs wc -l"), 'xargs', ["find ~/data -name '*.txt' | xargs wc -l"]),
        quiz(L('Why does "sudo echo 1 > /root/x" fail with Permission denied?', 'Почему «sudo echo 1 > /root/x» падает с Permission denied?', 'Чому «sudo echo 1 > /root/x» падає з Permission denied?'),
             [L('The > redirection is done by your shell, not by sudo — use | sudo tee', 'Перенаправление > делает ваша оболочка, а не sudo — используйте | sudo tee', 'Перенаправлення > робить ваша оболонка, а не sudo — використовуйте | sudo tee'), L('echo cannot run as root', 'echo нельзя запускать от root', 'echo не можна запускати від root'), L('/root does not exist', '/root не существует', '/root не існує')], 0),
    ]),
]

module('17-textpro.json', 'textpro', '/linux/textpro', 'scroll',
       L('Text processing', 'Обработка текста', 'Обробка тексту'),
       L('cut, tr, sed, awk reports, diff and comm, tee and xargs.', 'cut, tr, sed, отчёты на awk, diff и comm, tee и xargs.', 'cut, tr, sed, звіти на awk, diff і comm, tee і xargs.'),
       text)
