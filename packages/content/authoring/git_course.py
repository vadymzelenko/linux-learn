"""Git & GitHub course: 3 modules, 13 lessons and a mission, in en/ru/uk/pl.

    python3 authoring/git_course.py && python3 authoring/courses.py && python3 authoring/register.py
"""
import json, os
from lib import *

def T(en, ru, uk, pl): return L(en, ru, uk, pl)

IDENTITY = '[user]\n\tname = Student\n\temail = student@example.com\n'
INDEX = '<!doctype html>\n<title>My site</title>\n<h1>Hello!</h1>\n'
STYLE = 'body { font-family: sans-serif; }\n'

fixture('git-fresh', {"hostname": "dev01", "files": {"~/project/index.html": INDEX, "~/project/style.css": STYLE}})
fixture('git-lab', {"hostname": "dev01", "files": {"~/.gitconfig": IDENTITY, "~/project/index.html": INDEX, "~/project/style.css": STYLE, "~/project/notes.txt": "ideas:\n- dark theme\n- contact page\n"}})

# a repository with history (prepare commands for later lessons)
REPO = ['cd ~/project', 'git init -q', 'git add .', 'git commit -qm "Add home page"', 'echo "h1 { color: teal; }" >> style.css', 'git commit -qam "Teal headings"', 'echo "<p>Welcome to my site.</p>" >> index.html', 'git commit -qam "Welcome text"']
PUBLISHED = REPO + ['gh repo create site --public', 'git remote add origin https://github.com/student/site.git', 'git push -qu origin main 2>/dev/null']

YES = lambda en, ru, uk, pl: T(en, ru, uk, pl)

# ------------------------------------------------------------------ module 1: basics

basics = [
    lesson('gt-why', T('Why version control', 'Зачем нужен контроль версий', 'Навіщо потрібен контроль версій', 'Po co kontrola wersji'), ['git'], setup='git-fresh', steps=[
        reading(T(
"""## final_v2_REALLY_final.html
Without version control people copy folders, mail zip files and lose work when two people edit the same file.

**Git** keeps the whole **history** of a project inside the project folder:
- every saved state is a **commit** — a snapshot of all files with a message, an author and a date;
- you can see what changed, when and why, and go back to any snapshot;
- **branches** let you try ideas without breaking the working version;
- the history can be shared: **GitHub** is a website that hosts Git repositories, so a team works on one project.

## Words of this course
| word | what it is |
|---|---|
| **repository** (repo) | a project folder with its history (the hidden `.git` folder) |
| **commit** | a saved snapshot + message |
| **branch** | a line of development, e.g. `main` or `feature` |
| **remote** | a copy of the repository on a server, usually called `origin` |
| **push / pull** | send your commits to the remote / get new ones from it |

> Git is a program on your computer. GitHub is a service on the internet. Git works perfectly without GitHub; GitHub stores Git repositories.""",
"""## final_v2_TOCHNO_final.html
Без контроля версий люди копируют папки, пересылают zip-архивы и теряют работу, когда двое правят один файл.

**Git** хранит всю **историю** проекта прямо в папке проекта:
- каждое сохранённое состояние — **коммит**: снимок всех файлов с сообщением, автором и датой;
- видно, что, когда и зачем поменялось, и можно вернуться к любому снимку;
- **ветки** позволяют пробовать идеи, не ломая рабочую версию;
- историей можно делиться: **GitHub** — сайт, где хранятся Git-репозитории, чтобы команда работала над одним проектом.

## Слова этого курса
| слово | что это |
|---|---|
| **репозиторий** (repo) | папка проекта с историей (скрытая папка `.git`) |
| **коммит** | сохранённый снимок + сообщение |
| **ветка** | линия разработки, например `main` или `feature` |
| **remote** | копия репозитория на сервере, обычно с именем `origin` |
| **push / pull** | отправить свои коммиты на сервер / забрать оттуда новые |

> Git — программа на вашем компьютере. GitHub — сервис в интернете. Git прекрасно работает без GitHub; GitHub хранит Git-репозитории.""",
"""## final_v2_TOCHNO_final.html
Без контролю версій люди копіюють теки, пересилають zip-архіви й втрачають роботу, коли двоє правлять один файл.

**Git** зберігає всю **історію** проєкту просто в теці проєкту:
- кожен збережений стан — **коміт**: знімок усіх файлів з повідомленням, автором і датою;
- видно, що, коли й навіщо змінилося, і можна повернутися до будь-якого знімка;
- **гілки** дають змогу пробувати ідеї, не ламаючи робочу версію;
- історією можна ділитися: **GitHub** — сайт, де зберігаються Git-репозиторії, щоб команда працювала над одним проєктом.

## Слова цього курсу
| слово | що це |
|---|---|
| **репозиторій** (repo) | тека проєкту з історією (прихована тека `.git`) |
| **коміт** | збережений знімок + повідомлення |
| **гілка** | лінія розробки, наприклад `main` або `feature` |
| **remote** | копія репозиторію на сервері, зазвичай з назвою `origin` |
| **push / pull** | надіслати свої коміти на сервер / забрати звідти нові |

> Git — програма на вашому комп’ютері. GitHub — сервіс в інтернеті. Git чудово працює без GitHub; GitHub зберігає Git-репозиторії.""",
"""## final_v2_NAPRAWDE_final.html
Bez kontroli wersji ludzie kopiują foldery, wysyłają archiwa zip i tracą pracę, gdy dwie osoby edytują ten sam plik.

**Git** przechowuje całą **historię** projektu w jego folderze:
- każdy zapisany stan to **commit** — migawka wszystkich plików z opisem, autorem i datą;
- widać, co, kiedy i dlaczego się zmieniło, i można wrócić do dowolnej migawki;
- **gałęzie** pozwalają próbować pomysłów bez psucia działającej wersji;
- historią można się dzielić: **GitHub** to serwis z repozytoriami Gita, dzięki któremu zespół pracuje nad jednym projektem.

## Słowa tego kursu
| słowo | co to jest |
|---|---|
| **repozytorium** (repo) | folder projektu z historią (ukryty folder `.git`) |
| **commit** | zapisana migawka + opis |
| **gałąź** (branch) | linia rozwoju, np. `main` albo `feature` |
| **remote** | kopia repozytorium na serwerze, zwykle o nazwie `origin` |
| **push / pull** | wyślij swoje commity na serwer / pobierz z niego nowe |

> Git to program na twoim komputerze. GitHub to serwis w internecie. Git świetnie działa bez GitHuba; GitHub przechowuje repozytoria Gita."""),
            title=T('History of a project', 'История проекта', 'Історія проєкту', 'Historia projektu')),
        quiz(T('What is the difference between Git and GitHub?', 'Чем Git отличается от GitHub?', 'Чим Git відрізняється від GitHub?', 'Czym różni się Git od GitHuba?'),
             [T('Git is a version control program; GitHub is a website that hosts Git repositories', 'Git — программа контроля версий; GitHub — сайт, на котором хранятся Git-репозитории', 'Git — програма контролю версій; GitHub — сайт, на якому зберігаються Git-репозиторії', 'Git to program do kontroli wersji; GitHub to serwis, który przechowuje repozytoria Gita'),
              T('GitHub is the new name of Git', 'GitHub — новое название Git', 'GitHub — нова назва Git', 'GitHub to nowa nazwa Gita'),
              T('Git works only when connected to GitHub', 'Git работает только при подключении к GitHub', 'Git працює лише з підключенням до GitHub', 'Git działa tylko po połączeniu z GitHubem')], 0,
             T('You can use Git for years without GitHub. GitHub (like GitLab or Bitbucket) is one of the places to keep a copy and work as a team.', 'Git можно годами использовать без GitHub. GitHub (как и GitLab или Bitbucket) — одно из мест, где хранят копию и работают командой.', 'Git можна роками використовувати без GitHub. GitHub (як і GitLab чи Bitbucket) — одне з місць, де зберігають копію й працюють командою.', 'Gita można używać latami bez GitHuba. GitHub (jak GitLab czy Bitbucket) to jedno z miejsc na kopię i pracę zespołową.')),
        quiz(T('What is a commit?', 'Что такое коммит?', 'Що таке коміт?', 'Czym jest commit?'),
             [T('A saved snapshot of the project with a message, an author and a time', 'Сохранённый снимок проекта с сообщением, автором и временем', 'Збережений знімок проєкту з повідомленням, автором і часом', 'Zapisana migawka projektu z opisem, autorem i czasem'),
              T('Uploading files to GitHub', 'Загрузка файлов на GitHub', 'Завантаження файлів на GitHub', 'Wysłanie plików na GitHuba'),
              T('A copy of one file', 'Копия одного файла', 'Копія одного файлу', 'Kopia jednego pliku')], 0),
    ]),

    lesson('gt-setup', T('Who you are and a new repository', 'Кто вы и новый репозиторий', 'Хто ви і новий репозиторій', 'Kim jesteś i nowe repozytorium'), ['git'], setup='git-fresh', steps=[
        theory(T(
"""## Introduce yourself once
Every commit stores an author. Tell Git your name and e-mail — once per computer:
```
$ git config --global user.name "Student"
$ git config --global user.email "student@example.com"
$ git config --global --list
```
`--global` writes to `~/.gitconfig` and applies to all your repositories.

## Start a repository
```
$ cd ~/project
$ git init
$ ls -a
```
`git init` creates the hidden folder **`.git`** — that *is* the repository: the history, branches and settings. Your files stay where they are.

> Never edit files inside `.git` by hand, and do not delete it: without `.git` the folder is no longer a repository and the history is gone.""",
"""## Представьтесь один раз
Каждый коммит хранит автора. Сообщите Git своё имя и e-mail — один раз на компьютер:
```
$ git config --global user.name "Student"
$ git config --global user.email "student@example.com"
$ git config --global --list
```
`--global` пишет в `~/.gitconfig` и действует для всех ваших репозиториев.

## Создайте репозиторий
```
$ cd ~/project
$ git init
$ ls -a
```
`git init` создаёт скрытую папку **`.git`** — это и есть репозиторий: история, ветки и настройки. Ваши файлы остаются на месте.

> Не правьте файлы внутри `.git` руками и не удаляйте её: без `.git` папка перестаёт быть репозиторием, а история пропадает.""",
"""## Представтеся один раз
Кожен коміт зберігає автора. Повідомте Git своє ім’я та e-mail — один раз на комп’ютер:
```
$ git config --global user.name "Student"
$ git config --global user.email "student@example.com"
$ git config --global --list
```
`--global` пише в `~/.gitconfig` і діє для всіх ваших репозиторіїв.

## Створіть репозиторій
```
$ cd ~/project
$ git init
$ ls -a
```
`git init` створює приховану теку **`.git`** — це і є репозиторій: історія, гілки й налаштування. Ваші файли лишаються на місці.

> Не правте файли всередині `.git` вручну й не видаляйте її: без `.git` тека перестає бути репозиторієм, а історія зникає.""",
"""## Przedstaw się raz
Każdy commit zapisuje autora. Podaj Gitowi imię i e-mail — raz na komputer:
```
$ git config --global user.name "Student"
$ git config --global user.email "student@example.com"
$ git config --global --list
```
`--global` zapisuje do `~/.gitconfig` i działa dla wszystkich twoich repozytoriów.

## Utwórz repozytorium
```
$ cd ~/project
$ git init
$ ls -a
```
`git init` tworzy ukryty folder **`.git`** — to właśnie jest repozytorium: historia, gałęzie i ustawienia. Twoje pliki zostają na miejscu.

> Nie edytuj ręcznie plików w `.git` i nie usuwaj go: bez `.git` folder przestaje być repozytorium, a historia znika."""),
            title=T('git config and git init', 'git config и git init', 'git config і git init', 'git config i git init'), demo=['git config --global user.name "Student"', 'git config --global user.email "student@example.com"', 'git config --global --list']),
        task(T('Tell Git your name (Student) and e-mail (student@example.com) for all repositories.', 'Сообщите Git своё имя (Student) и e-mail (student@example.com) для всех репозиториев.', 'Повідомте Git своє ім’я (Student) та e-mail (student@example.com) для всіх репозиторіїв.', 'Podaj Gitowi imię (Student) i e-mail (student@example.com) dla wszystkich repozytoriów.'),
             [fcontains('~/.gitconfig', T('The name is set', 'Имя задано', 'Ім’я задано', 'Imię ustawione'), regex=r'name = \S'),
              fcontains('~/.gitconfig', T('The e-mail is set', 'E-mail задан', 'E-mail задано', 'E-mail ustawiony'), regex=r'email = \S+@\S+')],
             T('git config --global user.name "…", then the same for user.email', 'git config --global user.name "…", затем то же для user.email', 'git config --global user.name "…", потім те саме для user.email', 'git config --global user.name "…", potem to samo dla user.email'), 'git config',
             ['git config --global user.name "Student"', 'git config --global user.email "student@example.com"']),
        task(T('Turn ~/project into a Git repository.', 'Превратите ~/project в Git-репозиторий.', 'Перетворіть ~/project на Git-репозиторій.', 'Zamień ~/project w repozytorium Gita.'),
             [dexists('~/project/.git', T('~/project/.git exists', 'Есть ~/project/.git', 'Є ~/project/.git', 'Istnieje ~/project/.git')),
              git('~/project', T('Git sees a repository there', 'Git видит там репозиторий', 'Git бачить там репозиторій', 'Git widzi tam repozytorium'), head='main')],
             T('Go into the folder, then one git command creates the repository.', 'Перейдите в папку, затем одна команда git создаст репозиторий.', 'Перейдіть у теку, потім одна команда git створить репозиторій.', 'Wejdź do folderu, potem jedno polecenie git utworzy repozytorium.'), 'git init', ['cd ~/project', 'git init'],
             prepare=['git config --global user.name "Student"', 'git config --global user.email "student@example.com"']),
        quiz(T('Where does Git keep the history of ~/project?', 'Где Git хранит историю ~/project?', 'Де Git зберігає історію ~/project?', 'Gdzie Git przechowuje historię ~/project?'),
             [T('In the hidden folder ~/project/.git', 'В скрытой папке ~/project/.git', 'У прихованій теці ~/project/.git', 'W ukrytym folderze ~/project/.git'),
              T('On GitHub', 'На GitHub', 'На GitHub', 'Na GitHubie'),
              T('In ~/.gitconfig', 'В ~/.gitconfig', 'У ~/.gitconfig', 'W ~/.gitconfig')], 0,
             T('~/.gitconfig holds only your settings (name, e-mail). The history is in .git inside the project.', 'В ~/.gitconfig только ваши настройки (имя, e-mail). История — в .git внутри проекта.', 'У ~/.gitconfig лише ваші налаштування (ім’я, e-mail). Історія — у .git усередині проєкту.', '~/.gitconfig zawiera tylko twoje ustawienia (imię, e-mail). Historia jest w .git wewnątrz projektu.')),
    ]),

    lesson('gt-commit', T('The first commit', 'Первый коммит', 'Перший коміт', 'Pierwszy commit'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## Three places
| place | what is there |
|---|---|
| **working tree** | the files you edit |
| **staging area** (index) | what goes into the next commit |
| **repository** | saved commits |

A file goes: edit → `git add` → `git commit`.
```
$ git status
$ git add index.html style.css
$ git commit -m "Add home page"
```
- `git status` — your best friend: what is **untracked**, what is **staged**, what is **modified**
- `git add FILE` — put the current version of a file into the staging area (`git add .` — everything in this folder)
- `git commit -m "…"` — save the staged snapshot with a message

## A good message
Short, in the imperative, says *what and why*: `Add contact page`, `Fix broken link in menu`. Not `update`, not `asdf`.

> Why the staging area? You choose what goes into a commit: changed 5 files, but only 2 belong to this fix — add just those.""",
"""## Три места
| место | что там |
|---|---|
| **рабочая папка** (working tree) | файлы, которые вы правите |
| **индекс** (staging area) | то, что попадёт в следующий коммит |
| **репозиторий** | сохранённые коммиты |

Путь файла: правка → `git add` → `git commit`.
```
$ git status
$ git add index.html style.css
$ git commit -m "Add home page"
```
- `git status` — ваш лучший друг: что **не отслеживается** (untracked), что **в индексе** (staged), что **изменено** (modified)
- `git add ФАЙЛ` — положить текущую версию файла в индекс (`git add .` — всё в этой папке)
- `git commit -m "…"` — сохранить снимок из индекса с сообщением

## Хорошее сообщение
Короткое, в повелительном наклонении, говорит *что и зачем*: `Add contact page`, `Fix broken link in menu`. Не `update` и не `asdf`.

> Зачем индекс? Вы сами выбираете, что войдёт в коммит: изменили 5 файлов, а к этой правке относятся только 2 — добавьте только их.""",
"""## Три місця
| місце | що там |
|---|---|
| **робоча тека** (working tree) | файли, які ви правите |
| **індекс** (staging area) | те, що потрапить у наступний коміт |
| **репозиторій** | збережені коміти |

Шлях файлу: правка → `git add` → `git commit`.
```
$ git status
$ git add index.html style.css
$ git commit -m "Add home page"
```
- `git status` — ваш найкращий друг: що **не відстежується** (untracked), що **в індексі** (staged), що **змінено** (modified)
- `git add ФАЙЛ` — покласти поточну версію файлу в індекс (`git add .` — усе в цій теці)
- `git commit -m "…"` — зберегти знімок з індексу з повідомленням

## Добре повідомлення
Коротке, у наказовому способі, каже *що й навіщо*: `Add contact page`, `Fix broken link in menu`. Не `update` і не `asdf`.

> Навіщо індекс? Ви самі обираєте, що ввійде в коміт: змінили 5 файлів, а до цієї правки стосуються лише 2 — додайте тільки їх.""",
"""## Trzy miejsca
| miejsce | co tam jest |
|---|---|
| **katalog roboczy** (working tree) | pliki, które edytujesz |
| **indeks** (staging area) | to, co trafi do następnego commita |
| **repozytorium** | zapisane commity |

Droga pliku: edycja → `git add` → `git commit`.
```
$ git status
$ git add index.html style.css
$ git commit -m "Add home page"
```
- `git status` — twój najlepszy przyjaciel: co jest **nieśledzone** (untracked), co **w indeksie** (staged), co **zmienione** (modified)
- `git add PLIK` — wstaw bieżącą wersję pliku do indeksu (`git add .` — wszystko w tym folderze)
- `git commit -m "…"` — zapisz migawkę z indeksu z opisem

## Dobry opis
Krótki, w trybie rozkazującym, mówi *co i po co*: `Add contact page`, `Fix broken link in menu`. Nie `update` ani `asdf`.

> Po co indeks? Sam wybierasz, co trafi do commita: zmieniłeś 5 plików, a do tej poprawki należą tylko 2 — dodaj tylko je."""),
            title=T('status → add → commit', 'status → add → commit', 'status → add → commit', 'status → add → commit'), demo=['mkdir demo && cd demo && git init -q', 'echo "<h1>Hi</h1>" > index.html', 'git status', 'git add index.html', 'git status -s'], setup={"files": {"~/.gitconfig": IDENTITY}}),
        task(T('In ~/project, commit index.html and style.css (but not notes.txt) with a meaningful message.', 'В ~/project закоммитьте index.html и style.css (но не notes.txt) с понятным сообщением.', 'У ~/project закомітьте index.html і style.css (але не notes.txt) зі зрозумілим повідомленням.', 'W ~/project zatwierdź index.html i style.css (ale nie notes.txt) z sensownym opisem.'),
             [git('~/project', T('There is a commit', 'Есть коммит', 'Є коміт', 'Jest commit'), commits=1),
              git('~/project', T('index.html is in it', 'В нём есть index.html', 'У ньому є index.html', 'Zawiera index.html'), tracked='~/project/index.html'),
              git('~/project', T('style.css is in it', 'В нём есть style.css', 'У ньому є style.css', 'Zawiera style.css'), tracked='~/project/style.css'),
              git('~/project', T('notes.txt is not committed', 'notes.txt не закоммичен', 'notes.txt не закомічено', 'notes.txt nie jest zatwierdzony'), untracked='~/project/notes.txt')],
             T('git add with the two file names, then git commit -m "…"', 'git add с двумя именами файлов, затем git commit -m "…"', 'git add з двома назвами файлів, потім git commit -m "…"', 'git add z dwiema nazwami plików, potem git commit -m "…"'), 'git add',
             ['git add index.html style.css', 'git commit -m "Add home page"'], prepare=['cd ~/project', 'git init -q']),
        predict('git status -s', [' M index.html\n?? notes.txt\n', 'M  index.html\n?? notes.txt\n', '?? index.html\n?? notes.txt\n'], 0,
                T('-s is the short status: the left column is the staging area, the right one the working tree. " M" = modified but not staged, "??" = untracked.', '-s — краткий статус: левая колонка — индекс, правая — рабочая папка. « M» — изменён, но не в индексе, «??» — не отслеживается.', '-s — короткий статус: ліва колонка — індекс, права — робоча тека. « M» — змінено, але не в індексі, «??» — не відстежується.', '-s to krótki status: lewa kolumna to indeks, prawa — katalog roboczy. „ M” = zmieniony, ale nie w indeksie, „??” = nieśledzony.'),
                setup='git-lab', prepare=['cd ~/project', 'git init -q', 'git add index.html style.css', 'git commit -qm "Add home page"', 'echo "<p>New</p>" >> index.html'], context=['git log --oneline', 'cat index.html']),
        quiz(T('You ran `git add style.css`, then edited style.css again. What will `git commit` save?', 'Вы выполнили `git add style.css`, а потом снова изменили style.css. Что сохранит `git commit`?', 'Ви виконали `git add style.css`, а потім знову змінили style.css. Що збереже `git commit`?', 'Wykonałeś `git add style.css`, a potem znów zmieniłeś style.css. Co zapisze `git commit`?'),
             [T('The version from the moment of git add; the new edit needs another git add', 'Версию на момент git add; новую правку нужно добавить ещё раз через git add', 'Версію на момент git add; нову правку треба додати ще раз через git add', 'Wersję z chwili git add; nową zmianę trzeba dodać ponownie przez git add'),
              T('The latest version of the file', 'Последнюю версию файла', 'Останню версію файлу', 'Najnowszą wersję pliku'),
              T('Nothing: the file changed, so it is skipped', 'Ничего: файл изменился, поэтому он пропускается', 'Нічого: файл змінився, тому його пропущено', 'Nic: plik się zmienił, więc jest pomijany')], 0,
             T('git add copies the file as it is right now into the staging area. git status will show style.css both under "to be committed" and "not staged".', 'git add копирует файл в индекс таким, какой он сейчас. git status покажет style.css и в «to be committed», и в «not staged».', 'git add копіює файл в індекс таким, який він зараз. git status покаже style.css і в «to be committed», і в «not staged».', 'git add kopiuje plik do indeksu w obecnej postaci. git status pokaże style.css zarówno w „to be committed”, jak i „not staged”.')),
        task(T('Edit notes.txt (add any line), then save the change with one commit command, without a separate git add. notes.txt is already tracked.', 'Измените notes.txt (добавьте любую строку) и сохраните изменение одной командой commit, без отдельного git add. notes.txt уже отслеживается.', 'Змініть notes.txt (додайте будь-який рядок) і збережіть зміну однією командою commit, без окремого git add. notes.txt уже відстежується.', 'Zmień notes.txt (dopisz dowolną linię) i zapisz zmianę jednym poleceniem commit, bez osobnego git add. notes.txt jest już śledzony.'),
             [git('~/project', T('Two commits', 'Два коммита', 'Два коміти', 'Dwa commity'), commits=2),
              git('~/project', T('Nothing left uncommitted', 'Ничего не осталось незакоммиченным', 'Нічого не лишилося незакоміченим', 'Nic nie zostało niezatwierdzone'), clean=True),
              used('git', T('commit -a', 'commit -a', 'commit -a', 'commit -a'), args=['commit'], flags=['-a'])],
             T('commit has a flag that stages every modified tracked file first: -a. Combine it with -m.', 'У commit есть флаг, который сначала добавляет все изменённые отслеживаемые файлы: -a. Совместите с -m.', 'У commit є прапорець, що спершу додає всі змінені відстежувані файли: -a. Поєднайте з -m.', 'commit ma flagę, która najpierw dodaje wszystkie zmienione śledzone pliki: -a. Połącz ją z -m.'), 'git commit',
             ['echo "- blog" >> notes.txt', 'git commit -am "Add blog idea"'], prepare=['cd ~/project', 'git init -q', 'git add .', 'git commit -qm "Initial commit"']),
    ]),

    lesson('gt-history', T('History and differences', 'История и различия', 'Історія та відмінності', 'Historia i różnice'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## What happened?
```
$ git log
$ git log --oneline
$ git log --oneline -2
$ git show HEAD
```
- `git log` — commits from the newest: id (hash), author, date, message
- `--oneline` — one short line each; `-2` — only the last two
- **HEAD** = the commit you are on now; `HEAD~1` — the one before, `HEAD~2` — two back
- `git show COMMIT` — one commit with its changes

## What changed?
```
$ git diff
$ git diff --staged
```
- `git diff` — changes **not yet staged** (working tree vs staging area)
- `git diff --staged` — what **will go** into the next commit
Lines with `+` were added, with `-` removed.

> Commit ids are long (40 characters), but the first 7 are enough: `git show 3f2a9c1`.""",
"""## Что происходило?
```
$ git log
$ git log --oneline
$ git log --oneline -2
$ git show HEAD
```
- `git log` — коммиты от новых к старым: id (хэш), автор, дата, сообщение
- `--oneline` — по одной короткой строке; `-2` — только два последних
- **HEAD** — коммит, на котором вы сейчас; `HEAD~1` — предыдущий, `HEAD~2` — на два назад
- `git show КОММИТ` — один коммит с его изменениями

## Что изменилось?
```
$ git diff
$ git diff --staged
```
- `git diff` — изменения, **ещё не добавленные** в индекс (рабочая папка против индекса)
- `git diff --staged` — то, что **войдёт** в следующий коммит
Строки с `+` добавлены, с `-` удалены.

> Id коммитов длинные (40 символов), но хватает первых 7: `git show 3f2a9c1`.""",
"""## Що відбувалося?
```
$ git log
$ git log --oneline
$ git log --oneline -2
$ git show HEAD
```
- `git log` — коміти від нових до старих: id (хеш), автор, дата, повідомлення
- `--oneline` — по одному короткому рядку; `-2` — лише два останні
- **HEAD** — коміт, на якому ви зараз; `HEAD~1` — попередній, `HEAD~2` — на два назад
- `git show КОМІТ` — один коміт з його змінами

## Що змінилося?
```
$ git diff
$ git diff --staged
```
- `git diff` — зміни, **ще не додані** в індекс (робоча тека проти індексу)
- `git diff --staged` — те, що **ввійде** в наступний коміт
Рядки з `+` додано, з `-` видалено.

> Id комітів довгі (40 символів), але вистачає перших 7: `git show 3f2a9c1`.""",
"""## Co się działo?
```
$ git log
$ git log --oneline
$ git log --oneline -2
$ git show HEAD
```
- `git log` — commity od najnowszego: id (hash), autor, data, opis
- `--oneline` — po jednej krótkiej linii; `-2` — tylko dwa ostatnie
- **HEAD** = commit, na którym teraz jesteś; `HEAD~1` — poprzedni, `HEAD~2` — dwa wstecz
- `git show COMMIT` — jeden commit z jego zmianami

## Co się zmieniło?
```
$ git diff
$ git diff --staged
```
- `git diff` — zmiany **jeszcze nie dodane** do indeksu (katalog roboczy kontra indeks)
- `git diff --staged` — co **trafi** do następnego commita
Linie z `+` dodano, z `-` usunięto.

> Id commitów są długie (40 znaków), ale wystarczy pierwsze 7: `git show 3f2a9c1`."""),
            title=T('log, show, diff', 'log, show, diff', 'log, show, diff', 'log, show, diff'), demo=['cd ~/project && git init -q && git add . && git commit -qm "Add home page"', 'echo "<p>Hi</p>" >> index.html && git commit -qam "Greeting"', 'git log --oneline', 'git show HEAD'], setup='git-lab'),
        task(T('Show the history of ~/project, one short line per commit.', 'Покажите историю ~/project, по одной короткой строке на коммит.', 'Покажіть історію ~/project, по одному короткому рядку на коміт.', 'Pokaż historię ~/project, po jednej krótkiej linii na commit.'),
             [used('git', T('git log --oneline', 'git log --oneline', 'git log --oneline', 'git log --oneline'), args=['log'], flags=['--oneline']), out(T('You see "Welcome text"', 'Видно «Welcome text»', 'Видно «Welcome text»', 'Widać „Welcome text”'), text='Welcome text')],
             T('log with a flag for short lines', 'log с флагом коротких строк', 'log із прапорцем коротких рядків', 'log z flagą krótkich linii'), 'git log', ['git log --oneline'], prepare=REPO),
        predict('git show HEAD~2:style.css', ['body { font-family: sans-serif; }\n', 'body { font-family: sans-serif; }\nh1 { color: teal; }\n', "fatal: path 'style.css' does not exist in 'HEAD~2'\n"], 0,
                T('HEAD~2 is two commits before the current one: "Add home page". COMMIT:FILE prints the file as it was in that commit — before the teal headings were added.', 'HEAD~2 — на два коммита раньше текущего: «Add home page». КОММИТ:ФАЙЛ печатает файл таким, каким он был в том коммите, — ещё до бирюзовых заголовков.', 'HEAD~2 — на два коміти раніше від поточного: «Add home page». КОМІТ:ФАЙЛ друкує файл таким, яким він був у тому коміті, — ще до бірюзових заголовків.', 'HEAD~2 to dwa commity przed bieżącym: „Add home page”. COMMIT:PLIK wypisuje plik takim, jaki był w tym commicie — jeszcze przed turkusowymi nagłówkami.'),
                setup='git-lab', prepare=REPO, context=['git log --oneline', 'cat style.css']),
        task(T('Add a line to style.css and look at the exact change before committing it.', 'Добавьте строку в style.css и посмотрите точное изменение, прежде чем его коммитить.', 'Додайте рядок у style.css і подивіться точну зміну, перш ніж її комітити.', 'Dopisz linię do style.css i obejrzyj dokładną zmianę przed zatwierdzeniem.'),
             [git('~/project', T('style.css is modified', 'style.css изменён', 'style.css змінено', 'style.css zmieniony'), clean=False),
              used('git', T('git diff', 'git diff', 'git diff', 'git diff'), args=['diff']), out(T('The diff shows an added line', 'diff показывает добавленную строку', 'diff показує доданий рядок', 'diff pokazuje dodaną linię'), regex=r'^\+[^+]')],
             T('Append with echo … >> style.css, then the git command that compares the working tree with the staging area.', 'Допишите через echo … >> style.css, затем команда git, сравнивающая рабочую папку с индексом.', 'Допишіть через echo … >> style.css, потім команда git, що порівнює робочу теку з індексом.', 'Dopisz przez echo … >> style.css, potem polecenie git porównujące katalog roboczy z indeksem.'), 'git diff',
             ['echo "p { margin: 0; }" >> style.css', 'git diff'], prepare=REPO),
        quiz(T('You staged everything with `git add .`. Now `git diff` prints nothing. Why?', 'Вы добавили всё через `git add .`. Теперь `git diff` ничего не выводит. Почему?', 'Ви додали все через `git add .`. Тепер `git diff` нічого не виводить. Чому?', 'Dodałeś wszystko przez `git add .`. Teraz `git diff` nic nie wypisuje. Dlaczego?'),
             [T('git diff compares the working tree with the staging area, and they are equal now; use git diff --staged', 'git diff сравнивает рабочую папку с индексом, а они теперь одинаковые; нужен git diff --staged', 'git diff порівнює робочу теку з індексом, а вони тепер однакові; потрібен git diff --staged', 'git diff porównuje katalog roboczy z indeksem, a teraz są równe; użyj git diff --staged'),
              T('git add . deleted the changes', 'git add . удалил изменения', 'git add . видалив зміни', 'git add . usunął zmiany'),
              T('The changes were committed automatically', 'Изменения закоммитились автоматически', 'Зміни закомітилися автоматично', 'Zmiany zostały zatwierdzone automatycznie')], 0),
    ]),

    lesson('gt-undo', T('Undoing changes', 'Отмена изменений', 'Скасування змін', 'Cofanie zmian'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## Not committed yet
| situation | command |
|---|---|
| broke a file, want the last committed version | `git restore FILE` |
| staged a file by mistake | `git restore --staged FILE` |

`git restore FILE` **throws away** your edits in that file — there is no undo for this one.

## Already committed
| situation | command |
|---|---|
| the last commit message has a typo | `git commit --amend -m "Better message"` |
| undo a commit that is already shared | `git revert COMMIT` — a *new* commit with the opposite change |
| forget the last commits locally | `git reset --hard HEAD~1` — moves the branch back, files too |

> `revert` is safe: history only grows. `reset --hard` rewrites history and deletes changes — use it only for commits nobody else has.""",
"""## Ещё не закоммичено
| ситуация | команда |
|---|---|
| сломали файл, нужна последняя закоммиченная версия | `git restore ФАЙЛ` |
| случайно добавили файл в индекс | `git restore --staged ФАЙЛ` |

`git restore ФАЙЛ` **выбрасывает** ваши правки в файле — эту операцию не отменить.

## Уже закоммичено
| ситуация | команда |
|---|---|
| опечатка в сообщении последнего коммита | `git commit --amend -m "Better message"` |
| отменить коммит, который уже у других | `git revert КОММИТ` — *новый* коммит с обратным изменением |
| забыть последние коммиты локально | `git reset --hard HEAD~1` — откатывает ветку и файлы |

> `revert` безопасен: история только растёт. `reset --hard` переписывает историю и стирает изменения — только для коммитов, которых больше ни у кого нет.""",
"""## Ще не закомічено
| ситуація | команда |
|---|---|
| зламали файл, потрібна остання закомічена версія | `git restore ФАЙЛ` |
| випадково додали файл в індекс | `git restore --staged ФАЙЛ` |

`git restore ФАЙЛ` **викидає** ваші правки у файлі — цю операцію не скасувати.

## Уже закомічено
| ситуація | команда |
|---|---|
| помилка в повідомленні останнього коміту | `git commit --amend -m "Better message"` |
| скасувати коміт, який уже є в інших | `git revert КОМІТ` — *новий* коміт з оберненою зміною |
| забути останні коміти локально | `git reset --hard HEAD~1` — відкочує гілку й файли |

> `revert` безпечний: історія лише росте. `reset --hard` переписує історію й стирає зміни — тільки для комітів, яких більше ні в кого немає.""",
"""## Jeszcze niezatwierdzone
| sytuacja | polecenie |
|---|---|
| zepsułeś plik, chcesz ostatnią zatwierdzoną wersję | `git restore PLIK` |
| przez pomyłkę dodałeś plik do indeksu | `git restore --staged PLIK` |

`git restore PLIK` **wyrzuca** twoje zmiany w pliku — tego nie da się cofnąć.

## Już zatwierdzone
| sytuacja | polecenie |
|---|---|
| literówka w opisie ostatniego commita | `git commit --amend -m "Better message"` |
| cofnij commit, który mają już inni | `git revert COMMIT` — *nowy* commit z odwrotną zmianą |
| zapomnij ostatnie commity lokalnie | `git reset --hard HEAD~1` — cofa gałąź i pliki |

> `revert` jest bezpieczny: historia tylko rośnie. `reset --hard` przepisuje historię i kasuje zmiany — tylko dla commitów, których nikt inny nie ma."""),
            title=T('restore, revert, reset', 'restore, revert, reset', 'restore, revert, reset', 'restore, revert, reset'), terminal=False),
        task(T('Oops: index.html was overwritten. Bring back the last committed version.', 'Ой: index.html затёрт. Верните последнюю закоммиченную версию.', 'Ой: index.html затерто. Поверніть останню закомічену версію.', 'Ups: index.html został nadpisany. Przywróć ostatnią zatwierdzoną wersję.'),
             [fcontains('~/project/index.html', T('index.html is back', 'index.html вернулся', 'index.html повернувся', 'index.html wrócił'), text='Welcome to my site'),
              git('~/project', T('Nothing modified', 'Ничего не изменено', 'Нічого не змінено', 'Nic nie jest zmienione'), clean=True)],
             T('restore takes the file from the last commit.', 'restore берёт файл из последнего коммита.', 'restore бере файл з останнього коміту.', 'restore bierze plik z ostatniego commita.'), 'git restore',
             ['git restore index.html'], prepare=REPO + ['echo oops > index.html']),
        task(T('draft.txt got into the staging area by mistake. Unstage it without losing the file.', 'draft.txt случайно попал в индекс. Уберите его из индекса, не потеряв файл.', 'draft.txt випадково потрапив в індекс. Приберіть його з індексу, не втративши файл.', 'draft.txt przez pomyłkę trafił do indeksu. Usuń go z indeksu, nie tracąc pliku.'),
             [git('~/project', T('draft.txt is not staged', 'draft.txt не в индексе', 'draft.txt не в індексі', 'draft.txt nie jest w indeksie'), untracked='~/project/draft.txt'),
              fexists('~/project/draft.txt', T('The file is still there', 'Файл на месте', 'Файл на місці', 'Plik nadal istnieje'))],
             T('restore with the flag for the staging area', 'restore с флагом для индекса', 'restore з прапорцем для індексу', 'restore z flagą dla indeksu'), 'git restore',
             ['git restore --staged draft.txt'], prepare=REPO + ['echo "my draft" > draft.txt', 'git add draft.txt']),
        task(T('The commit "Teal headings" broke the design, and the team already has it. Undo it safely, without rewriting history.', 'Коммит «Teal headings» сломал дизайн, и он уже есть у команды. Отмените его безопасно, не переписывая историю.', 'Коміт «Teal headings» зламав дизайн, і він уже є в команди. Скасуйте його безпечно, не переписуючи історію.', 'Commit „Teal headings” zepsuł wygląd, a zespół już go ma. Cofnij go bezpiecznie, bez przepisywania historii.'),
             [git('~/project', T('A new commit was added (4 in total)', 'Добавлен новый коммит (всего 4)', 'Додано новий коміт (усього 4)', 'Dodano nowy commit (razem 4)'), commits=4, message='^Revert'),
              fnot('~/project/style.css', T('style.css has no teal any more', 'В style.css больше нет teal', 'У style.css більше немає teal', 'W style.css nie ma już teal'), text='teal')],
             T('git revert with the commit: it is HEAD~1 (or its short id from git log --oneline).', 'git revert с коммитом: это HEAD~1 (или его короткий id из git log --oneline).', 'git revert з комітом: це HEAD~1 (або його короткий id з git log --oneline).', 'git revert z commitem: to HEAD~1 (albo jego krótkie id z git log --oneline).'), 'git revert',
             ['git revert HEAD~1'], prepare=REPO),
        quiz(T('Which command is safe for a commit that is already on GitHub?', 'Какая команда безопасна для коммита, который уже на GitHub?', 'Яка команда безпечна для коміту, який уже на GitHub?', 'Które polecenie jest bezpieczne dla commita, który jest już na GitHubie?'),
             [T('git revert — it adds a new commit', 'git revert — он добавляет новый коммит', 'git revert — він додає новий коміт', 'git revert — dodaje nowy commit'),
              T('git reset --hard — it removes the commit', 'git reset --hard — он удаляет коммит', 'git reset --hard — він видаляє коміт', 'git reset --hard — usuwa commit'),
              T('git restore — it restores the commit', 'git restore — он восстанавливает коммит', 'git restore — він відновлює коміт', 'git restore — przywraca commit')], 0,
             T('Others already have the old history. reset would make your history different from theirs, and your next push would be rejected.', 'У других уже есть старая история. reset сделает вашу историю отличной от их, и следующий push будет отклонён.', 'Інші вже мають стару історію. reset зробить вашу історію відмінною від їхньої, і наступний push буде відхилено.', 'Inni mają już starą historię. reset sprawi, że twoja będzie inna, a następny push zostanie odrzucony.')),
    ]),

    lesson('gt-ignore', T('What not to commit: .gitignore', 'Что не коммитить: .gitignore', 'Що не комітити: .gitignore', 'Czego nie zatwierdzać: .gitignore'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## Not everything belongs in history
Logs, build output, dependencies (`node_modules/`), editor files and especially **secrets** (`.env` with passwords) should not be committed.

List them in a file named **`.gitignore`** at the root of the repository:
```
*.log
build/
.env
```
| pattern | ignores |
|---|---|
| `*.log` | every file ending in .log, in any folder |
| `build/` | the folder build and everything inside |
| `.env` | files named .env |
| `!keep.log` | an exception: do not ignore keep.log |

Commit `.gitignore` itself — it is a part of the project.

> `.gitignore` affects only **untracked** files. A file that is already committed stays tracked: remove it from the index with `git rm --cached FILE`.""",
"""## Не всё должно быть в истории
Логи, результаты сборки, зависимости (`node_modules/`), файлы редактора и особенно **секреты** (`.env` с паролями) коммитить не нужно.

Перечислите их в файле **`.gitignore`** в корне репозитория:
```
*.log
build/
.env
```
| шаблон | игнорирует |
|---|---|
| `*.log` | все файлы на .log в любой папке |
| `build/` | папку build со всем содержимым |
| `.env` | файлы с именем .env |
| `!keep.log` | исключение: keep.log не игнорировать |

Сам `.gitignore` коммитят — это часть проекта.

> `.gitignore` действует только на **неотслеживаемые** файлы. Уже закоммиченный файл продолжит отслеживаться: уберите его из индекса через `git rm --cached ФАЙЛ`.""",
"""## Не все має бути в історії
Логи, результати збирання, залежності (`node_modules/`), файли редактора й особливо **секрети** (`.env` з паролями) комітити не треба.

Перелічіть їх у файлі **`.gitignore`** у корені репозиторію:
```
*.log
build/
.env
```
| шаблон | ігнорує |
|---|---|
| `*.log` | усі файли на .log у будь-якій теці |
| `build/` | теку build з усім вмістом |
| `.env` | файли з назвою .env |
| `!keep.log` | виняток: keep.log не ігнорувати |

Сам `.gitignore` комітять — це частина проєкту.

> `.gitignore` діє лише на **невідстежувані** файли. Уже закомічений файл і далі відстежуватиметься: приберіть його з індексу через `git rm --cached ФАЙЛ`.""",
"""## Nie wszystko powinno trafić do historii
Logi, wyniki budowania, zależności (`node_modules/`), pliki edytora, a zwłaszcza **sekrety** (`.env` z hasłami) nie powinny być zatwierdzane.

Wypisz je w pliku **`.gitignore`** w katalogu głównym repozytorium:
```
*.log
build/
.env
```
| wzorzec | ignoruje |
|---|---|
| `*.log` | każdy plik kończący się na .log, w dowolnym folderze |
| `build/` | folder build z całą zawartością |
| `.env` | pliki o nazwie .env |
| `!keep.log` | wyjątek: nie ignoruj keep.log |

Sam `.gitignore` się zatwierdza — to część projektu.

> `.gitignore` działa tylko na **nieśledzone** pliki. Plik już zatwierdzony dalej będzie śledzony: usuń go z indeksu przez `git rm --cached PLIK`."""),
            title=T('.gitignore', '.gitignore', '.gitignore', '.gitignore'), terminal=False),
        task(T('The project has debug.log and a secret .env. Make Git ignore all .log files and .env, and commit the .gitignore.', 'В проекте есть debug.log и секретный .env. Сделайте так, чтобы Git игнорировал все .log-файлы и .env, и закоммитьте .gitignore.', 'У проєкті є debug.log і секретний .env. Зробіть так, щоб Git ігнорував усі .log-файли та .env, і закомітьте .gitignore.', 'W projekcie są debug.log i tajny .env. Spraw, by Git ignorował wszystkie pliki .log i .env, i zatwierdź .gitignore.'),
             [git('~/project', T('*.log is ignored', '*.log игнорируется', '*.log ігнорується', '*.log jest ignorowany'), ignored='~/project/debug.log'),
              git('~/project', T('.env is ignored', '.env игнорируется', '.env ігнорується', '.env jest ignorowany'), ignored='~/project/.env'),
              git('~/project', T('.gitignore is committed', '.gitignore закоммичен', '.gitignore закомічено', '.gitignore jest zatwierdzony'), tracked='~/project/.gitignore'),
              git('~/project', T('Status is clean', 'Статус чистый', 'Статус чистий', 'Status jest czysty'), clean=True)],
             T('echo "*.log" > .gitignore, then append .env with >>, then add and commit .gitignore', 'echo "*.log" > .gitignore, потом допишите .env через >>, затем add и commit для .gitignore', 'echo "*.log" > .gitignore, потім допишіть .env через >>, далі add і commit для .gitignore', 'echo "*.log" > .gitignore, potem dopisz .env przez >>, następnie add i commit dla .gitignore'), 'echo',
             ['echo "*.log" > .gitignore', 'echo ".env" >> .gitignore', 'git add .gitignore', 'git commit -m "Ignore logs and secrets"'], prepare=REPO + ['echo "error at 12:00" > debug.log', 'echo "API_KEY=s3cr3t" > .env']),
        quiz(T('config.php with a password was committed a week ago. You add it to .gitignore. What happens?', 'config.php с паролем закоммитили неделю назад. Вы добавляете его в .gitignore. Что будет?', 'config.php з паролем закомітили тиждень тому. Ви додаєте його в .gitignore. Що буде?', 'config.php z hasłem zatwierdzono tydzień temu. Dodajesz go do .gitignore. Co się stanie?'),
             [T('Nothing changes: the file stays tracked and the password stays in history', 'Ничего: файл продолжает отслеживаться, а пароль остаётся в истории', 'Нічого: файл і далі відстежується, а пароль лишається в історії', 'Nic: plik dalej jest śledzony, a hasło zostaje w historii'),
              T('Git deletes the file from all old commits', 'Git удаляет файл из всех старых коммитов', 'Git видаляє файл з усіх старих комітів', 'Git usuwa plik ze wszystkich starych commitów'),
              T('Git deletes the file from the disk', 'Git удаляет файл с диска', 'Git видаляє файл з диска', 'Git usuwa plik z dysku')], 0,
             T('.gitignore only affects untracked files. Use git rm --cached config.php — and change the password: it is still in the history.', '.gitignore влияет только на неотслеживаемые файлы. Выполните git rm --cached config.php — и смените пароль: он остался в истории.', '.gitignore впливає лише на невідстежувані файли. Виконайте git rm --cached config.php — і змініть пароль: він лишився в історії.', '.gitignore działa tylko na pliki nieśledzone. Wykonaj git rm --cached config.php — i zmień hasło: nadal jest w historii.')),
    ]),
]

module('21-git-basics.json', 'git-basics', '/git/basics', 'git',
       T('Git basics', 'Основы Git', 'Основи Git', 'Podstawy Gita'),
       T('Repository, commits, history, undo and .gitignore', 'Репозиторий, коммиты, история, отмена и .gitignore', 'Репозиторій, коміти, історія, скасування й .gitignore', 'Repozytorium, commity, historia, cofanie i .gitignore'), basics)

# ------------------------------------------------------------------ module 2: branches

BRANCHED = REPO + ['git switch -qc dark-theme 2>/dev/null', 'echo "body { background: #111; color: #eee; }" >> style.css', 'git commit -qam "Dark theme"', 'git switch -q main 2>/dev/null']
CONFLICT = REPO + ['git switch -qc title 2>/dev/null', 'sed -i "s/Hello!/Hello from the team!/" index.html', 'git commit -qam "Team title"', 'git switch -q main 2>/dev/null', 'sed -i "s/Hello!/Hi there!/" index.html', 'git commit -qam "Friendlier title"', 'git merge title > /dev/null']

branches = [
    lesson('gt-branches', T('Branches', 'Ветки', 'Гілки', 'Gałęzie'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## A safe place for an idea
A **branch** is a movable label on a commit. `main` is the main line; for a new feature you make a branch, commit there, and `main` stays untouched.
```
$ git branch
$ git switch -c dark-theme
$ git branch
$ git switch main
```
- `git branch` — list branches, `*` marks the current one
- `git switch -c NAME` — **create** a branch and switch to it
- `git switch NAME` — switch to an existing branch; the files in the folder change to that branch's version
- `git branch -d NAME` — delete a branch that is already merged

Older guides use `git checkout NAME` and `git checkout -b NAME` — it does the same.

> Commit or stash your changes before switching: Git refuses to switch if unsaved edits would be overwritten.""",
"""## Безопасное место для идеи
**Ветка** — подвижная метка на коммите. `main` — основная линия; для новой функции создают ветку, коммитят в неё, а `main` остаётся нетронутой.
```
$ git branch
$ git switch -c dark-theme
$ git branch
$ git switch main
```
- `git branch` — список веток, `*` отмечает текущую
- `git switch -c ИМЯ` — **создать** ветку и перейти на неё
- `git switch ИМЯ` — перейти на существующую ветку; файлы в папке станут версией этой ветки
- `git branch -d ИМЯ` — удалить уже слитую ветку

В старых руководствах пишут `git checkout ИМЯ` и `git checkout -b ИМЯ` — это то же самое.

> Перед переключением закоммитьте или отложите (stash) изменения: Git не даст переключиться, если несохранённые правки будут затёрты.""",
"""## Безпечне місце для ідеї
**Гілка** — рухома мітка на коміті. `main` — основна лінія; для нової функції створюють гілку, комітять у неї, а `main` лишається недоторканою.
```
$ git branch
$ git switch -c dark-theme
$ git branch
$ git switch main
```
- `git branch` — список гілок, `*` позначає поточну
- `git switch -c НАЗВА` — **створити** гілку й перейти на неї
- `git switch НАЗВА` — перейти на наявну гілку; файли в теці стануть версією цієї гілки
- `git branch -d НАЗВА` — видалити вже злиту гілку

У старих посібниках пишуть `git checkout НАЗВА` і `git checkout -b НАЗВА` — це те саме.

> Перед перемиканням закомітьте або відкладіть (stash) зміни: Git не дасть перемкнутися, якщо незбережені правки буде затерто.""",
"""## Bezpieczne miejsce na pomysł
**Gałąź** to ruchoma etykieta na commicie. `main` to główna linia; dla nowej funkcji tworzy się gałąź, zatwierdza w niej, a `main` pozostaje nietknięta.
```
$ git branch
$ git switch -c dark-theme
$ git branch
$ git switch main
```
- `git branch` — lista gałęzi, `*` oznacza bieżącą
- `git switch -c NAZWA` — **utwórz** gałąź i przełącz się na nią
- `git switch NAZWA` — przełącz się na istniejącą gałąź; pliki w folderze zmienią się na wersję tej gałęzi
- `git branch -d NAZWA` — usuń już scaloną gałąź

Starsze poradniki używają `git checkout NAZWA` i `git checkout -b NAZWA` — to to samo.

> Przed przełączeniem zatwierdź lub odłóż (stash) zmiany: Git odmówi, jeśli niezapisane zmiany zostałyby nadpisane."""),
            title=T('branch and switch', 'branch и switch', 'branch і switch', 'branch i switch'), demo=['cd ~/project && git init -q && git add . && git commit -qm "Add home page"', 'git switch -c dark-theme', 'git branch'], setup='git-lab'),
        task(T('Create a branch named contact-page and switch to it. Add contact.html (any text) and commit it there.', 'Создайте ветку contact-page и перейдите на неё. Добавьте contact.html (любой текст) и закоммитьте его там.', 'Створіть гілку contact-page і перейдіть на неї. Додайте contact.html (будь-який текст) і закомітьте його там.', 'Utwórz gałąź contact-page i przełącz się na nią. Dodaj contact.html (dowolny tekst) i zatwierdź go tam.'),
             [git('~/project', T('You are on contact-page', 'Вы на ветке contact-page', 'Ви на гілці contact-page', 'Jesteś na gałęzi contact-page'), head='contact-page'),
              git('~/project', T('contact.html is committed', 'contact.html закоммичен', 'contact.html закомічено', 'contact.html jest zatwierdzony'), tracked='~/project/contact.html', commits=4)],
             T('git switch -c NAME, then echo … > contact.html, git add, git commit', 'git switch -c ИМЯ, затем echo … > contact.html, git add, git commit', 'git switch -c НАЗВА, потім echo … > contact.html, git add, git commit', 'git switch -c NAZWA, potem echo … > contact.html, git add, git commit'), 'git switch -c',
             ['git switch -c contact-page', 'echo "<h1>Contacts</h1>" > contact.html', 'git add contact.html', 'git commit -m "Add contact page"'], prepare=REPO),
        predict('ls', ['index.html\nnotes.txt\nstyle.css\n', 'contact.html\nindex.html\nnotes.txt\nstyle.css\n'], 0,
                T('contact.html exists only in the commits of contact-page. Switching to main puts the folder in main\'s state — the file disappears (and comes back when you switch back).', 'contact.html есть только в коммитах ветки contact-page. Переключение на main приводит папку к состоянию main — файл исчезает (и вернётся, если переключиться обратно).', 'contact.html є лише в комітах гілки contact-page. Перемикання на main приводить теку до стану main — файл зникає (і повернеться, якщо перемкнутися назад).', 'contact.html istnieje tylko w commitach gałęzi contact-page. Przełączenie na main ustawia folder w stanie main — plik znika (i wróci po powrocie).'),
                setup='git-lab', prepare=REPO + ['git switch -qc contact-page 2>/dev/null', 'echo hi > contact.html', 'git add contact.html', 'git commit -qm "Contact page"', 'git switch main 2>/dev/null'], context=['git branch', 'git log --oneline --all']),
        quiz(T('You are on main with an edited, uncommitted index.html. `git switch feature` fails with "would be overwritten". What do you do?', 'Вы на main, index.html изменён и не закоммичен. `git switch feature` падает с «would be overwritten». Что делать?', 'Ви на main, index.html змінено й не закомічено. `git switch feature` падає з «would be overwritten». Що робити?', 'Jesteś na main, index.html jest zmieniony i niezatwierdzony. `git switch feature` kończy się „would be overwritten”. Co robisz?'),
             [T('Commit the change or put it aside with git stash, then switch', 'Закоммитить изменение или отложить его через git stash, затем переключиться', 'Закомітити зміну або відкласти її через git stash, потім перемкнутися', 'Zatwierdzić zmianę albo odłożyć ją przez git stash, potem się przełączyć'),
              T('Delete the .git folder', 'Удалить папку .git', 'Видалити теку .git', 'Usunąć folder .git'),
              T('Create the branch again with -c', 'Создать ветку заново с -c', 'Створити гілку заново з -c', 'Utworzyć gałąź ponownie z -c')], 0),
    ]),

    lesson('gt-merge', T('Merging branches', 'Слияние веток', 'Злиття гілок', 'Scalanie gałęzi'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## Bring the work home
When a feature is ready, merge its branch into `main`:
```
$ git switch main
$ git merge dark-theme
```
You always merge **into the current branch**: first switch to the receiver, then name the giver.

## Two kinds of merge
| case | what Git does |
|---|---|
| main did not move since the branch started | **fast-forward**: main simply moves to the branch's last commit |
| both branches have new commits | a **merge commit** with two parents joins the lines |

```
$ git log --oneline --graph --all
```
draws the branches. After the merge the branch label can go: `git branch -d dark-theme`.""",
"""## Вернуть работу домой
Когда функция готова, влейте её ветку в `main`:
```
$ git switch main
$ git merge dark-theme
```
Сливают всегда **в текущую ветку**: сначала перейдите в принимающую, затем назовите ту, которую вливаете.

## Два вида слияния
| случай | что делает Git |
|---|---|
| main не двигалась с момента создания ветки | **fast-forward**: main просто переезжает на последний коммит ветки |
| в обеих ветках есть новые коммиты | **коммит слияния** с двумя родителями соединяет линии |

```
$ git log --oneline --graph --all
```
рисует ветки. После слияния метку ветки можно удалить: `git branch -d dark-theme`.""",
"""## Повернути роботу додому
Коли функція готова, влийте її гілку в `main`:
```
$ git switch main
$ git merge dark-theme
```
Зливають завжди **в поточну гілку**: спершу перейдіть у ту, що приймає, потім назвіть ту, яку вливаєте.

## Два види злиття
| випадок | що робить Git |
|---|---|
| main не рухалася відтоді, як створили гілку | **fast-forward**: main просто переїжджає на останній коміт гілки |
| в обох гілках є нові коміти | **коміт злиття** з двома батьками з’єднує лінії |

```
$ git log --oneline --graph --all
```
малює гілки. Після злиття мітку гілки можна видалити: `git branch -d dark-theme`.""",
"""## Sprowadź pracę do domu
Gdy funkcja jest gotowa, scal jej gałąź z `main`:
```
$ git switch main
$ git merge dark-theme
```
Zawsze scalasz **do bieżącej gałęzi**: najpierw przełącz się na odbiorcę, potem podaj dawcę.

## Dwa rodzaje scalania
| przypadek | co robi Git |
|---|---|
| main się nie ruszyła od utworzenia gałęzi | **fast-forward**: main po prostu przesuwa się na ostatni commit gałęzi |
| obie gałęzie mają nowe commity | **commit scalający** z dwoma rodzicami łączy linie |

```
$ git log --oneline --graph --all
```
rysuje gałęzie. Po scaleniu etykietę gałęzi można usunąć: `git branch -d dark-theme`."""),
            title=T('git merge', 'git merge', 'git merge', 'git merge'), terminal=False),
        task(T('The branch dark-theme is ready. Merge it into main.', 'Ветка dark-theme готова. Влейте её в main.', 'Гілка dark-theme готова. Влийте її в main.', 'Gałąź dark-theme jest gotowa. Scal ją z main.'),
             [git('~/project', T('You are on main', 'Вы на main', 'Ви на main', 'Jesteś na main'), head='main'),
              git('~/project', T('dark-theme is merged into main', 'dark-theme влита в main', 'dark-theme влито в main', 'dark-theme jest scalona z main'), merged='dark-theme'),
              fcontains('~/project/style.css', T('The dark theme is in style.css', 'Тёмная тема есть в style.css', 'Темна тема є в style.css', 'Ciemny motyw jest w style.css'), text='#111')],
             T('You are already on main: git merge with the branch name', 'Вы уже на main: git merge с именем ветки', 'Ви вже на main: git merge з назвою гілки', 'Jesteś już na main: git merge z nazwą gałęzi'), 'git merge',
             ['git merge dark-theme'], prepare=BRANCHED),
        task(T('Clean up: delete the merged branch dark-theme.', 'Наведите порядок: удалите слитую ветку dark-theme.', 'Наведіть лад: видаліть злиту гілку dark-theme.', 'Posprzątaj: usuń scaloną gałąź dark-theme.'),
             [git('~/project', T('dark-theme is gone', 'Ветки dark-theme больше нет', 'Гілки dark-theme більше немає', 'Gałęzi dark-theme już nie ma'), noBranch='dark-theme'),
              fcontains('~/project/style.css', T('The work stays in main', 'Работа осталась в main', 'Робота лишилася в main', 'Praca została w main'), text='#111')],
             T('branch with the delete flag', 'branch с флагом удаления', 'branch із прапорцем видалення', 'branch z flagą usuwania'), 'git branch -d',
             ['git branch -d dark-theme'], prepare=BRANCHED + ['git merge -q dark-theme > /dev/null']),
        quiz(T('You want the commits of feature to end up in main. Where must you be?', 'Нужно, чтобы коммиты feature оказались в main. Где нужно находиться?', 'Треба, щоб коміти feature опинилися в main. Де треба бути?', 'Chcesz, by commity z feature trafiły do main. Gdzie musisz być?'),
             [T('On main, then run git merge feature', 'На main, затем git merge feature', 'На main, потім git merge feature', 'Na main, potem git merge feature'),
              T('On feature, then run git merge main', 'На feature, затем git merge main', 'На feature, потім git merge main', 'Na feature, potem git merge main'),
              T('It does not matter', 'Неважно', 'Неважливо', 'Nie ma znaczenia')], 0,
             T('git merge X brings X into the branch you are on. On feature, git merge main would do the opposite.', 'git merge X вливает X в ветку, на которой вы находитесь. На feature git merge main сделал бы наоборот.', 'git merge X вливає X у гілку, на якій ви перебуваєте. На feature git merge main зробив би навпаки.', 'git merge X wciąga X do gałęzi, na której jesteś. Na feature git merge main zrobiłby odwrotnie.')),
    ]),

    lesson('gt-conflicts', T('Merge conflicts', 'Конфликты слияния', 'Конфлікти злиття', 'Konflikty scalania'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## When Git cannot decide
Both branches changed **the same lines** differently — Git stops and asks you:
```
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```
The file now holds both versions between markers:
```
<<<<<<< HEAD
<h1>Hi there!</h1>
=======
<h1>Hello from the team!</h1>
>>>>>>> title
```
- above `=======` — your branch (HEAD), below — the branch being merged

## Resolve it
1. `git status` — which files are in conflict (*both modified*)
2. edit the file: keep the right text, **delete all three marker lines**
3. `git add index.html` — mark it as resolved
4. `git commit` — finish the merge (the message is ready: `-m` is optional here)

Changed your mind? `git merge --abort` returns everything to before the merge.

> A conflict is normal teamwork, not an error. It only means two people edited the same place.""",
"""## Когда Git не может решить сам
Обе ветки по-разному изменили **одни и те же строки** — Git останавливается и спрашивает вас:
```
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```
Теперь в файле обе версии между маркерами:
```
<<<<<<< HEAD
<h1>Hi there!</h1>
=======
<h1>Hello from the team!</h1>
>>>>>>> title
```
- над `=======` — ваша ветка (HEAD), под ним — вливаемая ветка

## Разрешите конфликт
1. `git status` — какие файлы в конфликте (*both modified*)
2. отредактируйте файл: оставьте правильный текст и **удалите все три строки-маркера**
3. `git add index.html` — отметить как разрешённый
4. `git commit` — завершить слияние (сообщение уже готово: `-m` здесь необязателен)

Передумали? `git merge --abort` вернёт всё как было до слияния.

> Конфликт — нормальная командная работа, а не ошибка. Это лишь значит, что двое правили одно место.""",
"""## Коли Git не може вирішити сам
Обидві гілки по-різному змінили **ті самі рядки** — Git зупиняється й питає вас:
```
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```
Тепер у файлі обидві версії між маркерами:
```
<<<<<<< HEAD
<h1>Hi there!</h1>
=======
<h1>Hello from the team!</h1>
>>>>>>> title
```
- над `=======` — ваша гілка (HEAD), під ним — гілка, що вливається

## Розв’яжіть конфлікт
1. `git status` — які файли в конфлікті (*both modified*)
2. відредагуйте файл: лишіть правильний текст і **видаліть усі три рядки-маркери**
3. `git add index.html` — позначити як розв’язаний
4. `git commit` — завершити злиття (повідомлення вже готове: `-m` тут необов’язковий)

Передумали? `git merge --abort` поверне все як було до злиття.

> Конфлікт — нормальна командна робота, а не помилка. Це лише означає, що двоє правили одне місце.""",
"""## Gdy Git nie może zdecydować
Obie gałęzie inaczej zmieniły **te same linie** — Git zatrzymuje się i pyta ciebie:
```
CONFLICT (content): Merge conflict in index.html
Automatic merge failed; fix conflicts and then commit the result.
```
Plik zawiera teraz obie wersje między znacznikami:
```
<<<<<<< HEAD
<h1>Hi there!</h1>
=======
<h1>Hello from the team!</h1>
>>>>>>> title
```
- nad `=======` — twoja gałąź (HEAD), pod nim — gałąź scalana

## Rozwiąż konflikt
1. `git status` — które pliki są w konflikcie (*both modified*)
2. popraw plik: zostaw właściwy tekst i **usuń wszystkie trzy linie znaczników**
3. `git add index.html` — oznacz jako rozwiązany
4. `git commit` — zakończ scalanie (opis jest gotowy: `-m` jest tu opcjonalne)

Zmiana planów? `git merge --abort` przywraca stan sprzed scalania.

> Konflikt to normalna praca zespołowa, nie błąd. Oznacza tylko, że dwie osoby edytowały to samo miejsce."""),
            title=T('Conflict markers', 'Маркеры конфликта', 'Маркери конфлікту', 'Znaczniki konfliktu'), terminal=False),
        predict('git status -s', ['UU index.html\n', 'M  index.html\n', ' M index.html\n'], 0,
                T('UU = "unmerged, both modified": the file waits for you to resolve the conflict.', 'UU — «не слито, изменено обеими сторонами»: файл ждёт, пока вы разрешите конфликт.', 'UU — «не злито, змінено обома сторонами»: файл чекає, поки ви розв’яжете конфлікт.', 'UU = „nie scalony, zmieniony przez obie strony”: plik czeka, aż rozwiążesz konflikt.'),
                setup='git-lab', prepare=CONFLICT, context=['cat index.html']),
        task(T('The merge of the branch title stopped on a conflict in index.html. Keep the title "Hello from the team!", remove the markers and finish the merge.', 'Слияние ветки title остановилось на конфликте в index.html. Оставьте заголовок «Hello from the team!», уберите маркеры и завершите слияние.', 'Злиття гілки title зупинилося на конфлікті в index.html. Лишіть заголовок «Hello from the team!», приберіть маркери й завершіть злиття.', 'Scalanie gałęzi title zatrzymało się na konflikcie w index.html. Zostaw tytuł „Hello from the team!”, usuń znaczniki i zakończ scalanie.'),
             [fnot('~/project/index.html', T('No conflict markers left', 'Маркеров конфликта не осталось', 'Маркерів конфлікту не лишилося', 'Nie ma już znaczników konfliktu'), regex='^(<<<<<<<|=======|>>>>>>>)'),
              fcontains('~/project/index.html', T('The team title is kept', 'Командный заголовок сохранён', 'Командний заголовок збережено', 'Tytuł zespołu został'), text='Hello from the team!'),
              git('~/project', T('The merge is finished', 'Слияние завершено', 'Злиття завершено', 'Scalanie zakończone'), merging=False, merged='title')],
             T('Edit with nano index.html (or sed), then git add index.html and git commit', 'Отредактируйте nano index.html (или sed), затем git add index.html и git commit', 'Відредагуйте nano index.html (або sed), потім git add index.html і git commit', 'Popraw przez nano index.html (lub sed), potem git add index.html i git commit'), 'git add',
             ['sed -i "/^<<<<<<< /d; /^=======$/d; /^>>>>>>> /d; /Hi there!/d" index.html', 'git add index.html', 'git commit -m "Merge title"'], prepare=CONFLICT),
        quiz(T('What does `git merge --abort` do in the middle of a conflict?', 'Что делает `git merge --abort` посреди конфликта?', 'Що робить `git merge --abort` посеред конфлікту?', 'Co robi `git merge --abort` w trakcie konfliktu?'),
             [T('Cancels the merge and returns the files to the state before it', 'Отменяет слияние и возвращает файлы в состояние до него', 'Скасовує злиття й повертає файли до стану перед ним', 'Anuluje scalanie i przywraca pliki do stanu sprzed niego'),
              T('Keeps your version of every conflicting file', 'Оставляет вашу версию каждого конфликтного файла', 'Лишає вашу версію кожного конфліктного файлу', 'Zostawia twoją wersję każdego pliku w konflikcie'),
              T('Deletes the other branch', 'Удаляет другую ветку', 'Видаляє іншу гілку', 'Usuwa drugą gałąź')], 0),
    ]),
]

module('22-git-branches.json', 'git-branches', '/git/branches', 'git-merge',
       T('Branches and merging', 'Ветки и слияние', 'Гілки та злиття', 'Gałęzie i scalanie'),
       T('Work on ideas safely, merge them and resolve conflicts', 'Безопасно работайте над идеями, сливайте их и разрешайте конфликты', 'Безпечно працюйте над ідеями, зливайте їх і розв’язуйте конфлікти', 'Bezpiecznie pracuj nad pomysłami, scalaj je i rozwiązuj konflikty'), branches)

# ------------------------------------------------------------------ module 3: GitHub

COLLEAGUE = ['cd ~', 'git clone -q https://github.com/student/site.git /tmp/anna 2>/dev/null', 'cd /tmp/anna', 'echo "<footer>© 2026</footer>" >> index.html', 'git -c user.name=Anna -c user.email=anna@example.com commit -qam "Add footer"', 'git push -q 2>/dev/null', 'cd ~/project']

github_lessons = [
    lesson('gh-remote', T('Your repository on GitHub', 'Ваш репозиторий на GitHub', 'Ваш репозиторій на GitHub', 'Twoje repozytorium na GitHubie'), ['git', 'gh'], setup='git-lab', steps=[
        theory(T(
"""## A copy on the server
GitHub keeps a copy of your repository: a backup, a place to share code and to work as a team. Steps:
1. create an empty repository on github.com (or `gh repo create site --public` in the terminal)
2. connect it: `git remote add origin https://github.com/student/site.git`
3. send your commits: `git push -u origin main`
```
$ git remote -v
$ git push -u origin main
$ git status
```
- **origin** is just the conventional name of the main remote
- `-u` remembers that local `main` goes to `origin/main`; afterwards plain `git push` and `git pull` are enough
- `git status` now says *Your branch is up to date with 'origin/main'* — or *ahead by N commits* when you have unpushed work

> In the trainer GitHub is simulated: `gh` and `git push` talk to a pretend github.com on this machine. On a real computer you would log in once with `gh auth login`.""",
"""## Копия на сервере
GitHub хранит копию вашего репозитория: резерв, место, где делятся кодом и работают командой. Шаги:
1. создать пустой репозиторий на github.com (или `gh repo create site --public` в терминале)
2. подключить его: `git remote add origin https://github.com/student/site.git`
3. отправить коммиты: `git push -u origin main`
```
$ git remote -v
$ git push -u origin main
$ git status
```
- **origin** — просто общепринятое имя основного удалённого репозитория
- `-u` запоминает, что локальная `main` идёт в `origin/main`; дальше хватает просто `git push` и `git pull`
- `git status` теперь пишет *Your branch is up to date with 'origin/main'* — или *ahead by N commits*, если есть неотправленная работа

> В тренажёре GitHub симулирован: `gh` и `git push` общаются с ненастоящим github.com на этой машине. На реальном компьютере один раз входят через `gh auth login`.""",
"""## Копія на сервері
GitHub зберігає копію вашого репозиторію: резерв, місце, де діляться кодом і працюють командою. Кроки:
1. створити порожній репозиторій на github.com (або `gh repo create site --public` у терміналі)
2. підключити його: `git remote add origin https://github.com/student/site.git`
3. надіслати коміти: `git push -u origin main`
```
$ git remote -v
$ git push -u origin main
$ git status
```
- **origin** — просто загальноприйнята назва основного віддаленого репозиторію
- `-u` запам’ятовує, що локальна `main` іде в `origin/main`; далі вистачає просто `git push` і `git pull`
- `git status` тепер пише *Your branch is up to date with 'origin/main'* — або *ahead by N commits*, якщо є ненадіслана робота

> У тренажері GitHub симульовано: `gh` і `git push` спілкуються з несправжнім github.com на цій машині. На реальному комп’ютері один раз входять через `gh auth login`.""",
"""## Kopia na serwerze
GitHub przechowuje kopię twojego repozytorium: zapas, miejsce do dzielenia się kodem i pracy zespołowej. Kroki:
1. utwórz puste repozytorium na github.com (albo `gh repo create site --public` w terminalu)
2. podłącz je: `git remote add origin https://github.com/student/site.git`
3. wyślij commity: `git push -u origin main`
```
$ git remote -v
$ git push -u origin main
$ git status
```
- **origin** to po prostu przyjęta nazwa głównego zdalnego repozytorium
- `-u` zapamiętuje, że lokalna `main` idzie do `origin/main`; potem wystarczy samo `git push` i `git pull`
- `git status` pisze teraz *Your branch is up to date with 'origin/main'* — albo *ahead by N commits*, gdy masz niewysłaną pracę

> W trenażerze GitHub jest symulowany: `gh` i `git push` rozmawiają z udawanym github.com na tej maszynie. Na prawdziwym komputerze logujesz się raz przez `gh auth login`."""),
            title=T('remote and push', 'remote и push', 'remote і push', 'remote i push'), terminal=False),
        task(T('Publish ~/project: create the public GitHub repository site, connect it as origin and push main so that later a plain git push works.', 'Опубликуйте ~/project: создайте публичный репозиторий site на GitHub, подключите его как origin и отправьте main так, чтобы потом работал просто git push.', 'Опублікуйте ~/project: створіть публічний репозиторій site на GitHub, підключіть його як origin і надішліть main так, щоб потім працював просто git push.', 'Opublikuj ~/project: utwórz publiczne repozytorium site na GitHubie, podłącz je jako origin i wyślij main tak, by potem działało samo git push.'),
             [github('site', T('The repository site exists on GitHub', 'Репозиторий site есть на GitHub', 'Репозиторій site є на GitHub', 'Repozytorium site istnieje na GitHubie')),
              git('~/project', T('origin is connected', 'origin подключён', 'origin підключено', 'origin jest podłączony'), remote='origin'),
              git('~/project', T('main is pushed and tracks origin/main', 'main отправлена и связана с origin/main', 'main надіслано й пов’язано з origin/main', 'main jest wysłana i śledzi origin/main'), pushed='main'),
              github('site', T('GitHub has all 3 commits', 'На GitHub все 3 коммита', 'На GitHub усі 3 коміти', 'GitHub ma wszystkie 3 commity'), commits=3, file='index.html')],
             T('gh repo create site --public; git remote add origin https://github.com/student/site.git; git push -u origin main', 'gh repo create site --public; git remote add origin https://github.com/student/site.git; git push -u origin main', 'gh repo create site --public; git remote add origin https://github.com/student/site.git; git push -u origin main', 'gh repo create site --public; git remote add origin https://github.com/student/site.git; git push -u origin main'), 'git push -u',
             ['gh repo create site --public', 'git remote add origin https://github.com/student/site.git', 'git push -u origin main'], prepare=REPO),
        task(T('Commit any change to notes.txt and send it to GitHub.', 'Закоммитьте любое изменение в notes.txt и отправьте его на GitHub.', 'Закомітьте будь-яку зміну в notes.txt і надішліть її на GitHub.', 'Zatwierdź dowolną zmianę w notes.txt i wyślij ją na GitHuba.'),
             [git('~/project', T('A new commit', 'Новый коммит', 'Новий коміт', 'Nowy commit'), commits=4),
              git('~/project', T('Pushed: up to date with origin/main', 'Отправлено: совпадает с origin/main', 'Надіслано: збігається з origin/main', 'Wysłane: zgodne z origin/main'), pushed='main'),
              github('site', T('GitHub has 4 commits', 'На GitHub 4 коммита', 'На GitHub 4 коміти', 'GitHub ma 4 commity'), commits=4)],
             T('git add notes.txt, git commit -m …, then just git push (the upstream is remembered)', 'git add notes.txt, git commit -m …, затем просто git push (upstream запомнен)', 'git add notes.txt, git commit -m …, потім просто git push (upstream запам’ятовано)', 'git add notes.txt, git commit -m …, potem samo git push (upstream jest zapamiętany)'), 'git push',
             ['echo "- blog" >> notes.txt', 'git add notes.txt', 'git commit -m "Add notes"', 'git push'], prepare=PUBLISHED),
        quiz(T('`git status` says "Your branch is ahead of \'origin/main\' by 2 commits". What does it mean?', '`git status` пишет «Your branch is ahead of \'origin/main\' by 2 commits». Что это значит?', '`git status` пише «Your branch is ahead of \'origin/main\' by 2 commits». Що це означає?', '`git status` pisze „Your branch is ahead of \'origin/main\' by 2 commits”. Co to znaczy?'),
             [T('You have 2 local commits that are not on GitHub yet — run git push', 'У вас 2 локальных коммита, которых ещё нет на GitHub, — нужен git push', 'У вас 2 локальні коміти, яких ще немає на GitHub, — потрібен git push', 'Masz 2 lokalne commity, których jeszcze nie ma na GitHubie — uruchom git push'),
              T('GitHub has 2 commits you do not have — run git pull', 'На GitHub 2 коммита, которых нет у вас, — нужен git pull', 'На GitHub 2 коміти, яких немає у вас, — потрібен git pull', 'GitHub ma 2 commity, których ty nie masz — uruchom git pull'),
              T('2 files are not committed', '2 файла не закоммичены', '2 файли не закомічено', '2 pliki nie są zatwierdzone')], 0),
    ]),

    lesson('gh-clone-pull', T('Clone and pull: working together', 'Clone и pull: работа вместе', 'Clone і pull: робота разом', 'Clone i pull: praca razem'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## Get someone's repository
```
$ git clone https://github.com/student/site.git
$ cd site
```
`clone` downloads the whole history, sets up `origin` and checks out `main`.

## Stay up to date
Teammates push too. Before you start working:
```
$ git pull
```
`pull` = `fetch` (download new commits) + `merge` (join them into your branch).

## Rejected push
If someone pushed while you were working, your push is refused:
```
 ! [rejected]        main -> main (fetch first)
```
Nothing is broken: run `git pull` (resolve conflicts if any), then `git push` again.

> Never "fix" a rejected push with `git push --force` on a shared branch: it deletes your teammates' commits from GitHub.""",
"""## Получить чужой репозиторий
```
$ git clone https://github.com/student/site.git
$ cd site
```
`clone` скачивает всю историю, настраивает `origin` и разворачивает `main`.

## Будьте в курсе
Коллеги тоже делают push. Перед началом работы:
```
$ git pull
```
`pull` = `fetch` (скачать новые коммиты) + `merge` (влить их в вашу ветку).

## Отклонённый push
Если кто-то отправил коммиты, пока вы работали, ваш push отклонят:
```
 ! [rejected]        main -> main (fetch first)
```
Ничего не сломано: выполните `git pull` (разрешите конфликты, если будут), затем снова `git push`.

> Никогда не «чините» отклонённый push через `git push --force` в общей ветке: так вы сотрёте коммиты коллег с GitHub.""",
"""## Отримати чужий репозиторій
```
$ git clone https://github.com/student/site.git
$ cd site
```
`clone` завантажує всю історію, налаштовує `origin` і розгортає `main`.

## Будьте в курсі
Колеги теж роблять push. Перед початком роботи:
```
$ git pull
```
`pull` = `fetch` (завантажити нові коміти) + `merge` (влити їх у вашу гілку).

## Відхилений push
Якщо хтось надіслав коміти, поки ви працювали, ваш push відхилять:
```
 ! [rejected]        main -> main (fetch first)
```
Нічого не зламано: виконайте `git pull` (розв’яжіть конфлікти, якщо будуть), потім знову `git push`.

> Ніколи не «лагодьте» відхилений push через `git push --force` у спільній гілці: так ви зітрете коміти колег з GitHub.""",
"""## Pobierz cudze repozytorium
```
$ git clone https://github.com/student/site.git
$ cd site
```
`clone` pobiera całą historię, ustawia `origin` i rozpakowuje `main`.

## Bądź na bieżąco
Koledzy też robią push. Zanim zaczniesz pracę:
```
$ git pull
```
`pull` = `fetch` (pobierz nowe commity) + `merge` (scal je z twoją gałęzią).

## Odrzucony push
Jeśli ktoś wysłał commity w trakcie twojej pracy, twój push zostanie odrzucony:
```
 ! [rejected]        main -> main (fetch first)
```
Nic się nie zepsuło: wykonaj `git pull` (rozwiąż ewentualne konflikty), potem znów `git push`.

> Nigdy nie „naprawiaj” odrzuconego pusha przez `git push --force` na wspólnej gałęzi: usuniesz commity kolegów z GitHuba."""),
            title=T('clone, pull, rejected push', 'clone, pull, отклонённый push', 'clone, pull, відхилений push', 'clone, pull, odrzucony push'), terminal=False),
        task(T('Clone the GitHub repository student/site into ~/site-copy.', 'Склонируйте репозиторий student/site с GitHub в ~/site-copy.', 'Склонуйте репозиторій student/site з GitHub у ~/site-copy.', 'Sklonuj repozytorium student/site z GitHuba do ~/site-copy.'),
             [git('~/site-copy', T('~/site-copy is a repository', '~/site-copy — репозиторий', '~/site-copy — репозиторій', '~/site-copy to repozytorium'), commits=3, remote='origin'),
              fexists('~/site-copy/index.html', T('The files are there', 'Файлы на месте', 'Файли на місці', 'Pliki są na miejscu'))],
             T('git clone URL DIRECTORY (the URL is https://github.com/student/site.git)', 'git clone URL ПАПКА (URL — https://github.com/student/site.git)', 'git clone URL ТЕКА (URL — https://github.com/student/site.git)', 'git clone URL KATALOG (URL to https://github.com/student/site.git)'), 'git clone',
             ['cd ~', 'git clone https://github.com/student/site.git site-copy'], prepare=PUBLISHED + ['cd ~']),
        task(T('Anna pushed a footer to GitHub. Bring her commit into your ~/project.', 'Анна отправила на GitHub подвал сайта. Заберите её коммит в свой ~/project.', 'Анна надіслала на GitHub підвал сайту. Заберіть її коміт у свій ~/project.', 'Anna wysłała na GitHuba stopkę strony. Ściągnij jej commit do swojego ~/project.'),
             [fcontains('~/project/index.html', T('The footer is in index.html', 'Подвал есть в index.html', 'Підвал є в index.html', 'Stopka jest w index.html'), text='<footer>'),
              git('~/project', T('Up to date with origin/main', 'Совпадает с origin/main', 'Збігається з origin/main', 'Zgodne z origin/main'), pushed='main', commits=4)],
             T('One command: fetch + merge', 'Одна команда: fetch + merge', 'Одна команда: fetch + merge', 'Jedno polecenie: fetch + merge'), 'git pull', ['git pull'], prepare=PUBLISHED + COLLEAGUE),
        task(T('You committed a change to notes.txt, but git push is rejected: Anna pushed first. Get her work and publish yours.', 'Вы закоммитили изменение в notes.txt, но git push отклонён: Анна отправила раньше. Заберите её работу и опубликуйте свою.', 'Ви закомітили зміну в notes.txt, але git push відхилено: Анна надіслала раніше. Заберіть її роботу й опублікуйте свою.', 'Zatwierdziłeś zmianę w notes.txt, ale git push został odrzucony: Anna wysłała wcześniej. Pobierz jej pracę i opublikuj swoją.'),
             [fcontains('~/project/index.html', T("Anna's footer is here", 'Подвал Анны у вас', 'Підвал Анни у вас', 'Stopka Anny jest u ciebie'), text='<footer>'),
              git('~/project', T('Your branch is pushed', 'Ваша ветка отправлена', 'Вашу гілку надіслано', 'Twoja gałąź jest wysłana'), pushed='main'),
              github('site', T('GitHub has both commits', 'На GitHub оба коммита', 'На GitHub обидва коміти', 'GitHub ma oba commity'), commits=6)],
             T('git pull, then git push', 'git pull, затем git push', 'git pull, потім git push', 'git pull, potem git push'), 'git pull', ['git pull', 'git push'],
             prepare=PUBLISHED + COLLEAGUE + ['echo "- blog" >> notes.txt', 'git commit -qam "Add notes"']),
        quiz(T('Your push was rejected (fetch first). A colleague suggests `git push --force`. Why is it a bad idea?', 'Ваш push отклонён (fetch first). Коллега советует `git push --force`. Почему это плохая идея?', 'Ваш push відхилено (fetch first). Колега радить `git push --force`. Чому це погана ідея?', 'Twój push odrzucono (fetch first). Kolega radzi `git push --force`. Dlaczego to zły pomysł?'),
             [T('It overwrites the branch on GitHub and deletes the commits others pushed', 'Он перезапишет ветку на GitHub и удалит коммиты, отправленные другими', 'Він перезапише гілку на GitHub і видалить коміти, надіслані іншими', 'Nadpisze gałąź na GitHubie i usunie commity wysłane przez innych'),
              T('It is slower than a normal push', 'Он медленнее обычного push', 'Він повільніший за звичайний push', 'Jest wolniejszy niż zwykły push'),
              T('It works only for the repository owner', 'Он работает только у владельца репозитория', 'Він працює лише у власника репозиторію', 'Działa tylko dla właściciela repozytorium')], 0),
    ]),

    lesson('gh-pr', T('Pull requests', 'Pull request’ы', 'Pull request’и', 'Pull requesty'), ['git', 'gh'], setup='git-lab', steps=[
        theory(T(
"""## Propose, review, merge
In a team nobody pushes straight to `main`. The **GitHub flow**:
1. `git switch -c contact-page` — a branch for the task
2. commit, then `git push -u origin contact-page`
3. open a **pull request** (PR): "please merge contact-page into main"
4. teammates review the changes, comment, approve; automatic checks (CI) run
5. the PR is merged on GitHub; everybody runs `git pull`

From the terminal:
```
$ gh pr create --title "Add contact page" --body "Closes #3"
$ gh pr list
$ gh pr view 1
$ gh pr merge 1 --merge --delete-branch
```
| merge option | result in main |
|---|---|
| `--merge` | all commits of the branch + a merge commit |
| `--squash` | the whole PR as one commit |
| `--rebase` | the commits are replayed on top of main, no merge commit |

> A PR is a conversation about a change. Small PRs get reviewed fast; huge ones wait for days.""",
"""## Предложить, обсудить, слить
В команде никто не пушит прямо в `main`. **GitHub flow**:
1. `git switch -c contact-page` — ветка под задачу
2. коммиты, затем `git push -u origin contact-page`
3. открыть **pull request** (PR): «пожалуйста, влейте contact-page в main»
4. коллеги смотрят изменения, комментируют, одобряют; запускаются автоматические проверки (CI)
5. PR сливают на GitHub; все делают `git pull`

Из терминала:
```
$ gh pr create --title "Add contact page" --body "Closes #3"
$ gh pr list
$ gh pr view 1
$ gh pr merge 1 --merge --delete-branch
```
| вариант слияния | что получится в main |
|---|---|
| `--merge` | все коммиты ветки + коммит слияния |
| `--squash` | весь PR одним коммитом |
| `--rebase` | коммиты переигрываются поверх main, без коммита слияния |

> PR — это разговор об изменении. Маленькие PR проверяют быстро, огромные ждут днями.""",
"""## Запропонувати, обговорити, злити
У команді ніхто не пушить просто в `main`. **GitHub flow**:
1. `git switch -c contact-page` — гілка під завдання
2. коміти, потім `git push -u origin contact-page`
3. відкрити **pull request** (PR): «будь ласка, влийте contact-page у main»
4. колеги переглядають зміни, коментують, схвалюють; запускаються автоматичні перевірки (CI)
5. PR зливають на GitHub; усі роблять `git pull`

З термінала:
```
$ gh pr create --title "Add contact page" --body "Closes #3"
$ gh pr list
$ gh pr view 1
$ gh pr merge 1 --merge --delete-branch
```
| варіант злиття | що вийде в main |
|---|---|
| `--merge` | усі коміти гілки + коміт злиття |
| `--squash` | увесь PR одним комітом |
| `--rebase` | коміти програються поверх main, без коміту злиття |

> PR — це розмова про зміну. Маленькі PR перевіряють швидко, величезні чекають днями.""",
"""## Zaproponuj, omów, scal
W zespole nikt nie wypycha zmian prosto do `main`. **GitHub flow**:
1. `git switch -c contact-page` — gałąź na zadanie
2. commity, potem `git push -u origin contact-page`
3. otwórz **pull request** (PR): „proszę, scalcie contact-page z main”
4. koledzy przeglądają zmiany, komentują, zatwierdzają; uruchamiają się automatyczne testy (CI)
5. PR jest scalany na GitHubie; wszyscy robią `git pull`

Z terminala:
```
$ gh pr create --title "Add contact page" --body "Closes #3"
$ gh pr list
$ gh pr view 1
$ gh pr merge 1 --merge --delete-branch
```
| opcja scalania | wynik w main |
|---|---|
| `--merge` | wszystkie commity gałęzi + commit scalający |
| `--squash` | cały PR jako jeden commit |
| `--rebase` | commity są odtworzone na szczycie main, bez commita scalającego |

> PR to rozmowa o zmianie. Małe PR-y są przeglądane szybko, ogromne czekają dniami."""),
            title=T('GitHub flow', 'GitHub flow', 'GitHub flow', 'GitHub flow'), terminal=False),
        task(T('Make a branch contact-page with contact.html, push it and open a pull request into main.', 'Создайте ветку contact-page с contact.html, отправьте её и откройте pull request в main.', 'Створіть гілку contact-page з contact.html, надішліть її й відкрийте pull request у main.', 'Utwórz gałąź contact-page z contact.html, wyślij ją i otwórz pull request do main.'),
             [git('~/project', T('contact.html is committed on contact-page', 'contact.html закоммичен в contact-page', 'contact.html закомічено в contact-page', 'contact.html jest zatwierdzony na contact-page'), branch='contact-page', head='contact-page', tracked='~/project/contact.html'),
              github('site', T('The branch is on GitHub', 'Ветка есть на GitHub', 'Гілка є на GitHub', 'Gałąź jest na GitHubie'), branch='contact-page'),
              github('site', T('A pull request is open', 'Pull request открыт', 'Pull request відкрито', 'Pull request jest otwarty'), prs=1)],
             T('switch -c, add + commit, git push -u origin contact-page, gh pr create --title "…"', 'switch -c, add + commit, git push -u origin contact-page, gh pr create --title "…"', 'switch -c, add + commit, git push -u origin contact-page, gh pr create --title "…"', 'switch -c, add + commit, git push -u origin contact-page, gh pr create --title "…"'), 'gh pr create',
             ['git switch -c contact-page', 'echo "<h1>Contacts</h1>" > contact.html', 'git add contact.html', 'git commit -m "Add contact page"', 'git push -u origin contact-page', 'gh pr create --title "Add contact page" --body "A page with contacts"'], prepare=PUBLISHED),
        task(T('The review is done. Merge pull request #1 on GitHub, then update your local main.', 'Ревью пройдено. Слейте pull request #1 на GitHub, затем обновите локальную main.', 'Рев’ю пройдено. Злийте pull request #1 на GitHub, потім оновіть локальну main.', 'Przegląd zakończony. Scal pull request #1 na GitHubie, potem zaktualizuj lokalną main.'),
             [github('site', T('PR #1 is merged', 'PR #1 слит', 'PR #1 злито', 'PR #1 jest scalony'), merged=1),
              git('~/project', T('You are on main', 'Вы на main', 'Ви на main', 'Jesteś na main'), head='main'),
              fexists('~/project/contact.html', T('main has contact.html', 'В main есть contact.html', 'У main є contact.html', 'main ma contact.html')),
              git('~/project', T('main is up to date with GitHub', 'main совпадает с GitHub', 'main збігається з GitHub', 'main jest zgodna z GitHubem'), pushed='main')],
             T('gh pr merge 1 --merge, then git switch main and git pull', 'gh pr merge 1 --merge, затем git switch main и git pull', 'gh pr merge 1 --merge, потім git switch main і git pull', 'gh pr merge 1 --merge, potem git switch main i git pull'), 'gh pr merge',
             ['gh pr merge 1 --merge', 'git switch main', 'git pull'],
             prepare=PUBLISHED + ['git switch -qc contact-page 2>/dev/null', 'echo "<h1>Contacts</h1>" > contact.html', 'git add contact.html', 'git commit -qm "Add contact page"', 'git push -qu origin contact-page 2>/dev/null', 'gh pr create --title "Add contact page" --body "Contacts" > /dev/null']),
        quiz(T('Why open a pull request instead of pushing straight to main?', 'Зачем открывать pull request, а не пушить сразу в main?', 'Навіщо відкривати pull request, а не пушити одразу в main?', 'Po co otwierać pull request zamiast wypychać prosto do main?'),
             [T('Teammates and automatic checks review the change before it reaches main', 'Коллеги и автоматические проверки смотрят изменение до того, как оно попадёт в main', 'Колеги й автоматичні перевірки переглядають зміну до того, як вона потрапить у main', 'Koledzy i automatyczne testy sprawdzają zmianę, zanim trafi do main'),
              T('git push to main is impossible', 'git push в main невозможен', 'git push у main неможливий', 'git push do main jest niemożliwy'),
              T('A pull request makes the code run faster', 'Pull request ускоряет код', 'Pull request пришвидшує код', 'Pull request przyspiesza kod')], 0),
        quiz(T('A PR has 12 small "fix typo" commits. Which merge keeps main\'s history tidy with one commit for the whole PR?', 'В PR 12 мелких коммитов «fix typo». Какое слияние сохранит историю main аккуратной — один коммит на весь PR?', 'У PR 12 дрібних комітів «fix typo». Яке злиття збереже історію main охайною — один коміт на весь PR?', 'PR ma 12 drobnych commitów „fix typo”. Które scalanie da w main jeden commit na cały PR?'),
             [T('--squash', '--squash', '--squash', '--squash'), T('--merge', '--merge', '--merge', '--merge'), T('--rebase', '--rebase', '--rebase', '--rebase')], 0),
    ]),

    lesson('gh-team', T('Issues, forks and teamwork', 'Issues, форки и командная работа', 'Issues, форки й командна робота', 'Zgłoszenia, forki i praca zespołowa'), ['gh'], setup='git-lab', steps=[
        reading(T(
"""## Issues — the to-do list of a project
An **issue** is a task, a bug report or an idea with a number: `#3`. Write `Closes #3` in a PR description — the issue closes itself when the PR is merged.
```
$ gh issue create --title "Menu is broken on phones" --body "Steps: …"
$ gh issue list
```

## Forks — contributing to someone else's project
You cannot push to a stranger's repository. Instead:
1. **fork** it — your own copy on GitHub
2. clone your fork, make a branch, push to *your* fork
3. open a PR from your fork to the original repository

## Good habits
| habit | why |
|---|---|
| `git pull` before starting work | fewer conflicts |
| one branch = one task | small, clear PRs |
| commit messages that explain *why* | history you can read in a year |
| `.gitignore` for secrets and build output | nothing private leaks to GitHub |
| protect `main`: changes only via PR | nobody breaks the main line by accident |

## GitHub Actions
Files in `.github/workflows/*.yml` describe automatic jobs: run the tests on every push and PR, build the app, deploy the site. A red ❌ next to a PR means a check failed — read its log before merging.""",
"""## Issues — список дел проекта
**Issue** — задача, сообщение об ошибке или идея с номером: `#3`. Напишите `Closes #3` в описании PR — issue закроется сам, когда PR сольют.
```
$ gh issue create --title "Menu is broken on phones" --body "Steps: …"
$ gh issue list
```

## Форки — вклад в чужой проект
Пушить в чужой репозиторий нельзя. Вместо этого:
1. сделайте **fork** — свою копию на GitHub
2. склонируйте форк, создайте ветку, отправьте в *свой* форк
3. откройте PR из своего форка в исходный репозиторий

## Хорошие привычки
| привычка | зачем |
|---|---|
| `git pull` перед началом работы | меньше конфликтов |
| одна ветка = одна задача | маленькие понятные PR |
| сообщения коммитов объясняют *зачем* | историю можно прочитать и через год |
| `.gitignore` для секретов и сборки | ничего личного не утечёт на GitHub |
| защищённая `main`: изменения только через PR | никто случайно не сломает основную линию |

## GitHub Actions
Файлы в `.github/workflows/*.yml` описывают автоматические задачи: прогнать тесты на каждый push и PR, собрать приложение, выложить сайт. Красный ❌ у PR значит, что проверка упала, — прочитайте её лог до слияния.""",
"""## Issues — список справ проєкту
**Issue** — завдання, повідомлення про помилку чи ідея з номером: `#3`. Напишіть `Closes #3` в описі PR — issue закриється сам, коли PR зіллють.
```
$ gh issue create --title "Menu is broken on phones" --body "Steps: …"
$ gh issue list
```

## Форки — внесок у чужий проєкт
Пушити в чужий репозиторій не можна. Натомість:
1. зробіть **fork** — свою копію на GitHub
2. склонуйте форк, створіть гілку, надішліть у *свій* форк
3. відкрийте PR зі свого форку у вихідний репозиторій

## Добрі звички
| звичка | навіщо |
|---|---|
| `git pull` перед початком роботи | менше конфліктів |
| одна гілка = одне завдання | маленькі зрозумілі PR |
| повідомлення комітів пояснюють *навіщо* | історію можна прочитати й через рік |
| `.gitignore` для секретів і збирання | нічого особистого не витече на GitHub |
| захищена `main`: зміни лише через PR | ніхто випадково не зламає основну лінію |

## GitHub Actions
Файли в `.github/workflows/*.yml` описують автоматичні завдання: прогнати тести на кожен push і PR, зібрати застосунок, викласти сайт. Червоний ❌ біля PR означає, що перевірка впала, — прочитайте її лог до злиття.""",
"""## Zgłoszenia — lista zadań projektu
**Issue** to zadanie, raport o błędzie lub pomysł z numerem: `#3`. Napisz `Closes #3` w opisie PR — zgłoszenie zamknie się samo po scaleniu PR.
```
$ gh issue create --title "Menu is broken on phones" --body "Steps: …"
$ gh issue list
```

## Forki — wkład w cudzy projekt
Nie możesz wypychać do cudzego repozytorium. Zamiast tego:
1. zrób **fork** — własną kopię na GitHubie
2. sklonuj fork, utwórz gałąź, wypchnij do *swojego* forka
3. otwórz PR ze swojego forka do oryginalnego repozytorium

## Dobre nawyki
| nawyk | po co |
|---|---|
| `git pull` przed rozpoczęciem pracy | mniej konfliktów |
| jedna gałąź = jedno zadanie | małe, czytelne PR-y |
| opisy commitów wyjaśniają *dlaczego* | historię da się przeczytać po roku |
| `.gitignore` dla sekretów i wyników budowania | nic prywatnego nie wycieknie na GitHuba |
| chroniona `main`: zmiany tylko przez PR | nikt przypadkiem nie zepsuje głównej linii |

## GitHub Actions
Pliki w `.github/workflows/*.yml` opisują automatyczne zadania: uruchom testy przy każdym pushu i PR, zbuduj aplikację, opublikuj stronę. Czerwony ❌ przy PR oznacza, że test nie przeszedł — przeczytaj jego log przed scaleniem."""),
            title=T('Beyond git', 'Больше, чем git', 'Більше, ніж git', 'Więcej niż git')),
        task(T('Report a bug: create an issue in the site repository with the title "Menu is broken on phones".', 'Сообщите об ошибке: создайте issue в репозитории site с заголовком «Menu is broken on phones».', 'Повідомте про помилку: створіть issue в репозиторії site із заголовком «Menu is broken on phones».', 'Zgłoś błąd: utwórz issue w repozytorium site z tytułem „Menu is broken on phones”.'),
             [github('site', T('An issue exists', 'Issue создан', 'Issue створено', 'Zgłoszenie istnieje'), issues=1), used('gh', T('gh issue create', 'gh issue create', 'gh issue create', 'gh issue create'), args=['issue', 'create'], success=True)],
             T('gh issue create --title "…" --body "…"', 'gh issue create --title "…" --body "…"', 'gh issue create --title "…" --body "…"', 'gh issue create --title "…" --body "…"'), 'gh issue create',
             ['gh issue create --title "Menu is broken on phones" --body "The menu overlaps the logo"'], prepare=PUBLISHED),
        quiz(T('You want to fix a bug in an open-source project where you have no write access. What is the usual way?', 'Хотите исправить ошибку в open-source проекте, куда у вас нет прав на запись. Как обычно поступают?', 'Хочете виправити помилку в open-source проєкті, куди у вас немає прав на запис. Як зазвичай роблять?', 'Chcesz naprawić błąd w projekcie open source, do którego nie masz prawa zapisu. Jak zwykle się to robi?'),
             [T('Fork, push a branch to your fork, open a pull request to the original', 'Сделать fork, отправить ветку в свой форк, открыть pull request в оригинал', 'Зробити fork, надіслати гілку у свій форк, відкрити pull request в оригінал', 'Zrobić fork, wypchnąć gałąź do swojego forka, otworzyć pull request do oryginału'),
              T('Clone it and git push to their main', 'Склонировать и сделать git push в их main', 'Склонувати й зробити git push у їхню main', 'Sklonować i zrobić git push do ich main'),
              T('Send the authors a zip file', 'Отправить авторам zip-архив', 'Надіслати авторам zip-архів', 'Wysłać autorom plik zip')], 0),
        quiz(T('A PR description says "Closes #12". What happens when the PR is merged?', 'В описании PR написано «Closes #12». Что произойдёт при слиянии PR?', 'В описі PR написано «Closes #12». Що станеться під час злиття PR?', 'Opis PR zawiera „Closes #12”. Co się stanie po scaleniu PR?'),
             [T('Issue #12 is closed automatically', 'Issue #12 закроется автоматически', 'Issue #12 закриється автоматично', 'Zgłoszenie #12 zamknie się automatycznie'),
              T('Commit #12 is deleted', 'Удалится коммит #12', 'Видалиться коміт #12', 'Commit #12 zostanie usunięty'),
              T('Nothing, it is just text', 'Ничего, это просто текст', 'Нічого, це просто текст', 'Nic, to tylko tekst')], 0),
    ]),
]

module('23-github.json', 'github', '/git/github', 'github',
       T('Working with GitHub', 'Работа с GitHub', 'Робота з GitHub', 'Praca z GitHubem'),
       T('Remotes, push and pull, pull requests, issues and teamwork', 'Remote, push и pull, pull request’ы, issues и командная работа', 'Remote, push і pull, pull request’и, issues і командна робота', 'Remote, push i pull, pull requesty, zgłoszenia i praca zespołowa'), github_lessons)

# ------------------------------------------------------------------ mission

MISSION = {
    "id": "git-hotfix", "course": "git", "topics": ["gt-branches", "gh-pr", "gh-clone-pull"],
    "title": T('Friday hotfix', 'Хотфикс в пятницу', 'Хотфікс у п’ятницю', 'Piątkowy hotfix'),
    "story": T('17:40, Friday. The site has a typo in the main heading: "Helo!". Anna already pushed a footer to GitHub. Fix the typo the team way: get the latest main, make a branch hotfix, commit, push it, open a pull request and merge it — main on GitHub must have both the fix and the footer.',
               '17:40, пятница. На сайте опечатка в главном заголовке: «Helo!». Анна уже отправила на GitHub подвал. Исправьте опечатку по-командному: заберите свежую main, создайте ветку hotfix, закоммитьте, отправьте, откройте pull request и слейте его — в main на GitHub должны быть и исправление, и подвал.',
               '17:40, п’ятниця. На сайті помилка в головному заголовку: «Helo!». Анна вже надіслала на GitHub підвал. Виправте помилку по-командному: заберіть свіжу main, створіть гілку hotfix, закомітьте, надішліть, відкрийте pull request і злийте його — у main на GitHub мають бути і виправлення, і підвал.',
               '17:40, piątek. Na stronie jest literówka w głównym nagłówku: „Helo!”. Anna wysłała już stopkę na GitHuba. Popraw literówkę zespołowo: pobierz świeżą main, utwórz gałąź hotfix, zatwierdź, wypchnij, otwórz pull request i scal go — main na GitHubie musi mieć i poprawkę, i stopkę.'),
    "difficulty": 2, "requires": "github", "xp": 120, "setup": 'git-lab',
    "prepare": REPO + ['sed -i "s/Hello!/Helo!/" index.html', 'git commit -qam "New heading"', 'gh repo create site --public > /dev/null', 'git remote add origin https://github.com/student/site.git', 'git push -qu origin main 2>/dev/null'] + COLLEAGUE,
    "checks": [
        github('site', T('A pull request was merged on GitHub', 'На GitHub слит pull request', 'На GitHub злито pull request', 'Na GitHubie scalono pull request'), merged=1),
        github('site', T('The branch hotfix was pushed', 'Ветка hotfix отправлена', 'Гілку hotfix надіслано', 'Gałąź hotfix została wypchnięta'), branch='hotfix'),
        git('~/project', T('Your main has the merged result', 'В вашей main результат слияния', 'У вашій main результат злиття', 'Twoja main ma wynik scalenia'), pushed='main', head='main'),
        fcontains('~/project/index.html', T('The heading is fixed', 'Заголовок исправлен', 'Заголовок виправлено', 'Nagłówek poprawiony'), text='<h1>Hello!</h1>'),
        fcontains('~/project/index.html', T("Anna's footer is kept", 'Подвал Анны на месте', 'Підвал Анни на місці', 'Stopka Anny została'), text='<footer>'),
    ],
    "hints": {"direction": T('git pull first; then git switch -c hotfix, sed or nano to fix, commit, git push -u origin hotfix, gh pr create, gh pr merge, git switch main, git pull.', 'Сначала git pull; затем git switch -c hotfix, sed или nano для правки, commit, git push -u origin hotfix, gh pr create, gh pr merge, git switch main, git pull.', 'Спершу git pull; потім git switch -c hotfix, sed або nano для правки, commit, git push -u origin hotfix, gh pr create, gh pr merge, git switch main, git pull.', 'Najpierw git pull; potem git switch -c hotfix, sed lub nano do poprawki, commit, git push -u origin hotfix, gh pr create, gh pr merge, git switch main, git pull.'), "command": "gh pr create"},
    "solution": ['git pull', 'git switch -c hotfix', 'sed -i "s/Helo!/Hello!/" index.html', 'git commit -am "Fix heading typo"', 'git push -u origin hotfix', 'gh pr create --title "Fix heading typo" --body "Helo -> Hello"', 'gh pr merge 1 --merge', 'git switch main', 'git pull'],
}

MP = os.path.join(ROOT, 'missions', 'missions.json')
from git_pro import MISSIONS as PRO_MISSIONS
ms = [m for m in json.load(open(MP)) if m.get('course') != 'git'] + [MISSION] + PRO_MISSIONS
with open(MP, 'w') as f:
    json.dump(ms, f, indent=2, ensure_ascii=False)
    f.write('\n')
print('missions:', len(ms))
