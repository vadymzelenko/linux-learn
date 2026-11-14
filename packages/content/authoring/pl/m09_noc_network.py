T = {
"5a20a75454": "Sieci dla NOC",
"cf385d7192": "IP, podsieci, brama, ping, traceroute, DNS i porty: znajdź, gdzie psuje się sieć.",
"205f0952ff": "Adresy IP, podsieci i brama",
"fef7ea29ec": """## Adres dla każdej maszyny
**Adres IPv4** to cztery liczby 0–255: `10.0.2.15`. Każda karta sieciowa (interfejs) ma własny.

## Podsieć i CIDR
`10.0.2.15/24` — `/24` mówi, że pierwsze 24 bity (trzy liczby) to **sieć**, a ostatnia liczba to **host**. Wszystkie maszyny `10.0.2.x` są więc sąsiadami i rozmawiają bezpośrednio.

| CIDR | maska | adresy |
|---|---|---|
| /24 | 255.255.255.0 | 256 |
| /16 | 255.255.0.0 | 65 536 |
| /32 | 255.255.255.255 | 1 (pojedynczy host) |

## Zakresy prywatne
`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` — używane w firmach i domach, niedostępne bezpośrednio z internetu.

## Brama
Aby dotrzeć do czegokolwiek poza podsiecią, pakiety idą do **bramy** (routera). Brak bramy albo zła brama — brak internetu.

> 127.0.0.1 (**localhost**) to zawsze sama maszyna.""",
"19ffe5796c": "Podstawy sieci",
"3bbc802469": """## Zobacz to na serwerze
```
$ ip a
$ ip r
```
`ip a` wypisuje interfejsy: szukaj `state UP` i wiersza `inet`. `ip r` pokazuje trasy: wiersz **default via** to brama.""",
"2dd930b350": "Jaki adres IP ma web01 na eth0?",
"8e46d8bf4d": "Użyj ip a",
"36e1c4a93c": "Widać wiersz inet",
"4c6f53141a": "Znajdź bramę domyślną web01.",
"ea228a253d": "Użyj ip r",
"9c3eecc885": "Widać default via",
"a9952e0c6e": "Czy 10.0.2.15/24 i 10.0.3.20/24 są w tej samej podsieci?",
"4245d85d87": "Nie: trzecie liczby się różnią (2 i 3)",
"74a5ad3e52": "Tak, oba zaczynają się od 10",
"80cc316d1a": "Tak, /24 jest takie samo",
"2f5d816760": "Który adres jest prywatny (niedostępny z internetu)?",
"7b1f83f4c7": "ping: czy host żyje?",
"115913f456": """## ICMP echo
`ping HOST` wysyła małe pakiety i czeka na echo. Odpowiada na trzy pytania:
- **Czy host jest osiągalny?** odpowiedzi wracają albo nie
- **Jak daleko?** `time=0.6 ms` w sieci lokalnej, 20–100 ms między kontynentami
- **Czy łącze jest czyste?** `packet loss` w podsumowaniu

```
$ ping -c 4 db01
```
Prawdziwy ping działa do Ctrl+C; `-c 4` wysyła cztery pakiety i kończy.

## Odczytywanie wyniku
| wynik | znaczenie |
|---|---|
| 0% strat, niski czas | wszystko dobrze |
| 100% strat | host leży, jest nieosiągalny albo blokuje ICMP |
| 10–50% strat | złe łącze — rozmowy się urywają, strony wiszą |
| Name or service not known | problem z DNS, nie z siecią |

!> Niektóre hosty celowo blokują ping. 100% strat to trop, a nie dowód — sprawdź też port usługi.""",
"4b988e2c67": "Osiągalność",
"37d6de65c9": "API skarży się na bazę danych. Sprawdź, czy db01 odpowiada: wyślij dokładnie 4 pingi.",
"8b925617d2": "Użyj ping z -c 4",
"e32142a960": "ping -c LICZBA HOST",
"c7c9657785": "Monitoring mówi, że backup01 jest niedostępny. Potwierdź to 3 pingami.",
"ba5e64f98f": "Pinguj backup01",
"ccc4e287ec": "To samo polecenie, inny host i -c 3.",
"581e8da8ea": "Użytkownicy VPN partnera skarżą się na zawieszenia. Zmierz utratę pakietów do vpn.partner.net dziesięcioma pingami.",
"c2824e5c84": "10 pingów do vpn.partner.net",
"f40a648119": "Są straty pakietów",
"b120602ddd": "Nazwy w ogóle nie udało się rozwiązać — to problem DNS/nazwy, nie wysłano żadnego pakietu.",
"b95fd01bfa": "ping pokazuje time=180 ms do serwera w tym samym centrum danych. Co jest podejrzane?",
"4cd09c7ad6": "W jednym centrum danych powinno być < 1 ms: przeciążenie albo zła trasa",
"9fcc6edbb4": "Nic, 180 ms to wszędzie norma",
"d65267fdd2": "Serwer ma za dużo RAM",
"745af956a2": "traceroute: gdzie urywa się trasa?",
"6128a3d554": """## Przeskok po przeskoku
`traceroute HOST` pokazuje każdy router (**przeskok**) między Tobą a hostem z trzema pomiarami czasu.
```
$ traceroute vpn.partner.net
```
- Pierwszy przeskok to zwykle Twoja brama
- `* * *` — ten przeskok nie odpowiedział (dla jednego przeskoku w środku to często normalne)
- Gwiazdki **aż do końca** — trasa urywa się za ostatnim odpowiadającym przeskokiem
- Czas skaczący z 5 ms do 150 ms — długie lub przeciążone łącze w tym miejscu

> traceroute to Twój dowód, gdy dzwonisz do dostawcy lub partnera: „trasa urywa się za edge.partner.net”.""",
"d5cb3036bd": "Trasa",
"ba33f358dc": "Prześledź trasę z web01 do vpn.partner.net.",
"c7654f672a": "Użyj traceroute",
"35a8f63031": "Widać brzegowy router partnera",
"d309eea965": "Gdzie zatrzymuje się trasa do backup01? Uruchom traceroute z wyjściem liczbowym (-n).",
"86f2a52d79": "Za bramą tylko gwiazdki",
"9543f2a29a": "-n = nie rozwiązuj nazw.",
"ef2d84cd4f": "Przeskoki 1–4 odpowiadają, przeskok 5 pokazuje * * *, przeskok 6 (cel) odpowiada. Czy trasa jest zepsuta?",
"cdcbde7e8b": "Nie: jeden milczący router w środku to norma, jeśli cel odpowiada",
"4def3ac80b": "Tak, przeskok 5 leży",
"a793de8c9a": "Tak, cel kłamie",
"7efa2e0363": "DNS: nazwy i adresy",
"c23dcff785": """## Książka telefoniczna internetu
Ludzie pamiętają nazwy, komputery potrzebują adresów IP. **DNS** tłumaczy `example.com` → `93.184.215.14` (**rekord A**).

## Kto odpowiada pierwszy
Większość programów (ping, curl, przeglądarki) pyta w tej kolejności:
1. lokalny plik **/etc/hosts**
2. serwer DNS (w Ubuntu lokalny resolver 127.0.0.53)

`dig` i `nslookup` pytają **tylko DNS** i ignorują /etc/hosts.

## Typowe awarie
| objaw | znaczenie |
|---|---|
| NXDOMAIN | nazwa nie istnieje (albo literówka) |
| działa w ping, nie działa w dig | nazwa jest tylko w /etc/hosts |
| SERVFAIL / timeout | zepsuty jest sam serwer DNS |
| zwracany stary IP | nieaktualny wpis w /etc/hosts albo cache |

> „To zawsze DNS” to stały żart administratorów — i często prawda.""",
"b78faa2d5c": "Nazwy → adresy",
"cfeb7b3a58": """## Trzy narzędzia
```
$ dig example.com
$ dig +short github.com
$ nslookup example.com
$ host github.com
```
W `dig` patrz na `status:` (NOERROR / NXDOMAIN) i **ANSWER SECTION**.""",
"44546d7553": "Znajdź adres IP github.com, wypisz tylko adres.",
"2f18f09551": "Użyj dig +short",
"6c8a583855": "Wypisany jest tylko IP",
"afe8e1e0ba": "dig z +short.",
"32eed434f5": "Użytkownicy nie mogą otworzyć nosuch-shop.com. Zapytaj DNS przez nslookup i zobacz, co odpowie.",
"388f5fb5a3": "Użyj nslookup",
"716bc2b8be": "nslookup NAZWA",
"32d39f2b63": "legacy.shop.local odpowiada na ping, ale dig milczy. Udowodnij, skąd bierze się nazwa: pokaż wiersz w /etc/hosts.",
"4ad3b110d8": "Przeszukaj /etc/hosts grepem",
"70fa4959aa": "Widać wpis w hosts",
"9a946e1fea": "grep NAZWA /etc/hosts",
"4f60428934": "dig pyta tylko DNS; nazwa jest tylko w /etc/hosts, więc odpowiedź jest pusta.",
"773566b26b": "Po przeniesieniu strony na nowy serwer tylko TWÓJ laptop wciąż otwiera starą. Najbardziej prawdopodobna przyczyna?",
"3c11792b48": "Stary wpis w Twoim /etc/hosts albo cache DNS",
"8a0a489d49": "Nowy serwer leży",
"03bc9c0cf9": "Internet jest zepsuty",
"5cc74d849e": "Porty i nasłuchujące usługi",
"9286ff97db": """## Jeden adres, wiele usług
Numer portu wybiera usługę na maszynie. Serwer **nasłuchuje** na porcie; klient się z nim **łączy**.

| port | usługa |
|---|---|
| 22 | SSH |
| 53 | DNS (UDP) |
| 80 / 443 | HTTP / HTTPS |
| 3306 | MySQL |
| 5432 | PostgreSQL |
| 6379 | Redis |

## TCP czy UDP
**TCP** zestawia połączenie i gwarantuje dostarczenie (WWW, ssh, bazy danych). **UDP** po prostu wysyła datagramy (DNS, wideo, VoIP).

## Adres nasłuchu ma znaczenie
- `0.0.0.0:80` — nasłuchuje na wszystkich interfejsach, dostępny z sieci
- `127.0.0.1:5432` — tylko z tej samej maszyny

## Trzy odpowiedzi sprawdzenia portu
| wynik | znaczenie |
|---|---|
| succeeded | coś nasłuchuje |
| Connection refused | host działa, na tym porcie nic nie nasłuchuje |
| timed out | host leży albo zapora odrzuca pakiety |""",
"16c2eb4dbb": "Porty",
"b4d5b83cd6": """## Polecenia
```
$ sudo ss -tulpn
$ nc -zv db01 5432
```
`ss -tulpn`: **t**cp, **u**dp, **l**istening (nasłuchujące), **p**rocesses (procesy), **n**umeric (liczbowo). Bez sudo nazwy procesów innych użytkowników są ukryte.""",
"90c57ade09": "Które programy nasłuchują na których portach web01? Pokaż nasłuchujące gniazda TCP+UDP z nazwami procesów.",
"0df5c6c244": "Widać nginx na porcie 80",
"6084dba6fb": "Nazwy procesów innych użytkowników wymagają sudo.",
"9d3cca9de2": "Czy PostgreSQL na db01 jest osiągalny z web01? Sprawdź port 5432 przez nc.",
"7afae51378": "nc -zv HOST PORT",
"930717a93f": "Redis na cache01 (port 6379) nie odpowiada API. Sprawdź port i przeczytaj komunikat.",
"08b249c935": "Sprawdź cache01 6379",
"455d089222": "Jak poprzednio, inny host i port.",
"d8fb67ea89": "nc do cache01:6379 mówi „Connection refused”, a ping do cache01 działa. Wniosek?",
"1365daa818": "Host działa, ale Redis nie nasłuchuje — sprawdź usługę na cache01",
"ac1e19479c": "Przecięty kabel sieciowy",
"e5cecafe8a": "Zepsuty DNS",
"6c20386fb4": "ss pokazuje 127.0.0.1:5432. Czy klienci bazy z innych serwerów mogą się połączyć?",
"7dabd0071b": "Nie, nasłuchuje tylko na localhost",
"1e2570b7ea": "Tak, pasuje dowolny adres",
"87361a1821": "Tylko po UDP",
}
