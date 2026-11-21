T = {
"1868447020": "Użytkownicy i grupy",
"7ab4e4c653": "id, useradd, groups, wspólny katalog zespołu, sudo i su.",
"e9aefa406e": "Kim naprawdę jestem?",
"02d8c864ce": """## Użytkownicy i grupy
Każdy proces działa **jako jakiś użytkownik**. Każdy użytkownik ma:
- **UID** — liczbę, której naprawdę używa jądro (root = 0)
- **grupę główną** i dowolną liczbę **grup dodatkowych**

Grupy dają wspólne prawa: każdy w `developers` może pisać do katalogu projektu; każdy w `sudo` może zostać rootem.
```
$ whoami
$ id
$ groups
$ id olena
```
## Użytkownicy systemowi
`www-data`, `postgres`, `syslog`… to nie ludzie. Usługi działają jako oni, żeby przejęty serwer WWW nie mógł czytać Twojego katalogu domowego.""",
"7e5a975b6a": "Tożsamość",
"072948d181": "Pokaż swój UID i wszystkie swoje grupy jednym poleceniem.",
"5db94dc441": "W jakich grupach jest olena?",
"e65a0baa61": "groups olena (albo id olena)",
"8bcf6c236c": "Co oznacza UID 0?",
"245cbd2b12": "root — wszechmocny administrator",
"3e76119649": "usunięty użytkownik",
"130ab3e089": "gość",
"171b1182be": "Dlaczego nginx działa jako www-data, a nie jako root?",
"4738de38be": "Jeśli zostanie przejęty, atakujący dostanie tylko ograniczone prawa www-data",
"51704bc635": "root jest wolniejszy",
"eb1ebb08d7": "To tylko tradycja",
"02c7734d51": "Tworzenie użytkowników",
"f0f23674fc": """## useradd
```
$ sudo useradd -m -s /bin/bash anna
$ sudo passwd anna
$ id anna
```
- `-m` — utwórz katalog domowy `/home/anna` (bez tego go nie będzie!)
- `-s /bin/bash` — powłoka logowania
- `-G developers` — od razu dodatkowe grupy

W Debianie/Ubuntu jest też przyjazne `adduser`, które zadaje pytania interaktywnie.

## Usuwanie
```
$ sudo userdel -r anna
```
`-r` usuwa także katalog domowy — zastanów się dwa razy.

> Wszystkie te polecenia zmieniają /etc/passwd i /etc/group, więc potrzebują **sudo**.""",
"8b7d7fd4c5": "Nowa koleżanka",
"95df96ae4d": "Dziś zaczyna pracę nowa koleżanka anna. Utwórz jej konto z katalogiem domowym i powłoką bash.",
"b07820b296": "Użytkownik anna istnieje",
"3c2ddc4c17": "/home/anna istnieje",
"8d0acb813b": "Jej powłoka to /bin/bash",
"60b5e73c35": "Ustaw hasło dla anny.",
"42c79e6da6": "Konto stażysty „intern1” nie jest już potrzebne. Usuń je razem z katalogiem domowym.",
"a6d28852e5": "intern1 już nie ma",
"b1764cf032": "/home/intern1 już nie ma",
"ad2a0e5772": "Wykonałeś „sudo useradd bob” (bez -m). Czego brakuje?",
"13bb364a52": "Jego katalogu domowego /home/bob",
"c8fc9c2211": "Jego UID",
"4481948392": "Niczego",
"5175624999": "Grupy i wspólny katalog",
"0ee6478765": """## Klasyczne zadanie: katalog zespołu
„Anna i Olena mają obie edytować pliki w /srv/project, inni — nie.”
1. Utwórz grupę: `sudo groupadd webteam`
2. Dodaj ludzi: `sudo usermod -aG webteam olena`
3. Oddaj katalog grupie: `sudo chown :webteam /srv/project`
4. Uprawnienia: `sudo chmod 2770 /srv/project`

## Co znaczy 2770?
- `770` — właściciel i grupa: wszystko; inni: nic
- `2` — bit **setgid** na katalogu: nowe pliki w środku automatycznie dostają grupę katalogu

## -aG, nie -G!
`usermod -G webteam olena` **zastępuje** wszystkie jej grupy — może stracić `sudo` lub `developers`. Zawsze `-aG` (append).

> Zmiany grup działają od **następnego logowania** tego użytkownika.""",
"8fb3578f22": "Dostęp zespołu",
"3de651476c": "Utwórz grupę webteam i dodaj do niej olenę i siebie (student).",
"49141fbb53": "1. `sudo groupadd webteam`\n2. `sudo usermod -aG webteam olena`\n3. `sudo usermod -aG webteam student`\n4. Sprawdź: `groups olena`",
"52ae8d4105": "olena jest w webteam",
"0db020c306": "olena zachowała developers",
"6987a73fb2": "student jest w webteam",
"1e6240df28": "student zachował sudo",
"8be80af6cb": "Utwórz /srv/project, oddaj go grupie webteam i ustaw uprawnienia 2770.",
"938f1ef8dd": "/srv/project istnieje",
"378d43fbd0": "Grupa to webteam",
"0f2ead13c5": "Tryb 2770 (drwxrws---)",
"d123323117": "Bit setgid wyświetla się jako „s” w miejscu x grupy.",
"ba83df5d1d": "Co się stanie po „sudo usermod -G webteam student” (bez -a)?",
"7334a56a0a": "student traci wszystkie inne grupy dodatkowe, w tym sudo",
"c6d29be841": "Nic innego niż przy -aG",
"5f37f68b12": "su, sudo i root",
"182a9ed2d0": """## Stawanie się innym użytkownikiem
| polecenie | co robi |
|---|---|
| `sudo POLECENIE` | uruchom jedno polecenie jako root (pyta o **Twoje** hasło) |
| `sudo -i` | interaktywna powłoka roota; wyjście przez `exit` |
| `sudo -u olena POLECENIE` | uruchom polecenie jako olena |
| `su - olena` | zaloguj się jako olena (pyta o **jej** hasło) |
| `sudo -l` | co wolno mi robić przez sudo? |

Kto może używać sudo, decyduje grupa `sudo` (Ubuntu) lub `wheel` (RHEL) oraz plik `/etc/sudoers` (edytuj tylko przez `visudo`!).

> Pracuj jako zwykły użytkownik, sudo używaj do pojedynczych poleceń. Pozostawiona otwarta powłoka roota to wypadek, który czeka na swoją chwilę. Każde sudo jest zapisywane w /var/log/auth.log.""",
"8829e0cc1f": "Przełączanie użytkowników",
"4e867e09b8": "Otwórz powłokę roota, sprawdź, kim jesteś, i z niej wyjdź.",
"bca942c2d4": "whoami jako root",
"afb7aacba4": "Znów jesteś studentem",
"af8d8d5b92": "Wykonaj „whoami” jako użytkownik www-data — nie stając się rootem.",
"35870611a6": "sudo -u UŻYTKOWNIK POLECENIE",
"fb3a725670": "sudo pyta o hasło. Czyje?",
"755844bc39": "Twoje",
"e9f7843d35": "roota",
"029067b010": "Docelowego użytkownika",
"00397ad4b7": "Dlaczego /etc/sudoers edytuje się tylko przez visudo?",
"778c30e835": "Sprawdza składnię: zepsuty sudoers może odciąć wszystkich od sudo",
"8cf0c2a9f1": "Tak szybciej",
"d11bb613b0": "nano nie umie go otworzyć",
}
