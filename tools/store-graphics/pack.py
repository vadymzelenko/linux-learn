"""Packs everything Play Console asks for into one zip, laid out by Console section.

    python3 tools/store-graphics/pack.py     # -> google-play/dist/LinuxTerminalTrainer-GooglePlay.zip
"""
import os
import shutil
import zipfile

import listings

HERE = os.path.dirname(os.path.abspath(__file__))
GP = os.path.normpath(os.path.join(HERE, '..', '..', 'google-play'))
NAME = 'LinuxTerminalTrainer-GooglePlay'
DIST = os.path.join(GP, 'dist')
LANG_DIRS = {'en': '1-en-US (default)', 'ru': '2-ru-RU', 'uk': '3-uk', 'pl': '4-pl-PL'}

README = '''LINUX TERMINAL TRAINER — ВСЁ ДЛЯ GOOGLE PLAY
================================================

Play Console → Развитие → Страница приложения в Google Play → Основная страница.
Папки пронумерованы в порядке полей на странице.

1-texts/  — «Общие текстовые ресурсы»
   1-en-US (default)/  английский — язык по умолчанию
       1-app-name.txt            → «Название приложения» (≤30)
       2-short-description.txt   → «Краткое описание» (≤80)
       3-full-description.txt    → «Полное описание» (≤4000)
       4-release-notes.txt       → «Что нового» при создании выпуска (≤500)
   2-ru-RU/, 3-uk/, 4-pl-PL/  — переводы: «Управление переводами» →
       «Добавить свой перевод» → выберите язык → вставьте те же 4 поля.
   release-notes-all-languages.txt → можно вставить целиком в поле
       «Примечания к выпуску» (все 4 языка сразу, с тегами <en-US> и т.д.)
   google-play.txt → все ответы для «Содержание приложения» (Data safety,
       рейтинг, аудитория, реклама и т.д.) и ссылки на сайт и политику.

2-graphics/  — «Общие визуальные ресурсы»
   icon-512.png              → «Значок приложения» (512×512, < 1 МБ)
   feature-graphic.png       → «Картинка для описания» (1024×500)

3-phone/  — «Скриншоты для смартфона»: phone-1 … phone-8 (1080×1920, 9:16)
4-tablet-7/  — «Скриншоты для семидюймовых планшетов»: 4 шт. (1080×1920)
5-tablet-10/ — «Скриншоты для 10-дюймового планшета»: 4 шт. (1920×1080)
6-desktop/   — «Скриншоты на компьютере»: 6 шт. (1920×1080, 16:9; нужно 4–8)
               Сняты с настоящей браузерной версии приложения.
7-video/     — «Видео»: Play принимает только ссылку YouTube.
   promo-video-1920x1080.mp4 → загрузите на YouTube (доступ «Открытый» или
       «По ссылке», без рекламы и без возрастных ограничений), вставьте ссылку
       вида https://www.youtube.com/watch?v=… в поле «Видео».
   youtube.txt → название и описание для ролика на YouTube.

Android XR — НЕ заполняйте: приложение не делалось для XR-очков/шлемов,
раздел необязательный.

Ссылки:
   Сайт:          https://vadymzelenko.github.io/linux-learn/
   Политика:      https://vadymzelenko.github.io/linux-learn/privacy/
   Веб-версия:    https://vadymzelenko.github.io/linux-learn/app/
   (заработают после включения GitHub Pages: Settings → Pages → Source:
    GitHub Actions)
E-mail поддержки (обязательно): укажите свой публичный ящик в
«Настройки магазина → Контактные данные».
'''

YOUTUBE = '''Title:
Linux Terminal Trainer — learn the Linux command line by doing

Description:
Learn the Linux terminal by typing real commands in a safe simulated system: short lessons, tasks checked by the result, on-call missions, "Explain a command", Docker and Git courses. Free, offline, no account, no ads.

Android: https://play.google.com/store/apps/details?id=com.vadymzelenko.linuxtrainer
In the browser: https://vadymzelenko.github.io/linux-learn/app/
Website: https://vadymzelenko.github.io/linux-learn/

Visibility: Public or Unlisted. Audience: "No, it's not made for kids". No ads on this video.
'''


def main():
    listings.main()
    stage = os.path.join(DIST, NAME)
    shutil.rmtree(stage, ignore_errors=True)
    os.makedirs(stage)

    def put(rel, src=None, text=None):
        dst = os.path.join(stage, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if text is not None:
            with open(dst, 'w', encoding='utf-8') as f:
                f.write(text if text.endswith('\n') else text + '\n')
        else:
            shutil.copy(os.path.join(GP, src), dst)

    put('README.txt', text=README)
    notes = []
    for lang, d in LANG_DIRS.items():
        L = listings.L[lang]
        put(f'1-texts/{d}/1-app-name.txt', text=L['title'])
        put(f'1-texts/{d}/2-short-description.txt', text=L['short'])
        put(f'1-texts/{d}/3-full-description.txt', text=L['full'])
        put(f'1-texts/{d}/4-release-notes.txt', text=L['notes'])
        code = listings.PLAY_CODE[lang]
        notes.append(f'<{code}>\n{L["notes"]}\n</{code}>')
    put('1-texts/release-notes-all-languages.txt', text='\n'.join(notes))
    put('1-texts/google-play.txt', 'google-play.txt')
    put('2-graphics/icon-512.png', 'icon-512.png')
    put('2-graphics/feature-graphic.png', 'feature-graphic.png')
    for i in range(1, 9):
        put(f'3-phone/phone-{i}.png', f'phone-{i}.png')
    for i in range(1, 5):
        put(f'4-tablet-7/tablet7-{i}.png', f'tablet7-{i}.png')
        put(f'5-tablet-10/tablet10-{i}.png', f'tablet10-{i}.png')
    for i in range(1, 7):
        put(f'6-desktop/desktop-{i}.png', f'desktop-{i}.png')
    put('7-video/promo-video-1920x1080.mp4', 'promo-video-1920x1080.mp4')
    put('7-video/youtube.txt', text=YOUTUBE)

    out = os.path.join(DIST, NAME + '.zip')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(stage):
            for f in sorted(files):
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, DIST))
    shutil.rmtree(stage)
    print(out, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
