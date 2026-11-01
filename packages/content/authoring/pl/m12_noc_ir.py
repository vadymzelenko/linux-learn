T = {
"1f0d4c5a55": "Zarządzanie incydentami",
"15fac5bc19": "Cykl życia, runbooki, eskalacja, zmiany i wycofanie, postmortemy.",
"e6b63f9158": "Cykl życia incydentu",
"919cd89007": """## Siedem kroków
1. **Wykryj** — alert, klient, kolega
2. **Potwierdź** — „zajmuję się tym” w narzędziu do alertów: nikt nie dubluje pracy, a licznik eskalacji staje
3. **Oceń** — co jest zepsute, dla kogo, od kiedy → **priorytet**
4. **Komunikuj** — otwórz zgłoszenie / kanał, pierwsza aktualizacja w ciągu kilku minut
5. **Mityguj** — *najpierw* przywróć usługę (restart, przełączenie, wycofanie)
6. **Rozwiąż** — usuń przyczynę źródłową
7. **Omów** — postmortem: czego się uczymy, co zmieniamy

## Mitygacja ≠ rozwiązanie
==Mitygacja== oddaje usługę użytkownikom, ==rozwiązanie== sprawia, że to się nie powtórzy. W trakcie incydentu mitygujesz; rozwiązujesz, gdy użytkownicy znów są zadowoleni.

> Pierwsze 5 minut decyduje o incydencie: potwierdź, oceń, komunikuj. Cisza to najgorsza aktualizacja.""",
"d804bdd51c": "Alert odpala się o 03:00. Co robisz NAJPIERW?",
"f73ce6115b": "Potwierdzam go, żeby zespół wiedział, że ktoś się tym zajmuje",
"279ec19621": "Zaczynam przepisywać konfigurację",
"c64fb729af": "Czekam, czy samo się rozwiąże",
"d4133b5af6": "Baza danych zwalnia; przełączasz ruch na replikę i użytkownikom jest dobrze. Co właśnie zrobiłeś?",
"795d22d119": "Mitygację — przyczyna źródłowa wciąż jest",
"09cb68fb3a": "Rozwiązanie — incydent zamknięty na zawsze",
"452d220543": "Postmortem",
"5de898d2ef": "Która aktualizacja dla interesariuszy jest najlepsza?",
"ae240de0a2": "„11:10 UTC: finalizacja zamówienia zwraca błędy u ~30% użytkowników. Przyczyna w trakcie ustalania (nginx/api). Następna aktualizacja 11:25.”",
"d372ff6927": "„Coś się zepsuło, pracujemy nad tym”",
"31e940a7d1": "„Upstream zwraca 502 przez ECONNRESET w puli 20/20”",
"5bb45b6ada": "Wpływ, czas, obecny stan i kiedy będzie następna aktualizacja — prostym językiem.",
"24d1aa5f8a": "Praca według runbooka",
"f7ad278f6d": """## Runbook = przepis na znany problem
Dobry runbook zawiera:
- **kiedy go użyć** (który alert)
- **ponumerowane kroki** z dokładnymi poleceniami
- **oczekiwany wynik** każdego kroku
- **kiedy eskalować** i do kogo

Masz dyżur. Zgłoszenie INC-2041 mówi „Sklep nie działa”. Runbook jest w `~/runbooks/website-down.md`, zgłoszenie w `~/tickets/INC-2041.txt`.

> Wykonuj kroki po kolei i zapisuj, co widziałeś. „Krok 2: nginx inactive od 11:02” pomaga następnej osobie bardziej niż „naprawione”.""",
"e9fb091db4": "INC-2041: sklep nie działa",
"de658d51b6": "Przeczytaj runbook „strona nie działa”.",
"2914ee31a7": "cat runbooka",
"ff4b8338b4": "Widać eskalację do L2",
"b8747ad9e7": "Krok 1: potwierdź problem — zażądaj http://localhost.",
"007c28c643": "Krok 2: czy nginx działa? Sprawdź jego status.",
"16a56ad4c8": "nginx został zatrzymany normalnie (nie padł). Uruchom go i potwierdź, że strona odpowiada 200.",
"79e25ed6a5": "Sprawdź przez curl",
"37e2244fa4": "Zapisz wynik w zgłoszeniu: dopisz do ~/tickets/INC-2041.txt wiersz ze słowami „nginx was stopped” i „started”.",
"cc21c69322": "Pierwotny tekst zgłoszenia zachowany",
"6dff20137c": "Zapisano „nginx was stopped”",
"58ad3cf381": "Zapisano „started”",
"a4378318b4": "echo \"...\" >> PLIK  (dwa > !)",
"bbfc7da60a": "Ktoś normalnie zatrzymał nginx. Co jeszcze należy zapisać w zgłoszeniu?",
"9dfdacf905": "Zadanie na później: ustalić, kto i po co go zatrzymał (auth.log, kalendarz zmian)",
"79f7dbd4be": "Nic — teraz działa",
"ff2913db4c": "Hasło roota",
"3d304b42ea": """## Eskalacja to nie porażka
L1 (NOC) widzi wszystko, ale ma ograniczone uprawnienia i wiedzę o każdym systemie. L2/L3 to eksperci. **Eskalacja na czas to część pracy.**

## Kiedy eskalować
- runbook się skończył, a usługa wciąż leży
- minął czas z runbooka (np. 15 minut)
- naprawa wymaga uprawnień, których nie masz, albo jest ryzykowna (baza, usuwanie danych)
- P1 — natychmiast poinformuj kierownika zmiany, nawet jeśli naprawiasz

## Jak eskalować
Dobre przekazanie odpowiada, zanim ktoś zapyta:
```
INC-2041 P1, shop down since 11:02 UTC.
Checked: nginx inactive; started it; 200 again 11:12.
Unclear: who stopped it. Need: L2 web to review.
```
> Nigdy nie eskaluj słowami „nie działa”. Powiedz, co widziałeś, co zrobiłeś, czego potrzebujesz.""",
"92b06d9c40": "Wygląda na to, że baza danych jest zepsuta. Znajdź w ~/notes/oncall.txt, kto ma dyżur L2 od baz danych.",
"b630d4e8fa": "grep w notatkach",
"f78fd94c49": "Jak szybko trzeba podjąć P2? Znajdź wiersz o priorytetach (severity).",
"bb8ef260e1": "Runbook mówi „eskaluj po 15 minutach”. Jest 14. minuta, a Ty masz pomysł, który może zadziałać. Co robisz?",
"b34554f250": "Eskaluję teraz i wspominam o pomyśle — L2 zdecyduje razem ze mną",
"55d69f9325": "Próbuję jeszcze godzinę",
"b31fcfaf20": "Która wiadomość przy przekazaniu jest przydatna dla L2?",
"4375fe1b5a": "„P2: api 500 od 10:50, w api.log pula db 20/20, restart pomógł na 5 min, potrzebne sprawdzenie bazy”",
"ad374e8d48": "„API jest zepsute, pomocy”",
"010cc1f86a": "„???”",
"fa2fa58b41": "Zmiany i wycofanie",
"05c5a8fe28": """## Większość awarii następuje po zmianie
Wdrożenia, edycje konfiguracji, zmiany w sieci. Dlatego pierwsze pytanie przy incydencie brzmi: **co się ostatnio zmieniło?**

## Zarządzanie zmianami w skrócie
- każda zmiana ma zgłoszenie (CHG-…) z czasem, właścicielem i **planem wycofania**
- ryzykowne zmiany wykonuje się w oknie serwisowym
- po zmianie: sprawdź (curl, status, dashboardy)

## Najpierw wycofaj, potem debuguj
Jeśli incydent zaczyna się tuż po zmianie, najszybszą mitygacją jest zwykle jej **wycofanie**. *Dlaczego* się zepsuło — ustalisz potem, na spokojnie.
```
$ diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
$ sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
```
> `diff STARY NOWY`: wiersze z `<` są tylko w STARYM, wiersze z `>` tylko w NOWYM.""",
"f9f4424815": "Co się zmieniło?",
"585e726125": "nginx leży po zmianie CHG-118. Przeczytaj zgłoszenie zmiany w ~/tickets.",
"fc80cd0f3c": "cat zgłoszenia",
"93797e200f": "Widać plan wycofania",
"c9b45410a8": "Porównaj kopię zapasową z obecną konfiguracją: co dokładnie się zmieniło?",
"e3e83f3da4": "diff STARY NOWY",
"7736de0d93": "Wiersz proxy_pass się różni",
"7ce8abb45a": "„10c10”: wiersz 10 starego pliku zmieniono na wiersz 10 nowego.",
"82e2156f4d": "Wykonaj plan wycofania i sprawdź, że sklep odpowiada 200.",
"4ebb686bc4": "Wdrożenie 5 minut temu, teraz błędy 5xx. Najszybsza bezpieczna mitygacja?",
"2703d58f57": "Wycofać wdrożenie",
"7cf54e0ace": "Debugować nowy kod na produkcji",
"ee258a4337": "Zrestartować wszystkie serwery",
"1e4968911a": "Postmortem i 5 dlaczego",
"ff8ae0b40e": """## Postmortem bez szukania winnych
Po każdym poważnym incydencie zespół pisze krótki dokument. **Blameless** oznacza: szukamy słabych punktów w *systemie*, a nie winnej osoby. Ludzie, którzy się boją, ukrywają informacje.

## Struktura
1. **Podsumowanie** — 2–3 zdania: co, jak długo, jaki wpływ
2. **Oś czasu** — od pierwszego sygnału do przywrócenia (UTC)
3. **Przyczyna źródłowa** — znaleziona metodą „5 dlaczego”
4. **Co poszło dobrze / źle**
5. **Zadania** — konkretne zadania z właścicielem i terminem

## 5 dlaczego — przykład
1. Dlaczego sklep nie działał? — nginx nie wystartował.
2. Dlaczego? — błąd składni w nginx.conf.
3. Dlaczego trafił na produkcję? — konfiguracji nie przetestowano przed restartem.
4. Dlaczego nie? — w procedurze zmian nie ma kroku `nginx -t`.
5. Dlaczego? — procedurę napisano, zanim zaczęliśmy używać nginx.

**Zadanie:** dodać `nginx -t` do listy kontrolnej zmian; sprawdzanie konfiguracji w CI.

> „Bądźmy ostrożniejsi” to nie jest zadanie. Zadanie zmienia system.""",
"11ab0e8890": "Uczenie się na incydentach",
"c281219719": "Które zadanie jest dobre?",
"aae3a1d7ec": "„Dodać alert zajętości dysku przy 85% dla wszystkich serwerów WWW — właścicielka: Olena, do 15 listopada”",
"94b99c7314": "„Bardziej uważać na dyski”",
"3b403f418b": "„Ukarać tego, kto zapełnił dysk”",
"4f783a0f0b": "Dlaczego postmortemy są „blameless”?",
"ce1eeb635b": "Żeby ludzie otwarcie dzielili się wszystkimi faktami i żeby naprawiano system",
"69dee7066e": "Bo nikt nigdy za nic nie odpowiada",
"40c36f365d": "Żeby były krótsze",
"3e4f79276a": "5 dlaczego: „Dysk się zapełnił” → dlaczego? → „zostawiono włączone logowanie debug”. Następne dobre „dlaczego”?",
"7112b74242": "Dlaczego logowanie debug było możliwe na produkcji bez alertu i limitu?",
"b79bd2ff28": "Kto je włączył?",
"43aadfa01e": "Po co w ogóle są dyski?",
"d843014338": "Co należy do podsumowania postmortemu?",
"4a332dbd0b": "Co się zepsuło, na jak długo i jaki był wpływ na użytkowników",
"8e55763529": "Wszystkie polecenia, które wpisałeś",
"817aae7dbd": "Nazwiska winnych",
}
