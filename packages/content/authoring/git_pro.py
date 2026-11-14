"""Git & GitHub course, module 4 "Git in practice": stash, tags and releases,
searching history, cherry-pick and amend — and two missions. en/ru/uk/pl.

Imported by git_course.py (which writes missions.json); can also be run alone:

    python3 authoring/git_pro.py && python3 authoring/courses.py && python3 authoring/register.py
"""
from lib import *


def T(en, ru, uk, pl): return L(en, ru, uk, pl)


REPO = ['cd ~/project', 'git init -q', 'git add .', 'git commit -qm "Add home page"', 'echo "h1 { color: teal; }" >> style.css', 'git commit -qam "Teal headings"', 'echo "<p>Welcome to my site.</p>" >> index.html', 'git commit -qam "Welcome text"']
PUBLISHED = REPO + ['gh repo create site --public > /dev/null', 'git remote add origin https://github.com/student/site.git', 'git push -qu origin main 2>/dev/null']
ANNA = lambda msg: f'git -c user.name=Anna -c user.email=anna@example.com commit -qam "{msg}"'
TEAM = REPO + ['echo "<footer>© 2026</footer>" >> index.html', ANNA('Add footer'), 'echo "a { color: teal; }" >> style.css', 'git commit -qam "Teal links"', 'sed -i "s/Welcome to my site./Welcome to our shop!/" index.html', ANNA('New welcome text')]
FEATURE = REPO + ['git switch -qc contact', 'echo "<p>Contact: hello@example.com</p>" > contact.html', 'git add contact.html', 'git commit -qm "Contact page"', 'sed -i "s/Hello!/Hello, world!/" index.html', 'git commit -qam "Fix greeting"', 'git switch -q main']

lessons_ = [
    lesson('gt-stash', T('Put work aside: stash', 'Отложить работу: stash', 'Відкласти роботу: stash', 'Odłóż pracę: stash'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## An urgent task in the middle of your work
You are halfway through a change — and a bug must be fixed right now on a clean tree. Committing half-done work is ugly, throwing it away is a pity. **Stash** puts the changes on a shelf:
```
$ git stash push -m "contact form"
Saved working directory and index state On main: contact form
$ git status
nothing to commit, working tree clean
```
Now fix the bug, commit — and take your work back:
```
$ git stash list
stash@{0}: On main: contact form
$ git stash pop
```
`pop` returns the changes and removes them from the shelf; `apply` returns them and keeps a copy; `drop` throws one entry away.

> The stash is local: it is not pushed to GitHub. Do not keep work there for weeks — make a branch.""",
"""## Срочная задача посреди работы
Вы на середине изменений — а баг нужно чинить прямо сейчас на чистом дереве. Коммитить полуготовое некрасиво, выбрасывать жалко. **Stash** кладёт изменения на полку:
```
$ git stash push -m "contact form"
Saved working directory and index state On main: contact form
$ git status
nothing to commit, working tree clean
```
Теперь чините баг, коммитьте — и забирайте работу обратно:
```
$ git stash list
stash@{0}: On main: contact form
$ git stash pop
```
`pop` возвращает изменения и убирает их с полки; `apply` возвращает и оставляет копию; `drop` выбрасывает одну запись.

> Stash локальный: на GitHub он не уходит. Не храните там работу неделями — сделайте ветку.""",
"""## Термінове завдання посеред роботи
Ви на середині змін — а баг треба лагодити просто зараз на чистому дереві. Комітити напівготове негарно, викидати шкода. **Stash** кладе зміни на полицю:
```
$ git stash push -m "contact form"
Saved working directory and index state On main: contact form
$ git status
nothing to commit, working tree clean
```
Тепер лагодьте баг, комітьте — і забирайте роботу назад:
```
$ git stash list
stash@{0}: On main: contact form
$ git stash pop
```
`pop` повертає зміни й прибирає їх з полиці; `apply` повертає й лишає копію; `drop` викидає один запис.

> Stash локальний: на GitHub він не потрапляє. Не тримайте там роботу тижнями — зробіть гілку.""",
"""## Pilne zadanie w środku pracy
Jesteś w połowie zmian — a błąd trzeba naprawić teraz, na czystym drzewie. Zatwierdzanie niedokończonej pracy jest brzydkie, wyrzucanie — szkoda. **Stash** odkłada zmiany na półkę:
```
$ git stash push -m "contact form"
Saved working directory and index state On main: contact form
$ git status
nothing to commit, working tree clean
```
Teraz napraw błąd, zatwierdź — i zabierz pracę z powrotem:
```
$ git stash list
stash@{0}: On main: contact form
$ git stash pop
```
`pop` przywraca zmiany i zdejmuje je z półki; `apply` przywraca i zostawia kopię; `drop` wyrzuca jeden wpis.

> Stash jest lokalny: nie trafia na GitHuba. Nie trzymaj tam pracy tygodniami — zrób gałąź."""),
            title=T('A shelf for changes', 'Полка для изменений', 'Полиця для змін', 'Półka na zmiany')),
        task(T('You are adding a contact form (index.html is changed). An urgent fix comes in: shelve the change with the message "contact form" so the working tree is clean.', 'Вы добавляете форму обратной связи (index.html изменён). Пришёл срочный фикс: уберите изменение на полку с сообщением «contact form», чтобы рабочее дерево стало чистым.', 'Ви додаєте форму зворотного зв’язку (index.html змінено). Прийшов терміновий фікс: приберіть зміну на полицю з повідомленням «contact form», щоб робоче дерево стало чистим.', 'Dodajesz formularz kontaktowy (index.html jest zmieniony). Przyszła pilna poprawka: odłóż zmianę na półkę z opisem „contact form”, żeby drzewo robocze było czyste.'),
             [git('~/project', T('The working tree is clean', 'Рабочее дерево чистое', 'Робоче дерево чисте', 'Drzewo robocze jest czyste'), clean=True),
              used('git', T('Stashed with a message', 'Отложено с сообщением', 'Відкладено з повідомленням', 'Odłożono z opisem'), args=['stash', 'contact form'], success=True)],
             T('git stash push -m "contact form"', 'git stash push -m "contact form"', 'git stash push -m "contact form"', 'git stash push -m "contact form"'),
             'git stash', ['git stash push -m "contact form"'], prepare=REPO + ['echo "<form></form>" >> index.html']),
        task(T('The fix is done. Bring the contact form back from the stash and leave the shelf empty.', 'Фикс готов. Верните форму из stash и оставьте полку пустой.', 'Фікс готовий. Поверніть форму зі stash і залиште полицю порожньою.', 'Poprawka gotowa. Przywróć formularz ze stash i zostaw półkę pustą.'),
             [fcontains('~/project/index.html', T('The form is back in index.html', 'Форма снова в index.html', 'Форма знову в index.html', 'Formularz wrócił do index.html'), text='<form></form>'),
              used('git', T('Used git stash pop', 'Использован git stash pop', 'Використано git stash pop', 'Użyto git stash pop'), args=['stash', 'pop'], success=True)],
             T('git stash list, then git stash pop', 'git stash list, затем git stash pop', 'git stash list, потім git stash pop', 'git stash list, potem git stash pop'),
             'git stash', ['git stash list', 'git stash pop'],
             prepare=REPO + ['echo "<form></form>" >> index.html', 'git stash push -qm "contact form"', 'sed -i "s/Hello!/Hello, friends!/" index.html', 'git commit -qam "Urgent: friendlier greeting"']),
    ]),

    lesson('gt-tags', T('Tags and releases', 'Теги и релизы', 'Теги й релізи', 'Tagi i wydania'), ['git', 'gh'], setup='git-lab', steps=[
        theory(T(
"""## A name for a version
A commit id like `3e6af08` is hard to remember. A **tag** gives a commit a permanent name — usually a version:
```
$ git tag -a v1.0 -m "First public version"
$ git tag
v1.0
$ git log --oneline --decorate -n 1
```
`-a -m` makes an *annotated* tag with a message — the kind used for releases. Unlike a branch, a tag never moves.

## Tags are not pushed by default
`git push` sends branches only. Send tags explicitly:
```
$ git push origin v1.0
$ git push --tags
```

## A release on GitHub
A **release** is a tag plus a title and notes that users can read:
```
$ gh release create v1.0 --title "Version 1.0" --notes "First public version"
$ gh release list
```
Versions usually follow **SemVer**: `MAJOR.MINOR.PATCH` — 1.4.2 → 1.4.3 for a fix, 1.5.0 for a feature, 2.0.0 for breaking changes.""",
"""## Имя для версии
Id коммита вроде `3e6af08` трудно запомнить. **Тег** даёт коммиту постоянное имя — обычно версию:
```
$ git tag -a v1.0 -m "First public version"
$ git tag
v1.0
$ git log --oneline --decorate -n 1
```
`-a -m` создаёт *аннотированный* тег с сообщением — такие используют для релизов. В отличие от ветки, тег никогда не двигается.

## Теги не отправляются по умолчанию
`git push` отправляет только ветки. Теги нужно отправить явно:
```
$ git push origin v1.0
$ git push --tags
```

## Релиз на GitHub
**Релиз** — это тег плюс заголовок и заметки, которые читают пользователи:
```
$ gh release create v1.0 --title "Version 1.0" --notes "First public version"
$ gh release list
```
Версии обычно следуют **SemVer**: `MAJOR.MINOR.PATCH` — 1.4.2 → 1.4.3 для исправления, 1.5.0 для новой функции, 2.0.0 для несовместимых изменений.""",
"""## Ім’я для версії
Id коміту на кшталт `3e6af08` важко запам’ятати. **Тег** дає коміту постійне ім’я — зазвичай версію:
```
$ git tag -a v1.0 -m "First public version"
$ git tag
v1.0
$ git log --oneline --decorate -n 1
```
`-a -m` створює *анотований* тег з повідомленням — такі використовують для релізів. На відміну від гілки, тег ніколи не рухається.

## Теги не надсилаються за замовчуванням
`git push` надсилає лише гілки. Теги треба надіслати явно:
```
$ git push origin v1.0
$ git push --tags
```

## Реліз на GitHub
**Реліз** — це тег плюс заголовок і нотатки, які читають користувачі:
```
$ gh release create v1.0 --title "Version 1.0" --notes "First public version"
$ gh release list
```
Версії зазвичай дотримуються **SemVer**: `MAJOR.MINOR.PATCH` — 1.4.2 → 1.4.3 для виправлення, 1.5.0 для нової функції, 2.0.0 для несумісних змін.""",
"""## Nazwa dla wersji
Id commita w rodzaju `3e6af08` trudno zapamiętać. **Tag** nadaje commitowi stałą nazwę — zwykle wersję:
```
$ git tag -a v1.0 -m "First public version"
$ git tag
v1.0
$ git log --oneline --decorate -n 1
```
`-a -m` tworzy tag *z opisem* (annotated) — takich używa się do wydań. W odróżnieniu od gałęzi tag nigdy się nie przesuwa.

## Tagi nie są wysyłane domyślnie
`git push` wysyła tylko gałęzie. Tagi trzeba wysłać jawnie:
```
$ git push origin v1.0
$ git push --tags
```

## Wydanie na GitHubie
**Wydanie** (release) to tag plus tytuł i notatki, które czytają użytkownicy:
```
$ gh release create v1.0 --title "Version 1.0" --notes "First public version"
$ gh release list
```
Wersje zwykle stosują **SemVer**: `MAJOR.MINOR.PATCH` — 1.4.2 → 1.4.3 dla poprawki, 1.5.0 dla nowej funkcji, 2.0.0 dla zmian niezgodnych wstecz."""),
            title=T('v1.0', 'v1.0', 'v1.0', 'v1.0')),
        quiz(T('The current version is 2.3.1. You fixed a bug without changing anything else. Which version is next?', 'Текущая версия 2.3.1. Вы исправили баг, больше ничего не меняя. Какая версия следующая?', 'Поточна версія 2.3.1. Ви виправили баг, нічого більше не змінюючи. Яка версія наступна?', 'Obecna wersja to 2.3.1. Naprawiłeś błąd, nic więcej nie zmieniając. Jaka jest następna wersja?'),
             [T('2.3.2', '2.3.2', '2.3.2', '2.3.2'), T('2.4.0', '2.4.0', '2.4.0', '2.4.0'), T('3.0.0', '3.0.0', '3.0.0', '3.0.0')], 0,
             T('A fix bumps PATCH; a new feature — MINOR; a breaking change — MAJOR.', 'Исправление увеличивает PATCH; новая функция — MINOR; несовместимое изменение — MAJOR.', 'Виправлення збільшує PATCH; нова функція — MINOR; несумісна зміна — MAJOR.', 'Poprawka zwiększa PATCH; nowa funkcja — MINOR; zmiana niezgodna — MAJOR.')),
        task(T('Mark the current commit as version v1.0 with an annotated tag (message "First public version").', 'Пометьте текущий коммит как версию v1.0 аннотированным тегом (сообщение «First public version»).', 'Позначте поточний коміт як версію v1.0 анотованим тегом (повідомлення «First public version»).', 'Oznacz bieżący commit jako wersję v1.0 tagiem z opisem („First public version”).'),
             [git('~/project', T('The tag v1.0 exists', 'Тег v1.0 существует', 'Тег v1.0 існує', 'Tag v1.0 istnieje'), tag='v1.0'),
              used('git', T('An annotated tag (-a)', 'Аннотированный тег (-a)', 'Анотований тег (-a)', 'Tag z opisem (-a)'), flags=['-a'], args=['tag'])],
             T('git tag -a v1.0 -m "First public version"', 'git tag -a v1.0 -m "First public version"', 'git tag -a v1.0 -m "First public version"', 'git tag -a v1.0 -m "First public version"'),
             'git tag', ['git tag -a v1.0 -m "First public version"'], prepare=PUBLISHED),
        task(T('Publish the release: send the tag v1.0 to GitHub and create a GitHub release for it.', 'Опубликуйте релиз: отправьте тег v1.0 на GitHub и создайте для него релиз на GitHub.', 'Опублікуйте реліз: надішліть тег v1.0 на GitHub і створіть для нього реліз на GitHub.', 'Opublikuj wydanie: wyślij tag v1.0 na GitHuba i utwórz dla niego wydanie na GitHubie.'),
             [github('site', T('The tag v1.0 is on GitHub', 'Тег v1.0 есть на GitHub', 'Тег v1.0 є на GitHub', 'Tag v1.0 jest na GitHubie'), tag='v1.0'),
              github('site', T('A release v1.0 exists', 'Релиз v1.0 создан', 'Реліз v1.0 створено', 'Wydanie v1.0 istnieje'), release='v1.0'),
              used('git', T('The tag was pushed', 'Тег отправлен через push', 'Тег надіслано через push', 'Tag wypchnięty'), args=['push'], success=True)],
             T('git push origin v1.0 (or --tags), then gh release create v1.0 --title ... --notes ...', 'git push origin v1.0 (или --tags), затем gh release create v1.0 --title ... --notes ...', 'git push origin v1.0 (або --tags), потім gh release create v1.0 --title ... --notes ...', 'git push origin v1.0 (lub --tags), potem gh release create v1.0 --title ... --notes ...'),
             'gh release create', ['git push origin v1.0', 'gh release create v1.0 --title "Version 1.0" --notes "First public version"'], prepare=PUBLISHED + ['git tag -a v1.0 -m "First public version"']),
    ]),

    lesson('gt-search', T('Searching the history', 'Поиск по истории', 'Пошук в історії', 'Szukanie w historii'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## Who changed this and why?
History is a database — ask it questions:
```
$ git log --oneline --grep=footer      # commits whose message mentions "footer"
$ git log --oneline --author=Anna      # commits by Anna
$ git log --oneline -- style.css       # commits that touched style.css
$ git show 3e6af08                     # one commit and its diff
```

## git blame: line by line
```
$ git blame index.html
a1b2c3d4 (Anna    2026-11-14 10:02:11 +0000 5) <footer>© 2026</footer>
```
For every line: the commit, the author, the date and the line number. Found the commit? `git show` it to read *why* the change was made.

> blame is not about blaming people — it is about finding the context of a change.""",
"""## Кто это поменял и зачем?
История — это база данных, задавайте ей вопросы:
```
$ git log --oneline --grep=footer      # коммиты, в сообщении которых есть «footer»
$ git log --oneline --author=Anna      # коммиты Анны
$ git log --oneline -- style.css       # коммиты, менявшие style.css
$ git show 3e6af08                     # один коммит и его diff
```

## git blame: построчно
```
$ git blame index.html
a1b2c3d4 (Anna    2026-11-14 10:02:11 +0000 5) <footer>© 2026</footer>
```
Для каждой строки — коммит, автор, дата и номер строки. Нашли коммит? Сделайте `git show`, чтобы прочитать, *зачем* было изменение.

> blame — не про поиск виноватых, а про контекст изменения.""",
"""## Хто це змінив і навіщо?
Історія — це база даних, ставте їй запитання:
```
$ git log --oneline --grep=footer      # коміти, у повідомленні яких є «footer»
$ git log --oneline --author=Anna      # коміти Анни
$ git log --oneline -- style.css       # коміти, що змінювали style.css
$ git show 3e6af08                     # один коміт і його diff
```

## git blame: порядково
```
$ git blame index.html
a1b2c3d4 (Anna    2026-11-14 10:02:11 +0000 5) <footer>© 2026</footer>
```
Для кожного рядка — коміт, автор, дата й номер рядка. Знайшли коміт? Зробіть `git show`, щоб прочитати, *навіщо* була зміна.

> blame — не про пошук винних, а про контекст зміни.""",
"""## Kto to zmienił i po co?
Historia to baza danych — zadawaj jej pytania:
```
$ git log --oneline --grep=footer      # commity, których opis wspomina „footer”
$ git log --oneline --author=Anna      # commity Anny
$ git log --oneline -- style.css       # commity, które zmieniały style.css
$ git show 3e6af08                     # jeden commit i jego diff
```

## git blame: wiersz po wierszu
```
$ git blame index.html
a1b2c3d4 (Anna    2026-11-14 10:02:11 +0000 5) <footer>© 2026</footer>
```
Dla każdego wiersza: commit, autor, data i numer wiersza. Znalazłeś commit? Zrób `git show`, aby przeczytać, *po co* była zmiana.

> blame nie służy do szukania winnych — tylko do poznania kontekstu zmiany."""),
            title=T('Ask the history', 'Спросите историю', 'Запитайте історію', 'Zapytaj historię')),
        task(T('Show (one line each) only the commits written by Anna.', 'Покажите (по строке на коммит) только коммиты, написанные Анной.', 'Покажіть (по рядку на коміт) лише коміти, написані Анною.', 'Pokaż (jeden wiersz na commit) tylko commity napisane przez Annę.'),
             [used('git', T('git log --author', 'git log --author', 'git log --author', 'git log --author'), args=['log'], success=True),
              lines(T('Exactly Anna’s two commits', 'Ровно два коммита Анны', 'Рівно два коміти Анни', 'Dokładnie dwa commity Anny'), eq=2),
              out(T('Her footer commit is listed', 'В списке её коммит с подвалом', 'У списку її коміт з підвалом', 'Na liście jest jej commit ze stopką'), text='Add footer')],
             T('git log --oneline --author=Anna', 'git log --oneline --author=Anna', 'git log --oneline --author=Anna', 'git log --oneline --author=Anna'),
             'git log', ['git log --oneline --author=Anna'], prepare=TEAM),
        task(T('Who wrote the welcome line "Welcome to our shop!" in index.html? Find it line by line.', 'Кто написал строку приветствия «Welcome to our shop!» в index.html? Найдите построчно.', 'Хто написав рядок привітання «Welcome to our shop!» в index.html? Знайдіть порядково.', 'Kto napisał wiersz powitania „Welcome to our shop!” w index.html? Znajdź wiersz po wierszu.'),
             [used('git', T('Used git blame', 'Использован git blame', 'Використано git blame', 'Użyto git blame'), args=['blame'], success=True),
              out(T('The line is attributed to Anna', 'Строка приписана Анне', 'Рядок приписано Анні', 'Wiersz przypisany Annie'), regex=r'Anna\s.*Welcome to our shop!')],
             T('git blame index.html', 'git blame index.html', 'git blame index.html', 'git blame index.html'),
             'git blame', ['git blame index.html'], prepare=TEAM),
    ]),

    lesson('gt-cherry-amend', T('Cherry-pick and fixing the last commit', 'Cherry-pick и исправление последнего коммита', 'Cherry-pick і виправлення останнього коміту', 'Cherry-pick i poprawianie ostatniego commita'), ['git'], setup='git-lab', steps=[
        theory(T(
"""## A typo in the last commit message
As long as the commit is **not pushed**, rewrite it:
```
$ git commit --amend -m "Fix greeting on the home page"
```
`--amend` replaces the last commit (message and content: stage a forgotten file first, then amend). After a push, do not amend — teammates already have the old commit.

## Take one commit from another branch
The branch `contact` is not ready, but one of its commits fixes a bug you need on `main` today:
```
$ git log --oneline contact
$ git switch main
$ git cherry-pick 1a2b3c4
```
`cherry-pick` copies the change of that commit onto your branch as a new commit. Later, when `contact` is merged, Git sees the same change and does not apply it twice.""",
"""## Опечатка в сообщении последнего коммита
Пока коммит **не отправлен**, перепишите его:
```
$ git commit --amend -m "Fix greeting on the home page"
```
`--amend` заменяет последний коммит (сообщение и содержимое: сначала добавьте забытый файл, затем amend). После push — не меняйте: у коллег уже есть старый коммит.

## Взять один коммит из другой ветки
Ветка `contact` ещё не готова, но один из её коммитов чинит баг, который нужен в `main` уже сегодня:
```
$ git log --oneline contact
$ git switch main
$ git cherry-pick 1a2b3c4
```
`cherry-pick` копирует изменение этого коммита в вашу ветку новым коммитом. Позже, когда `contact` сольют, Git увидит то же изменение и не применит его дважды.""",
"""## Помилка в повідомленні останнього коміту
Доки коміт **не надіслано**, перепишіть його:
```
$ git commit --amend -m "Fix greeting on the home page"
```
`--amend` замінює останній коміт (повідомлення і вміст: спершу додайте забутий файл, потім amend). Після push — не змінюйте: у колег уже є старий коміт.

## Узяти один коміт з іншої гілки
Гілка `contact` ще не готова, але один з її комітів лагодить баг, який потрібен у `main` уже сьогодні:
```
$ git log --oneline contact
$ git switch main
$ git cherry-pick 1a2b3c4
```
`cherry-pick` копіює зміну цього коміту у вашу гілку новим комітом. Пізніше, коли `contact` зіллють, Git побачить ту саму зміну й не застосує її двічі.""",
"""## Literówka w opisie ostatniego commita
Dopóki commit **nie jest wypchnięty**, przepisz go:
```
$ git commit --amend -m "Fix greeting on the home page"
```
`--amend` zastępuje ostatni commit (opis i zawartość: najpierw dodaj zapomniany plik, potem amend). Po push — nie zmieniaj: koledzy mają już stary commit.

## Weź jeden commit z innej gałęzi
Gałąź `contact` nie jest gotowa, ale jeden z jej commitów naprawia błąd potrzebny w `main` już dziś:
```
$ git log --oneline contact
$ git switch main
$ git cherry-pick 1a2b3c4
```
`cherry-pick` kopiuje zmianę tego commita do Twojej gałęzi jako nowy commit. Później, gdy `contact` zostanie scalona, Git zobaczy tę samą zmianę i nie zastosuje jej dwa razy."""),
            title=T('--amend and cherry-pick', '--amend и cherry-pick', '--amend і cherry-pick', '--amend i cherry-pick')),
        quiz(T('You pushed a commit an hour ago and now see a typo in its message. What is the safe way?', 'Вы отправили коммит час назад и заметили опечатку в сообщении. Как поступить безопасно?', 'Ви надіслали коміт годину тому й помітили помилку в повідомленні. Як діяти безпечно?', 'Wypchnąłeś commit godzinę temu i widzisz literówkę w opisie. Jak postąpić bezpiecznie?'),
             [T('Leave it: the commit is already shared', 'Оставить: коммит уже у всех', 'Залишити: коміт уже в усіх', 'Zostawić: commit jest już współdzielony'),
              T('git commit --amend and git push --force', 'git commit --amend и git push --force', 'git commit --amend і git push --force', 'git commit --amend i git push --force'),
              T('Delete the repository and push again', 'Удалить репозиторий и отправить заново', 'Видалити репозиторій і надіслати знову', 'Usunąć repozytorium i wypchnąć ponownie')], 0,
             T('Rewriting pushed history breaks teammates’ copies. A typo is not worth it.', 'Переписывание отправленной истории ломает копии коллег. Опечатка того не стоит.', 'Переписування надісланої історії ламає копії колег. Помилка того не варта.', 'Przepisywanie wypchniętej historii psuje kopie kolegów. Literówka nie jest tego warta.')),
        task(T('The last commit says "Fix greting" (not pushed yet). Correct the message to "Fix greeting" without creating a new commit.', 'В последнем коммите написано «Fix greting» (ещё не отправлен). Исправьте сообщение на «Fix greeting», не создавая нового коммита.', 'В останньому коміті написано «Fix greting» (ще не надіслано). Виправте повідомлення на «Fix greeting», не створюючи нового коміту.', 'Ostatni commit mówi „Fix greting” (jeszcze nie wypchnięty). Popraw opis na „Fix greeting” bez tworzenia nowego commita.'),
             [git('~/project', T('The last commit is "Fix greeting"', 'Последний коммит — «Fix greeting»', 'Останній коміт — «Fix greeting»', 'Ostatni commit to „Fix greeting”'), message='^Fix greeting$'),
              git('~/project', T('Still 4 commits — nothing added', 'Всё ещё 4 коммита — ничего не добавлено', 'Досі 4 коміти — нічого не додано', 'Nadal 4 commity — nic nie dodano'), commits=4),
              used('git', T('Used --amend', 'Использован --amend', 'Використано --amend', 'Użyto --amend'), flags=['--amend'], args=['commit'])],
             T('git commit --amend -m "Fix greeting"', 'git commit --amend -m "Fix greeting"', 'git commit --amend -m "Fix greeting"', 'git commit --amend -m "Fix greeting"'),
             'git commit --amend', ['git commit --amend -m "Fix greeting"'], prepare=REPO + ['sed -i "s/Hello!/Hello, world!/" index.html', 'git commit -qam "Fix greting"']),
        task(T('On main, take only the greeting fix from the unfinished branch contact — without the contact page.', 'В main возьмите из незаконченной ветки contact только исправление приветствия — без страницы контактов.', 'У main візьміть з незавершеної гілки contact лише виправлення привітання — без сторінки контактів.', 'W main weź z niedokończonej gałęzi contact tylko poprawkę powitania — bez strony kontaktowej.'),
             [git('~/project', T('You are on main', 'Вы на main', 'Ви на main', 'Jesteś na main'), head='main'),
              fcontains('~/project/index.html', T('The greeting fix is on main', 'Исправление приветствия в main', 'Виправлення привітання в main', 'Poprawka powitania jest w main'), text='Hello, world!'),
              gone('~/project/contact.html', T('No contact page on main', 'Страницы контактов в main нет', 'Сторінки контактів у main немає', 'Brak strony kontaktowej w main')),
              used('git', T('Used cherry-pick', 'Использован cherry-pick', 'Використано cherry-pick', 'Użyto cherry-pick'), args=['cherry-pick'], success=True)],
             T('git log --oneline contact shows the "Fix greeting" commit; git cherry-pick it on main (contact is the tip, contact~1 the page).', 'git log --oneline contact покажет коммит «Fix greeting»; сделайте git cherry-pick в main (contact — верхушка ветки, contact~1 — страница).', 'git log --oneline contact покаже коміт «Fix greeting»; зробіть git cherry-pick у main (contact — верхівка гілки, contact~1 — сторінка).', 'git log --oneline contact pokaże commit „Fix greeting”; zrób git cherry-pick w main (contact to czubek gałęzi, contact~1 — strona).'),
             'git cherry-pick', ['git log --oneline contact', 'git cherry-pick contact'], prepare=FEATURE),
    ]),
]

module('25-git-pro.json', 'git-pro', '/git/pro', 'git',
       T('Git in practice', 'Git на практике', 'Git на практиці', 'Git w praktyce'),
       T('Stash, tags and releases, searching history, cherry-pick and amend', 'Stash, теги и релизы, поиск по истории, cherry-pick и amend', 'Stash, теги й релізи, пошук в історії, cherry-pick і amend', 'Stash, tagi i wydania, szukanie w historii, cherry-pick i amend'), lessons_)

# ------------------------------------------------------------------ missions

LEAK = REPO + ['printf "DB_PASSWORD=Sup3rS3cret\\nAPI_KEY=sk_live_42\\n" > .env', 'git add .env', 'git commit -qm "Add config"']

MISSIONS = [
    {
        "id": "git-leaked-env", "course": "git", "topics": ["gt-ignore", "gt-undo"],
        "title": T('Secrets in the repo', 'Секреты в репозитории', 'Секрети в репозиторії', 'Sekrety w repozytorium'),
        "story": T('Code review, 16:05. Your last commit "Add config" put .env with a database password into the repository — luckily it is not pushed yet. Stop tracking .env (the file must stay on disk, the app needs it), make Git ignore it from now on, and commit the fix. The working tree must end up clean.',
                   'Код-ревью, 16:05. Ваш последний коммит «Add config» добавил в репозиторий .env с паролем от базы — к счастью, ещё не отправлен. Перестаньте отслеживать .env (файл должен остаться на диске, он нужен приложению), сделайте так, чтобы Git его игнорировал, и закоммитьте исправление. Рабочее дерево в итоге должно быть чистым.',
                   'Код-рев’ю, 16:05. Ваш останній коміт «Add config» додав у репозиторій .env з паролем від бази — на щастя, ще не надісланий. Перестаньте відстежувати .env (файл має лишитися на диску, він потрібен застосунку), зробіть так, щоб Git його ігнорував, і закомітьте виправлення. Робоче дерево зрештою має бути чистим.',
                   'Code review, 16:05. Twój ostatni commit „Add config” dodał do repozytorium .env z hasłem do bazy — na szczęście jeszcze nie wypchnięty. Przestań śledzić .env (plik musi zostać na dysku, aplikacja go potrzebuje), spraw, by Git go ignorował, i zatwierdź poprawkę. Na koniec drzewo robocze ma być czyste.'),
        "difficulty": 2, "requires": "git-pro", "xp": 120, "setup": 'git-lab', "prepare": LEAK,
        "checks": [
            fexists('~/project/.env', T('.env is still on disk', '.env остался на диске', '.env лишився на диску', '.env nadal jest na dysku')),
            git('~/project', T('.env is no longer tracked', '.env больше не отслеживается', '.env більше не відстежується', '.env nie jest już śledzony'), untracked='.env'),
            git('~/project', T('.env is ignored', '.env игнорируется', '.env ігнорується', '.env jest ignorowany'), ignored='.env'),
            git('~/project', T('The fix is committed, the tree is clean', 'Исправление закоммичено, дерево чистое', 'Виправлення закомічено, дерево чисте', 'Poprawka zatwierdzona, drzewo czyste'), clean=True),
        ],
        "hints": {"direction": T('git rm --cached .env keeps the file; echo .env >> .gitignore; git add .gitignore; git commit.', 'git rm --cached .env оставит файл; echo .env >> .gitignore; git add .gitignore; git commit.', 'git rm --cached .env залишить файл; echo .env >> .gitignore; git add .gitignore; git commit.', 'git rm --cached .env zostawi plik; echo .env >> .gitignore; git add .gitignore; git commit.'), "command": "git rm"},
        "solution": ['git show --stat', 'git rm --cached .env', 'echo .env >> .gitignore', 'git add .gitignore', 'git commit -m "Stop tracking .env"', 'git status'],
    },
    {
        "id": "git-release-day", "course": "git", "topics": ["gt-tags", "gt-cherry-amend"],
        "title": T('Release day', 'День релиза', 'День релізу', 'Dzień wydania'),
        "story": T('Thursday, 11:00 — release 1.1.0. The greeting fix lives on the unfinished branch contact; it must ship today, the contact page must not. Bring just that fix to main, push main, tag it v1.1.0, push the tag and publish a GitHub release v1.1.0.',
                   'Четверг, 11:00 — релиз 1.1.0. Исправление приветствия лежит в незаконченной ветке contact; оно должно уйти сегодня, а страница контактов — нет. Перенесите в main только это исправление, отправьте main, поставьте тег v1.1.0, отправьте тег и опубликуйте релиз v1.1.0 на GitHub.',
                   'Четвер, 11:00 — реліз 1.1.0. Виправлення привітання лежить у незавершеній гілці contact; воно має піти сьогодні, а сторінка контактів — ні. Перенесіть у main лише це виправлення, надішліть main, поставте тег v1.1.0, надішліть тег і опублікуйте реліз v1.1.0 на GitHub.',
                   'Czwartek, 11:00 — wydanie 1.1.0. Poprawka powitania jest w niedokończonej gałęzi contact; musi wyjść dziś, a strona kontaktowa — nie. Przenieś do main tylko tę poprawkę, wypchnij main, oznacz tagiem v1.1.0, wypchnij tag i opublikuj wydanie v1.1.0 na GitHubie.'),
        "difficulty": 3, "requires": "git-pro", "xp": 150, "setup": 'git-lab',
        "prepare": FEATURE + ['gh repo create site --public > /dev/null', 'git remote add origin https://github.com/student/site.git', 'git push -qu origin main 2>/dev/null'],
        "checks": [
            github('site', T('main on GitHub has the greeting fix', 'В main на GitHub есть исправление приветствия', 'У main на GitHub є виправлення привітання', 'main na GitHubie ma poprawkę powitania'), file='index.html', fileContains='Hello, world!'),
            github('site', T('The tag v1.1.0 is on GitHub', 'Тег v1.1.0 на GitHub', 'Тег v1.1.0 на GitHub', 'Tag v1.1.0 jest na GitHubie'), tag='v1.1.0'),
            github('site', T('The release v1.1.0 is published', 'Релиз v1.1.0 опубликован', 'Реліз v1.1.0 опубліковано', 'Wydanie v1.1.0 opublikowane'), release='v1.1.0'),
            gone('~/project/contact.html', T('The contact page did not ship', 'Страница контактов не попала в релиз', 'Сторінка контактів не потрапила в реліз', 'Strona kontaktowa nie weszła do wydania')),
            git('~/project', T('Local main is pushed', 'Локальная main отправлена', 'Локальну main надіслано', 'Lokalna main wypchnięta'), pushed='main', head='main'),
        ],
        "hints": {"direction": T('git log --oneline contact; git cherry-pick the fix; git push; git tag -a v1.1.0 -m ...; git push origin v1.1.0; gh release create v1.1.0.', 'git log --oneline contact; git cherry-pick исправления; git push; git tag -a v1.1.0 -m ...; git push origin v1.1.0; gh release create v1.1.0.', 'git log --oneline contact; git cherry-pick виправлення; git push; git tag -a v1.1.0 -m ...; git push origin v1.1.0; gh release create v1.1.0.', 'git log --oneline contact; git cherry-pick poprawki; git push; git tag -a v1.1.0 -m ...; git push origin v1.1.0; gh release create v1.1.0.'), "command": "git cherry-pick"},
        "solution": ['git log --oneline contact', 'git cherry-pick contact', 'git push', 'git tag -a v1.1.0 -m "Release 1.1.0"', 'git push origin v1.1.0', 'gh release create v1.1.0 --title "1.1.0" --notes "Greeting fix"'],
    },
]
