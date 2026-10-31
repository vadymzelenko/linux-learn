"""Adds course/topics to the existing missions and challenges and (re)writes the NOC missions.

Idempotent: NOC missions are replaced on every run.
"""
import contextlib, copy, io, json, os
from lib import *

with contextlib.redirect_stdout(io.StringIO()):
    from noc_web import API_DOWN
    from noc_logs import LOGS, BOT, rows as LOG_ROWS
    from noc_incidents import CHANGED
    from noc_network import NET

MISSIONS = os.path.join(ROOT, 'missions', 'missions.json')
CHALLENGES = os.path.join(ROOT, 'challenges', 'challenges.json')

LINUX_TOPICS = {
    'server-down': ['text-wc-grep', 'text-redirects'],
    'disk-full': ['search-find-type-size', 'files-delete'],
    'sort-downloads': ['files-wildcards', 'files-copy-move'],
    'fix-deploy': ['perm-chmod', 'perm-read'],
    'lost-config': ['search-find-name'],
    'runaway-process': ['power-processes', 'proc-signals'],
    'project-backup': ['files-copy-move', 'search-find-name'],
    'who-is-attacking': ['text-sort-uniq', 'power-text-wizardry'],
    'tmp-cleanup': ['search-find-name', 'files-delete'],
    'ssh-keys': ['perm-chmod'],
}

CHALLENGE_TOPICS = {
    'ch-count-conf': ['text-pipes'], 'ch-newest': ['text-head-tail'], 'ch-mkdir-tree': ['files-create', 'sp-braces'],
    'ch-hidden': ['nav-hidden-and-details'], 'ch-biggest': ['nav-hidden-and-details'], 'ch-copy-safe': ['files-wildcards'],
    'ch-top-score': ['text-sort-uniq'], 'ch-replace': ['power-text-wizardry', 'tp-sed'], 'ch-link': ['perm-links'],
    'ch-private': ['perm-chmod'], 'ch-find-js': ['search-find-name'], 'ch-alias': ['power-variables'],
    'ch-errors-only': ['text-wc-grep', 'text-redirects'], 'ch-disk-hog': ['search-find-type-size'],
}

BOT_N = sum(1 for r in LOG_ROWS if r[0] == BOT)

TICKET = copy.deepcopy(API_DOWN)
TICKET['files']['~/tickets/'] = None
TICKET['files']['~/tickets/INC-3001.txt'] = {"content": "INC-3001  P2  Shop: 5xx rate 40% (alert fired 10:43 UTC)\n"}

DISK = 'noc-busy'

DNS = copy.deepcopy(NET)
DNS['files']['~/tickets/'] = None
DNS['files']['~/tickets/INC-3017.txt'] = {"content": "INC-3017  P3  'legacy.shop.local works on web01 but not from the office laptops'\n"}


def mission(id, title, story, difficulty, requires, topics, setup, checks, hint, cmd, solution, xp, instructions=None):
    m = {"id": id, "course": "noc", "topics": topics, "title": title, "story": story, "difficulty": difficulty, "requires": requires, "xp": xp, "setup": setup}
    if instructions: m["instructions"] = instructions
    m.update({"checks": checks, "hints": {"direction": hint, "command": cmd}, "solution": solution})
    return m


NOC = [
    mission('noc-shop-502',
            L('Black Friday 502', 'Чёрная пятница: 502', 'Чорна п’ятниця: 502'),
            L('10:43 UTC, Black Friday. Alert: the shop returns 5xx to 40% of buyers (ticket ~/tickets/INC-3001.txt). Find which part of the chain is broken, bring the shop back and leave a note in the ticket: what was down and what you did.',
              '10:43 UTC, Чёрная пятница. Алерт: магазин отдаёт 5xx 40% покупателей (тикет ~/tickets/INC-3001.txt). Найдите, какое звено цепочки сломано, верните магазин и оставьте запись в тикете: что лежало и что вы сделали.',
              '10:43 UTC, Чорна п’ятниця. Алерт: магазин віддає 5xx 40% покупців (тікет ~/tickets/INC-3001.txt). Знайдіть, яка ланка ланцюжка зламана, поверніть магазин і залиште запис у тікеті: що лежало і що ви зробили.'),
            2, 'noc-web', ['http-curl', 'svc-systemctl', 'svc-journal'], TICKET,
            [svc('api', 'active', L('The api service is running', 'Сервис api работает', 'Сервіс api працює')),
             used('curl', L('You verified the site with curl', 'Вы проверили сайт через curl', 'Ви перевірили сайт через curl')),
             fcontains('~/tickets/INC-3001.txt', L('The ticket still has its header', 'Заголовок тикета сохранён', 'Заголовок тікета збережено'), text='INC-3001'),
             fcontains('~/tickets/INC-3001.txt', L('The ticket mentions api', 'В тикете упомянут api', 'У тікеті згадано api'), regex='[Aa]pi.*(restart|start)|(restart|start).*api')],
            L('curl -I localhost/api/items → systemctl --failed → status / journal → sudo systemctl restart api → echo "…" >> ticket',
              'curl -I localhost/api/items → systemctl --failed → status / journal → sudo systemctl restart api → echo "…" >> тикет',
              'curl -I localhost/api/items → systemctl --failed → status / journal → sudo systemctl restart api → echo "…" >> тікет'),
            'systemctl',
            ['curl -I http://localhost/api/items', 'systemctl --failed', 'journalctl -u api -n 5', 'sudo systemctl restart api', 'curl -I http://localhost/api/items',
             'echo "10:50 api.service was failed (FATAL ECONNRESET); restarted api, shop returns 200 again" >> ~/tickets/INC-3001.txt'], 120,
            L('1. Confirm: `curl -I http://localhost/api/items`\n2. What is broken? `systemctl --failed`\n3. Why? `journalctl -u api -n 5`\n4. Mitigate and verify with curl\n5. `echo "…" >> ~/tickets/INC-3001.txt`',
              '1. Подтвердите: `curl -I http://localhost/api/items`\n2. Что сломано? `systemctl --failed`\n3. Почему? `journalctl -u api -n 5`\n4. Митигируйте и проверьте через curl\n5. `echo "…" >> ~/tickets/INC-3001.txt`',
              '1. Підтвердіть: `curl -I http://localhost/api/items`\n2. Що зламано? `systemctl --failed`\n3. Чому? `journalctl -u api -n 5`\n4. Мітигуйте й перевірте через curl\n5. `echo "…" >> ~/tickets/INC-3001.txt`')),

    mission('noc-disk-95',
            L('95% and climbing', '95% и растёт', '95% і зростає'),
            L('The root filesystem of web01 is at 95%. Free space by following ~/runbooks/disk-full.md — remove only what the runbook allows — and save the "after" df -h / output to ~/disk-after.txt for the ticket.',
              'Корневая ФС web01 заполнена на 95%. Освободите место по ~/runbooks/disk-full.md — удаляйте только то, что разрешает ранбук — и сохраните вывод df -h / «после» в ~/disk-after.txt для тикета.',
              'Коренева ФС web01 заповнена на 95%. Звільніть місце за ~/runbooks/disk-full.md — видаляйте лише те, що дозволяє ранбук — і збережіть вивід df -h / «після» у ~/disk-after.txt для тікета.'),
            2, 'noc-health', ['health-disk'], DISK,
            [gone('/var/log/app/debug.log.1.gz', L('The old rotated log is removed', 'Старый ротированный лог удалён', 'Старий ротований лог видалено')),
             gone('/var/crash/api.core', L('The core dump is removed', 'Core dump удалён', 'Core dump видалено')),
             fexists('/var/log/app/debug.log', L('The LIVE log was not deleted', 'ЖИВОЙ лог не удалён', 'ЖИВИЙ лог не видалено')),
             fcontains('~/disk-after.txt', L('df output saved', 'Вывод df сохранён', 'Вивід df збережено'), text='/dev/sda1')],
            L('cat the runbook; sudo du -sh /var/log/* /var/crash/*; delete *.gz and the core dump; df -h / > ~/disk-after.txt',
              'cat ранбука; sudo du -sh /var/log/* /var/crash/*; удалить *.gz и core dump; df -h / > ~/disk-after.txt',
              'cat ранбука; sudo du -sh /var/log/* /var/crash/*; видалити *.gz і core dump; df -h / > ~/disk-after.txt'),
            'rm', ['cat ~/runbooks/disk-full.md', 'sudo du -sh /var/log/app/* /var/crash/*', 'sudo rm /var/log/app/debug.log.1.gz /var/crash/api.core', 'df -h / > ~/disk-after.txt'], 110),

    mission('noc-dns-mystery',
            L('Works on my server', 'У меня на сервере работает', 'У мене на сервері працює'),
            L('Ticket INC-3017: legacy.shop.local opens from web01 but not from the office. Find out WHY. Write into ~/tickets/INC-3017.txt the IP that web01 uses for legacy.shop.local and the file where it comes from.',
              'Тикет INC-3017: legacy.shop.local открывается с web01, но не из офиса. Выясните ПОЧЕМУ. Запишите в ~/tickets/INC-3017.txt IP, который web01 использует для legacy.shop.local, и файл, откуда он берётся.',
              'Тікет INC-3017: legacy.shop.local відкривається з web01, але не з офісу. З’ясуйте ЧОМУ. Запишіть у ~/tickets/INC-3017.txt IP, який web01 використовує для legacy.shop.local, і файл, звідки він береться.'),
            2, 'noc-network', ['net-dns'], DNS,
            [used('dig', L('You asked DNS with dig', 'Вы спросили DNS через dig', 'Ви запитали DNS через dig')),
             fcontains('~/tickets/INC-3017.txt', L('The IP 10.0.9.15', 'IP 10.0.9.15', 'IP 10.0.9.15'), text='10.0.9.15'),
             fcontains('~/tickets/INC-3017.txt', L('The source: /etc/hosts', 'Источник: /etc/hosts', 'Джерело: /etc/hosts'), text='/etc/hosts')],
            L('ping legacy.shop.local shows the IP; dig says NXDOMAIN — so the name is not in DNS. grep it in /etc/hosts.',
              'ping legacy.shop.local покажет IP; dig скажет NXDOMAIN — значит, в DNS имени нет. Найдите его grep в /etc/hosts.',
              'ping legacy.shop.local покаже IP; dig скаже NXDOMAIN — отже, у DNS імені немає. Знайдіть його grep в /etc/hosts.'),
            'dig', ['ping -c 1 legacy.shop.local', 'dig legacy.shop.local', 'grep legacy /etc/hosts', 'echo "legacy.shop.local = 10.0.9.15 only in /etc/hosts on web01, missing in DNS" >> ~/tickets/INC-3017.txt'], 110),

    mission('noc-bot-report',
            L('The 401 storm', 'Шторм из 401', 'Шторм із 401'),
            L('Security asks for a short report: which IP hammers /login on the shop, how many requests it made and with which user agent. Analyse /var/log/nginx/access.log and write the answer into ~/incident/bot.txt.',
              'Безопасники просят короткий отчёт: какой IP долбит /login магазина, сколько запросов он сделал и с каким user agent. Проанализируйте /var/log/nginx/access.log и запишите ответ в ~/incident/bot.txt.',
              'Безпека просить короткий звіт: який IP довбає /login магазину, скільки запитів він зробив і з яким user agent. Проаналізуйте /var/log/nginx/access.log і запишіть відповідь у ~/incident/bot.txt.'),
            3, 'noc-logs', ['logs-access', 'logs-grep', 'tp-awk'], LOGS,
            [fcontains('~/incident/bot.txt', L(f'The IP {BOT}', f'IP {BOT}', f'IP {BOT}'), text=BOT),
             fcontains('~/incident/bot.txt', L(f'The count: {BOT_N}', f'Количество: {BOT_N}', f'Кількість: {BOT_N}'), regex=f'\\b{BOT_N}\\b'),
             fcontains('~/incident/bot.txt', L('The user agent', 'User agent', 'User agent'), text='python-requests')],
            L("awk '$9 == 401 {print $1}' … | sort | uniq -c; then grep the IP and look at the last field",
              "awk '$9 == 401 {print $1}' … | sort | uniq -c; затем grep по IP и посмотрите последнее поле",
              "awk '$9 == 401 {print $1}' … | sort | uniq -c; потім grep за IP і подивіться останнє поле"),
            'awk', ['mkdir -p ~/incident', "awk '$9 == 401 {print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -1",
                    f"grep -c {BOT} /var/log/nginx/access.log", f"grep -m 1 {BOT} /var/log/nginx/access.log",
                    f'echo "{BOT} sent {BOT_N} POST /login requests (all 401), user agent python-requests/2.31" > ~/incident/bot.txt'], 150),

    mission('noc-bad-change',
            L('Friday deploy', 'Деплой в пятницу', 'Деплой у п’ятницю'),
            L('12:15 UTC. Right after change CHG-118 the shop is down. Follow the rollback plan in ~/tickets/CHG-118.txt, make sure the shop answers 200 and append "rolled back" with the time to the change ticket.',
              '12:15 UTC. Сразу после изменения CHG-118 магазин лёг. Выполните план отката из ~/tickets/CHG-118.txt, убедитесь, что магазин отвечает 200, и допишите в тикет изменения «rolled back» со временем.',
              '12:15 UTC. Одразу після зміни CHG-118 магазин ліг. Виконайте план відкату з ~/tickets/CHG-118.txt, переконайтеся, що магазин відповідає 200, і допишіть у тікет зміни «rolled back» із часом.'),
            3, 'noc-ir', ['ir-change', 'svc-config'], CHANGED,
            [fcontains('/etc/nginx/nginx.conf', L('The config is restored', 'Конфиг восстановлен', 'Конфіг відновлено'), text='proxy_pass http://127.0.0.1:3000;'),
             svc('nginx', 'active', L('nginx is active', 'nginx активен', 'nginx активний')),
             used('curl', L('Verified with curl', 'Проверено через curl', 'Перевірено через curl')),
             fcontains('~/tickets/CHG-118.txt', L('"rolled back" noted', 'Отмечено «rolled back»', 'Позначено «rolled back»'), text='rolled back'),
             fcontains('~/tickets/CHG-118.txt', L('The rollback plan is still there', 'План отката на месте', 'План відкату на місці'), text='Rollback plan')],
            L('cat the ticket, diff .bak with the config, sudo cp, sudo systemctl restart nginx, curl, echo >>',
              'cat тикета, diff .bak с конфигом, sudo cp, sudo systemctl restart nginx, curl, echo >>',
              'cat тікета, diff .bak з конфігом, sudo cp, sudo systemctl restart nginx, curl, echo >>'),
            'cp', ['cat ~/tickets/CHG-118.txt', 'diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf', 'sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf',
                   'sudo systemctl restart nginx', 'curl -I http://localhost', 'echo "12:20 rolled back to nginx.conf.bak, nginx active, HTTP 200" >> ~/tickets/CHG-118.txt'], 150),
]

missions = [m for m in json.load(open(MISSIONS)) if m.get('course') != 'noc']
for m in missions:
    m.setdefault('course', 'linux')
    if m['id'] in LINUX_TOPICS: m['topics'] = LINUX_TOPICS[m['id']]
missions += NOC
with open(MISSIONS, 'w') as f:
    json.dump(missions, f, indent=2, ensure_ascii=False)
    f.write('\n')

challenges = json.load(open(CHALLENGES))
for c in challenges:
    if c['id'] in CHALLENGE_TOPICS: c['topics'] = CHALLENGE_TOPICS[c['id']]
with open(CHALLENGES, 'w') as f:
    json.dump(challenges, f, indent=2, ensure_ascii=False)
    f.write('\n')
print(f'{len(missions)} missions ({len(NOC)} NOC), {len(challenges)} challenges')
