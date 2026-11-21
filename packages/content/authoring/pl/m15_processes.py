T = {
"d8bc80eda4": "Procesy i usługi",
"ff2ae59471": "ps, pgrep, sygnały, kill i pkill, pożeracze zasobów, systemd.",
"cfe128a942": "Czym jest proces",
"bf12d265d3": """## Program a proces
**Program** to plik na dysku (`/usr/bin/python3`). **Proces** to jego działająca kopia z własnym numerem — **PID**, właścicielem, pamięcią i stanem.

## ps aux — każdy proces
| kolumna | znaczenie |
|---|---|
| USER | kto go uruchomił |
| PID | identyfikator procesu |
| %CPU, %MEM | udział w CPU / pamięci |
| RSS | rzeczywista pamięć w KiB |
| STAT | stan: `R` działa, `S` śpi, `D` czeka na dysk, `Z` zombie, `T` zatrzymany |
| START, TIME | kiedy wystartował, zużyty czas CPU |
| COMMAND | wiersz polecenia |

```
$ ps aux
$ ps -ef
$ ps -u student
```
> PID 1 (`init` / `systemd`) jest przodkiem wszystkich procesów. Każdy proces ma rodzica (PPID).""",
"ed7308bb59": "Procesy",
"052be2f1b2": "Pokaż tylko swoje procesy.",
"ce6b500b2c": "Widać resize_photos.py",
"7942affc85": "Żadnych wierszy postgres",
"51ddb3abfc": "Pokaż wszystkie procesy użytkownika postgres w pełnym formacie BSD (z %CPU i %MEM).",
"ce3da3cec0": "Nagłówek %MEM",
"f51fae32be": "Serwer postgres",
"83cf7e4f85": "Proces długo ma STAT „D”. Co robi?",
"3c3e019c35": "Czeka na dysk / I/O — nie da się go nawet zabić, dopóki I/O się nie skończy",
"1f24bd6b19": "Pracuje na pełnych obrotach",
"2d611544f3": "Jest martwy",
"8a7bfcbd92": "Szukanie procesów",
"a937e6228c": """## Trzy sposoby
```
$ ps aux | grep nginx
$ pgrep -a nginx
$ pgrep -u www-data -l nginx
```
`ps aux | grep` znajduje też **samego grepa** — klasyczna pułapka. `pgrep` — nie.

## Opcje pgrep
- `-a` — pokaż pełny wiersz polecenia
- `-l` — pokaż nazwę
- `-f` — szukaj w całym wierszu polecenia, nie tylko w nazwie (`pgrep -f resize_photos`)
- `-u UŻYTKOWNIK` — tylko procesy tego użytkownika
- `-c` — policz

> Zanim zabijesz po nazwie, zawsze najpierw spójrz przez `pgrep -a`.""",
"20fa850d3e": "Znajdź PID-y wszystkich procesów nginx z ich wierszami poleceń.",
"dac7941f6f": "3 procesy nginx",
"0076ec9ed6": "Ile procesów ROBOCZYCH (worker) nginx działa jako www-data?",
"85fd028d8c": "Znajdź PID skryptu od zdjęć po części nazwy pliku: resize_photos.",
"1e9e9b92eb": "Jego nazwa to python3 — więc przeszukaj cały wiersz polecenia przez -f.",
"87f5948048": "Dwa procesy sleep plus sam grep — jego wiersz polecenia „grep -c sleep” też zawiera „sleep”.",
"7d44cfd945": "Sygnały: TERM i KILL",
"68b9c3e7f7": """## kill wysyła sygnały
`kill` niekoniecznie zabija — wysyła **sygnał**.

| sygnał | numer | znaczenie |
|---|---|---|
| SIGTERM | 15 | „proszę, zakończ się” — domyślny, proces może posprzątać |
| SIGKILL | 9 | natychmiastowa śmierć z ręki jądra, bez sprzątania |
| SIGHUP | 1 | „przeładuj konfigurację” dla wielu demonów |
| SIGINT | 2 | to wysyła **Ctrl+C** |
| SIGSTOP / SIGCONT | 19 / 18 | pauza / wznowienie (Ctrl+Z) |

```
$ kill 3100
$ kill -9 3100
$ pkill -f resize_photos
$ killall sleep
```
## Właściwa kolejność
1. `kill PID` (TERM) i odczekaj kilka sekund
2. dopiero gdy Cię ignoruje — `kill -9 PID`

> `kill -9` na bazie danych może uszkodzić dane: nie ma szansy zapisać buforów.""",
"46c7568a45": "Zatrzymywanie procesów",
"0c24146f7f": "Skrypt od zdjęć zjada procesor. Zatrzymaj go grzecznie (SIGTERM) po PID.",
"d8c4ef5fb4": "kill PID (bez -9)",
"c7a40b9470": "Skrypt jest zatrzymany",
"140802c8f5": "pgrep -f resize_photos, potem kill PID",
"c5453c0ad7": "Zatrzymaj naraz wszystkie procesy „sleep” po nazwie.",
"6948504075": "Nie ma już procesów sleep",
"87cf9fa9ad": "killall sleep  albo  pkill sleep",
"2e314e8e09": "Spróbuj zatrzymać worker nginx 902 jako Ty. Co odpowie Linux?",
"3ff29230db": "Co nacisnąć, żeby wysłać SIGINT programowi działającemu w Twoim terminalu?",
"b84e59c1e0": "„pkill a” — dlaczego to niebezpieczne?",
"e302c3bfbe": "Pasuje do każdego procesu z „a” w nazwie",
"acf53390b9": "Zabija tylko proces „a”",
"d954a15b1c": "Restartuje komputer",
"cc2dffdf4d": "Kto zużywa zasoby",
"88176f6d25": """## top — widok na żywo
```
$ top
```
W top: `P` — sortuj po CPU, `M` — po pamięci, `k` — zabij, `q` — wyjdź. `htop` to kolorowy kolega (jeśli jest zainstalowany).

## Migawki przez ps
```
$ ps aux --sort=-%cpu | head -5
$ ps aux --sort=-%mem | head -5
$ ps aux --sort=-rss | head
```
`-` przed polem = malejąco.

## 100% CPU — czy to źle?
Na maszynie z 4 rdzeniami jeden proces może pokazać do **400%**. Jeden zajęty proces ze 100% w pełni używa jednego rdzenia — w porządku dla zadania wsadowego, problem dla serwera WWW, który powinien odpoczywać.""",
"1c3b3896cb": "Pożeracze zasobów",
"ea3ddf2379": "Pokaż 3 procesy najbardziej obciążające CPU (plus wiersz nagłówka).",
"a18d429644": "4 wiersze",
"d0fd14d7be": "python3 na górze",
"79b957be2a": "Który proces zużywa najwięcej pamięci? Pokaż nagłówek i pierwszy wiersz.",
"bbac9cf315": "2 wiersze",
"1836815a74": "top pokazuje proces ze 180% CPU. Czy to możliwe?",
"d0ad64e9dc": "Tak, na maszynie wielordzeniowej używa prawie dwóch rdzeni",
"11ef833cff": "Nie, maksimum to 100%",
"99f00f1023": "Tylko dla roota",
"16a964f0e4": "Demony i usługi",
"ce8e1a9c76": """## Demon to proces w tle
cron, sshd, nginx, postgres — startują przy rozruchu i czekają na pracę. We współczesnym Linuksie uruchamia je i pilnuje **systemd** (PID 1).
```
$ systemctl status cron
$ systemctl list-units --type=service
$ sudo systemctl restart ssh
$ sudo systemctl enable nginx
```
- `start` / `stop` / `restart` — teraz
- `enable` / `disable` — przy starcie systemu
- `status` — stan + ostatnie wiersze logu

> Nie zabijaj PID-u demona ręcznie — systemd może go po prostu uruchomić ponownie. Używaj systemctl.""",
"03def21a13": "Wypisz wszystkie usługi na tej maszynie.",
"05c40721f7": "Widać cron.service",
"1882138672": "Zrestartuj usługę ssh i sprawdź, że jest aktywna.",
"e31e1a7fdd": "ssh jest aktywne",
"894d35d238": "Usługa ma startować sama po każdym restarcie. Które polecenie?",
"8a75073462": "sudo systemctl enable NAZWA",
"ddc3550d83": "sudo systemctl start NAZWA",
"856599718c": "sudo systemctl restart NAZWA",
}
