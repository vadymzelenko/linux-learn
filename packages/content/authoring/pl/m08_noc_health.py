T = {
"b7eb47c041": "Zdrowie serwera",
"828a3dca6f": "Load average, pamięć, dysk i CPU: w minutę ustal, co dolega hostowi.",
"2780d14875": "Load average i rdzenie CPU",
"b6ea40746d": """## Trzy liczby w uptime
`load average: 7.82, 6.95, 4.10` — średnia liczba procesów, które **działały lub czekały** na CPU w ciągu ostatnich **1, 5 i 15 minut**.

## Jak je czytać
- Porównaj z liczbą rdzeni: `nproc`
- load ≈ rdzenie — CPU jest w pełni zajęty, ale daje radę
- load **dużo wyższy** niż rdzenie — procesy stoją w kolejce, wszystko zwalnia
- wartość 1-minutowa > 15-minutowej — obciążenie właśnie **rośnie**

| rdzenie | load 1.0 | load 4.0 | load 8.0 |
|---|---|---|---|
| 2 | w porządku | przeciążenie ×2 | przeciążenie ×4 |
| 8 | bezczynność | w połowie zajęty | w pełni zajęty |

> Load rośnie też wtedy, gdy procesy czekają na wolny **dysk**, nie tylko na CPU.""",
"09b5274b67": "Czy serwer jest przeciążony?",
"e29e2313e3": "Alert mówi „web01 zwalnia”. Spójrz na load average.",
"1c42f0d30f": "Sprawdź przez uptime",
"cb613f42d9": "Load average jest na ekranie",
"f1a7ad1ad2": "Polecenie wypisuje czas, czas działania i obciążenie.",
"cf360fff46": "Ile rdzeni procesora ma web01? Wypisz liczbę.",
"3ab9e99baf": "Użyj nproc",
"7bf4289ee1": "Odpowiedź to 2",
"614493461a": "n + proc = liczba procesorów.",
"b25feda14c": "load average: 7.82, 6.95, 4.10 przy 2 rdzeniach. Co się dzieje?",
"8b522d1f91": "Silne przeciążenie, rosnące od ostatnich 15 minut",
"62be1bf59e": "Serwer się nudzi",
"5bcfc005ab": "Obciążenie spada",
"2ecef345f1": "7,8 / 2 ≈ 4 procesy na rdzeń. 1 min > 15 min oznacza, że obciążenie rośnie.",
"f9a9f9f5bc": "Load 3.0 na serwerze z 16 rdzeniami to…",
"0b0ee6e1a3": "Lekkie obciążenie, nie ma powodu do obaw",
"85ed17673a": "Krytyczne przeciążenie",
"4665f0750a": "Zepsuty dysk",
"3591a29dc2": "Pamięć i swap",
"ab10419290": """## free -h
```
$ free -h
```
| kolumna | znaczenie |
|---|---|
| total | cała pamięć RAM |
| used | zajęta przez programy |
| buff/cache | cache dysku — Linux oddaje go na żądanie |
| **available** | ile programy mogą jeszcze dostać — **patrz tutaj** |

## Swap
Gdy RAM nie wystarcza, Linux przenosi strony pamięci na dysk (**swap**). Dysk jest ~1000× wolniejszy niż RAM, więc intensywny swap = wszystko się czołga.

## OOM killer
Gdy pamięć skończy się całkowicie, jądro zabija duży proces i zapisuje w logu „Out of memory: Killed process ...”.

> Małe „free” to normalne. Małe „available” i używany swap — to problem.""",
"1c81ad6d4b": "Gdzie podziała się pamięć?",
"5b1675282e": "Sprawdź pamięć na web01 w czytelnych jednostkach.",
"ce32626b07": "Użyj free z -h",
"77b9fc7e99": "Widać wiersz Swap",
"7daf0bd3bb": "free + flaga czytelnych jednostek.",
"0213a44105": "Zajęte jest 1,4 GiB swapu: serwerowi zabrakło RAM i swapuje.",
"6ba9ba197c": "free -h: total 3.8Gi, used 1.6Gi, free 200Mi, buff/cache 2.0Gi, available 2.1Gi. Czy serwerowi brakuje pamięci?",
"2302baa10c": "Nie: dostępne jest 2,1 GiB, cache zostanie zwolniony",
"a825d45450": "Tak: wolne jest tylko 200 MiB",
"b4f17f5661": "Nie da się powiedzieć",
"e10c363f8e": "Który wiersz logu dowodzi, że jądro zabiło proces z powodu pamięci?",
"08a9b24fdc": "Miejsce na dysku",
"55dc70ca95": """## Dwa narzędzia
- `df -h` — jak pełny jest każdy **system plików** (Use%)
- `du -sh ŚCIEŻKA` — ile zajmuje **katalog**

## Szukanie winowajcy
```
$ df -h
$ sudo du -sh /var/log/* | sort -h
```
`sort -h` rozumie rozmiary jak 2.0G i 512M, największy trafia na dół.

## Co można usunąć
- stare **zrotowane** logi: `*.1`, `*.gz`
- zrzuty pamięci w /var/crash (po poinformowaniu L2)
- pliki tymczasowe w /tmp

!> Nigdy nie usuwaj **żywego** logu działającej usługi: proces dalej pisze do usuniętego pliku, a miejsce nie zostanie zwolnione aż do restartu.

> Przy 100% dysku bazy danych przestają zapisywać, logowanie zawodzi, a usługi padają. Działaj przy 90%.""",
"c9a56ab5f0": "Alert: pełny dysk",
"d0cba4c65a": "Alert: „web01 disk / > 90%”. Potwierdź go: pokaż, jak pełne są systemy plików.",
"4e1576e050": "Użyj df -h",
"6eccdec049": "/ jest zapełniony w 95%",
"2b4913d70d": "Który katalog w /var/log zajmuje najwięcej? Pokaż rozmiary posortowane.",
"4a610f547e": "1. `sudo du -sh /var/log/*` — rozmiar każdego elementu\n2. Dodaj `| sort -h`, by posortować po rozmiarze",
"97e10a52f9": "Zmierz przez du -sh",
"21982bcbc1": "Posortuj przez sort -h",
"99d15e072e": "/var/log/app jest największy",
"3b08c7e226": "Zwolnij miejsce bezpiecznie: usuń stary zrotowany log /var/log/app/debug.log.1.gz i zrzut pamięci /var/crash/api.core. NIE ruszaj żywego debug.log.",
"61cbbbb9c7": "Zrotowanego logu już nie ma",
"c2175006e4": "Zrzutu pamięci już nie ma",
"0a5ea48474": "Żywy log nietknięty",
"c29ea0ab6f": "Pliki należą do roota: sudo rm PLIK PLIK.",
"3cf03383e9": "Sprawdź wynik: jak pełny jest teraz /?",
"b17744d23f": "Uruchom ponownie df -h",
"be21e0313b": "To samo polecenie co wcześniej.",
"34ef76c60e": "Dlaczego usuwanie żywego logu działającej usługi to zły pomysł?",
"08c8a787cb": "Proces trzyma plik otwarty, miejsce się nie zwalnia, a logi przepadają",
"d994aa7c62": "Linux zabrania usuwania logów",
"ce834719a2": "Nic się nie stanie",
"4f0991854e": "Kto zjada CPU",
"5133e57d03": """## Znajdź pożeracza
```
$ top
$ ps aux --sort=-%cpu | head -5
```
- `top` — widok na żywo posortowany po %CPU (prawdziwy top się odświeża, `q` wychodzi)
- `ps aux --sort=-%cpu` — migawka posortowana po CPU, najcięższe najpierw
- 100% = jeden pełny rdzeń; 190% = prawie dwa rdzenie

## Zanim zabijesz
1. **Czyj** to proces? (kolumna USER)
2. **Co** to jest? (COMMAND) — nigdy nie zabijaj na ślepo baz danych ani demonów systemowych
3. Czy jest **oczekiwany**? Nocna kopia zapasowa o 03:00 jest w porządku; „raport” w godzinach szczytu — nie

## Zatrzymywanie
`kill PID` wysyła SIGTERM — grzeczną prośbę. `kill -9 PID` (SIGKILL) tylko wtedy, gdy nie reaguje.""",
"c559d79436": "Wysokie CPU",
"9fa4f6d6c9": "Otwórz top i znajdź proces z najwyższym %CPU.",
"d0e08861c0": "Użyj top",
"f98ebaea86": "Widać ciężki proces",
"42ded92545": "Trzy litery.",
"03c0ddb88e": "Pokaż przez ps 3 najcięższe procesy według CPU (plus wiersz nagłówka).",
"5ba0c4cf19": "Użyj ps aux posortowanego po CPU",
"c1203ce767": "Przytnij przez head -4",
"3431c01a18": "report_generator.py jest na górze",
"efd2f789e4": "Ciężki python3 report_generator.py uruchomiłeś Ty (student) w godzinach szczytu. Zatrzymaj go.",
"afae1d9049": "1. Znajdź PID: `ps aux --sort=-%cpu | head -3`\n2. Uruchom `kill PID`\n3. Sprawdź w `top`, że go nie ma",
"c654816475": "Generator raportów zatrzymany",
"1a66db3825": "Znajdź jego PID w ps / top, potem kill PID.",
"09f5a8efa0": "Na górze jest postgres z 95% CPU w czasie wyprzedaży. Co powinien zrobić L1?",
"03a68e44d7": "Nie zabijać bazy; sprawdzić dashboardy i eskalować do L2 od baz danych",
"eff263fb6e": "Natychmiast kill -9 postgres",
"e7aaf40cf4": "Zrestartować serwer",
"e156fb8a90": "Sprawdzenie serwera w 60 sekund",
"0db96b570e": """## Wykonuj przy każdym alercie
1. `uptime` — obciążenie i niedawne restarty
2. `free -h` — pamięć i swap
3. `df -h` — miejsce na dysku
4. `top` albo `ps aux --sort=-%cpu | head` — kto zjada zasoby
5. `systemctl --failed` — zepsute usługi
6. `journalctl -p err -n 20` — najnowsze błędy

## Zapisz, co zobaczyłeś
Krótka notatka w zgłoszeniu jest na wagę złota dla następnego inżyniera:
```
10:42 web01: load 0.4/2 cores, mem avail 2.3G, / 62%,
no failed units, no new errors -> host healthy, looking at app
```
> Zdrowy host też pomaga: mówi, żeby szukać gdzie indziej — w sieci, bazie danych, aplikacji.""",
"332e2a0fe9": "Lista kontrolna",
"eb646a95ba": "Wykonaj na web01 pełne sprawdzenie w 60 sekund: obciążenie, pamięć, dysk, zepsute usługi i najnowsze błędy.",
"1ce0527a3e": "Uruchom pięć poleceń z listy kontrolnej jedno po drugim.",
"05a7451c05": "Zapisz krótki stan hosta w ~/status.txt: dopisz do pliku wyjście uptime i df -h /.",
"1f74d6649a": "uptime jest w pliku",
"cb34aa060b": "zajętość dysku jest w pliku",
"80b1d2c808": "Użyj >>, by dopisać oba wyjścia.",
"67d573ab04": "Wszystkie sześć sprawdzeń wygląda zdrowo, a użytkownicy dalej widzą błędy. Co dalej?",
"0c33c6220c": "Szukać poza hostem: sieć, baza danych, logi aplikacji",
"60812aa940": "Na wszelki wypadek zrestartować zdrowy serwer",
"dfbdb5fc77": "Zamknąć zgłoszenie",
}
