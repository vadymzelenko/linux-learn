"""Polish overlay: translations keyed by a short hash of the English text.

    python3 authoring/pl_tools.py todo modules/13-fhs.json   # list untranslated texts with their keys
    python3 authoring/pl_tools.py apply                      # fill "pl" in every content JSON

Translations live in authoring/pl/*.py as `T = {"<key>": "<polish>"}`. Keys are
stable as long as the English text does not change; when it does, the old
translation is simply not applied (and `todo` lists the text again).
"""
import glob, hashlib, importlib.util, json, os, sys
from lib import ROOT

FILES = sorted(glob.glob(os.path.join(ROOT, 'modules', '*.json'))) + [os.path.join(ROOT, p) for p in ('missions/missions.json', 'challenges/challenges.json', 'glossary.json', 'achievements.json', 'courses.json')]


def key(en):
    return hashlib.sha1(en.encode('utf-8')).hexdigest()[:10]


def texts(v, out):
    if isinstance(v, dict):
        if isinstance(v.get('en'), str) and 'ru' in v:
            out.append(v)
            return
        for x in v.values(): texts(x, out)
    elif isinstance(v, list):
        for x in v: texts(x, out)


def load_overlay():
    T = {}
    for f in sorted(glob.glob(os.path.join(os.path.dirname(__file__), 'pl', '*.py'))):
        spec = importlib.util.spec_from_file_location(os.path.basename(f)[:-3], f)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        T.update(m.T)
    return T


def apply():
    T = load_overlay()
    filled = missing = 0
    for f in FILES:
        data = json.load(open(f))
        found = []
        texts(data, found)
        changed = False
        for t in found:
            if 'pl' in t: continue
            if t['en'] == t.get('ru') == t.get('uk'):
                # language-neutral text (a command, a path, a number)
                t['pl'] = t['en']
                filled += 1
                changed = True
                continue
            k = key(t['en'])
            if k in T:
                t['pl'] = T[k]
                filled += 1
                changed = True
            else:
                missing += 1
        if changed:
            with open(f, 'w') as fh:
                json.dump(data, fh, indent=2, ensure_ascii=False)
                fh.write('\n')
    print(f'pl overlay: filled {filled}, still missing {missing}')


def todo(path):
    data = json.load(open(os.path.join(ROOT, path)))
    found = []
    texts(data, found)
    T = load_overlay()
    seen = set()
    for t in found:
        k = key(t['en'])
        if 'pl' in t or k in T or k in seen or t['en'] == t.get('ru') == t.get('uk'): continue
        seen.add(k)
        print(f'### {k}\n{t["en"]}\n')


if __name__ == '__main__':
    if sys.argv[1] == 'apply': apply()
    else: todo(sys.argv[2])
