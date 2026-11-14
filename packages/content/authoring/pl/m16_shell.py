T = {
"76e8aeed59": "Powłoka jak u profesjonalisty",
"fc1bb186e8": "&& i ||, cudzysłowy, nawiasy klamrowe, pętle for i while, if, skróty klawiszowe.",
"90b1ff998b": "Łączenie poleceń",
"bc8f366708": """## Kody wyjścia
Każde polecenie zwraca liczbę: **0 = sukces**, cokolwiek innego = błąd. Ostatni kod jest w `$?`.
```
$ ls /nope
$ echo $?
```
## Cztery łączniki
| składnia | drugie polecenie wykona się… |
|---|---|
| `a ; b` | zawsze |
| `a && b` | tylko jeśli a **się powiodło** |
| `a \\|\\| b` | tylko jeśli a **się nie powiodło** |
| `a \\| b` | równocześnie, wyjście a trafia do b |

```
$ mkdir -p backup && cp report.txt backup/
$ grep -q web servers.txt && echo "found" || echo "missing"
```
> `&&` to pas bezpieczeństwa: `cd /var/www && rm -rf old` — jeśli cd się nie uda, rm nigdy nie uruchomi się w złym katalogu.""",
"4f42f8b9a0": "Kody wyjścia i łączniki",
"cc7caccb54": "Utwórz ~/backup i skopiuj do niego ~/report.txt — w JEDNYM wierszu, kopiowanie tylko jeśli mkdir się powiódł.",
"8e9f02b97b": "~/backup/report.txt istnieje",
"9b2a4405ec": "cp po &&",
"6fc7a514a9": "Wypisz „found”, jeśli db01 jest w ~/servers.txt, w przeciwnym razie „missing”. Użyj grep -q, && i ||.",
"0cd208cee5": "ls zwraca 2 przy „poważnym problemie”, np. nieistniejącej ścieżce w argumencie.",
"08e2fe6f05": "„cd /data && rm -rf tmp” — co, jeśli /data nie istnieje?",
"8d7b81251f": "cd się nie udaje, rm się nie wykona — bezpiecznie",
"141d329502": "rm usunie tmp w bieżącym katalogu",
"f0bf407703": "Wykonają się oba",
"6d1aa955cc": "Cudzysłowy i podstawianie",
"38cc9a6a6a": """## Trzy rodzaje cytowania
| forma | `$VAR` i `$(cmd)` | spacje |
|---|---|---|
| `"podwójne"` | **rozwijane** | zachowane, jedno słowo |
| `'pojedyncze'` | dosłownie, jak wpisano | zachowane, jedno słowo |
| `\\` przed znakiem | ten znak dosłownie | — |

```
$ echo "Home: $HOME"
$ echo 'Home: $HOME'
$ echo "Today is $(date +%A)"
$ echo "Files: $(ls | wc -l)"
```
## Podstawianie poleceń
`$(polecenie)` zostaje zastąpione wyjściem polecenia. Stary styl: odwrotne apostrofy `` `polecenie` ``.

> Zasada: zmienne bierz w **podwójne cudzysłowy** — `rm "$file"` — inaczej nazwa pliku ze spacją stanie się dwoma argumentami.""",
"2286d1ddea": "„…” a '…'",
"da68a57af3": "Pojedyncze cudzysłowy zachowują wszystko dosłownie.",
"04c3c5e5b9": "Wypisz dokładnie: „There are 3 servers” — liczba ma pochodzić z policzenia wierszy ~/servers.txt.",
"54c0426109": "wc -l wewnątrz $( )",
"9b28b55bb9": "Utwórz plik, którego nazwa zawiera spację: „~/my notes.txt”.",
"1751b6c471": "„my notes.txt” istnieje",
"4b1cd0c972": "Brak przypadkowego pliku „my”",
"b1222ee89a": "FILE=\"my notes.txt\"; rm $FILE — co rm próbuje usunąć?",
"8f9965b2de": "Dwa pliki: „my” i „notes.txt”",
"1b3a1fa999": "„my notes.txt”",
"6a929cc9b8": "Bez cudzysłowów wartość jest dzielona na spacjach. Pisz rm \"$FILE\".",
"511cb46636": "Rozwijanie nawiasów klamrowych",
"e771f746b1": """## Bash napisze listę za Ciebie
```
$ echo file{1,2,3}.txt
file1.txt file2.txt file3.txt
$ echo {1..5}
$ echo {a..e}
$ echo log-{01..12}
```
## Prawdziwe zastosowania
```
$ mkdir -p project/{src,docs,tests}
$ touch project/src/{main,utils}.py
$ cp config.yml{,.bak}
```
Ostatnie to ulubieniec: `{,.bak}` rozwija się do `config.yml config.yml.bak` — kopia zapasowa w 12 znakach.

> Nawiasy są rozwijane **przed** wszystkim innym i nie patrzą na dysk — w przeciwieństwie do `*` tworzą nazwy, których jeszcze nie ma.""",
"f84b4cb66a": "{a,b} i {1..9}",
"c8f59d2ad4": "Utwórz szkielet projektu ~/site z katalogami css, js i img — jednym poleceniem.",
"2c00ee8743": "jedno mkdir z nawiasami",
"396cb2255d": "Utwórz 7 pustych dziennych logów ~/logs/day1.log … ~/logs/day7.log.",
"3fc426c243": "7 plików",
"e47393e943": "Zrób kopię ~/report.txt jako ~/report.txt.bak sztuczką {,.bak}.",
"c4348f7bff": "report.txt.bak istnieje",
"b8577dcd30": "Oryginał zostaje",
"d9e1718558": "Dwie grupy nawiasów dają wszystkie kombinacje.",
"732623371a": "Pętle: for i while",
"01816b515f": """## for — powtórz dla każdego elementu
```
$ for s in web01 web02 db01; do echo "checking $s"; done
$ for f in ~/photos/*.JPG; do echo "$f"; done
$ for i in {1..3}; do echo "try $i"; done
```
Budowa: `for NAZWA in LISTA; do POLECENIA; done`.

## while read — wiersz po wierszu
```
$ while read host; do echo "ping $host"; done < servers.txt
```
`read` bierze jeden wiersz na obrót; pętla kończy się na końcu pliku.

## Arytmetyka
```
$ i=0; while [ $i -lt 3 ]; do echo $i; i=$((i+1)); done
```
> Jeden wiersz w terminalu albo wiele wierszy w skrypcie — działa jedno i drugie. W skrypcie `do` i `done` stawiaj w osobnych wierszach.""",
"17303b3749": "Powtarzaj bez kopiuj-wklej",
"9bf93f99a8": "Dla każdego serwera z ~/servers.txt wypisz „ok: NAZWA”.",
"c674719969": "3 wiersze",
"839d623b47": "Zmień wszystkie ~/photos/*.JPG na .jpg małymi literami (IMG_001.JPG → IMG_001.jpg).",
"e6bedb48ee": "1. `for f in ~/photos/*.JPG; do … done` przechodzi po plikach\n2. `basename \"$f\" .JPG` → IMG_001 (nazwa bez rozszerzenia)\n3. `mv \"$f\" ~/photos/NAZWA.jpg`",
"2a4b433636": "Nie zostało żadne .JPG",
"305db781e1": "for f in ~/photos/*.JPG; do mv \"$f\" \"${f%.JPG}.jpg\"; done — albo użyj basename",
"18cf8299fb": "$(( )) liczy w liczbach całkowitych, echo wypisuje każdy wynik w osobnym wierszu.",
"7f15cc4ae4": "Która pętla poprawnie czyta ~/servers.txt wiersz po wierszu?",
"792a5106c3": "„for s in PLIK” robi jeden obrót — po NAZWIE pliku, a nie po jego wierszach.",
"178d9ba35f": "Warunki: if i test",
"04c558e592": """## if
```
if [ -f ~/report.txt ]; then
  echo "report exists"
elif [ -d ~/reports ]; then
  echo "there is a folder"
else
  echo "nothing"
fi
```
`[ … ]` to polecenie `test`. **Spacje wewnątrz nawiasów są obowiązkowe.**

## Najprzydatniejsze testy
| test | prawdziwy, gdy |
|---|---|
| `-f PLIK` / `-d KATALOG` / `-e ŚCIEŻKA` | istnieje plik / katalog / cokolwiek |
| `-s PLIK` | plik nie jest pusty |
| `-z "$S"` / `-n "$S"` | napis jest pusty / niepusty |
| `"$A" = "$B"` / `!=` | napisy równe / różne |
| `N -eq M`, `-ne`, `-lt`, `-le`, `-gt`, `-ge` | liczby: =, ≠, <, ≤, >, ≥ |

Warunkiem może być dowolne polecenie: `if grep -q error app.log; then …`.""",
"1ef8efe941": "Podejmowanie decyzji",
"c5158b0e0d": "Wypisz „big”, jeśli w ~/photos jest więcej niż 3 elementy, w przeciwnym razie „small”.",
"f7b72af89b": "big (4 elementy)",
"795d00c475": "Napisz ~/check.sh: jeśli ~/report.txt istnieje, wypisuje „report ok”, w przeciwnym razie „report missing” i kończy się kodem 1. Uruchom go.",
"ee59ef9649": "1. `nano ~/check.sh` (albo echo '…' > ~/check.sh)\n2. Napisz: `if [ -f ~/report.txt ]; then echo \"report ok\"; else echo \"report missing\"; exit 1; fi`\n3. `bash ~/check.sh`",
"3739b8a692": "Skrypt używa if",
"d4c247bb17": "… i fi",
"244ec6962e": "Napisz go w nano, potem bash ~/check.sh",
"50d9f2a1d8": "n=4. Dlaczego „[$n -gt 3]” kończy się „command not found”?",
"6d9588b3a7": "Brak spacji: bash szuka polecenia o nazwie „[4”",
"5a5ee4b052": "-gt nie istnieje",
"9e6953bdd3": "W testach nie wolno używać zmiennych",
"ad87c2c7e2": "Który test jest prawdziwy, gdy zmienna NAME jest pusta?",
"bdb5c2f05b": "Szybkie sztuczki w terminalu",
"2fe8057f64": """## Klawisze, które oszczędzają godziny
| klawisze | działanie |
|---|---|
| **Tab** | dokończ polecenie lub nazwę pliku; Tab Tab — pokaż opcje |
| **↑ / ↓** | poprzednie / następne polecenie |
| **Ctrl+R** | szukaj w historii: wpisz fragment, Ctrl+R ponownie — starsze |
| **Ctrl+A / Ctrl+E** | skok na początek / koniec wiersza |
| **Ctrl+W** | usuń słowo przed kursorem |
| **Ctrl+U** | usuń wszystko przed kursorem |
| **Ctrl+L** | wyczyść ekran (jak `clear`) |
| **Ctrl+C** | zatrzymaj działające polecenie |
| **Ctrl+D** | koniec wejścia / wylogowanie |

## Sztuczki z historią
- `history` — ponumerowana lista
- `!!` — powtórz ostatnie polecenie (`sudo !!` — powtórz je z sudo)
- `!42` — uruchom polecenie numer 42
- `!$` — ostatni argument poprzedniego polecenia

> W trenażerze: Tab i ↑/↓ działają w terminalu, historia i !! też.""",
"b3b2a842b0": "Skróty klawiszowe i historia",
"159e3b391c": "Przeczytaj /etc/shadow przez cat (dostaniesz odmowę), potem powtórz to samo polecenie z sudo — bez wpisywania go od nowa.",
"331560be06": "1. `cat /etc/shadow` → Permission denied\n2. `sudo !!` — bash wstawia poprzednie polecenie po sudo",
"7a84015d76": "Wpisałeś połowę bardzo długiego polecenia i chcesz znaleźć pełne, którego użyłeś wczoraj. Najszybszy sposób?",
"02a6179504": "Ctrl+R i wpisać jego fragment",
"f2ec8ddb97": "Nacisnąć ↑ 300 razy",
"9af85f84c6": "Wpisać wszystko od nowa",
"6dab8493c3": "Co robi Tab Tab po „systemctl re”?",
"50a0f69811": "Pokazuje wszystkie możliwe dopełnienia (restart, reload, …)",
"cbd735d085": "Uruchamia polecenie",
"966fb3169e": "Usuwa wiersz",
}
