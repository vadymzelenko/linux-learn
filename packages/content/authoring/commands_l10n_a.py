# Command summaries and option texts, part A: files, text, search. (ru, uk, pl)
S = {}
O = {}
def cmd(name, ru, uk, pl, *opts):
    S[name] = {"ru": ru, "uk": uk, "pl": pl}
    O[name] = {spec: {"ru": r, "uk": u, "pl": p} for spec, r, u, p in opts}

cmd('cd', 'сменить текущую директорию', 'змінити поточну директорію', 'zmień bieżący katalog',
    ('-L', 'следовать символическим ссылкам логически (по умолчанию)', 'слідувати символьним посиланням логічно (за замовчуванням)', 'podążaj za dowiązaniami logicznie (domyślnie)'),
    ('-P', 'использовать физическую структуру каталогов', 'використовувати фізичну структуру каталогів', 'użyj fizycznej struktury katalogów'))
cmd('ls', 'показать содержимое директории', 'показати вміст директорії', 'wyświetl zawartość katalogu',
    ('-a, --all', 'показывать и скрытые файлы (имена с точки)', 'показувати й приховані файли (імена з крапки)', 'pokazuj też ukryte pliki (nazwy z kropką)'),
    ('-A, --almost-all', 'скрытые файлы, но без . и ..', 'приховані файли, але без . і ..', 'ukryte pliki, ale bez . i ..'),
    ('-d, --directory', 'показать саму директорию, а не её содержимое', 'показати саму директорію, а не її вміст', 'pokaż sam katalog, nie jego zawartość'),
    ('-F, --classify', 'добавить значок типа (*/@) к именам', 'додати значок типу (*/@) до імен', 'dodaj znacznik typu (*/@) do nazw'),
    ('-h, --human-readable', 'с -l: размеры в понятном виде (1K 234M 2G)', 'з -l: розміри у зрозумілому вигляді (1K 234M 2G)', 'z -l: rozmiary w czytelnej postaci (1K 234M 2G)'),
    ('-l', 'подробный список: права, владелец, размер, дата', 'докладний список: права, власник, розмір, дата', 'szczegółowa lista: uprawnienia, właściciel, rozmiar, data'),
    ('-r, --reverse', 'обратный порядок сортировки', 'зворотний порядок сортування', 'odwrotna kolejność sortowania'),
    ('-R, --recursive', 'показывать поддиректории рекурсивно', 'показувати піддиректорії рекурсивно', 'pokazuj podkatalogi rekurencyjnie'),
    ('-S', 'сортировать по размеру, крупные первыми', 'сортувати за розміром, великі першими', 'sortuj według rozmiaru, największe najpierw'),
    ('-t', 'сортировать по времени, новые первыми', 'сортувати за часом, нові першими', 'sortuj według czasu, najnowsze najpierw'),
    ('-1', 'по одному файлу в строке', 'по одному файлу в рядку', 'jeden plik w wierszu'),
    ('-C', 'выводить колонками', 'виводити колонками', 'wypisuj w kolumnach'),
    ('--color[=WHEN]', 'раскрашивать вывод: always, auto или never', 'розфарбовувати вивід: always, auto або never', 'koloruj wyjście: always, auto lub never'))
cmd('pwd', 'показать путь текущей директории', 'показати шлях поточної директорії', 'wypisz ścieżkę bieżącego katalogu',
    ('-L', 'вывести значение $PWD (по умолчанию)', 'вивести значення $PWD (за замовчуванням)', 'wypisz wartość $PWD (domyślnie)'),
    ('-P', 'физический путь, без символических ссылок', 'фізичний шлях, без символьних посилань', 'fizyczna ścieżka, bez dowiązań symbolicznych'))
cmd('tree', 'показать директории в виде дерева', 'показати директорії у вигляді дерева', 'pokaż katalogi w postaci drzewa',
    ('-a', 'показывать и скрытые файлы', 'показувати й приховані файли', 'pokazuj też ukryte pliki'),
    ('-d', 'только директории', 'лише директорії', 'tylko katalogi'),
    ('-f', 'печатать полный путь к каждому файлу', 'друкувати повний шлях до кожного файлу', 'wypisuj pełną ścieżkę każdego pliku'),
    ('-L level', 'максимальная глубина дерева', 'максимальна глибина дерева', 'maksymalna głębokość drzewa'),
    ('--noreport', 'не печатать итог (число файлов и папок)', 'не друкувати підсумок (кількість файлів і тек)', 'nie wypisuj podsumowania (liczby plików i katalogów)'))
cmd('cat', 'вывести содержимое файлов (склеить файлы)', 'вивести вміст файлів (склеїти файли)', 'wypisz zawartość plików (połącz pliki)',
    ('-A, --show-all', 'то же, что -vET: показать невидимые символы', 'те саме, що -vET: показати невидимі символи', 'to samo co -vET: pokaż niewidoczne znaki'),
    ('-b, --number-nonblank', 'нумеровать только непустые строки', 'нумерувати лише непорожні рядки', 'numeruj tylko niepuste wiersze'),
    ('-E, --show-ends', 'показывать $ в конце каждой строки', 'показувати $ у кінці кожного рядка', 'pokazuj $ na końcu każdego wiersza'),
    ('-n, --number', 'нумеровать все строки', 'нумерувати всі рядки', 'numeruj wszystkie wiersze'),
    ('-s, --squeeze-blank', 'сжимать повторяющиеся пустые строки', 'стискати повторювані порожні рядки', 'ściskaj powtarzające się puste wiersze'),
    ('-T, --show-tabs', 'показывать табуляции как ^I', 'показувати табуляції як ^I', 'pokazuj tabulatory jako ^I'))
cmd('cp', 'копировать файлы и директории', 'копіювати файли й директорії', 'kopiuj pliki i katalogi',
    ('-a, --archive', 'архивный режим: рекурсивно и с сохранением всех атрибутов', 'архівний режим: рекурсивно й зі збереженням усіх атрибутів', 'tryb archiwum: rekurencyjnie z zachowaniem wszystkich atrybutów'),
    ('-n, --no-clobber', 'не перезаписывать существующий файл', 'не перезаписувати наявний файл', 'nie nadpisuj istniejącego pliku'),
    ('-p', 'сохранить права, владельца и время', 'зберегти права, власника й час', 'zachowaj uprawnienia, właściciela i czas'),
    ('-r, -R, --recursive', 'копировать директории рекурсивно (со всем содержимым)', 'копіювати директорії рекурсивно (з усім вмістом)', 'kopiuj katalogi rekurencyjnie (z całą zawartością)'),
    ('-T, --no-target-directory', 'считать DEST обычным файлом', 'вважати DEST звичайним файлом', 'traktuj DEST jako zwykły plik'),
    ('-v, --verbose', 'рассказывать, что делается', 'розповідати, що робиться', 'opisuj, co jest robione'))
cmd('ln', 'создать ссылку на файл', 'створити посилання на файл', 'utwórz dowiązanie do pliku',
    ('-f, --force', 'удалить существующий файл назначения', 'видалити наявний файл призначення', 'usuń istniejący plik docelowy'),
    ('-s, --symbolic', 'символическая ссылка вместо жёсткой', 'символьне посилання замість жорсткого', 'dowiązanie symboliczne zamiast twardego'),
    ('-v, --verbose', 'печатать имя каждой созданной ссылки', 'друкувати ім’я кожного створеного посилання', 'wypisuj nazwę każdego utworzonego dowiązania'),
    ('-n, --no-dereference', 'не заходить в ссылку на директорию, а заменить её', 'не заходити в посилання на директорію, а замінити його', 'nie wchodź w dowiązanie do katalogu, tylko je zastąp'))
cmd('mkdir', 'создать директории', 'створити директорії', 'utwórz katalogi',
    ('-m, --mode=MODE', 'задать права новой директории (как в chmod)', 'задати права нової директорії (як у chmod)', 'ustaw uprawnienia nowego katalogu (jak w chmod)'),
    ('-p, --parents', 'создать и родительские директории, без ошибки если уже есть', 'створити й батьківські директорії, без помилки якщо вже є', 'utwórz też katalogi nadrzędne, bez błędu jeśli istnieją'),
    ('-v, --verbose', 'сообщать о каждой созданной директории', 'повідомляти про кожну створену директорію', 'informuj o każdym utworzonym katalogu'))
cmd('mv', 'переместить или переименовать файлы', 'перемістити або перейменувати файли', 'przenieś lub zmień nazwę plików',
    ('-f, --force', 'не спрашивать перед перезаписью', 'не питати перед перезаписом', 'nie pytaj przed nadpisaniem'),
    ('-n, --no-clobber', 'не перезаписывать существующий файл', 'не перезаписувати наявний файл', 'nie nadpisuj istniejącego pliku'),
    ('-T, --no-target-directory', 'считать DEST обычным файлом', 'вважати DEST звичайним файлом', 'traktuj DEST jako zwykły plik'),
    ('-v, --verbose', 'рассказывать, что делается', 'розповідати, що робиться', 'opisuj, co jest robione'))
cmd('readlink', 'показать, куда указывает ссылка', 'показати, куди вказує посилання', 'pokaż, dokąd wskazuje dowiązanie',
    ('-f, --canonicalize', 'пройти по всем ссылкам и вывести настоящий путь', 'пройти всіма посиланнями й вивести справжній шлях', 'przejdź przez wszystkie dowiązania i wypisz prawdziwą ścieżkę'))
cmd('realpath', 'показать полный настоящий путь', 'показати повний справжній шлях', 'wypisz pełną prawdziwą ścieżkę')
cmd('rm', 'удалить файлы или директории', 'видалити файли або директорії', 'usuń pliki lub katalogi',
    ('-f, --force', 'не спрашивать и молчать о несуществующих файлах', 'не питати й мовчати про неіснуючі файли', 'nie pytaj i milcz o nieistniejących plikach'),
    ('-r, -R, --recursive', 'удалять директории со всем содержимым', 'видаляти директорії з усім вмістом', 'usuwaj katalogi z całą zawartością'),
    ('-d, --dir', 'удалять пустые директории', 'видаляти порожні директорії', 'usuwaj puste katalogi'),
    ('-v, --verbose', 'рассказывать, что удаляется', 'розповідати, що видаляється', 'opisuj, co jest usuwane'),
    ('--no-preserve-root', 'не защищать корень / (никогда так не делайте)', 'не захищати корінь / (ніколи так не робіть)', 'nie chroń katalogu głównego / (nigdy tego nie rób)'))
cmd('rmdir', 'удалить пустые директории', 'видалити порожні директорії', 'usuń puste katalogi',
    ('-p, --parents', 'удалить директорию и её пустых родителей', 'видалити директорію та її порожніх батьків', 'usuń katalog i jego puste katalogi nadrzędne'),
    ('-v, --verbose', 'сообщать о каждой директории', 'повідомляти про кожну директорію', 'informuj o każdym katalogu'))
cmd('touch', 'создать пустой файл или обновить его время', 'створити порожній файл або оновити його час', 'utwórz pusty plik lub zaktualizuj jego czas',
    ('-c, --no-create', 'не создавать файлы', 'не створювати файли', 'nie twórz plików'))
cmd('cut', 'вырезать колонки (поля) из строк', 'вирізати колонки (поля) з рядків', 'wytnij kolumny (pola) z wierszy',
    ('-c, --characters=LIST', 'выбрать эти символы (позиции)', 'вибрати ці символи (позиції)', 'wybierz te znaki (pozycje)'),
    ('-d, --delimiter=DELIM', 'разделитель полей вместо табуляции', 'роздільник полів замість табуляції', 'separator pól zamiast tabulatora'),
    ('-f, --fields=LIST', 'выбрать эти поля (колонки)', 'вибрати ці поля (колонки)', 'wybierz te pola (kolumny)'),
    ('-s, --only-delimited', 'пропускать строки без разделителя', 'пропускати рядки без роздільника', 'pomijaj wiersze bez separatora'))
cmd('echo', 'вывести строку текста', 'вивести рядок тексту', 'wypisz wiersz tekstu',
    ('-n', 'не добавлять перевод строки в конце', 'не додавати переведення рядка в кінці', 'nie dodawaj nowej linii na końcu'),
    ('-e', 'понимать escape-последовательности (\\n, \\t…)', 'розуміти escape-послідовності (\\n, \\t…)', 'interpretuj sekwencje specjalne (\\n, \\t…)'),
    ('-E', 'не понимать escape-последовательности', 'не розуміти escape-послідовності', 'nie interpretuj sekwencji specjalnych'))
cmd('grep', 'найти строки по шаблону', 'знайти рядки за шаблоном', 'znajdź wiersze pasujące do wzorca',
    ('-E, --extended-regexp', 'расширенные регулярные выражения (|, +, ?)', 'розширені регулярні вирази (|, +, ?)', 'rozszerzone wyrażenia regularne (|, +, ?)'),
    ('-F, --fixed-strings', 'искать как обычный текст, без регулярок', 'шукати як звичайний текст, без регулярок', 'szukaj jako zwykły tekst, bez wyrażeń regularnych'),
    ('-e, --regexp=PATTERNS', 'шаблон для поиска', 'шаблон для пошуку', 'wzorzec do wyszukania'),
    ('-i, --ignore-case', 'не различать регистр букв', 'не розрізняти регістр літер', 'ignoruj wielkość liter'),
    ('-v, --invert-match', 'наоборот: строки, которые НЕ подходят', 'навпаки: рядки, які НЕ підходять', 'odwrotnie: wiersze, które NIE pasują'),
    ('-w, --word-regexp', 'только целые слова', 'лише цілі слова', 'tylko całe słowa'),
    ('-x, --line-regexp', 'только строка целиком', 'лише рядок цілком', 'tylko cały wiersz'),
    ('-c, --count', 'вывести только число найденных строк', 'вивести лише кількість знайдених рядків', 'wypisz tylko liczbę znalezionych wierszy'),
    ('-l, --files-with-matches', 'вывести только имена файлов с совпадениями', 'вивести лише імена файлів зі збігами', 'wypisz tylko nazwy plików z dopasowaniami'),
    ('-L, --files-without-match', 'имена файлов без совпадений', 'імена файлів без збігів', 'nazwy plików bez dopasowań'),
    ('-n, --line-number', 'показывать номер строки', 'показувати номер рядка', 'pokazuj numer wiersza'),
    ('-H, --with-filename', 'показывать имя файла', 'показувати ім’я файлу', 'pokazuj nazwę pliku'),
    ('-h, --no-filename', 'не показывать имя файла', 'не показувати ім’я файлу', 'nie pokazuj nazwy pliku'),
    ('-o, --only-matching', 'выводить только совпавший кусок', 'виводити лише збіглий фрагмент', 'wypisuj tylko dopasowany fragment'),
    ('-q, --quiet', 'ничего не выводить, только код возврата', 'нічого не виводити, лише код повернення', 'nic nie wypisuj, tylko kod wyjścia'),
    ('-r, --recursive', 'искать во всех файлах внутри директорий', 'шукати в усіх файлах усередині директорій', 'szukaj we wszystkich plikach w katalogach'),
    ('-m, --max-count=NUM', 'остановиться после NUM найденных строк', 'зупинитися після NUM знайдених рядків', 'zatrzymaj się po NUM znalezionych wierszach'),
    ('--color[=WHEN]', 'подсвечивать найденное', 'підсвічувати знайдене', 'podświetlaj znalezione'))
cmd('head', 'показать начало файла', 'показати початок файлу', 'pokaż początek pliku',
    ('-c, --bytes=NUM', 'первые NUM байт', 'перші NUM байтів', 'pierwsze NUM bajtów'),
    ('-n, --lines=NUM', 'первые NUM строк (вместо 10)', 'перші NUM рядків (замість 10)', 'pierwsze NUM wierszy (zamiast 10)'),
    ('-q, --quiet', 'не печатать заголовки с именами файлов', 'не друкувати заголовки з іменами файлів', 'nie wypisuj nagłówków z nazwami plików'),
    ('-v, --verbose', 'всегда печатать заголовки с именами файлов', 'завжди друкувати заголовки з іменами файлів', 'zawsze wypisuj nagłówki z nazwami plików'))
cmd('less', 'просматривать файл постранично', 'переглядати файл посторінково', 'przeglądaj plik stronami')
cmd('more', 'просматривать файл постранично (простой)', 'переглядати файл посторінково (простий)', 'przeglądaj plik stronami (prosty)')
cmd('nl', 'пронумеровать строки', 'пронумерувати рядки', 'ponumeruj wiersze')
cmd('printf', 'форматированный вывод', 'форматований вивід', 'sformatowane wyjście')
cmd('rev', 'перевернуть каждую строку задом наперёд', 'перевернути кожен рядок задом наперед', 'odwróć każdy wiersz')
cmd('seq', 'вывести последовательность чисел', 'вивести послідовність чисел', 'wypisz ciąg liczb',
    ('-s, --separator=STRING', 'разделитель между числами (по умолчанию \\n)', 'роздільник між числами (за замовчуванням \\n)', 'separator między liczbami (domyślnie \\n)'))
cmd('sort', 'отсортировать строки', 'відсортувати рядки', 'posortuj wiersze',
    ('-f, --ignore-case', 'не различать регистр', 'не розрізняти регістр', 'ignoruj wielkość liter'),
    ('-h, --human-numeric-sort', 'сравнивать размеры вроде 2K и 1G', 'порівнювати розміри на кшталт 2K і 1G', 'porównuj rozmiary jak 2K i 1G'),
    ('-n, --numeric-sort', 'сортировать как числа', 'сортувати як числа', 'sortuj jako liczby'),
    ('-r, --reverse', 'обратный порядок', 'зворотний порядок', 'odwrotna kolejność'),
    ('-u, --unique', 'выводить одинаковые строки один раз', 'виводити однакові рядки один раз', 'wypisuj identyczne wiersze raz'),
    ('-k, --key=KEYDEF', 'сортировать по полю (колонке) номер N', 'сортувати за полем (колонкою) номер N', 'sortuj według pola (kolumny) nr N'),
    ('-t, --field-separator=SEP', 'разделитель полей', 'роздільник полів', 'separator pól'),
    ('-o, --output=FILE', 'записать результат в файл', 'записати результат у файл', 'zapisz wynik do pliku'))
cmd('tac', 'вывести файл задом наперёд (с последней строки)', 'вивести файл задом наперед (з останнього рядка)', 'wypisz plik od ostatniego wiersza')
cmd('tail', 'показать конец файла', 'показати кінець файлу', 'pokaż koniec pliku',
    ('-c, --bytes=NUM', 'последние NUM байт', 'останні NUM байтів', 'ostatnie NUM bajtów'),
    ('-n, --lines=NUM', 'последние NUM строк (вместо 10); -n +NUM — начиная со строки NUM', 'останні NUM рядків (замість 10); -n +NUM — починаючи з рядка NUM', 'ostatnie NUM wierszy (zamiast 10); -n +NUM — od wiersza NUM'),
    ('-q, --quiet', 'не печатать заголовки с именами файлов', 'не друкувати заголовки з іменами файлів', 'nie wypisuj nagłówków z nazwami plików'),
    ('-v, --verbose', 'всегда печатать заголовки с именами файлов', 'завжди друкувати заголовки з іменами файлів', 'zawsze wypisuj nagłówki z nazwami plików'),
    ('-f, --follow', 'следить за новыми строками (в тренажёре не интерактивно)', 'стежити за новими рядками (у тренажері не інтерактивно)', 'śledź nowe wiersze (w trenażerze nieinteraktywnie)'))
cmd('tee', 'писать ввод и на экран, и в файлы', 'писати ввід і на екран, і у файли', 'zapisuj wejście na ekran i do plików',
    ('-a, --append', 'дописывать в файлы, а не перезаписывать', 'дописувати у файли, а не перезаписувати', 'dopisuj do plików zamiast nadpisywać'))
cmd('tr', 'заменить или удалить символы', 'замінити або видалити символи', 'zamień lub usuń znaki',
    ('-d, --delete', 'удалить символы из набора', 'видалити символи з набору', 'usuń znaki z zestawu'),
    ('-s, --squeeze-repeats', 'сжать повторы символа в один', 'стиснути повтори символу в один', 'ściśnij powtórzenia znaku do jednego'),
    ('-c, --complement', 'взять все символы, КРОМЕ набора', 'взяти всі символи, КРІМ набору', 'weź wszystkie znaki OPRÓCZ zestawu'))
cmd('uniq', 'убрать или посчитать повторяющиеся строки', 'прибрати або порахувати повторювані рядки', 'usuń lub policz powtarzające się wiersze',
    ('-c, --count', 'показать, сколько раз встретилась строка', 'показати, скільки разів трапився рядок', 'pokaż, ile razy wystąpił wiersz'),
    ('-d, --repeated', 'только повторяющиеся строки', 'лише повторювані рядки', 'tylko powtarzające się wiersze'),
    ('-u, --unique', 'только уникальные строки', 'лише унікальні рядки', 'tylko unikalne wiersze'),
    ('-i, --ignore-case', 'не различать регистр', 'не розрізняти регістр', 'ignoruj wielkość liter'))
cmd('wc', 'посчитать строки, слова и байты', 'порахувати рядки, слова й байти', 'policz wiersze, słowa i bajty',
    ('-c, --bytes', 'число байт', 'кількість байтів', 'liczba bajtów'),
    ('-m, --chars', 'число символов', 'кількість символів', 'liczba znaków'),
    ('-l, --lines', 'число строк', 'кількість рядків', 'liczba wierszy'),
    ('-w, --words', 'число слов', 'кількість слів', 'liczba słów'),
    ('-L, --max-line-length', 'длина самой длинной строки', 'довжина найдовшого рядка', 'długość najdłuższego wiersza'))
cmd('awk', 'язык обработки текста по колонкам', 'мова обробки тексту за колонками', 'język przetwarzania tekstu kolumnami',
    ('-F fs', 'разделитель полей', 'роздільник полів', 'separator pól'),
    ('-v var=value', 'задать переменную до запуска программы', 'задати змінну до запуску програми', 'ustaw zmienną przed startem programu'))
cmd('sed', 'потоковый редактор: замена и удаление в строках', 'потоковий редактор: заміна й видалення в рядках', 'edytor strumieniowy: zamiana i usuwanie w wierszach',
    ('-n, --quiet', 'не печатать строки автоматически (только по p)', 'не друкувати рядки автоматично (лише за p)', 'nie wypisuj wierszy automatycznie (tylko przez p)'),
    ('-e script', 'добавить скрипт (команду sed)', 'додати скрипт (команду sed)', 'dodaj skrypt (polecenie sed)'),
    ('-i, --in-place', 'менять сам файл', 'змінювати сам файл', 'zmieniaj sam plik'),
    ('-E, -r, --regexp-extended', 'расширенные регулярные выражения', 'розширені регулярні вирази', 'rozszerzone wyrażenia regularne'))
cmd('df', 'показать свободное место на дисках', 'показати вільне місце на дисках', 'pokaż wolne miejsce na dyskach',
    ('-h, --human-readable', 'размеры в понятном виде (1023M)', 'розміри у зрозумілому вигляді (1023M)', 'rozmiary w czytelnej postaci (1023M)'),
    ('-T, --print-type', 'показать тип файловой системы', 'показати тип файлової системи', 'pokaż typ systemu plików'))
cmd('du', 'посчитать, сколько места занимают файлы', 'порахувати, скільки місця займають файли', 'policz, ile miejsca zajmują pliki',
    ('-a, --all', 'показывать и файлы, не только директории', 'показувати й файли, не лише директорії', 'pokazuj też pliki, nie tylko katalogi'),
    ('-c, --total', 'добавить общий итог', 'додати загальний підсумок', 'dodaj sumę całkowitą'),
    ('-d, --max-depth=N', 'показывать не глубже N уровней', 'показувати не глибше N рівнів', 'pokazuj nie głębiej niż N poziomów'),
    ('-h, --human-readable', 'размеры в понятном виде (1K 234M 2G)', 'розміри у зрозумілому вигляді (1K 234M 2G)', 'rozmiary w czytelnej postaci (1K 234M 2G)'),
    ('-s, --summarize', 'только итог для каждого аргумента', 'лише підсумок для кожного аргументу', 'tylko suma dla każdego argumentu'))
cmd('file', 'определить тип файла', 'визначити тип файлу', 'określ typ pliku',
    ('-b, --brief', 'не печатать имя файла', 'не друкувати ім’я файлу', 'nie wypisuj nazwy pliku'))
cmd('find', 'искать файлы в дереве директорий', 'шукати файли в дереві директорій', 'szukaj plików w drzewie katalogów',
    ('-name PATTERN', 'имя совпадает с шаблоном (берите в кавычки: -name "*.log")', 'ім’я збігається з шаблоном (беріть у лапки: -name "*.log")', 'nazwa pasuje do wzorca (w cudzysłowie: -name "*.log")'),
    ('-iname PATTERN', 'как -name, но без учёта регистра', 'як -name, але без урахування регістру', 'jak -name, ale bez rozróżniania wielkości liter'),
    ('-path PATTERN', 'весь путь совпадает с шаблоном', 'увесь шлях збігається з шаблоном', 'cała ścieżka pasuje do wzorca'),
    ('-type c', 'тип: f — файл, d — директория, l — ссылка', 'тип: f — файл, d — директорія, l — посилання', 'typ: f — plik, d — katalog, l — dowiązanie'),
    ('-size [+-]N[ckMG]', 'размер больше (+), меньше (-) или ровно N', 'розмір більший (+), менший (-) або рівно N', 'rozmiar większy (+), mniejszy (-) lub równy N'),
    ('-mtime [+-]N', 'изменён больше (+) или меньше (-) N суток назад', 'змінений більше (+) або менше (-) N діб тому', 'zmieniony ponad (+) lub poniżej (-) N dni temu'),
    ('-mmin [+-]N', 'изменён больше (+) или меньше (-) N минут назад', 'змінений більше (+) або менше (-) N хвилин тому', 'zmieniony ponad (+) lub poniżej (-) N minut temu'),
    ('-empty', 'пустой файл или пустая директория', 'порожній файл або порожня директорія', 'pusty plik lub pusty katalog'),
    ('-user NAME', 'владелец — пользователь NAME', 'власник — користувач NAME', 'właściciel to użytkownik NAME'),
    ('-perm MODE', 'права ровно MODE (восьмерично)', 'права рівно MODE (вісімково)', 'uprawnienia dokładnie MODE (ósemkowo)'),
    ('-maxdepth N', 'заходить не глубже N уровней', 'заходити не глибше N рівнів', 'schodź nie głębiej niż N poziomów'),
    ('-mindepth N', 'не проверять уровни мельче N', 'не перевіряти рівні мілкіші за N', 'nie sprawdzaj poziomów płytszych niż N'),
    ('-newer FILE', 'изменён позже, чем FILE', 'змінений пізніше, ніж FILE', 'zmieniony później niż FILE'),
    ('-print', 'напечатать путь (действие по умолчанию)', 'надрукувати шлях (дія за замовчуванням)', 'wypisz ścieżkę (domyślna akcja)'),
    ('-delete', 'удалить найденные файлы', 'видалити знайдені файли', 'usuń znalezione pliki'),
    ('-exec COMMAND {} ;', 'выполнить команду для каждого файла: {} — имя файла, конец — \\; или +', 'виконати команду для кожного файлу: {} — ім’я файлу, кінець — \\; або +', 'wykonaj polecenie dla każdego pliku: {} to nazwa pliku, koniec — \\; lub +'))
cmd('stat', 'подробная информация о файле', 'докладна інформація про файл', 'szczegółowe informacje o pliku')
cmd('which', 'найти, где лежит программа', 'знайти, де лежить програма', 'znajdź, gdzie leży program')
cmd('xargs', 'превратить ввод в аргументы команды', 'перетворити ввід на аргументи команди', 'zamień wejście na argumenty polecenia',
    ('-n, --max-args=MAX-ARGS', 'не больше MAX-ARGS аргументов за один запуск', 'не більше MAX-ARGS аргументів за один запуск', 'nie więcej niż MAX-ARGS argumentów na jedno uruchomienie'),
    ('-I R', 'подставлять каждую строку ввода вместо R', 'підставляти кожен рядок вводу замість R', 'wstawiaj każdy wiersz wejścia w miejsce R'),
    ('-0, --null', 'элементы разделены нулевым байтом', 'елементи розділені нульовим байтом', 'elementy rozdzielone bajtem zerowym'))
cmd('basename', 'оставить от пути только имя файла', 'залишити від шляху лише ім’я файлу', 'zostaw ze ścieżki tylko nazwę pliku')
cmd('dirname', 'оставить от пути только директорию', 'залишити від шляху лише директорію', 'zostaw ze ścieżki tylko katalog')
cmd('comm', 'сравнить два отсортированных файла построчно', 'порівняти два відсортовані файли порядково', 'porównaj dwa posortowane pliki wiersz po wierszu',
    ('-1', 'скрыть колонку 1 (только в первом файле)', 'сховати колонку 1 (лише в першому файлі)', 'ukryj kolumnę 1 (tylko w pierwszym pliku)'),
    ('-2', 'скрыть колонку 2 (только во втором файле)', 'сховати колонку 2 (лише в другому файлі)', 'ukryj kolumnę 2 (tylko w drugim pliku)'),
    ('-3', 'скрыть колонку 3 (строки в обоих файлах)', 'сховати колонку 3 (рядки в обох файлах)', 'ukryj kolumnę 3 (wiersze w obu plikach)'))
cmd('diff', 'сравнить файлы построчно', 'порівняти файли порядково', 'porównaj pliki wiersz po wierszu',
    ('-u', 'единый формат (- удалено, + добавлено), как в git', 'єдиний формат (- видалено, + додано), як у git', 'format ujednolicony (- usunięte, + dodane), jak w git'),
    ('-q, --brief', 'сказать только, различаются ли файлы', 'сказати лише, чи відрізняються файли', 'powiedz tylko, czy pliki się różnią'),
    ('-i', 'не различать регистр', 'не розрізняти регістр', 'ignoruj wielkość liter'),
    ('-w', 'не обращать внимания на пробелы', 'не зважати на пробіли', 'ignoruj białe znaki'))
cmd('paste', 'склеить строки файлов бок о бок', 'склеїти рядки файлів пліч-о-пліч', 'połącz wiersze plików obok siebie',
    ('-d, --delimiters=LIST', 'разделители вместо табуляции', 'роздільники замість табуляції', 'separatory zamiast tabulatora'),
    ('-s, --serial', 'склеить строки одного файла в одну', 'склеїти рядки одного файлу в один', 'połącz wiersze jednego pliku w jeden'))
cmd('zcat', 'вывести содержимое сжатых файлов', 'вивести вміст стиснутих файлів', 'wypisz zawartość skompresowanych plików')
cmd('zgrep', 'искать в сжатых файлах', 'шукати в стиснутих файлах', 'szukaj w skompresowanych plikach')
cmd('zless', 'просматривать сжатые файлы', 'переглядати стиснуті файли', 'przeglądaj skompresowane pliki')
