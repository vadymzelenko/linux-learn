from lib import *

S = 'noc-web01'

lessons = [
    lesson('noc-role', L('Who is a NOC engineer', 'Кто такой NOC-инженер', 'Хто такий NOC-інженер'), ['cat', 'less'], setup=S, steps=[
        reading(L(
            """## Network Operations Center
A **NOC** is the team that watches the health of servers, networks and applications around the clock. When a website slows down at 3 AM, the NOC notices first — usually before customers do.

## What you do on a shift
- Watch dashboards and the **monitoring** system
- React to every **alert**: confirm it, assess impact, act or escalate
- Follow **runbooks** — step-by-step instructions for known problems
- Keep the **ticket** up to date: what happened, when, what you did
- Hand over the shift: open incidents, things to watch

## Support levels
| Level | Who | What they do |
|---|---|---|
| L1 | NOC | detect, triage, run runbooks, escalate |
| L2 | system / service experts | deep diagnostics, fixes |
| L3 | product developers | code bugs, architecture |

> A great NOC engineer is not the one who knows everything, but the one who **reacts fast, writes clearly and escalates on time**.""",
            """## Network Operations Center
**NOC** — это команда, которая круглосуточно следит за здоровьем серверов, сетей и приложений. Когда сайт начинает тормозить в 3 часа ночи, NOC замечает это первым — обычно раньше клиентов.

## Что вы делаете на смене
- Смотрите на дашборды и систему **мониторинга**
- Реагируете на каждый **алерт**: подтверждаете, оцениваете влияние, действуете или эскалируете
- Работаете по **ранбукам** — пошаговым инструкциям для известных проблем
- Ведёте **тикет**: что случилось, когда, что вы сделали
- Передаёте смену: открытые инциденты, за чем присматривать

## Линии поддержки
| Линия | Кто | Что делает |
|---|---|---|
| L1 | NOC | обнаруживает, сортирует, выполняет ранбуки, эскалирует |
| L2 | эксперты по системам и сервисам | глубокая диагностика, исправления |
| L3 | разработчики продукта | баги в коде, архитектура |

> Хороший NOC-инженер — не тот, кто знает всё, а тот, кто **быстро реагирует, понятно пишет и вовремя эскалирует**.""",
            """## Network Operations Center
**NOC** — це команда, яка цілодобово стежить за здоров’ям серверів, мереж і застосунків. Коли сайт починає гальмувати о 3-й ночі, NOC помічає це першим — зазвичай раніше за клієнтів.

## Що ви робите на зміні
- Дивитеся на дашборди та систему **моніторингу**
- Реагуєте на кожен **алерт**: підтверджуєте, оцінюєте вплив, дієте або ескалюєте
- Працюєте за **ранбуками** — покроковими інструкціями для відомих проблем
- Ведете **тікет**: що сталося, коли, що ви зробили
- Передаєте зміну: відкриті інциденти, за чим наглядати

## Лінії підтримки
| Лінія | Хто | Що робить |
|---|---|---|
| L1 | NOC | виявляє, сортує, виконує ранбуки, ескалює |
| L2 | експерти із систем і сервісів | глибока діагностика, виправлення |
| L3 | розробники продукту | баги в коді, архітектура |

> Хороший NOC-інженер — не той, хто знає все, а той, хто **швидко реагує, зрозуміло пише й вчасно ескалює**."""),
            title=L('Your new job', 'Ваша новая работа', 'Ваша нова робота')),
        task(L("It's your first shift on server web01. Read the on-call note ~/notes/oncall.txt — who is the L2 for the website?",
               'Ваша первая смена на сервере web01. Прочитайте памятку дежурного ~/notes/oncall.txt — кто L2 по сайту?',
               'Ваша перша зміна на сервері web01. Прочитайте пам’ятку чергового ~/notes/oncall.txt — хто L2 по сайту?'),
             [used('cat', L('Read the file with cat (or less)', 'Прочитайте файл через cat (или less)', 'Прочитайте файл через cat (або less)')),
              out(L('The on-call list is on the screen', 'Список дежурных на экране', 'Список чергових на екрані'), text='L2 web')],
             L('cat prints a file; the path starts at your home ~.', 'cat выводит файл; путь начинается с домашней папки ~.', 'cat виводить файл; шлях починається з домашньої теки ~.'),
             'cat', ['cat ~/notes/oncall.txt'],
             instructions=L('1. Type `cat ~/notes/oncall.txt`\n2. Find the line "L2 web"', '1. Наберите `cat ~/notes/oncall.txt`\n2. Найдите строку «L2 web»', '1. Наберіть `cat ~/notes/oncall.txt`\n2. Знайдіть рядок «L2 web»')),
        task(L('Runbooks are stored in ~/runbooks. List them and open the one about a website being down.',
               'Ранбуки лежат в ~/runbooks. Посмотрите список и откройте тот, что про падение сайта.',
               'Ранбуки лежать у ~/runbooks. Перегляньте список і відкрийте той, що про падіння сайту.'),
             [used('ls', L('List the runbooks', 'Посмотрите список ранбуков', 'Перегляньте список ранбуків')),
              out(L('The website runbook is open', 'Ранбук про сайт открыт', 'Ранбук про сайт відкрито'), text='Escalate to L2')],
             L('ls shows the files, cat (or less) reads one.', 'ls покажет файлы, cat (или less) прочитает один из них.', 'ls покаже файли, cat (або less) прочитає один із них.'),
             'cat', ['ls ~/runbooks', 'cat ~/runbooks/website-down.md'],
             instructions=L('1. `ls ~/runbooks`\n2. `cat ~/runbooks/website-down.md`', '1. `ls ~/runbooks`\n2. `cat ~/runbooks/website-down.md`', '1. `ls ~/runbooks`\n2. `cat ~/runbooks/website-down.md`')),
        quiz(L('An alert fires, you followed the runbook for 15 minutes and the site is still down. What now?', 'Сработал алерт, вы 15 минут действуете по ранбуку, а сайт всё ещё лежит. Что дальше?', 'Спрацював алерт, ви 15 хвилин дієте за ранбуком, а сайт досі лежить. Що далі?'),
             [L('Escalate to L2 as the runbook says', 'Эскалировать на L2, как написано в ранбуке', 'Ескалювати на L2, як написано в ранбуку'),
              L('Keep trying alone until it works', 'Пытаться дальше в одиночку, пока не получится', 'Пробувати далі самостійно, поки не вийде'),
              L('Close the alert as a false positive', 'Закрыть алерт как ложное срабатывание', 'Закрити алерт як хибне спрацювання')], 0,
             L('Time matters more than pride. Escalating on time shortens the outage.', 'Время важнее самолюбия. Своевременная эскалация сокращает простой.', 'Час важливіший за самолюбство. Вчасна ескалація скорочує простій.')),
        quiz(L('Which task belongs to L1 (the NOC)?', 'Какая задача относится к L1 (NOC)?', 'Яке завдання належить L1 (NOC)?'),
             [L('Confirm an alert and follow the runbook', 'Подтвердить алерт и выполнить ранбук', 'Підтвердити алерт і виконати ранбук'),
              L('Rewrite the payment module code', 'Переписать код платёжного модуля', 'Переписати код платіжного модуля'),
              L('Choose a new database for the product', 'Выбрать новую базу данных для продукта', 'Обрати нову базу даних для продукту')], 0),
    ]),

    lesson('noc-monitoring', L('Monitoring and alerts', 'Мониторинг и алерты', 'Моніторинг і алерти'), ['curl'], setup=S, steps=[
        reading(L(
            """## Three kinds of signals
- **Metrics** — numbers over time: CPU %, free disk, requests per second, error rate
- **Logs** — text events: "ERROR database connection refused"
- **Checks** — active probes: "does http://shop/health answer 200?"

## The four golden signals
1. **Latency** — how long requests take
2. **Traffic** — how many requests arrive
3. **Errors** — how many fail (5xx)
4. **Saturation** — how full the resources are (CPU, memory, disk)

## Thresholds and alerts
An alert fires when a metric crosses a **threshold**: warning at 80% disk, critical at 90%. Good alerts are *actionable*: there is something a human can do.

!> Too many noisy alerts lead to *alert fatigue*: people start ignoring them — and miss the real one.""",
            """## Три вида сигналов
- **Метрики** — числа во времени: CPU %, свободный диск, запросы в секунду, доля ошибок
- **Логи** — текстовые события: «ERROR database connection refused»
- **Проверки** — активные пробы: «отвечает ли http://shop/health кодом 200?»

## Четыре золотых сигнала
1. **Задержка** (latency) — сколько длится запрос
2. **Трафик** — сколько запросов приходит
3. **Ошибки** — сколько запросов падает (5xx)
4. **Насыщение** (saturation) — насколько заняты ресурсы (CPU, память, диск)

## Пороги и алерты
Алерт срабатывает, когда метрика пересекает **порог**: warning на 80% диска, critical на 90%. Хороший алерт *действенный*: человеку есть что сделать.

!> Слишком много шумных алертов ведёт к «усталости от алертов»: их начинают игнорировать — и пропускают настоящий.""",
            """## Три види сигналів
- **Метрики** — числа в часі: CPU %, вільний диск, запити за секунду, частка помилок
- **Логи** — текстові події: «ERROR database connection refused»
- **Перевірки** — активні проби: «чи відповідає http://shop/health кодом 200?»

## Чотири золоті сигнали
1. **Затримка** (latency) — скільки триває запит
2. **Трафік** — скільки запитів надходить
3. **Помилки** — скільки запитів падає (5xx)
4. **Насичення** (saturation) — наскільки зайняті ресурси (CPU, пам’ять, диск)

## Пороги та алерти
Алерт спрацьовує, коли метрика перетинає **поріг**: warning на 80% диска, critical на 90%. Добрий алерт *дієвий*: людині є що зробити.

!> Забагато шумних алертів веде до «втоми від алертів»: їх починають ігнорувати — і пропускають справжній."""),
            title=L('What we watch', 'За чем мы следим', 'За чим ми стежимо')),
        theory(L(
            """## A health check by hand
Monitoring often just calls a special URL. You can do the same with `curl`:
```
$ curl -s localhost/health
$ curl -I localhost
```
`-s` hides progress, `-I` asks only for the headers — the first line contains the **status code**.""",
            """## Проверка здоровья вручную
Мониторинг часто просто вызывает специальный URL. То же можно сделать через `curl`:
```
$ curl -s localhost/health
$ curl -I localhost
```
`-s` скрывает прогресс, `-I` просит только заголовки — в первой строке будет **код ответа**.""",
            """## Перевірка здоров’я вручну
Моніторинг часто просто викликає спеціальний URL. Те саме можна зробити через `curl`:
```
$ curl -s localhost/health
$ curl -I localhost
```
`-s` ховає прогрес, `-I` просить лише заголовки — у першому рядку буде **код відповіді**."""),
            demo=['curl -s localhost/health', 'curl -I localhost']),
        task(L('Monitoring says "web01 health check: UNKNOWN". Check the health endpoint http://localhost/health yourself.',
               'Мониторинг пишет «web01 health check: UNKNOWN». Проверьте эндпоинт http://localhost/health сами.',
               'Моніторинг пише «web01 health check: UNKNOWN». Перевірте ендпоінт http://localhost/health самі.'),
             [used('curl', L('Request it with curl', 'Запросите его через curl', 'Запитайте його через curl')),
              out(L('The service answered OK', 'Сервис ответил OK', 'Сервіс відповів OK'), regex='^OK$')],
             L('curl URL prints the answer of the server.', 'curl URL печатает ответ сервера.', 'curl URL друкує відповідь сервера.'), 'curl', ['curl localhost/health'],
             instructions=L('1. Type `curl localhost/health`\n2. Expect the answer OK', '1. Наберите `curl localhost/health`\n2. Ожидаемый ответ — OK', '1. Наберіть `curl localhost/health`\n2. Очікувана відповідь — OK')),
        task(L('Get only the HTTP headers of the main page and read the status code.', 'Получите только HTTP-заголовки главной страницы и посмотрите код ответа.', 'Отримайте лише HTTP-заголовки головної сторінки й подивіться код відповіді.'),
             [used('curl', L('Use curl with -I', 'Используйте curl с -I', 'Використайте curl з -I'), flags=['-I']),
              out(L('Status line: HTTP/1.1 200 OK', 'Строка статуса: HTTP/1.1 200 OK', 'Рядок статусу: HTTP/1.1 200 OK'), text='HTTP/1.1 200 OK')],
             L('-I = headers only.', '-I = только заголовки.', '-I = лише заголовки.'), 'curl', ['curl -I localhost']),
        quiz(L('Which of these is a golden signal of saturation?', 'Какой из этих показателей — золотой сигнал «насыщение»?', 'Який із цих показників — золотий сигнал «насичення»?'),
             [L('Disk is 93% full', 'Диск заполнен на 93%', 'Диск заповнено на 93%'), L('500 requests per second', '500 запросов в секунду', '500 запитів за секунду'), L('2% of requests return 502', '2% запросов возвращают 502', '2% запитів повертають 502')], 0,
             L('Saturation = how full a resource is. Requests per second is traffic, 502s are errors.', 'Насыщение — насколько заполнен ресурс. Запросы в секунду — трафик, 502 — ошибки.', 'Насичення — наскільки заповнений ресурс. Запити за секунду — трафік, 502 — помилки.')),
        quiz(L('An alert "CPU > 50%" fires 40 times a day and nobody ever acts on it. What is the right fix?', 'Алерт «CPU > 50%» срабатывает 40 раз в день, и никто никогда ничего не делает. Как правильно поступить?', 'Алерт «CPU > 50%» спрацьовує 40 разів на день, і ніхто ніколи нічого не робить. Як правильно вчинити?'),
             [L('Tune or remove it: an alert must be actionable', 'Настроить или убрать: алерт должен требовать действия', 'Налаштувати або прибрати: алерт має вимагати дії'),
              L('Mute notifications on your phone', 'Выключить уведомления на телефоне', 'Вимкнути сповіщення на телефоні'),
              L('Add five more similar alerts to be sure', 'Добавить ещё пять похожих алертов для надёжности', 'Додати ще п’ять схожих алертів для певності')], 0),
    ]),

    lesson('noc-incidents', L('Incidents and priorities', 'Инциденты и приоритеты', 'Інциденти та пріоритети'), ['cat'], setup=S, steps=[
        reading(L(
            """## Incident lifecycle
1. **Detect** — an alert or a user report
2. **Acknowledge** — "I'm on it", so nobody else duplicates the work
3. **Triage** — who is affected, how badly, since when
4. **Mitigate** — reduce the damage now: restart, failover, rollback
5. **Resolve** — the service works normally again
6. **Postmortem** — find the root cause so it never repeats

## Severity
| Priority | Meaning | Reaction |
|---|---|---|
| P1 | everything down for everyone, money is lost | page on-call immediately, all hands |
| P2 | a major feature broken for many users | within 15 minutes |
| P3 | minor issue, a workaround exists | working hours |
| P4 | cosmetic | backlog |

> First ask: **what changed?** Most incidents start right after a deploy or a config edit.""",
            """## Жизненный цикл инцидента
1. **Обнаружение** — алерт или жалоба пользователя
2. **Подтверждение** (acknowledge) — «я занимаюсь», чтобы никто не дублировал работу
3. **Триаж** — кого затронуло, насколько сильно, с какого момента
4. **Митигация** — уменьшить ущерб прямо сейчас: рестарт, переключение, откат
5. **Решение** — сервис снова работает нормально
6. **Постмортем** — найти корневую причину, чтобы не повторилось

## Приоритет
| Приоритет | Значение | Реакция |
|---|---|---|
| P1 | всё лежит у всех, теряются деньги | сразу будить дежурного, все на борт |
| P2 | сломана важная функция у многих | в течение 15 минут |
| P3 | мелкая проблема, есть обходной путь | в рабочее время |
| P4 | косметика | в бэклог |

> Первый вопрос: **что поменялось?** Большинство инцидентов начинаются сразу после деплоя или правки конфига.""",
            """## Життєвий цикл інциденту
1. **Виявлення** — алерт або скарга користувача
2. **Підтвердження** (acknowledge) — «я займаюся», щоб ніхто не дублював роботу
3. **Тріаж** — кого зачепило, наскільки сильно, з якого моменту
4. **Мітигація** — зменшити шкоду просто зараз: рестарт, перемикання, відкат
5. **Розв’язання** — сервіс знову працює нормально
6. **Постмортем** — знайти кореневу причину, щоб не повторилося

## Пріоритет
| Пріоритет | Значення | Реакція |
|---|---|---|
| P1 | усе лежить у всіх, втрачаються гроші | одразу будити чергового, усі на борт |
| P2 | зламано важливу функцію в багатьох | протягом 15 хвилин |
| P3 | дрібна проблема, є обхідний шлях | у робочий час |
| P4 | косметика | у беклог |

> Перше питання: **що змінилося?** Більшість інцидентів починаються одразу після деплою чи правки конфігу."""),
            title=L('From alert to postmortem', 'От алерта до постмортема', 'Від алерту до постмортему')),
        quiz(L('The online shop does not open for anybody, orders stopped. Priority?', 'Интернет-магазин не открывается ни у кого, заказы остановились. Приоритет?', 'Інтернет-магазин не відкривається ні в кого, замовлення зупинилися. Пріоритет?'),
             [L('P1', 'P1', 'P1'), L('P2', 'P2', 'P2'), L('P3', 'P3', 'P3'), L('P4', 'P4', 'P4')], 0),
        quiz(L('Product images load slowly for 5% of users, everything else works. Priority?', 'Картинки товаров медленно грузятся у 5% пользователей, остальное работает. Приоритет?', 'Зображення товарів повільно вантажаться у 5% користувачів, решта працює. Пріоритет?'),
             [L('P1', 'P1', 'P1'), L('P2', 'P2', 'P2'), L('P3', 'P3', 'P3'), L('P4', 'P4', 'P4')], 2),
        quiz(L('A typo in the footer of the "About us" page. Priority?', 'Опечатка в подвале страницы «О нас». Приоритет?', 'Друкарська помилка в підвалі сторінки «Про нас». Пріоритет?'),
             [L('P1', 'P1', 'P1'), L('P2', 'P2', 'P2'), L('P3', 'P3', 'P3'), L('P4', 'P4', 'P4')], 3),
        quiz(L('The site went down 2 minutes after a new release. The fastest mitigation?', 'Сайт упал через 2 минуты после нового релиза. Самая быстрая митигация?', 'Сайт упав через 2 хвилини після нового релізу. Найшвидша мітигація?'),
             [L('Roll back to the previous release', 'Откатиться на предыдущий релиз', 'Відкотитися на попередній реліз'),
              L('Start debugging the new code line by line', 'Начать отлаживать новый код построчно', 'Почати налагоджувати новий код рядок за рядком'),
              L('Wait, maybe it fixes itself', 'Подождать, может, само пройдёт', 'Зачекати, може, саме минеться')], 0,
             L('Restore the service first, look for the root cause afterwards.', 'Сначала восстановить сервис, корневую причину искать потом.', 'Спочатку відновити сервіс, кореневу причину шукати потім.')),
        quiz(L('Why "acknowledge" an alert before working on it?', 'Зачем «подтверждать» алерт перед работой над ним?', 'Навіщо «підтверджувати» алерт перед роботою над ним?'),
             [L('So colleagues know someone is on it and do not duplicate work', 'Чтобы коллеги знали, что им занимаются, и не дублировали работу', 'Щоб колеги знали, що ним займаються, і не дублювали роботу'),
              L('It closes the incident automatically', 'Это автоматически закрывает инцидент', 'Це автоматично закриває інцидент'),
              L('It restarts the server', 'Это перезагружает сервер', 'Це перезавантажує сервер')], 0),
    ]),

    lesson('noc-sla', L('SLA, SLO and downtime math', 'SLA, SLO и математика простоя', 'SLA, SLO і математика простою'), ['awk'], steps=[
        reading(L(
            """## Three letters you will hear every day
- **SLI** — a measured indicator: share of successful requests, p95 latency
- **SLO** — the internal target for an SLI: "99.95% of requests succeed"
- **SLA** — the promise to customers in a contract, with penalties: "99.9% per month"

## How much downtime is allowed
| Availability | Downtime per month | per year |
|---|---|---|
| 99% | 7 h 18 min | 3.65 days |
| 99.9% | 43 min | 8.8 h |
| 99.95% | 22 min | 4.4 h |
| 99.99% | 4.3 min | 53 min |

The allowed downtime is the **error budget**. Spent it? No risky releases until the next month.

## Speed metrics of a NOC
- **MTTA** — mean time to acknowledge an alert
- **MTTR** — mean time to restore the service

> Every minute counts: at 99.99% you have only about 4 minutes per month.""",
            """## Три буквы, которые вы будете слышать каждый день
- **SLI** — измеряемый показатель: доля успешных запросов, задержка p95
- **SLO** — внутренняя цель для SLI: «99,95% запросов успешны»
- **SLA** — обещание клиентам в договоре, со штрафами: «99,9% в месяц»

## Сколько простоя допустимо
| Доступность | Простой в месяц | в год |
|---|---|---|
| 99% | 7 ч 18 мин | 3,65 дня |
| 99,9% | 43 мин | 8,8 ч |
| 99,95% | 22 мин | 4,4 ч |
| 99,99% | 4,3 мин | 53 мин |

Допустимый простой — это **бюджет ошибок** (error budget). Потратили его? Никаких рискованных релизов до следующего месяца.

## Метрики скорости NOC
- **MTTA** — среднее время до подтверждения алерта
- **MTTR** — среднее время до восстановления сервиса

> Каждая минута на счету: при 99,99% у вас всего около 4 минут в месяц.""",
            """## Три літери, які ви чутимете щодня
- **SLI** — вимірюваний показник: частка успішних запитів, затримка p95
- **SLO** — внутрішня ціль для SLI: «99,95% запитів успішні»
- **SLA** — обіцянка клієнтам у договорі, зі штрафами: «99,9% на місяць»

## Скільки простою допустимо
| Доступність | Простій на місяць | на рік |
|---|---|---|
| 99% | 7 год 18 хв | 3,65 дня |
| 99,9% | 43 хв | 8,8 год |
| 99,95% | 22 хв | 4,4 год |
| 99,99% | 4,3 хв | 53 хв |

Допустимий простій — це **бюджет помилок** (error budget). Витратили його? Жодних ризикованих релізів до наступного місяця.

## Метрики швидкості NOC
- **MTTA** — середній час до підтвердження алерту
- **MTTR** — середній час до відновлення сервісу

> Кожна хвилина на рахунку: за 99,99% у вас лише близько 4 хвилин на місяць."""),
            title=L('Promises in numbers', 'Обещания в цифрах', 'Обіцянки в цифрах')),
        quiz(L('The SLA is 99.9% per month. The site was down 50 minutes this month. Is the SLA kept?', 'SLA — 99,9% в месяц. В этом месяце сайт лежал 50 минут. SLA выполнен?', 'SLA — 99,9% на місяць. Цього місяця сайт лежав 50 хвилин. SLA виконано?'),
             [L('No, the budget is about 43 minutes', 'Нет, бюджет — около 43 минут', 'Ні, бюджет — близько 43 хвилин'), L('Yes, up to 7 hours are allowed', 'Да, допустимо до 7 часов', 'Так, допустимо до 7 годин'), L('Yes, SLA only counts nights', 'Да, SLA считает только ночи', 'Так, SLA рахує лише ночі')], 0),
        quiz(L('What is the difference between an SLO and an SLA?', 'Чем SLO отличается от SLA?', 'Чим SLO відрізняється від SLA?'),
             [L('SLO is an internal target, SLA is a contract with customers', 'SLO — внутренняя цель, SLA — договор с клиентами', 'SLO — внутрішня ціль, SLA — договір із клієнтами'),
              L('They are synonyms', 'Это синонимы', 'Це синоніми'),
              L('SLA is measured in CPU %, SLO in megabytes', 'SLA меряется в % CPU, SLO — в мегабайтах', 'SLA вимірюється у % CPU, SLO — у мегабайтах')], 0,
             L('Teams set the SLO stricter than the SLA to have a safety margin.', 'Команды делают SLO строже SLA, чтобы был запас.', 'Команди роблять SLO суворішим за SLA, щоб мати запас.')),
        quiz(L('MTTA went from 2 to 20 minutes this month. What does it tell you?', 'MTTA в этом месяце вырос с 2 до 20 минут. О чём это говорит?', 'MTTA цього місяця зріс із 2 до 20 хвилин. Про що це свідчить?'),
             [L('Alerts are acknowledged much later — check on-call routing and alert fatigue', 'Алерты подтверждают намного позже — проверьте маршрутизацию дежурств и шум алертов', 'Алерти підтверджують значно пізніше — перевірте маршрутизацію чергувань і шум алертів'),
              L('Servers became 10 times faster', 'Серверы стали в 10 раз быстрее', 'Сервери стали в 10 разів швидшими'),
              L('Fewer incidents happened', 'Инцидентов стало меньше', 'Інцидентів стало менше')], 0),
        task(L('Practise the math in the shell: calculate 30 days × 24 h × 60 min × 0.001 (the 0.1% budget) with awk and print the result.',
               'Потренируйте математику в оболочке: посчитайте 30 дней × 24 ч × 60 мин × 0,001 (бюджет 0,1%) через awk и выведите результат.',
               'Потренуйте математику в оболонці: порахуйте 30 днів × 24 год × 60 хв × 0,001 (бюджет 0,1%) через awk і виведіть результат.'),
             [used('awk', L('Calculate with awk', 'Посчитайте через awk', 'Порахуйте через awk')),
              out(L('43.2 minutes', '43,2 минуты', '43,2 хвилини'), text='43.2')],
             L("awk 'BEGIN { print ... }' calculates without input.", "awk 'BEGIN { print ... }' считает без входных данных.", "awk 'BEGIN { print ... }' рахує без вхідних даних."),
             'awk', ["awk 'BEGIN { print 30*24*60*0.001 }'"],
             instructions=L("1. Type `awk 'BEGIN { print 30*24*60*0.001 }'`\n2. The answer is the monthly budget in minutes", "1. Наберите `awk 'BEGIN { print 30*24*60*0.001 }'`\n2. Ответ — месячный бюджет в минутах", "1. Наберіть `awk 'BEGIN { print 30*24*60*0.001 }'`\n2. Відповідь — місячний бюджет у хвилинах")),
    ]),

    lesson('noc-first-look', L('First look at a server', 'Первый взгляд на сервер', 'Перший погляд на сервер'), ['hostname', 'uptime', 'w', 'date'], setup=S, steps=[
        theory(L(
            """## Before you touch anything
You logged in after an alert. Four quick questions first:
1. **Am I on the right machine?** `hostname`
2. **Who am I?** `whoami` — you will need `sudo` for repairs
3. **Did it reboot recently?** `uptime` — "up 3 min" after an incident is a clue
4. **Who else is here?** `w` — maybe a colleague is already fixing it

> Write down the time with `date` — the ticket timeline starts now.

!> Restarting the wrong server is a classic incident of its own. Always check the hostname.""",
            """## Прежде чем что-то трогать
Вы зашли на сервер после алерта. Сначала четыре быстрых вопроса:
1. **Я на той машине?** `hostname`
2. **Кто я?** `whoami` — для ремонта понадобится `sudo`
3. **Не перезагружалась ли она?** `uptime` — «up 3 min» после инцидента — это зацепка
4. **Кто ещё здесь?** `w` — возможно, коллега уже чинит

> Запишите время командой `date` — хронология тикета начинается сейчас.

!> Перезапустить не тот сервер — классический инцидент сам по себе. Всегда проверяйте hostname.""",
            """## Перш ніж щось чіпати
Ви зайшли на сервер після алерту. Спершу чотири швидкі питання:
1. **Я на тій машині?** `hostname`
2. **Хто я?** `whoami` — для ремонту знадобиться `sudo`
3. **Чи не перезавантажувалася вона?** `uptime` — «up 3 min» після інциденту — це зачіпка
4. **Хто ще тут?** `w` — можливо, колега вже лагодить

> Запишіть час командою `date` — хронологія тікета починається зараз.

!> Перезапустити не той сервер — класичний інцидент сам собою. Завжди перевіряйте hostname."""),
            title=L('The 30-second check', 'Проверка за 30 секунд', 'Перевірка за 30 секунд'), demo=['hostname', 'uptime', 'w']),
        task(L('Make sure you are on the right machine: print its host name.', 'Убедитесь, что вы на нужной машине: выведите её имя.', 'Переконайтеся, що ви на потрібній машині: виведіть її ім’я.'),
             [used('hostname', L('Run hostname', 'Выполните hostname', 'Виконайте hostname')), out(L('It is web01', 'Это web01', 'Це web01'), text='web01')],
             L('The command has the same name as what you need.', 'Команда называется так же, как то, что нужно узнать.', 'Команда називається так само, як те, що треба дізнатися.'), 'hostname', ['hostname']),
        task(L('How long has the server been running, and what is the load average?', 'Сколько сервер уже работает и какая у него средняя нагрузка?', 'Скільки сервер уже працює і яке в нього середнє навантаження?'),
             [used('uptime', L('Use uptime', 'Используйте uptime', 'Використайте uptime')), out(L('Load average is visible', 'Видна средняя нагрузка', 'Видно середнє навантаження'), text='load average')],
             L('One word: up + time.', 'Одно слово: up + time.', 'Одне слово: up + time.'), 'uptime', ['uptime']),
        task(L('Check who else is logged in to the server right now.', 'Проверьте, кто ещё сейчас залогинен на сервере.', 'Перевірте, хто ще зараз залогінений на сервері.'),
             [used('w', L('Use w (or who)', 'Используйте w (или who)', 'Використайте w (або who)')), out(L('The user list is visible', 'Виден список пользователей', 'Видно список користувачів'), text='pts/0')],
             L('The shortest command in Linux: a single letter.', 'Самая короткая команда Linux — одна буква.', 'Найкоротша команда Linux — одна літера.'), 'w', ['w']),
        predict('uptime -p', ['up 3 days, 2 hours, 14 minutes', 'up 3 min', 'up 14 days'], 0,
                L('-p (pretty) prints only how long the system is up.', '-p (pretty) выводит только время работы системы.', '-p (pretty) виводить лише час роботи системи.'), setup=S, context=['uptime']),
        quiz(L('After a "server unreachable" alert uptime shows "up 2 min". What does it most likely mean?', 'После алерта «сервер недоступен» uptime показывает «up 2 min». Что это скорее всего значит?', 'Після алерту «сервер недоступний» uptime показує «up 2 min». Що це найімовірніше означає?'),
             [L('The server rebooted — find out why (logs, power, OOM)', 'Сервер перезагрузился — нужно выяснить почему (логи, питание, OOM)', 'Сервер перезавантажився — треба з’ясувати чому (логи, живлення, OOM)'),
              L('The server is 2 minutes old and brand new', 'Серверу 2 минуты, он новенький', 'Серверу 2 хвилини, він новенький'),
              L('Nothing interesting', 'Ничего интересного', 'Нічого цікавого')], 0),
    ]),
]

module('07-noc-intro.json', 'noc-intro', '/noc/intro', 'headset',
       L('The NOC profession', 'Профессия NOC-инженер', 'Професія NOC-інженер'),
       L('Monitoring, alerts, incidents, priorities and SLAs — the language of operations.', 'Мониторинг, алерты, инциденты, приоритеты и SLA — язык эксплуатации.', 'Моніторинг, алерти, інциденти, пріоритети та SLA — мова експлуатації.'),
       lessons)
