"""Insert keys into the locale files: python3 scripts/i18n_add.py keys.json
keys.json: {"section.key": {"en": "...", "ru": "...", "uk": "...", "pl": "..."}}
Nested sections ("settings.themes.x") are supported one level deep."""
import json, os, re, sys
ROOT = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'locales')

def q(v):
    if "'" not in v:
        return "'" + v.replace('\\', '\\\\').replace('\n', '\\n') + "'"
    return json.dumps(v, ensure_ascii=False)

def add(lang, path, value):
    f = os.path.join(ROOT, lang + '.ts')
    s = open(f).read()
    parts = path.split('.')
    if parts[0] == 'explainKeys':
        parts = [parts[0], '.'.join(parts[1:])]
    section, key = parts[0], parts[-1]
    keyq = key if re.match(r'^[A-Za-z_]\w*$', key) else q(key)
    m = re.search(r'\n  ' + re.escape(section) + r': \{', s)
    if not m:
        # new top-level section before the closing of the object
        end = s.rindex('\n};')
        s = s[:end] + f'\n  {section}: {{\n    {keyq}: {q(value)},\n  }},' + s[end:]
    else:
        # does the key exist already in this section? replace it
        start = m.end()
        depth, i = 1, start
        while depth:
            if s[i] == '{': depth += 1
            elif s[i] == '}': depth -= 1
            i += 1
        body = s[start:i - 1]
        km = re.search(r'(\n\s*|\{ ?|, )' + re.escape(keyq) + r': ("(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'),?', body)
        if km and len(parts) == 2:
            nb = body[:km.start(2)] + q(value) + body[km.end(2):]
            s = s[:start] + nb + s[i - 1:]
        elif len(parts) == 2:
            s = s[:start] + f'\n    {keyq}: {q(value)},' + s[start:]
        else:
            sub = parts[1]
            sm = re.search(r'(\n\s*|\{ ?)' + re.escape(sub) + r': \{', body)
            if not sm:
                s = s[:start] + f'\n    {sub}: {{ {keyq}: {q(value)} }},' + s[start:]
            else:
                pos = start + sm.end()
                s = s[:pos] + f' {keyq}: {q(value)},' + s[pos:]
    open(f, 'w').write(s)

data = json.load(open(sys.argv[1]))
for path, vals in data.items():
    for lang in ('en', 'ru', 'uk', 'pl'):
        add(lang, path, vals[lang])
print('added', len(data))
