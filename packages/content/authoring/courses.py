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
]
for c in C:
    c["modules"] = [m for m in c["modules"] if m in existing]
json.dump(C, open(os.path.join(ROOT, 'courses.json'), 'w'), indent=2, ensure_ascii=False)
open(os.path.join(ROOT, 'courses.json'), 'a').write('\n')
print({c['id']: len(c['modules']) for c in C})
