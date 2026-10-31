import copy, json, os
from lib import *

base = json.load(open(os.path.join(ROOT, 'fixtures', 'noc-web01.json')))
H = 'web01'
CONF = base['files']['/etc/nginx/nginx.conf']['content']


def with_nginx(state, logs, files=None, config=None):
    spec = copy.deepcopy(base)
    for s in spec['services']:
        if s['name'] == 'nginx':
            s['state'] = state
            s['logs'] = s['logs'] + logs
            if config: s['config'] = config
    spec['files'].update(files or {})
    spec['files']['~/tickets/'] = None
    return spec


NGINX_STOPPED = with_nginx('inactive', [
    f'Oct 31 11:02:40 {H} systemd[1]: Stopping nginx.service - A high performance web server and a reverse proxy server...',
    f'Oct 31 11:02:40 {H} systemd[1]: nginx.service: Deactivated successfully.',
    f'Oct 31 11:02:40 {H} systemd[1]: Stopped nginx.service - A high performance web server and a reverse proxy server.',
], files={'~/tickets/INC-2041.txt': {"content": "INC-2041  P1  Shop is down (monitoring: HTTP check failed from 3 locations)\nOpened 11:04 UTC by monitoring\n"}})

BAD = CONF.replace('proxy_pass http://127.0.0.1:3000; }', 'proxy_pass http://127.0.0.1:3000 }')
ERR = 'nginx: [emerg] directive "proxy_pass" is not terminated by ";" in /etc/nginx/nginx.conf:10'
CHANGED = with_nginx('failed', [
    f'Oct 31 12:15:03 {H} sudo:   deploy : TTY=pts/1 ; PWD=/etc/nginx ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx',
    f'Oct 31 12:15:03 {H} nginx[2210]: {ERR}',
    f'Oct 31 12:15:03 {H} systemd[1]: nginx.service: Control process exited, code=exited, status=1/FAILURE',
    f'Oct 31 12:15:03 {H} systemd[1]: Failed to start nginx.service - A high performance web server and a reverse proxy server.',
], files={
    '/etc/nginx/nginx.conf': {"content": BAD, "owner": "root", "mode": "644"},
    '/etc/nginx/nginx.conf.bak': {"content": CONF, "owner": "root", "mode": "644"},
    '~/tickets/CHG-118.txt': {"content": "CHG-118  12:10 UTC  deploy: tidy up nginx.conf formatting\nRollback plan: restore /etc/nginx/nginx.conf.bak and restart nginx\n"},
}, config={"path": "/etc/nginx/nginx.conf", "mustContain": "proxy_pass http://127.0.0.1:3000;", "error": ERR})

lessons = [
    lesson('ir-lifecycle', L('The incident lifecycle', 'Жизненный цикл инцидента', 'Життєвий цикл інциденту'), ['cat'], steps=[
        reading(L(
            """## Seven steps
1. **Detect** — an alert, a customer, a colleague
2. **Acknowledge** — "I am on it" in the alert tool: nobody else duplicates work, and the escalation timer stops
3. **Assess** — what is broken, for whom, since when → **priority**
4. **Communicate** — open a ticket / channel, the first update within minutes
5. **Mitigate** — restore service *first* (restart, failover, rollback)
6. **Resolve** — remove the root cause
7. **Review** — postmortem: what we learn, what we change

## Mitigate ≠ resolve
==Mitigation== returns the service to users, ==resolution== makes sure it does not happen again. During the incident you mitigate; you resolve when users are happy again.

> The first 5 minutes decide the incident: acknowledge, assess, communicate. Silence is the worst update.""",
            """## Семь шагов
1. **Обнаружить** — алерт, клиент, коллега
2. **Подтвердить (acknowledge)** — «я занимаюсь» в системе алертов: никто не дублирует работу, таймер эскалации останавливается
3. **Оценить** — что сломано, у кого, с какого времени → **приоритет**
4. **Сообщить** — тикет / канал, первое обновление в течение минут
5. **Смягчить (mitigate)** — *сначала* вернуть сервис (рестарт, переключение, откат)
6. **Устранить (resolve)** — убрать первопричину
7. **Разобрать** — постмортем: чему научились, что меняем

## Митигация ≠ устранение
==Митигация== возвращает сервис пользователям, ==устранение== гарантирует, что это не повторится. Во время инцидента вы смягчаете; устраняете, когда пользователи снова довольны.

> Первые 5 минут решают всё: подтвердить, оценить, сообщить. Молчание — худшее обновление.""",
            """## Сім кроків
1. **Виявити** — алерт, клієнт, колега
2. **Підтвердити (acknowledge)** — «я займаюся» в системі алертів: ніхто не дублює роботу, таймер ескалації зупиняється
3. **Оцінити** — що зламано, у кого, відколи → **пріоритет**
4. **Повідомити** — тікет / канал, перше оновлення протягом хвилин
5. **Пом’якшити (mitigate)** — *спершу* повернути сервіс (рестарт, перемикання, відкат)
6. **Усунути (resolve)** — прибрати першопричину
7. **Розібрати** — постмортем: чого навчилися, що змінюємо

## Мітигація ≠ усунення
==Мітигація== повертає сервіс користувачам, ==усунення== гарантує, що це не повториться. Під час інциденту ви пом’якшуєте; усуваєте, коли користувачі знову задоволені.

> Перші 5 хвилин вирішують усе: підтвердити, оцінити, повідомити. Мовчання — найгірше оновлення."""),
            title=L('From alert to postmortem', 'От алерта до постмортема', 'Від алерту до постмортему')),
        quiz(L('An alert fires at 03:00. What do you do FIRST?', 'Алерт сработал в 03:00. Что вы делаете ПЕРВЫМ?', 'Алерт спрацював о 03:00. Що ви робите ПЕРШИМ?'),
             [L('Acknowledge it, so the team knows someone is on it', 'Подтверждаю (ack), чтобы команда знала, что им занимаются', 'Підтверджую (ack), щоб команда знала, що ним займаються'), L('Start rewriting the config', 'Начинаю переписывать конфиг', 'Починаю переписувати конфіг'), L('Wait to see if it resolves itself', 'Жду, вдруг само пройдёт', 'Чекаю, раптом саме мине')], 0),
        quiz(L('The database is slow; you switch traffic to the replica and users are fine. What did you just do?', 'База тормозит; вы переключили трафик на реплику, и пользователям хорошо. Что вы сделали?', 'База гальмує; ви перемкнули трафік на репліку, і користувачам добре. Що ви зробили?'),
             [L('Mitigation — the root cause is still there', 'Митигацию — первопричина осталась', 'Мітигацію — першопричина залишилася'), L('Resolution — the incident is closed forever', 'Устранение — инцидент закрыт навсегда', 'Усунення — інцидент закрито назавжди'), L('A postmortem', 'Постмортем', 'Постмортем')], 0),
        quiz(L('Which update to stakeholders is best?', 'Какое обновление для заинтересованных лучше?', 'Яке оновлення для зацікавлених найкраще?'),
             [L('"11:10 UTC: checkout returns errors for ~30% of users. Cause under investigation (nginx/api). Next update 11:25."', '«11:10 UTC: оформление заказа выдаёт ошибки ~30% пользователей. Причину ищем (nginx/api). Следующее обновление в 11:25.»', '«11:10 UTC: оформлення замовлення видає помилки ~30% користувачів. Причину шукаємо (nginx/api). Наступне оновлення об 11:25.»'),
              L('"Something is broken, working on it"', '«Что-то сломалось, работаем»', '«Щось зламалося, працюємо»'), L('"The upstream returns 502 because of ECONNRESET in pool 20/20"', '«upstream отдаёт 502 из-за ECONNRESET в pool 20/20»', '«upstream віддає 502 через ECONNRESET у pool 20/20»')], 0,
             L('Impact, time, current status and when the next update comes — in plain language.', 'Влияние, время, текущий статус и когда будет следующее обновление — простым языком.', 'Вплив, час, поточний статус і коли буде наступне оновлення — простою мовою.')),
    ]),

    lesson('ir-runbook', L('Following a runbook', 'Работа по ранбуку', 'Робота за ранбуком'), ['cat', 'curl', 'systemctl', 'echo'], setup=NGINX_STOPPED, steps=[
        reading(L(
            """## Runbook = a recipe for a known problem
A good runbook has:
- **when to use** it (which alert)
- **numbered steps** with exact commands
- the **expected result** of each step
- **when to escalate** and to whom

You are on call. Ticket INC-2041 says "Shop is down". The runbook is in `~/runbooks/website-down.md`, the ticket in `~/tickets/INC-2041.txt`.

> Follow the steps in order and write what you saw. "Step 2: nginx inactive since 11:02" helps the next person more than "fixed it".""",
            """## Ранбук — рецепт для известной проблемы
В хорошем ранбуке есть:
- **когда применять** (какой алерт)
- **пронумерованные шаги** с точными командами
- **ожидаемый результат** каждого шага
- **когда эскалировать** и кому

Вы на дежурстве. Тикет INC-2041: «Магазин лежит». Ранбук — в `~/runbooks/website-down.md`, тикет — в `~/tickets/INC-2041.txt`.

> Идите по шагам по порядку и записывайте, что увидели. «Шаг 2: nginx inactive с 11:02» полезнее следующему человеку, чем «починил».""",
            """## Ранбук — рецепт для відомої проблеми
У хорошому ранбуці є:
- **коли застосовувати** (який алерт)
- **пронумеровані кроки** з точними командами
- **очікуваний результат** кожного кроку
- **коли ескалювати** і кому

Ви на чергуванні. Тікет INC-2041: «Магазин лежить». Ранбук — у `~/runbooks/website-down.md`, тікет — у `~/tickets/INC-2041.txt`.

> Ідіть кроками по черзі й записуйте, що побачили. «Крок 2: nginx inactive з 11:02» корисніше наступній людині, ніж «полагодив»."""),
            title=L('INC-2041: shop is down', 'INC-2041: магазин лежит', 'INC-2041: магазин лежить')),
        task(L('Read the runbook for "website down".', 'Прочитайте ранбук «сайт не работает».', 'Прочитайте ранбук «сайт не працює».'),
             [used('cat', L('cat the runbook', 'cat ранбука', 'cat ранбука')), out(L('Escalate to L2 is visible', 'Видно «Escalate to L2»', 'Видно «Escalate to L2»'), text='Escalate to L2')],
             L('cat ~/runbooks/website-down.md', 'cat ~/runbooks/website-down.md', 'cat ~/runbooks/website-down.md'), 'cat', ['cat ~/runbooks/website-down.md']),
        task(L('Step 1: confirm the problem — request http://localhost.', 'Шаг 1: подтвердите проблему — запросите http://localhost.', 'Крок 1: підтвердіть проблему — запитайте http://localhost.'),
             [used('curl', L('curl -I http://localhost', 'curl -I http://localhost', 'curl -I http://localhost')), out(L("Couldn't connect", "Couldn't connect", "Couldn't connect"), text="Couldn't connect")],
             L('curl -I http://localhost', 'curl -I http://localhost', 'curl -I http://localhost'), 'curl', ['curl -I http://localhost']),
        task(L('Step 2: is nginx running? Check its status.', 'Шаг 2: работает ли nginx? Проверьте статус.', 'Крок 2: чи працює nginx? Перевірте статус.'),
             [used('systemctl', L('systemctl status nginx', 'systemctl status nginx', 'systemctl status nginx'), args=['status', 'nginx']), out(L('inactive (dead)', 'inactive (dead)', 'inactive (dead)'), text='inactive')],
             L('systemctl status nginx', 'systemctl status nginx', 'systemctl status nginx'), 'systemctl', ['systemctl status nginx']),
        task(L('nginx was stopped cleanly (not crashed). Start it and confirm the site answers 200.', 'nginx был остановлен штатно (не упал). Запустите его и убедитесь, что сайт отвечает 200.', 'nginx було зупинено штатно (не впав). Запустіть його й переконайтеся, що сайт відповідає 200.'),
             [svc('nginx', 'active', L('nginx is active', 'nginx активен', 'nginx активний')), used('curl', L('Verify with curl', 'Проверьте через curl', 'Перевірте через curl')), out(L('200 OK', '200 OK', '200 OK'), text='200 OK')],
             L('sudo systemctl start nginx; curl -I http://localhost', 'sudo systemctl start nginx; curl -I http://localhost', 'sudo systemctl start nginx; curl -I http://localhost'), 'systemctl', ['sudo systemctl start nginx', 'curl -I http://localhost']),
        task(L('Write the result into the ticket: append a line with "nginx was stopped" and "started" to ~/tickets/INC-2041.txt.', 'Запишите результат в тикет: допишите строку со словами «nginx was stopped» и «started» в ~/tickets/INC-2041.txt.', 'Запишіть результат у тікет: допишіть рядок зі словами «nginx was stopped» і «started» у ~/tickets/INC-2041.txt.'),
             [fcontains('~/tickets/INC-2041.txt', L('The original ticket text is kept', 'Исходный текст тикета сохранён', 'Початковий текст тікета збережено'), text='Opened 11:04'), fcontains('~/tickets/INC-2041.txt', L('"nginx was stopped" is written', 'Записано «nginx was stopped»', 'Записано «nginx was stopped»'), text='nginx was stopped'), fcontains('~/tickets/INC-2041.txt', L('"started" is written', 'Записано «started»', 'Записано «started»'), text='started')],
             L('echo "..." >> FILE  (two > !)', 'echo "..." >> ФАЙЛ  (два > !)', 'echo "..." >> ФАЙЛ  (два > !)'), 'echo', ['echo "11:12 nginx was stopped at 11:02 (clean stop), started it, curl returns 200" >> ~/tickets/INC-2041.txt'],
             prefill='echo "11:12 nginx was stopped at 11:02, started it, curl 200" >> ~/tickets/INC-2041.txt'),
        quiz(L('nginx was stopped cleanly by someone. What else belongs in the ticket?', 'Кто-то штатно остановил nginx. Что ещё стоит записать в тикет?', 'Хтось штатно зупинив nginx. Що ще варто записати в тікет?'),
             [L('A follow-up: find out who stopped it and why (auth.log, change calendar)', 'Задачу на потом: выяснить, кто и зачем его остановил (auth.log, календарь изменений)', 'Задачу на потім: з’ясувати, хто і навіщо його зупинив (auth.log, календар змін)'), L('Nothing — it works now', 'Ничего — сейчас всё работает', 'Нічого — зараз усе працює'), L('The root password', 'Пароль root', 'Пароль root')], 0),
    ]),

    lesson('ir-escalation', L('Escalation', 'Эскалация', 'Ескалація'), ['grep', 'cat'], setup='noc-web01', steps=[
        reading(L(
            """## Escalation is not a failure
L1 (NOC) sees everything but has limited rights and knowledge of each system. L2/L3 are the experts. **Escalating on time is part of the job.**

## When to escalate
- the runbook ends and the service is still down
- the timer in the runbook expired (e.g. 15 minutes)
- the fix needs rights you don't have, or is risky (DB, data deletion)
- P1 — inform the duty manager immediately, even if you are fixing it

## How to escalate
A good handover answers before being asked:
```
INC-2041 P1, shop down since 11:02 UTC.
Checked: nginx inactive; started it; 200 again 11:12.
Unclear: who stopped it. Need: L2 web to review.
```
> Never escalate with "it does not work". Say what you saw, what you did, what you need.""",
            """## Эскалация — не провал
L1 (NOC) видит всё, но у него ограничены права и знание каждой системы. L2/L3 — эксперты. **Вовремя эскалировать — часть работы.**

## Когда эскалировать
- ранбук закончился, а сервис всё ещё лежит
- истёк таймер из ранбука (например, 15 минут)
- для исправления нужны права, которых у вас нет, или это рискованно (БД, удаление данных)
- P1 — сразу сообщить дежурному менеджеру, даже если вы уже чините

## Как эскалировать
Хорошая передача отвечает на вопросы до того, как их зададут:
```
INC-2041 P1, магазин лежит с 11:02 UTC.
Проверил: nginx inactive; запустил; 200 снова в 11:12.
Неясно: кто его остановил. Нужно: L2 web посмотреть.
```
> Никогда не эскалируйте словами «не работает». Скажите, что видели, что сделали, что нужно.""",
            """## Ескалація — не провал
L1 (NOC) бачить усе, але має обмежені права й знання кожної системи. L2/L3 — експерти. **Вчасно ескалювати — частина роботи.**

## Коли ескалювати
- ранбук закінчився, а сервіс усе ще лежить
- сплив таймер із ранбука (наприклад, 15 хвилин)
- для виправлення потрібні права, яких у вас немає, або це ризиковано (БД, видалення даних)
- P1 — одразу повідомити черговому менеджеру, навіть якщо ви вже лагодите

## Як ескалювати
Хороша передача відповідає на питання до того, як їх поставлять:
```
INC-2041 P1, магазин лежить з 11:02 UTC.
Перевірив: nginx inactive; запустив; 200 знову об 11:12.
Незрозуміло: хто його зупинив. Потрібно: L2 web подивитися.
```
> Ніколи не ескалюйте словами «не працює». Скажіть, що бачили, що зробили, що потрібно."""),
            title=L('L1 → L2 → L3', 'L1 → L2 → L3', 'L1 → L2 → L3')),
        task(L('The database looks broken. Find out who is the L2 on call for the DB in ~/notes/oncall.txt.', 'Похоже, сломана база. Узнайте, кто дежурный L2 по БД, в ~/notes/oncall.txt.', 'Схоже, зламано базу. Дізнайтеся, хто черговий L2 з БД, у ~/notes/oncall.txt.'),
             [used('grep', L('grep the notes', 'grep по заметкам', 'grep по нотатках')), out(L('Marek', 'Marek', 'Marek'), text='Marek')],
             L('grep -i db ~/notes/oncall.txt', 'grep -i db ~/notes/oncall.txt', 'grep -i db ~/notes/oncall.txt'), 'grep', ['grep -i db ~/notes/oncall.txt']),
        task(L('How fast must a P2 be picked up? Find the line about severity.', 'Как быстро нужно взять в работу P2? Найдите строку про severity.', 'Як швидко потрібно взяти в роботу P2? Знайдіть рядок про severity.'),
             [used('grep', L('grep Severity', 'grep Severity', 'grep Severity')), out(L('within 15 min', 'within 15 min', 'within 15 min'), text='within 15 min')],
             L('grep -i severity ~/notes/oncall.txt', 'grep -i severity ~/notes/oncall.txt', 'grep -i severity ~/notes/oncall.txt'), 'grep', ['grep -i severity ~/notes/oncall.txt']),
        quiz(L('The runbook says "escalate after 15 minutes". It is minute 14 and you have an idea that might work. What do you do?', 'В ранбуке «эскалировать через 15 минут». Идёт 14-я минута, и у вас есть идея, которая может сработать. Что делать?', 'У ранбуці «ескалювати через 15 хвилин». Іде 14-та хвилина, і у вас є ідея, яка може спрацювати. Що робити?'),
             [L('Escalate now and mention the idea — L2 decides together with you', 'Эскалировать сейчас и упомянуть идею — L2 решит вместе с вами', 'Ескалювати зараз і згадати ідею — L2 вирішить разом із вами'), L('Keep trying for another hour', 'Пробовать ещё час', 'Пробувати ще годину'), L('Close the ticket', 'Закрыть тикет', 'Закрити тікет')], 0),
        quiz(L('Which handover message is useful for L2?', 'Какое сообщение при передаче полезно L2?', 'Яке повідомлення при передачі корисне L2?'),
             [L('"P2: api 500s since 10:50, db pool 20/20 in api.log, restart helped for 5 min, need DB check"', '«P2: api 500 с 10:50, в api.log db pool 20/20, рестарт помог на 5 мин, нужна проверка БД»', '«P2: api 500 з 10:50, в api.log db pool 20/20, рестарт допоміг на 5 хв, потрібна перевірка БД»'), L('"API is broken, please help"', '«API сломан, помогите»', '«API зламано, допоможіть»'), L('"???"', '«???»', '«???»')], 0),
    ]),

    lesson('ir-change', L('Changes and rollback', 'Изменения и откат', 'Зміни та відкат'), ['diff', 'cp', 'systemctl'], setup=CHANGED, steps=[
        reading(L(
            """## Most outages follow a change
Deploys, config edits, network changes. So the first question in an incident is: **what changed recently?**

## Change management in short
- every change has a ticket (CHG-…) with time, owner and a **rollback plan**
- risky changes happen in a maintenance window
- after the change: verify (curl, status, dashboards)

## Rollback first, debug later
If an incident starts right after a change, the fastest mitigation is usually to **roll it back**. Find out *why* it broke afterwards, calmly.
```
$ diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
$ sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
```
> `diff OLD NEW`: lines with `<` are only in OLD, lines with `>` only in NEW.""",
            """## Большинство аварий следует за изменением
Деплои, правки конфигов, изменения сети. Поэтому первый вопрос в инциденте: **что недавно менялось?**

## Управление изменениями вкратце
- у каждого изменения есть тикет (CHG-…) со временем, ответственным и **планом отката**
- рискованные изменения делают в окно обслуживания
- после изменения — проверка (curl, status, дашборды)

## Сначала откат, разбор потом
Если инцидент начался сразу после изменения, самая быстрая митигация — обычно **откатить** его. Почему сломалось — выясняйте потом, спокойно.
```
$ diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
$ sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
```
> `diff СТАРЫЙ НОВЫЙ`: строки с `<` есть только в СТАРОМ, строки с `>` — только в НОВОМ.""",
            """## Більшість аварій іде за зміною
Деплої, правки конфігів, зміни мережі. Тому перше питання в інциденті: **що нещодавно змінювалося?**

## Керування змінами коротко
- кожна зміна має тікет (CHG-…) з часом, відповідальним і **планом відкату**
- ризиковані зміни роблять у вікно обслуговування
- після зміни — перевірка (curl, status, дашборди)

## Спершу відкат, розбір потім
Якщо інцидент почався одразу після зміни, найшвидша мітигація — зазвичай **відкотити** її. Чому зламалося — з’ясовуйте потім, спокійно.
```
$ diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
$ sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf
```
> `diff СТАРИЙ НОВИЙ`: рядки з `<` є лише в СТАРОМУ, рядки з `>` — лише в НОВОМУ."""),
            title=L('What changed?', 'Что поменялось?', 'Що змінилося?')),
        task(L('nginx is down after change CHG-118. Read the change ticket in ~/tickets.', 'nginx лежит после изменения CHG-118. Прочитайте тикет изменения в ~/tickets.', 'nginx лежить після зміни CHG-118. Прочитайте тікет зміни в ~/tickets.'),
             [used('cat', L('cat the ticket', 'cat тикета', 'cat тікета')), out(L('Rollback plan is visible', 'Виден Rollback plan', 'Видно Rollback plan'), text='Rollback plan')],
             L('cat ~/tickets/CHG-118.txt', 'cat ~/tickets/CHG-118.txt', 'cat ~/tickets/CHG-118.txt'), 'cat', ['cat ~/tickets/CHG-118.txt']),
        task(L('Compare the backup with the current config: what exactly changed?', 'Сравните резервную копию с текущим конфигом: что именно поменялось?', 'Порівняйте резервну копію з поточним конфігом: що саме змінилося?'),
             [used('diff', L('diff OLD NEW', 'diff СТАРЫЙ НОВЫЙ', 'diff СТАРИЙ НОВИЙ')), out(L('The proxy_pass line differs', 'Отличается строка proxy_pass', 'Відрізняється рядок proxy_pass'), text='> ')],
             L('diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf', 'diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf', 'diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf'), 'diff', ['diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf']),
        predict('diff /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf | head -n 1', ['10c10', '1c1', '10a11', ''], 0,
                L('"10c10": line 10 of the old file was changed into line 10 of the new one.', '«10c10»: строка 10 старого файла заменена строкой 10 нового.', '«10c10»: рядок 10 старого файлу замінено рядком 10 нового.'), setup=CHANGED, context=['ls /etc/nginx']),
        task(L('Execute the rollback plan and verify the shop answers 200.', 'Выполните план отката и убедитесь, что магазин отвечает 200.', 'Виконайте план відкату й переконайтеся, що магазин відповідає 200.'),
             [fcontains('/etc/nginx/nginx.conf', L('The config is restored', 'Конфиг восстановлен', 'Конфіг відновлено'), text='proxy_pass http://127.0.0.1:3000;'), svc('nginx', 'active', L('nginx is active', 'nginx активен', 'nginx активний')), out(L('HTTP 200', 'HTTP 200', 'HTTP 200'), text='200 OK')],
             L('sudo cp BAK CONF; sudo systemctl restart nginx; curl -I localhost', 'sudo cp BAK CONF; sudo systemctl restart nginx; curl -I localhost', 'sudo cp BAK CONF; sudo systemctl restart nginx; curl -I localhost'), 'cp',
             ['sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf', 'sudo systemctl restart nginx', 'curl -I http://localhost'], xp=30,
             instructions=L('1. `sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf`\n2. `sudo systemctl restart nginx`\n3. `curl -I http://localhost`', '1. `sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf`\n2. `sudo systemctl restart nginx`\n3. `curl -I http://localhost`', '1. `sudo cp /etc/nginx/nginx.conf.bak /etc/nginx/nginx.conf`\n2. `sudo systemctl restart nginx`\n3. `curl -I http://localhost`')),
        quiz(L('A deploy 5 minutes ago, now 5xx errors. Fastest safe mitigation?', 'Деплой 5 минут назад, теперь ошибки 5xx. Самая быстрая безопасная митигация?', 'Деплой 5 хвилин тому, тепер помилки 5xx. Найшвидша безпечна мітигація?'),
             [L('Roll back the deploy', 'Откатить деплой', 'Відкотити деплой'), L('Debug the new code on production', 'Отлаживать новый код на продакшене', 'Налагоджувати новий код на продакшені'), L('Reboot all servers', 'Перезагрузить все серверы', 'Перезавантажити всі сервери')], 0),
    ]),

    lesson('ir-postmortem', L('Postmortem and 5 whys', 'Постмортем и 5 почему', 'Постмортем і 5 чому'), ['cat'], steps=[
        reading(L(
            """## A blameless postmortem
After every serious incident the team writes a short document. **Blameless** means: we look for weak spots in the *system*, not for a guilty person. People who are afraid hide information.

## Structure
1. **Summary** — 2–3 sentences: what, how long, impact
2. **Timeline** — from the first signal to recovery (UTC)
3. **Root cause** — found with "5 whys"
4. **What went well / badly**
5. **Action items** — concrete tasks with an owner and a date

## 5 whys — example
1. Why was the shop down? — nginx did not start.
2. Why? — a syntax error in nginx.conf.
3. Why did it get to production? — the config was not tested before restart.
4. Why not? — there is no `nginx -t` step in the change procedure.
5. Why? — the procedure was written before we used nginx.

**Action item:** add `nginx -t` to the change checklist; CI check for configs.

> "Be more careful" is not an action item. An action item changes the system.""",
            """## Постмортем без поиска виноватых
После каждого серьёзного инцидента команда пишет короткий документ. **Blameless** значит: ищем слабые места в *системе*, а не виноватого человека. Люди, которые боятся, скрывают информацию.

## Структура
1. **Кратко** — 2–3 предложения: что, сколько длилось, влияние
2. **Таймлайн** — от первого сигнала до восстановления (UTC)
3. **Первопричина** — найдена через «5 почему»
4. **Что прошло хорошо / плохо**
5. **Задачи (action items)** — конкретные, с ответственным и сроком

## 5 почему — пример
1. Почему магазин лежал? — nginx не стартовал.
2. Почему? — синтаксическая ошибка в nginx.conf.
3. Почему она попала в прод? — конфиг не проверили перед рестартом.
4. Почему? — в процедуре изменений нет шага `nginx -t`.
5. Почему? — процедуру писали, когда nginx у нас ещё не было.

**Задача:** добавить `nginx -t` в чек-лист изменений; проверка конфигов в CI.

> «Быть внимательнее» — не задача. Задача меняет систему.""",
            """## Постмортем без пошуку винних
Після кожного серйозного інциденту команда пише короткий документ. **Blameless** означає: шукаємо слабкі місця в *системі*, а не винну людину. Люди, які бояться, приховують інформацію.

## Структура
1. **Коротко** — 2–3 речення: що, скільки тривало, вплив
2. **Таймлайн** — від першого сигналу до відновлення (UTC)
3. **Першопричина** — знайдена через «5 чому»
4. **Що пройшло добре / погано**
5. **Завдання (action items)** — конкретні, з відповідальним і терміном

## 5 чому — приклад
1. Чому магазин лежав? — nginx не стартував.
2. Чому? — синтаксична помилка в nginx.conf.
3. Чому вона потрапила в прод? — конфіг не перевірили перед рестартом.
4. Чому? — у процедурі змін немає кроку `nginx -t`.
5. Чому? — процедуру писали, коли nginx у нас ще не було.

**Завдання:** додати `nginx -t` у чек-лист змін; перевірка конфігів у CI.

> «Бути уважнішим» — не завдання. Завдання змінює систему."""),
            title=L('Learning from incidents', 'Учимся на инцидентах', 'Вчимося на інцидентах')),
        quiz(L('Which is a good action item?', 'Какая задача (action item) хорошая?', 'Яке завдання (action item) хороше?'),
             [L('"Add a disk-usage alert at 85% for all web servers — owner: Olena, by Nov 15"', '«Добавить алерт на заполнение диска 85% для всех веб-серверов — Олена, до 15 ноября»', '«Додати алерт на заповнення диска 85% для всіх вебсерверів — Олена, до 15 листопада»'), L('"Be more careful with disks"', '«Внимательнее следить за дисками»', '«Уважніше стежити за дисками»'), L('"Punish whoever filled the disk"', '«Наказать того, кто забил диск»', '«Покарати того, хто заповнив диск»')], 0),
        quiz(L('Why are postmortems "blameless"?', 'Почему постмортемы «blameless»?', 'Чому постмортеми «blameless»?'),
             [L('So people share all facts openly and the system gets fixed', 'Чтобы люди открыто делились фактами и чинилась система', 'Щоб люди відкрито ділилися фактами й лагодилася система'), L('Because nobody is ever responsible', 'Потому что никто никогда не отвечает', 'Бо ніхто ніколи не відповідає'), L('To make them shorter', 'Чтобы они были короче', 'Щоб вони були коротші')], 0),
        quiz(L('5 whys: "The disk filled up" → why? → "debug logging was left on". Next good "why"?', '5 почему: «Диск заполнился» → почему? → «оставили debug-логирование». Следующий хороший «почему»?', '5 чому: «Диск заповнився» → чому? → «залишили debug-логування». Наступне хороше «чому»?'),
             [L('Why was debug logging possible on production without an alert or limit?', 'Почему debug-логирование на проде возможно без алерта и лимита?', 'Чому debug-логування на проді можливе без алерту й ліміту?'), L('Who turned it on?', 'Кто его включил?', 'Хто його ввімкнув?'), L('Why do disks exist?', 'Зачем вообще нужны диски?', 'Навіщо взагалі потрібні диски?')], 0),
        quiz(L('Which belongs in the postmortem summary?', 'Что входит в краткое описание постмортема?', 'Що входить у короткий опис постмортему?'),
             [L('What broke, for how long, and the user impact', 'Что сломалось, на сколько и влияние на пользователей', 'Що зламалося, на скільки і вплив на користувачів'), L('All shell commands you typed', 'Все команды, которые вы вводили', 'Усі команди, які ви вводили'), L('The names of guilty people', 'Имена виноватых', 'Імена винних')], 0),
    ]),
]

module('12-noc-ir.json', 'noc-ir', '/noc/incidents', 'alert-octagon',
       L('Incident management', 'Управление инцидентами', 'Керування інцидентами'),
       L('Lifecycle, runbooks, escalation, changes and rollback, postmortems.', 'Жизненный цикл, ранбуки, эскалация, изменения и откат, постмортемы.', 'Життєвий цикл, ранбуки, ескалація, зміни й відкат, постмортеми.'),
       lessons)
