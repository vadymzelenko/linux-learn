T = {
"a354ed319f": "Logi i dochodzenie",
"63e9215dec": "Gdzie mieszkają logi, grep i awk na prawdziwych access logach, zdarzenia bezpieczeństwa i osie czasu.",
"e30ccc9f1b": "Gdzie mieszkają logi",
"d92ab28fe1": """## Mapa logów
| plik | co jest w środku |
|---|---|
| /var/log/syslog | ogólne komunikaty systemu (Debian/Ubuntu) |
| /var/log/auth.log | logowania, sudo, ssh — **tylko root** |
| /var/log/kern.log | jądro: dyski, karty sieciowe, OOM |
| /var/log/nginx/access.log | każde żądanie HTTP |
| /var/log/nginx/error.log | błędy nginx, problemy z upstreamem |
| /var/log/app/ | aplikacje Twojej firmy |
| journalctl | dziennik systemd (wszystkie usługi) |

## Rotacja
Logi rosłyby w nieskończoność, więc **logrotate** przemianowuje je co dzień lub co tydzień:
```
access.log        ← zapisywany właśnie teraz
access.log.1      ← wczoraj
access.log.2.gz   ← starszy, skompresowany
```
Skompresowane logi czyta się przez `zcat`, `zgrep`, `zless` — bez rozpakowywania.

> Gdy incydent zaczął się wczoraj wieczorem, odpowiedź często jest w `.1`, a nie w żywym pliku.""",
"a2023cac24": "Wypisz logi nginx z ich rozmiarami.",
"8efb415111": "Widać access.log.2.gz",
"157ae438bb": "Przeczytaj ostatnie 3 wiersze /var/log/auth.log. (Podpowiedź: nie każdy może go czytać.)",
"f7997f42c4": "tail -n 3 przez sudo",
"6260535d2a": "Dwa dni temu nie udała się kopia zapasowa. Znajdź „error” w skompresowanym /var/log/syslog.2.gz.",
"715b9d945a": "Użyj zgrep",
"a8450c3897": "zgrep WZORZEC PLIK.gz",
"b23ae269c1": "Klient mówi, że wczoraj o 23:00 strona zwalniała. Jest 09:00, logi rotują o północy. Który plik?",
"f2551e1a24": "Tylko error.log",
"0be1465d19": "Po północy wczorajsze wiersze przeniosły się do .1.",
"2c582850cf": "Przeszukiwanie logów grepem",
"66c5d72803": """## Przepisy
```
$ grep -i error /var/log/app/api.log
$ grep -c ' 502 ' /var/log/nginx/access.log
$ grep -v ' 200 ' /var/log/nginx/access.log
$ grep '10:5' /var/log/nginx/access.log
$ grep -E 'ERROR|FATAL' /var/log/app/api.log
$ grep -n FATAL /var/log/app/api.log
```
- `-i` bez rozróżniania wielkości liter, `-c` licz, `-v` odwróć, `-n` numery wierszy, `-E` alternatywy przez `|`
- grep po **czasie** (`10:5` = 10:50–10:59), by wyciąć okno czasowe

> Otaczaj kod statusu spacjami: `' 502 '` — inaczej `502` dopasuje się też do rozmiaru w bajtach, np. 15020.""",
"4197aa870c": "grep w logach",
"2a08ed2efd": "Znajdź wszystkie wiersze ERROR i FATAL w logu API /var/log/app/api.log.",
"7594cacfd4": "grep -E 'ERROR|FATAL' PLIK",
"bc8828bed6": "Ile żądań zakończyło się kodem 502 w /var/log/nginx/access.log?",
"cded344237": "grep -c ' 502 ' PLIK",
"a4e22cf824": "Kiedy zaczęły się 502? Pokaż tylko PIERWSZY wiersz z 502.",
"46b3879bd3": "czas 10:50:46",
"0b3f94a2c9": "grep ' 502 ' PLIK | head -n 1  (albo grep -m 1)",
"280c2f1207": "Zajrzyj do logu błędów nginx: co nginx mówi o upstreamie? Pokaż ostatni wiersz.",
"72a7b3bb13": "error.log nginx mówi „connect() failed (111: Connection refused) while connecting to upstream 127.0.0.1:3000”. Co to znaczy?",
"8df60cb554": "Na porcie 3000 nic nie nasłuchuje — backend leży",
"f42e7f3c9c": "Klient nie ma internetu",
"359b90abaf": "Analiza access.log",
"0cd1a5271e": """## Anatomia wiersza
```
45.155.205.66 - - [31/Oct/2026:10:00:00 +0000] "POST /login HTTP/1.1" 401 512 "-" "python-requests/2.31"
```
| pole awk | wartość |
|---|---|
| `$1` | IP klienta |
| `$4` | czas `[31/Oct/2026:10:00:00` |
| `$6` | metoda `"POST` |
| `$7` | ścieżka `/login` |
| `$9` | **status** 401 |
| `$10` | rozmiar w bajtach |

## Magiczny potok
```
$ awk '{print $9}' access.log | sort | uniq -c | sort -rn
```
1. `awk` wycina jedną kolumnę
2. `sort` stawia równe wartości obok siebie
3. `uniq -c` liczy każdą grupę
4. `sort -rn` — największe najpierw

> Zamień `$9` na `$1` (kto), `$7` (co) — i odpowiesz na 80% pytań „co się dzieje ze stroną”.""",
"7103c96e08": "Kolumny access.log",
"979989defc": "Policz żądania według kodu statusu w /var/log/nginx/access.log, najczęstsze najpierw.",
"cdb9078502": "1. `awk '{print $9}' /var/log/nginx/access.log` — same kody\n2. `| sort | uniq -c` — policz\n3. `| sort -rn` — największe najpierw",
"21dac1c341": "awk wypisuje $9",
"8fe07dfa14": "170 żądań z 200 na górze",
"2a454b5071": "awk '{print $9}' PLIK | sort | uniq -c | sort -rn",
"ba371f8087": "Który IP wysyła najwięcej żądań? Pokaż 3 pierwsze IP.",
"467894e3b9": "head -n 3 (albo -3)",
"cf7f2f4e85": "45.155.205.66 na górze",
"b81f37b1e8": "Ten sam potok z $1, potem | head -n 3",
"385831473b": "Które ścieżki zwracają błędy 5xx? Policz 5xx według ścieżek.",
"99545a496d": "awk z warunkiem $9 >= 500",
"22183a576b": "ścieżki /api/",
"dff3c977ba": "awk '$9 >= 500 {print $7}' PLIK | sort | uniq -c",
"7dfcd77ab2": "45.155.205.66 co kilka sekund wysyła POST /login, zawsze 401, user agent python-requests. Co to najpewniej jest?",
"1bfa7f7a8e": "Bot zgadujący hasła — zgłosić działowi bezpieczeństwa, rozważyć blokadę",
"b9c46e7e98": "Zadowolony klient",
"d63381f5af": "Nasz własny health check",
"6e5ff23ced": "Bezpieczeństwo: auth.log",
"dcd7398947": """## Co pokazuje auth.log
- `Accepted publickey for student from 192.168.1.10` — udane logowanie przez ssh
- `Failed password for invalid user admin from 45.155.205.2` — ktoś zgaduje
- `sudo: student : ... COMMAND=/usr/bin/systemctl restart nginx` — **kto** zrobił **co** jako root

## Liczenie atakujących
```
$ sudo grep 'Failed password' /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c
```
`$NF` = ostatnie pole, `$(NF-3)` = czwarte od końca — tutaj IP.

> Wiersze `sudo` w auth.log to pierwsze miejsce, gdzie szukać po pytaniu „kto zrestartował nginx o 10:12?”.""",
"21ca2b6dfd": "Logowania i sudo",
"1d73928b49": "Ile nieudanych prób podania hasła jest w /var/log/auth.log?",
"63da68d729": "grep -c przez sudo",
"52a194c0f9": "Kto zrestartował nginx przez sudo? Znajdź wiersz sudo.",
"363b5bf502": "Wypisz atakujące IP (po jednym w wierszu, bez powtórzeń).",
"e8b4c206ac": "Widać 45.155.205.9",
"0b49fba2ca": "6 unikalnych IP",
"348489ae47": "sudo grep 'Failed password' PLIK | awk '{print $(NF-3)}' | sort -u",
"2e6089d03e": "Widzisz tysiące „Failed password for invalid user admin” z różnych IP. Prawidłowa reakcja NOC?",
"7055dd120f": "Zanotować w zgłoszeniu dla bezpieczeństwa; to szum tła, o ile nie było udanego logowania",
"0854ea6d2d": "Wyłączyć serwer",
"0fc7a9d59c": "Usunąć auth.log",
"e14b93d339": "Budowanie osi czasu",
"5d6fc0f0bc": """## Po co oś czasu
Każde omówienie incydentu zaczyna się od pytania **„co się stało i kiedy?”**. Zbierz zdarzenia ze wszystkich źródeł w jedną listę:
```
10:12  student restarted nginx (auth.log)
10:50  api: db pool exhausted (app/api.log)
10:50  api: FATAL ECONNRESET, shutting down
10:50  nginx: first 502 (access.log)
10:55  alert "5xx rate high" fired
```
## Zasady
- czasy w **jednej strefie** (UTC jest najbezpieczniejsze)
- źródło każdego wiersza — żeby inni mogli sprawdzić
- fakty, nie domysły: „api się zatrzymało” — fakt, „winna jest baza” — hipoteza

> Pierwszy w czasie błąd jest zwykle bliżej przyczyny niż ten najgłośniejszy.""",
"be58bb9184": "Co się stało i kiedy",
"4d3f7cc6ef": "Znajdź pierwsze ostrzeżenie lub błąd w /var/log/app/api.log (z numerem wiersza).",
"c9d480218c": "grep -n -E 'WARN|ERROR' PLIK | head -n 1",
"e996bfb8fb": "Zacznij oś czasu: zapisz wiersze ERROR i FATAL logu API do ~/incident/timeline.txt.",
"01f2f0edda": "~/incident istnieje",
"4b98b610e9": "FATAL jest na osi czasu",
"9603ace93f": "mkdir ~/incident, potem grep -E ... > ~/incident/timeline.txt",
"f6cec93575": "Dopisz pierwsze 502 z access.log na koniec osi czasu (nie nadpisz jej!).",
"991c35aafa": "FATAL wciąż tam jest",
"c769572dfa": "Wiersz 502 został dopisany",
"ecfbc6c96d": ">> dopisuje, > nadpisuje.",
"4fb7ef191c": "Które stwierdzenie trafia na oś czasu jako FAKT?",
"db264bfb0e": "10:50:04 api zapisało FATAL ECONNRESET i się wyłączyło",
"b2df4a9a65": "Deweloperzy znowu coś zepsuli",
"5fcd7c6705": "Pewnie baza danych zwalnia",
}
