T = {
"9ff4ae86cf": "Wycieczka po systemie plików Linuksa",
"2a43ca8d4e": "/etc, /var, /tmp, /usr i reszta; PATH i typy plików.",
"ef4814e6a0": "Mapa systemu plików",
"cf2428afb8": """## Jedno drzewo, jeden korzeń
Linux nie ma dysków C: i D:. Wszystko wisi na **jednym korzeniu** `/`. Dyski i pendrive’y są *montowane* w katalogach tego drzewa.

| katalog | co tam mieszka |
|---|---|
| `/etc` | **konfiguracja** systemu i programów (pliki tekstowe) |
| `/home` | osobiste katalogi użytkowników (`/home/student`) |
| `/root` | katalog domowy użytkownika root |
| `/var` | dane **zmienne**: logi (`/var/log`), bazy danych, poczta, cache |
| `/tmp` | pliki tymczasowe, czyszczone przy restarcie |
| `/usr` | zainstalowane programy i biblioteki (`/usr/bin`, `/usr/lib`) |
| `/usr/local` | programy zainstalowane ręcznie |
| `/opt` | duże aplikacje firm trzecich |
| `/bin`, `/sbin` | podstawowe polecenia (dziś dowiązania do `/usr/bin`, `/usr/sbin`) |
| `/dev` | urządzenia jako pliki (`/dev/sda`, `/dev/null`) |
| `/proc`, `/sys` | okna do działającego jądra |
| `/mnt`, `/media` | punkty montowania dysków i USB |
| `/srv` | dane udostępniane przez serwer (strony, FTP) |
| `/boot` | jądro i program rozruchowy |

> Zasada: **ustawienia → /etc, logi → /var/log, programy → /usr/bin, Twoje rzeczy → /home.**""",
"92c5c8f128": "Filesystem Hierarchy Standard",
"1b33836d34": "Spójrz na najwyższy poziom drzewa: wypisz zawartość katalogu głównego /.",
"665ff2dc30": "Widać etc i var",
"683a222f79": "Kolega ręcznie zainstalował „shopapp” w /opt. Pokaż, co jest w /opt (dwa poziomy w głąb).",
"ee3705b495": "Widać app.py",
"3dbe82c0f9": "Gdzie szukać konfiguracji serwera SSH?",
"a926160f99": "Baza danych rośnie każdego dnia. W którym katalogu najwyższego poziomu najpewniej mieszka?",
"7dae08a3c1": "/var (dane zmienne)",
"0d3f05a714": "/etc: ustawienia",
"da57b0d149": """## Wszystko jest plikiem tekstowym
Linux trzyma ustawienia jako **zwykły tekst** w `/etc` — można je czytać i kopiować zwykłymi poleceniami.
```
$ cat /etc/hostname
$ cat /etc/os-release
$ cat /etc/hosts
```
## /etc/passwd — lista kont
```
student:x:1000:1000:student:/home/student:/bin/bash
```
| pole | znaczenie |
|---|---|
| 1 | nazwa logowania |
| 2 | `x` = hasło jest w /etc/shadow |
| 3, 4 | UID i GID |
| 6 | katalog domowy |
| 7 | powłoka logowania |

Pola są oddzielone `:` — idealne dla `cut -d: -f1`.

> Zanim cokolwiek zmienisz w /etc: `sudo cp plik plik.bak`. Jedna literówka może zatrzymać usługę.""",
"33e41faec4": "Czytanie konfiguracji",
"2d44a46705": "Jaka to dystrybucja Linuksa i wersja? Przeczytaj /etc/os-release.",
"83bf051950": "Wypisz tylko nazwy logowania wszystkich kont (pierwsze pole /etc/passwd).",
"3f339458ce": "Widać www-data",
"38f8e77fc1": "Żadnych innych pól",
"2471f1acf4": "Na jakim porcie nasłuchuje shopapp? Znajdź to w /etc/shopapp.conf.",
"aba9192fb3": "Pole 7 to powłoka; każde konto tutaj używa /bin/bash, a sort -u usuwa powtórzenia.",
"d59479b28f": "/var i /tmp",
"8f5ea596cb": """## /var — dane, które się zmieniają
- `/var/log` — logi
- `/var/lib` — stan programów: bazy danych, listy pakietów
- `/var/cache` — cache, które można odbudować
- `/var/www` — klasyczne miejsce na strony WWW
- `/var/spool` — kolejki: poczta, druk, zadania cron

Gdy „dysk jest pełny”, winowajca zwykle siedzi w /var.
```
$ sudo du -sh /var/* | sort -h
```
## /tmp — dla wszystkich, ale ostrożnie
Do `/tmp` mogą pisać **wszyscy** użytkownicy, a jednak nikt nie może tam usuwać cudzych plików. To **sticky bit** — `t` na końcu `drwxrwxrwt`.

> Nigdy nie trzymaj w /tmp niczego ważnego: jest czyszczony przy restarcie.""",
"1344924ee0": "Dane zmienne i pliki tymczasowe",
"a754f18d24": "Pokaż rozmiar każdego katalogu w /var, od najmniejszego do największego.",
"83d61763f2": "Spróbuj usunąć /tmp/upload-7f3a.tmp — należy do www-data. Co się stanie?",
"53d0a563da": "rm pliku",
"4f3fd720d1": "Plik przetrwał",
"b83a833cde": "Dlaczego NIE możesz usuwać cudzych plików w /tmp, choć każdy może tam pisać?",
"24c24d63ab": "Sticky bit (t) na /tmp",
"fd0d135944": "/tmp jest tylko do odczytu",
"5a064fa5fe": "Pliki w /tmp są zaszyfrowane",
"c42665e9f9": "Gdzie mieszkają polecenia: PATH",
"a88272a316": """## Jak powłoka znajduje `ls`
Gdy wpisujesz `ls`, bash przegląda katalogi z **$PATH** od lewej do prawej i uruchamia pierwsze znalezione `ls`.
```
$ echo $PATH
$ which ls
$ type cd
```
- `which` — gdzie leży plik programu
- `type` — mówi też o poleceniach wbudowanych i aliasach (`cd` jest wbudowane w bash, nie ma pliku)
- `/usr/local/bin` jest **przed** `/usr/bin`, więc Twoje skrypty stamtąd wygrywają

## Uruchamianie skryptu spoza PATH
`./script.sh` — `./` znaczy „z bieżącego katalogu”. Bez tego bash szuka tylko w PATH.

> Bezpieczeństwo: nigdy nie dodawaj `.` (bieżącego katalogu) do PATH.""",
"7e49f8236a": "Sprawdź, gdzie leży program „hello”.",
"042ec333a3": "Uruchom go — po prostu po nazwie.",
"ea3d5cdd70": "Czy „cd” to plik, czy część basha? Zapytaj powłokę.",
"5e79306184": "Utworzyłeś ~/bin/deploy.sh. Dlaczego „deploy.sh” zgłasza „command not found”, a „./deploy.sh” w ~/bin działa?",
"6e37d42370": "~/bin nie ma w $PATH",
"bed6ca36be": "Plik jest za duży",
"2c34e31c4e": "Bash nie uruchamia plików .sh",
"37f3d1c04a": "Typy plików i stat",
"9d691495c8": """## Pierwsza litera ls -l
| litera | typ |
|---|---|
| `-` | zwykły plik |
| `d` | katalog |
| `l` | dowiązanie symboliczne |
| `c`, `b` | urządzenie znakowe / blokowe (`/dev`) |
| `s`, `p` | gniazdo, potok nazwany |

## Rozszerzenia nic nie znaczą
Linux nie przejmuje się `.txt` czy `.jpg`. Aby sprawdzić, czym plik naprawdę jest:
```
$ file /usr/bin/ls
$ file /etc/shopapp.conf
```
## stat — wszystko o pliku
Rozmiar, uprawnienia liczbowo (0644), właściciel, czasy dostępu i modyfikacji.
```
$ stat /etc/hostname
```""",
"9278b04525": "Co to za plik?",
"a8a6eb9f61": "Jakim plikiem jest /usr/local/bin/hello?",
"4810adab9a": "skrypt",
"f6c9f1299b": "Pokaż uprawnienia /etc/shopapp.conf liczbowo przez stat.",
"d64f845126": "ls -l pokazuje „lrwxrwxrwx 1 root root 7 ... bin -> usr/bin”. Czym jest /bin?",
"fe7b57ddaf": "Dowiązaniem symbolicznym do /usr/bin",
"559aa2fb8b": "Kopią /usr/bin",
"4d60af7c11": "Urządzeniem",
"db3e49e9aa": "photo.jpg zmieniono na photo.txt. Co powie „file photo.txt”?",
"2305d63ea6": "JPEG image data — file patrzy na zawartość",
"536c252dd1": "Błąd",
}
