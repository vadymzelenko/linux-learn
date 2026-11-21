T = {
"e8dd24d7e5": "Zawód: inżynier NOC",
"d910aa857b": "Monitoring, alerty, incydenty, priorytety i SLA — język utrzymania.",
"2bf3e1b081": "Kim jest inżynier NOC",
"abb895fdd9": """## Network Operations Center
**NOC** to zespół, który całą dobę pilnuje zdrowia serwerów, sieci i aplikacji. Gdy strona zwalnia o 3 w nocy, NOC zauważa to pierwszy — zwykle zanim zrobią to klienci.

## Co robisz na zmianie
- Obserwujesz dashboardy i system **monitoringu**
- Reagujesz na każdy **alert**: potwierdzasz, oceniasz wpływ, działasz lub eskalujesz
- Działasz według **runbooków** — instrukcji krok po kroku dla znanych problemów
- Prowadzisz **zgłoszenie**: co się stało, kiedy, co zrobiłeś
- Przekazujesz zmianę: otwarte incydenty, rzeczy do obserwowania

## Poziomy wsparcia
| Poziom | Kto | Co robi |
|---|---|---|
| L1 | NOC | wykrywa, ocenia, wykonuje runbooki, eskaluje |
| L2 | eksperci od systemów i usług | głęboka diagnostyka, naprawy |
| L3 | deweloperzy produktu | błędy w kodzie, architektura |

> Świetny inżynier NOC to nie ten, który wie wszystko, tylko ten, który **reaguje szybko, pisze jasno i eskaluje na czas**.""",
"31d30b154f": "Twoja nowa praca",
"8fa4811229": "To Twoja pierwsza zmiana na serwerze web01. Przeczytaj notatkę dyżurnego ~/notes/oncall.txt — kto jest L2 od strony WWW?",
"7789a335fc": "1. Wpisz `cat ~/notes/oncall.txt`\n2. Znajdź wiersz „L2 web”",
"b2190150e7": "Przeczytaj plik przez cat (albo less)",
"d912a17ba9": "Lista dyżurów jest na ekranie",
"ce223bf834": "cat wypisuje plik; ścieżka zaczyna się od Twojego katalogu domowego ~.",
"6e6336cbfe": "Runbooki leżą w ~/runbooks. Wypisz je i otwórz ten o niedziałającej stronie.",
"068cb61095": "Wypisz runbooki",
"57d4fb74c7": "Runbook strony jest otwarty",
"b10db690d6": "ls pokazuje pliki, cat (albo less) czyta jeden z nich.",
"17a2bb0d62": "Alert się odpalił, działasz według runbooka od 15 minut, a strona wciąż leży. Co teraz?",
"ca9bbc85b9": "Eskalować do L2, jak mówi runbook",
"52ca1519e6": "Próbować dalej w pojedynkę, aż zadziała",
"2f436ec225": "Zamknąć alert jako fałszywy alarm",
"4bdf3cbe47": "Czas jest ważniejszy niż duma. Eskalacja na czas skraca awarię.",
"0916a349f7": "Które zadanie należy do L1 (NOC)?",
"f0bf8e76a4": "Potwierdzić alert i wykonać runbook",
"976cf68d27": "Przepisać kod modułu płatności",
"145bac2e9d": "Wybrać nową bazę danych dla produktu",
"56c3cae7da": "Monitoring i alerty",
"0d376e9409": """## Trzy rodzaje sygnałów
- **Metryki** — liczby w czasie: CPU %, wolne miejsce, żądania na sekundę, odsetek błędów
- **Logi** — zdarzenia tekstowe: „ERROR database connection refused”
- **Sprawdzenia** — aktywne sondy: „czy http://shop/health odpowiada 200?”

## Cztery złote sygnały
1. **Opóźnienie** — jak długo trwają żądania
2. **Ruch** — ile żądań przychodzi
3. **Błędy** — ile się nie udaje (5xx)
4. **Nasycenie** — jak pełne są zasoby (CPU, pamięć, dysk)

## Progi i alerty
Alert odpala się, gdy metryka przekroczy **próg**: ostrzeżenie przy 80% dysku, krytyczny przy 90%. Dobre alerty są *wykonalne*: człowiek może coś z nimi zrobić.

!> Zbyt wiele hałaśliwych alertów prowadzi do *zmęczenia alertami*: ludzie zaczynają je ignorować — i przegapiają ten prawdziwy.""",
"124374f45c": "Co obserwujemy",
"7744f7a6ab": """## Health check ręcznie
Monitoring często po prostu wywołuje specjalny URL. Możesz zrobić to samo przez `curl`:
```
$ curl -s localhost/health
$ curl -I localhost
```
`-s` ukrywa postęp, `-I` prosi tylko o nagłówki — pierwszy wiersz zawiera **kod statusu**.""",
"db21a75209": "Monitoring pisze „web01 health check: UNKNOWN”. Sprawdź sam endpoint http://localhost/health.",
"4ae2e95dda": "1. Wpisz `curl localhost/health`\n2. Oczekuj odpowiedzi OK",
"c6e94a1444": "Zapytaj go przez curl",
"e8055934ca": "Usługa odpowiedziała OK",
"942453b321": "curl URL wypisuje odpowiedź serwera.",
"cb7dc44467": "Pobierz tylko nagłówki HTTP strony głównej i odczytaj kod statusu.",
"02fe2b6bde": "Użyj curl z -I",
"9b95f4516c": "Wiersz statusu: HTTP/1.1 200 OK",
"590e781eff": "-I = tylko nagłówki.",
"99c23d45f2": "Który z nich to złoty sygnał nasycenia?",
"285a139019": "Dysk zapełniony w 93%",
"197e1d6b00": "500 żądań na sekundę",
"dcb7284668": "2% żądań zwraca 502",
"78ae2951d3": "Nasycenie = jak pełny jest zasób. Żądania na sekundę to ruch, 502 to błędy.",
"6a6c37f051": "Alert „CPU > 50%” odpala się 40 razy dziennie i nikt nigdy nic z nim nie robi. Jak to poprawnie naprawić?",
"9ec88e7b9d": "Dostroić lub usunąć: alert musi wymagać działania",
"9cd12fc18f": "Wyciszyć powiadomienia w telefonie",
"c4558cb371": "Dodać jeszcze pięć podobnych alertów dla pewności",
"2e3dc97cd9": "Incydenty i priorytety",
"78f46ba983": """## Cykl życia incydentu
1. **Wykrycie** — alert lub zgłoszenie użytkownika
2. **Potwierdzenie** — „zajmuję się tym”, żeby nikt nie dublował pracy
3. **Triaż** — kogo dotyczy, jak bardzo, od kiedy
4. **Mitygacja** — zmniejsz szkody teraz: restart, przełączenie, wycofanie
5. **Rozwiązanie** — usługa znów działa normalnie
6. **Postmortem** — znajdź przyczynę źródłową, by to się nie powtórzyło

## Priorytet
| Priorytet | Znaczenie | Reakcja |
|---|---|---|
| P1 | nic nie działa u nikogo, firma traci pieniądze | natychmiast budzimy dyżurnych, wszyscy na pokład |
| P2 | ważna funkcja zepsuta dla wielu użytkowników | w ciągu 15 minut |
| P3 | drobny problem, jest obejście | w godzinach pracy |
| P4 | kosmetyka | backlog |

> Najpierw zapytaj: **co się zmieniło?** Większość incydentów zaczyna się tuż po wdrożeniu lub edycji konfiguracji.""",
"397dff71a7": "Od alertu do postmortemu",
"31327ed312": "Sklep internetowy nie otwiera się nikomu, zamówienia stanęły. Priorytet?",
"0f77afff5b": "Zdjęcia produktów ładują się wolno u 5% użytkowników, reszta działa. Priorytet?",
"71487e6eca": "Literówka w stopce strony „O nas”. Priorytet?",
"97c918ddb9": "Strona padła 2 minuty po nowym wydaniu. Najszybsza mitygacja?",
"ab541c5f7b": "Wycofać się do poprzedniego wydania",
"0c9db1ec70": "Zacząć debugować nowy kod linijka po linijce",
"fee7cf8338": "Poczekać, może samo przejdzie",
"6d8f815035": "Najpierw przywróć usługę, przyczyny szukaj potem.",
"6270cd4d17": "Po co „potwierdzać” alert przed pracą nad nim?",
"6498902fd4": "Żeby koledzy wiedzieli, że ktoś się tym zajmuje, i nie dublowali pracy",
"2fada0c2f1": "Automatycznie zamyka incydent",
"4bbbf168cd": "Restartuje serwer",
"87f5fc961d": "SLA, SLO i matematyka przestojów",
"d980709656": """## Trzy litery, które usłyszysz codziennie
- **SLI** — mierzony wskaźnik: odsetek udanych żądań, opóźnienie p95
- **SLO** — wewnętrzny cel dla SLI: „99,95% żądań się udaje”
- **SLA** — obietnica dla klientów w umowie, z karami: „99,9% miesięcznie”

## Ile przestoju wolno
| Dostępność | Przestój na miesiąc | na rok |
|---|---|---|
| 99% | 7 h 18 min | 3,65 dnia |
| 99,9% | 43 min | 8,8 h |
| 99,95% | 22 min | 4,4 h |
| 99,99% | 4,3 min | 53 min |

Dozwolony przestój to **budżet błędów**. Wyczerpany? Żadnych ryzykownych wydań do następnego miesiąca.

## Metryki szybkości NOC
- **MTTA** — średni czas potwierdzenia alertu
- **MTTR** — średni czas przywrócenia usługi

> Liczy się każda minuta: przy 99,99% masz tylko około 4 minut miesięcznie.""",
"a0fa009c7f": "Obietnice w liczbach",
"fc095ad598": "SLA to 99,9% miesięcznie. W tym miesiącu strona leżała 50 minut. Czy SLA jest dotrzymane?",
"7299653a77": "Nie, budżet to około 43 minut",
"0bb9db754b": "Tak, dozwolone jest do 7 godzin",
"fc75ce46a2": "Tak, SLA liczy tylko noce",
"894624e3ce": "Czym SLO różni się od SLA?",
"5bfe4acca0": "SLO to wewnętrzny cel, SLA to umowa z klientami",
"9ed40b5a39": "To synonimy",
"ede4ac4c68": "SLA mierzy się w % CPU, SLO w megabajtach",
"e8d1d69391": "Zespoły ustawiają SLO ostrzej niż SLA, żeby mieć zapas.",
"8ce5772023": "MTTA wzrósł w tym miesiącu z 2 do 20 minut. Co to mówi?",
"f6b411be44": "Alerty są potwierdzane dużo później — sprawdź routing dyżurów i zmęczenie alertami",
"8c08c7882b": "Serwery stały się 10 razy szybsze",
"f218dac6bb": "Incydentów było mniej",
"fbb5068c35": "Poćwicz matematykę w powłoce: policz 30 dni × 24 h × 60 min × 0,001 (budżet 0,1%) przez awk i wypisz wynik.",
"b04fc7a14d": "1. Wpisz `awk 'BEGIN { print 30*24*60*0.001 }'`\n2. Odpowiedź to miesięczny budżet w minutach",
"3b81a6ee36": "Policz przez awk",
"780995d8ca": "43,2 minuty",
"7809507a53": "awk 'BEGIN { print ... }' liczy bez wejścia.",
"9a50adbf81": "Pierwsze spojrzenie na serwer",
"41ce974a6c": """## Zanim czegokolwiek dotkniesz
Zalogowałeś się po alercie. Najpierw cztery szybkie pytania:
1. **Czy jestem na właściwej maszynie?** `hostname`
2. **Kim jestem?** `whoami` — do napraw będziesz potrzebować `sudo`
3. **Czy był niedawno restart?** `uptime` — „up 3 min” po incydencie to trop
4. **Kto jeszcze tu jest?** `w` — może kolega już to naprawia

> Zapisz czas przez `date` — oś czasu zgłoszenia zaczyna się teraz.

!> Restart niewłaściwego serwera to klasyczny incydent sam w sobie. Zawsze sprawdzaj nazwę hosta.""",
"fda056ee6c": "Sprawdzenie w 30 sekund",
"58dd7d3b8b": "Upewnij się, że jesteś na właściwej maszynie: wypisz jej nazwę hosta.",
"3eb3124641": "Uruchom hostname",
"4881b29367": "To web01",
"1b1a70d24b": "Polecenie nazywa się tak samo jak to, czego potrzebujesz.",
"701a9e2e10": "Jak długo serwer już działa i jakie jest średnie obciążenie?",
"cf39174aea": "Użyj uptime",
"b0e6a1d680": "Widać load average",
"8eaf34b444": "Jedno słowo: up + time.",
"e230aaa7c0": "Sprawdź, kto jeszcze jest teraz zalogowany na serwerze.",
"0bb1966827": "Użyj w (albo who)",
"3f67ecd6f1": "Widać listę użytkowników",
"d1bd24e38f": "Najkrótsze polecenie w Linuksie: jedna litera.",
"e2f26d58c6": "-p (pretty) wypisuje tylko, jak długo system działa.",
"53167c70f9": "Po alercie „serwer niedostępny” uptime pokazuje „up 2 min”. Co to najpewniej znaczy?",
"d18eb98ed1": "Serwer się zrestartował — ustal dlaczego (logi, zasilanie, OOM)",
"5f2372d145": "Serwer ma 2 minuty, jest nowiutki",
"ecbdfaa991": "Nic ciekawego",
}
