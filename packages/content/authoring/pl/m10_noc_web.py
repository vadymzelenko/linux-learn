T = {
"fbd5fbe550": "Usługi WWW",
"2af51bfd0e": "Kody HTTP, sprawdzenia przez curl, usługi systemd, dzienniki i zepsute konfiguracje.",
"a22398f02d": "HTTP i kody statusu",
"ec7d361900": """## Żądanie i odpowiedź
Przeglądarka (klient) wysyła **żądanie**: `GET /api/items HTTP/1.1` plus nagłówki. Serwer wysyła **odpowiedź**: wiersz statusu, nagłówki i treść.

## Kody statusu
| klasa | znaczenie | przykłady |
|---|---|---|
| 2xx | sukces | 200 OK, 204 No Content |
| 3xx | idź gdzie indziej | 301 Moved Permanently, 302 Found |
| 4xx | błąd po stronie **klienta** | 400, 401 Unauthorized, 403 Forbidden, 404 Not Found |
| 5xx | zepsuty **serwer** | 500 Internal Error, 502 Bad Gateway, 503 Unavailable, 504 Timeout |

## Co 5xx mówią inżynierowi NOC
- **500** — aplikacja wyłożyła się na tym żądaniu (czytaj logi aplikacji)
- **502** — proxy (nginx) żyje, a backend za nim nie odpowiada
- **503** — usługa jest przeciążona albo w trakcie prac
- **504** — backend odpowiada zbyt wolno

> Skok 4xx to zwykle problem klientów albo botów; skok 5xx to **nasz** problem.""",
"3b311376f1": "Jak rozmawia sieć WWW",
"08054c1c9f": "nginx odpowiada, ale strona pokazuje „502 Bad Gateway”. Gdzie patrzysz najpierw?",
"37074a726f": "Na aplikację backendu za nginx",
"761e7d907d": "Na przeglądarkę użytkownika",
"213c076589": "Na DNS",
"cc94f5136b": "Który kod oznacza „żądana strona nie istnieje”?",
"3747826501": "Sprawdź kod statusu http://example.com przez curl (tylko nagłówki).",
"c5b8030b22": "Zażądaj nieistniejącej strony http://example.com/nope — wypisz tylko kod statusu.",
"7adcc1a359": "1. `-s` — cicho\n2. `-o /dev/null` — wyrzuć treść\n3. `-w '%{http_code}'` — wypisz tylko kod",
"2954f0c752": "curl z -w",
"92df47ebb8": "curl jak u inżyniera NOC",
"9c48d6e4f8": """## Przydatne formy
```
$ curl -I http://localhost
$ curl -s localhost/health
$ curl -s -o /dev/null -w '%{http_code}\\n' localhost
$ curl -v http://localhost
```
## Kody błędów curl
| błąd | znaczenie |
|---|---|
| (6) Could not resolve host | DNS / literówka |
| (7) Couldn't connect | nic nie nasłuchuje na tym porcie |
| (28) Timeout | host leży albo zapora |
| (22) z -f | HTTP ≥ 400 |

> Sprawdzaj **z samego serwera** (localhost) i **z zewnątrz**: jeśli działa tylko jedno, problem jest pomiędzy — zapora, proxy, DNS.""",
"0b6977d0ab": "Sprawdzanie strony",
"a3a61d8333": "Alert: „dużo 5xx w sklepie”. Sprawdź, co nginx zwraca na http://localhost/api/items.",
"fc44c46818": "Zapytaj przez curl -I",
"d396da95cf": "nginx przekazuje ruch do API na 127.0.0.1:3000. Sprawdź, czy ktoś tam nasłuchuje.",
"5e4a8c394c": "Zapytaj localhost:3000/health",
"05708d92f4": "nginx zwraca 502, a curl na port backendu mówi „Couldn't connect”. Następny krok?",
"1077dcba81": "Sprawdzić usługę backendu: systemctl status api",
"be379c2e7f": "Restartować nginx raz po raz",
"499872291a": "Wyczyścić cache przeglądarki",
"d2d15cc077": "Usługi i systemctl",
"3620fbe693": """## systemd zarządza demonami
Każdy demon to **unit**: nginx.service, postgresql.service, api.service.
```
$ systemctl status api
$ systemctl --failed
$ sudo systemctl restart api
$ systemctl is-active api
```
## Stany
| Active: | znaczenie |
|---|---|
| active (running) | działa |
| inactive (dead) | zatrzymana normalnie |
| failed | padła lub nie wystartowała — czytaj wiersze logu pod spodem |

## Zmiana stanu wymaga roota
start / stop / restart / enable wymagają `sudo`. Bez niego: „Interactive authentication required”.

> `restart` to **mitygacja**, nie naprawa: zawsze przeczytaj, dlaczego usługa padła (wiersze logu w status, journalctl), i zapisz to w zgłoszeniu.""",
"6b514a605e": "Unity i stany",
"68a3c70b53": "Które usługi na web01 są zepsute?",
"e50f1b2624": "api.service jest failed",
"f2404df1b6": "Sprawdź status usługi api i przeczytaj, dlaczego się zatrzymała.",
"15e9fa95f9": "Widać wiersz FATAL",
"f36cbaa4f7": "systemctl status NAZWA",
"d41d02b432": "Mitygacja: zrestartuj usługę api i upewnij się, że sklep znów odpowiada 200.",
"bf3fe49d6b": "api jest aktywne",
"cc517857ec": "Sprawdź stronę przez curl",
"0437f9d0b2": "sudo systemctl restart api, potem curl -I localhost",
"5845fccb76": "Wykonałeś „systemctl restart api” bez sudo i dostałeś „Interactive authentication required”. Dlaczego?",
"3a483b750d": "Zmiana stanu usługi wymaga roota",
"128578b760": "Usługa nie istnieje",
"65431511bf": "systemd jest zepsuty",
"c0025e64e0": "Logi usług i journalctl",
"06bb4ad51e": """## Dziennik
systemd zbiera wyjście każdej usługi:
```
$ journalctl -u api -n 20
$ journalctl -p err -n 20
$ journalctl -u nginx -r
```
- `-u NAZWA` — jeden unit
- `-n 20` — ostatnie 20 wierszy
- `-p err` — tylko błędy i gorsze
- `-r` — najnowsze najpierw
- `-f` — śledź na żywo (Ctrl+C kończy)

> Czytaj od **pierwszego** błędu, nie od ostatniego: ostatnie wiersze to często tylko skutki („Failed with result”), przyczyna jest wyżej.""",
"314adc8f4f": "Czytanie dziennika",
"fdc5386d0d": "Pokaż ostatnie 5 wierszy logu usługi api.",
"c7d62506a4": "Dokładnie 5 wierszy",
"24e6e08fca": "-u dla unitu, -n dla liczby.",
"fd89c4e037": "Pokaż tylko błędy z całego dziennika.",
"0c5efedd9b": "Widać ECONNRESET",
"bdad9cefcf": "-n 1 wypisuje tylko najnowszy wpis — skutek, a nie przyczynę.",
"cca24e7ab9": "Ostatni wiersz mówi „Failed with result 'exit-code'”. Gdzie jest prawdziwa przyczyna?",
"34a6267ffb": "We wcześniejszych wierszach tej samej usługi",
"f3293037e3": "Właśnie w tym wierszu",
"7b18d2c320": "W /etc/hosts",
"0772c1aa8c": "Zepsuta konfiguracja",
"ce4ea04602": """## Klasyczny incydent
Ktoś zmienił konfigurację i zrestartował usługę — nie startuje. Dziennik mówi dokładnie, co jest nie tak:
```
nginx: [emerg] unknown directive "listn" in /etc/nginx/nginx.conf:8
```
- **co**: nieznana dyrektywa „listn” (literówka w `listen`)
- **gdzie**: plik /etc/nginx/nginx.conf, **wiersz 8**

## Napraw ostrożnie
1. Spójrz na wiersz: `sed -n '8p' PLIK` albo `grep -n listn PLIK`
2. Zrób kopię przed edycją: `sudo cp PLIK PLIK.bak`
3. Popraw: `sudo sed -i 's/listn/listen/' PLIK` (albo `sudo nano PLIK`)
4. Uruchom: `sudo systemctl restart nginx`
5. Sprawdź: `systemctl is-active nginx`, `curl -I localhost`

> W prawdziwym życiu nginx ma `nginx -t` do testu konfiguracji przed restartem — zawsze go używaj, jeśli jest dostępny.""",
"73dba49875": "Przeczytaj błąd, popraw wiersz",
"19562e0661": "nginx nie startuje. Znajdź w dzienniku, który plik i wiersz są zepsute.",
"532aed490d": "Przeczytaj dziennik nginx",
"2a9eb08738": "Widać wiersz [emerg]",
"5b1bef6fc3": "Pokaż zepsuty wiersz z jego numerem.",
"9c3c76aacf": "grep -n SŁOWO PLIK wypisuje numery wierszy.",
"f7693457f1": "Zrób kopię konfiguracji, popraw literówkę i ponownie uruchom nginx.",
"03d951acee": "Kopia zapasowa istnieje",
"e853212be4": "listen 80; poprawione",
"1bd2bd5573": "Po co robić kopię konfiguracji przed edycją na serwerze produkcyjnym?",
"fb586ce1ec": "Żeby w kilka sekund się wycofać, jeśli zmiana pogorszy sytuację",
"0e5ef9eaf0": "Wymaga tego Linux",
"be2aa7e280": "Przyspiesza to nginx",
}
