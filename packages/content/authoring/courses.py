"""courses.json — module order of every course (only modules that exist are written)."""
import glob, json, os
from lib import ROOT, L

existing = {json.load(open(p))['id'] for p in glob.glob(os.path.join(ROOT, 'modules', '*.json'))}

C = [
    {"id": "linux", "icon": "terminal", "color": "#3DDC84",
     "title": {**L("Linux from zero", "Linux с нуля", "Linux з нуля"), "pl": "Linux od zera"},
     "subtitle": {**L("Terminal, files, text, permissions, processes, scripts", "Терминал, файлы, текст, права, процессы, скрипты", "Термінал, файли, текст, права, процеси, скрипти"), "pl": "Terminal, pliki, tekst, uprawnienia, procesy, skrypty"},
     "description": {**L("From the very first command to confident everyday work in the Linux terminal.", "От самой первой команды до уверенной ежедневной работы в терминале Linux.", "Від найпершої команди до впевненої щоденної роботи в терміналі Linux."), "pl": "Od pierwszego polecenia do pewnej codziennej pracy w terminalu Linuksa."},
     "modules": ["navigation", "files", "text", "search", "permissions", "fhs", "users", "processes", "shell-pro", "textpro", "power"]},
    {"id": "noc", "icon": "headset", "color": "#5EA9FF",
     "title": {**L("NOC engineer", "NOC-инженер", "NOC-інженер"), "pl": "Inżynier NOC"},
     "subtitle": {**L("Monitoring, networks, services, logs and incidents", "Мониторинг, сети, сервисы, логи и инциденты", "Моніторинг, мережі, сервіси, логи та інциденти"), "pl": "Monitoring, sieci, usługi, logi i incydenty"},
     "description": {**L("Everything a NOC / L1 support engineer does on a shift: diagnose a server, a network and a web service and handle an incident.", "Всё, что делает NOC-инженер / L1 на смене: диагностика сервера, сети и веб-сервиса, работа с инцидентом.", "Усе, що робить NOC-інженер / L1 на зміні: діагностика сервера, мережі та веб-сервісу, робота з інцидентом."), "pl": "Wszystko, co robi inżynier NOC / L1 na zmianie."},
     "modules": ["noc-intro", "noc-health", "noc-network", "noc-web", "noc-logs", "noc-ir"]},
    {"id": "docker", "icon": "docker", "color": "#4AA8FF",
     "title": {**L("Docker", "Docker", "Docker"), "pl": "Docker"},
     "subtitle": {**L("Containers, images, Dockerfile and Compose", "Контейнеры, образы, Dockerfile и Compose", "Контейнери, образи, Dockerfile і Compose"), "pl": "Kontenery, obrazy, Dockerfile i Compose"},
     "description": {**L("Run, debug and build containers: from hello-world to a multi-container app with docker compose.", "Запускайте, отлаживайте и собирайте контейнеры: от hello-world до приложения из нескольких контейнеров на docker compose.", "Запускайте, налагоджуйте й збирайте контейнери: від hello-world до застосунку з кількох контейнерів на docker compose."), "pl": "Uruchamiaj, debuguj i buduj kontenery: od hello-world do aplikacji z wielu kontenerów w docker compose."},
     "modules": ["docker-basics", "docker-ops", "docker-build"]},
    {"id": "git", "icon": "git", "color": "#F1502F",
     "title": {**L("Git & GitHub", "Git и GitHub", "Git і GitHub"), "pl": "Git i GitHub"},
     "subtitle": {**L("Commits, branches, merging, pull requests", "Коммиты, ветки, слияние, pull request’ы", "Коміти, гілки, злиття, pull request’и"), "pl": "Commity, gałęzie, scalanie, pull requesty"},
     "description": {**L("Version control from the first commit to the team workflow on GitHub: branches, conflicts, push and pull, pull requests and issues.", "Контроль версий от первого коммита до командной работы на GitHub: ветки, конфликты, push и pull, pull request’ы и issues.", "Контроль версій від першого коміту до командної роботи на GitHub: гілки, конфлікти, push і pull, pull request’и та issues."), "pl": "Kontrola wersji od pierwszego commita do pracy zespołowej na GitHubie: gałęzie, konflikty, push i pull, pull requesty i zgłoszenia."},
     "modules": ["git-basics", "git-branches", "github"]},
    # announced courses: shown with a "Later" badge, no lessons yet
    {"id": "bash", "icon": "script-text-outline", "color": "#B48EF5", "soon": True,
     "title": {**L("Bash scripting", "Bash-скрипты", "Bash-скрипти"), "pl": "Skrypty Bash"},
     "subtitle": {**L("Variables, functions, arguments, cron", "Переменные, функции, аргументы, cron", "Змінні, функції, аргументи, cron"), "pl": "Zmienne, funkcje, argumenty, cron"},
     "description": {**L("Automate routine work: scripts with arguments, functions, error handling and scheduled jobs.", "Автоматизируйте рутину: скрипты с аргументами, функции, обработка ошибок и задания по расписанию.", "Автоматизуйте рутину: скрипти з аргументами, функції, обробка помилок і завдання за розкладом."), "pl": "Automatyzuj rutynę: skrypty z argumentami, funkcje, obsługa błędów i zadania cykliczne."},
     "modules": []},
    {"id": "networks", "icon": "lan", "color": "#F5A524", "soon": True,
     "title": {**L("Networks deep dive", "Сети глубже", "Мережі глибше"), "pl": "Sieci dogłębnie"},
     "subtitle": {**L("TCP/IP, DNS, SSH, firewalls, TLS", "TCP/IP, DNS, SSH, файрволы, TLS", "TCP/IP, DNS, SSH, файрволи, TLS"), "pl": "TCP/IP, DNS, SSH, zapory, TLS"},
     "description": {**L("How packets travel: addressing and routing, DNS, SSH keys, firewalls and certificates.", "Как путешествуют пакеты: адресация и маршрутизация, DNS, SSH-ключи, файрволы и сертификаты.", "Як подорожують пакети: адресація й маршрутизація, DNS, SSH-ключі, файрволи та сертифікати."), "pl": "Jak podróżują pakiety: adresacja i routing, DNS, klucze SSH, zapory i certyfikaty."},
     "modules": []},
    {"id": "kubernetes", "icon": "ship-wheel", "color": "#4F8DF5", "soon": True,
     "title": {**L("Kubernetes", "Kubernetes", "Kubernetes"), "pl": "Kubernetes"},
     "subtitle": {**L("Pods, deployments, services, kubectl", "Поды, деплойменты, сервисы, kubectl", "Поди, деплойменти, сервіси, kubectl"), "pl": "Pody, deploymenty, serwisy, kubectl"},
     "description": {**L("Run containers at scale: kubectl, pods, deployments, services and rolling updates.", "Запускайте контейнеры в масштабе: kubectl, поды, деплойменты, сервисы и плавные обновления.", "Запускайте контейнери в масштабі: kubectl, поди, деплойменти, сервіси й плавні оновлення."), "pl": "Uruchamiaj kontenery na dużą skalę: kubectl, pody, deploymenty, serwisy i płynne aktualizacje."},
     "modules": []},
]
for c in C:
    c["modules"] = [m for m in c["modules"] if m in existing]
    assert c["modules"] or c.get("soon"), c["id"]
json.dump(C, open(os.path.join(ROOT, 'courses.json'), 'w'), indent=2, ensure_ascii=False)
open(os.path.join(ROOT, 'courses.json'), 'a').write('\n')
print({c['id']: len(c['modules']) for c in C})
