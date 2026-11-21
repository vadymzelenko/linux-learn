T = {
"1d1bf7f2c4": "Przetwarzanie tekstu",
"254a51afb3": "cut, tr, sed, raporty w awk, diff i comm, tee i xargs.",
"f7d5b19019": "cut i tr",
"7b89550470": """## cut — wybierz kolumny
```
$ cut -d, -f2 sales.csv
$ cut -d, -f1,4 sales.csv
$ cut -c1-10 sales.csv
```
- `-d,` — separator (przecinek); `-f2` — pole numer 2; `-f1,4` albo `-f2-3`
- `-c1-10` — znaki od 1 do 10

## tr — zamień lub usuń znaki
```
$ tr a-z A-Z < file
$ tr -s ' ' < contacts.txt
$ tr -d '\\r' < windows.txt > unix.txt
$ tr ',' '\\t' < sales.csv
```
- `-s` — ściśnij powtórzenia („a   b” → „a b”)
- `-d` — usuń te znaki

> tr czyta tylko standardowe wejście — użyj `<` albo potoku, nie przyjmuje nazwy pliku.""",
"b3c5b5fdb7": "Kolumny i znaki",
"91f5b629d2": "Jakie miasta występują w ~/data/sales.csv? Wypisz każde miasto raz (bez nagłówka).",
"41c0caeed8": "3 miasta",
"feca18dd0f": "tail -n +2 PLIK | cut -d, -f2 | sort -u",
"7f0dd6ab86": "W ~/data/contacts.txt jest bałagan ze spacjami. Ściśnij je tak, by między słowami była dokładnie jedna spacja, i zapisz do ~/data/contacts_clean.txt.",
"f01198da69": "Brak podwójnych spacji",
"9d37125e85": "tr -s ' ' < WEJŚCIE > WYJŚCIE",
"f6cf99d2e7": "Wypisz domenę każdego adresu URL z ~/data/urls.txt (shop.example.com, …).",
"3769465acc": "„https://shop…/cart” podzielone po „/” → pole 3 to domena",
"ba78218e7e": "tr zamienia każdą małą literę na jej wielką bliźniaczkę.",
"b3c648cfc5": "sed: szukaj i zamieniaj",
"81812ffa46": """## Słynne s///
```
$ sed 's/old/new/' file
$ sed 's/old/new/g' file
$ sed -i 's/port=8080/port=80/' app.conf
```
- bez `g` — tylko pierwsze dopasowanie **w każdym wierszu**
- `-i` — edytuj plik **na miejscu** (bez tego sed tylko wypisuje)
- `-i.bak` — na miejscu, z kopią zapasową

## Inne codzienne polecenia
```
$ sed -n '2,4p' file
$ sed '/^#/d' app.conf
$ sed '/^$/d' app.conf
$ sed -n '/database/,/^$/p' app.conf
```
- `-n …p` — wypisz tylko wybrane wiersze
- `/regex/d` — usuń pasujące wiersze

> Najpierw testuj bez `-i`. Gdy wynik wygląda dobrze, dodaj `-i`.""",
"bfdd6eeb89": "Edytor strumieniowy",
"88534d21be": "Pokaż ~/config/app.conf bez komentarzy i pustych wierszy — tylko prawdziwe ustawienia.",
"4d210e0d4a": "sed z /d",
"a38b36f6d9": "4 ustawienia",
"17af7a1c5e": "sed '/^#/d; /^$/d' PLIK",
"5d0b01be5a": "Wyłącz debug w ~/config/app.conf (debug=true → debug=false), edytując plik na miejscu.",
"0afc0c67c8": "Brak debug=true",
"b24613f46f": "Reszta nietknięta",
"850ecb7e87": "sed -i 's/debug=true/debug=false/' PLIK",
"2a771e1bae": "Wypisz tylko wiersze od 2 do 4 z ~/data/sales.csv.",
"bc58d61d57": "zaczyna się od 2026-10-01,Kyiv",
"b75b193f6c": "sed -n '2,4p' PLIK",
"e413e33df4": "Bez g zamieniane jest tylko pierwsze dopasowanie w wierszu.",
"f95c3fe6dc": "awk: raporty w jednym wierszu",
"eed8e9ef3c": """## Sumy, średnie, grupy
```
$ awk -F, 'NR>1 {s += $4} END {print s}' sales.csv
$ awk -F, 'NR>1 {s += $4; n++} END {print s/n}' sales.csv
$ awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' sales.csv
$ awk -F, '$4 > 1000' sales.csv
$ awk -F, 'NR>1 {printf "%-6s %5d\\n", $2, $4}' sales.csv
```
- `-F,` — separator pól
- `NR>1` — pomiń nagłówek (wiersz 1)
- `t[$2] += $4` — **tablica**: osobna suma dla każdego miasta
- `for (c in t)` — przejście po tablicy
- `printf` — wyrównane kolumny: `%-6s` tekst do lewej, `%5d` liczba

> `awk '{n[$1]++} END {for (k in n) print n[k], k}'` to wersja awk polecenia `sort | uniq -c`.""",
"628f0f2611": "Tablice w awk",
"ce676c32e7": "Jaka jest łączna kwota wszystkich sprzedaży w ~/data/sales.csv?",
"21dff445ec": "awk z END",
"b3f81552e5": "awk -F, 'NR>1 {s += $4} END {print s}' PLIK",
"c1d4ab9267": "Suma sprzedaży dla każdego miasta, największe najpierw.",
"8b2ffdb504": "tablica awk t[$2]",
"6e06c4c175": "Kyiv 2250 na górze",
"02b33f8145": "awk -F, 'NR>1 {t[$2] += $4} END {for (c in t) print c, t[c]}' PLIK | sort -k2 -rn",
"77dd023e32": "Pokaż tylko sprzedaż laptopów powyżej 1200.",
"f0d26d1a73": "awk z warunkiem &&",
"6731086a18": "1 wiersz",
"4f500b5bc5": "awk -F, '$3 == \"laptop\" && $4 > 1200' PLIK",
"4fc1a319df": "Trzy wiersze mają product = laptop.",
"b6ce8a18bc": "Porównywanie plików: diff i comm",
"6143217c7a": """## diff — co się zmieniło
```
$ diff app.conf.bak app.conf
2c2
< port=80
---
> port=8080
```
- `2c2` — wiersz 2 **z**mieniony (c = change; także `a` dodany, `d` usunięty)
- `<` — z pierwszego (starego) pliku, `>` — z drugiego (nowego)
- `diff -u` — format „unified” znany z gita: `-` usunięte, `+` dodane
- `diff -q` — tylko „różne / identyczne”

## comm — zbiory wierszy
Oba pliki muszą być **posortowane**:
```
$ comm team_old.txt team_new.txt
$ comm -23 team_old.txt team_new.txt
$ comm -13 team_old.txt team_new.txt
$ comm -12 team_old.txt team_new.txt
```
Kolumna 1 — tylko w pierwszym pliku, 2 — tylko w drugim, 3 — w obu. `-23` ukrywa kolumny 2 i 3.""",
"34715615b2": "Znajdź różnicę",
"0aa84e6f60": "Co się zmieniło w ~/config/app.conf w porównaniu z .bak? Pokaż różnicę w formacie unified.",
"b35b744627": "diff -u STARY NOWY",
"0af82f9f6c": "Kto odszedł z zespołu? Pokaż imiona, które są w team_old.txt, a nie ma ich w team_new.txt.",
"ea3949a73b": "tylko ivan",
"a486c110cb": "comm -23 STARY NOWY (oba są już posortowane)",
"4bfb400e57": "A kto dołączył?",
"c6fe1fe445": "tylko petro",
"7c6ff5ee3e": "comm -13 STARY NOWY",
"0f6f5b83cc": "diff wypisuje „5d4”. Co to znaczy?",
"1e937daaa6": "Wiersz 5 pierwszego pliku został usunięty",
"c88e82fb4c": "Wiersz 5 powtórzono 4 razy",
"d5d8b029fe": "Pliki różnią się w 5 z 4 wierszy",
"e6007d9b34": "tee i xargs",
"6116377a20": """## tee — zobacz i zapisz
```
$ grep Kyiv sales.csv | tee kyiv.csv
$ df -h | tee -a report.txt
$ echo "nameserver 1.1.1.1" | sudo tee -a /etc/resolv.conf
```
`tee` kopiuje strumień na ekran **i** do pliku (`-a` dopisuje). Ostatni przykład to klasyka: `sudo echo … > /etc/plik` nie działa, bo przekierowanie wykonuje się jako Ty, a nie jako root.

## xargs — wyjście staje się argumentami
```
$ find . -name '*.tmp' | xargs rm
$ cat servers.txt | xargs -n 1 ping -c 1
$ ls *.log | xargs wc -l
```
Wiele poleceń (rm, wc, ping) przyjmuje **argumenty**, a nie standardowe wejście. xargs buduje dla nich wiersz polecenia. `-n 1` — jeden argument na uruchomienie.""",
"880b32ffb9": "Hydraulika",
"8828a6d16c": "Pokaż sprzedaż ze Lwowa na ekranie I jednocześnie zapisz ją do ~/data/lviv.csv.",
"2f094a332a": "lviv.csv zawiera wiersze Lviv",
"f241470c02": "Zostały też wypisane",
"e44df3f8af": "grep Lviv PLIK | tee ~/data/lviv.csv",
"8dc820750c": "Policz wiersze każdego pliku .txt w ~/data JEDNYM wywołaniem wc przez find + xargs.",
"d87c2af17b": "wiersz total",
"17bebeb81a": "Dlaczego „sudo echo 1 > /root/x” kończy się Permission denied?",
"815ee76786": "Przekierowanie > wykonuje Twoja powłoka, a nie sudo — użyj | sudo tee",
"f79ae7d5ab": "echo nie może działać jako root",
"b49f153bfe": "/root nie istnieje",
}
