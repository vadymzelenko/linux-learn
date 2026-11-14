"""
Authoring helpers: lessons are written as Python data and saved as the JSON
files the app and the linter read. Run a module script to regenerate its JSON:

    python3 packages/content/authoring/noc_intro.py

Texts are given as L(en, ru, uk). Polish falls back to English until translated.
"""
import json
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')


def L(en, ru, uk, pl=None):
    d = {"en": en, "ru": ru, "uk": uk}
    if pl is not None: d["pl"] = pl
    return d


# ---------------------------------------------------------------- checks

def _c(d, label):
    d["label"] = label
    return d


def used(cmd, label, flags=None, args=None, success=None):
    d = {"type": "usedCommand", "command": cmd}
    if flags: d["flags"] = flags
    if args: d["args"] = args
    if success is not None: d["success"] = success
    return _c(d, label)


def out(label, text=None, regex=None):
    d = {"type": "outputContains"}
    if text is not None: d["text"] = text
    if regex is not None: d["regex"] = regex
    return _c(d, label)


def lines(label, eq=None, mn=None, mx=None):
    d = {"type": "outputLines"}
    if eq is not None: d["eq"] = eq
    if mn is not None: d["min"] = mn
    if mx is not None: d["max"] = mx
    return _c(d, label)


def fexists(path, label): return _c({"type": "fileExists", "path": path}, label)
def dexists(path, label): return _c({"type": "dirExists", "path": path}, label)
def gone(path, label): return _c({"type": "notExists", "path": path}, label)
def cwd(path, label): return _c({"type": "cwdIs", "path": path}, label)
def mode(path, m, label): return _c({"type": "modeIs", "path": path, "mode": m}, label)
def svc(name, state, label): return _c({"type": "serviceState", "name": name, "state": state}, label)
def enabled(name, on, label): return _c({"type": "serviceEnabled", "name": name, "enabled": on}, label)
def uexists(name, label, group=None, exists=True):
    d = {"type": "userExists", "name": name}
    if group: d["group"] = group
    if not exists: d["exists"] = False
    return _c(d, label)
def container(name, state, label, image=None, port=None, network=None):
    d = {"type": "containerState", "name": name, "state": state}
    if image: d["image"] = image
    if port is not None: d["hostPort"] = port
    if network: d["network"] = network
    return _c(d, label)
def image(name, label, exists=True):
    d = {"type": "imageExists", "name": name}
    if not exists: d["exists"] = False
    return _c(d, label)
def ccount(label, eq=None, running=None, mx=None):
    d = {"type": "containerCount"}
    if eq is not None: d["eq"] = eq
    if mx is not None: d["max"] = mx
    if running: d["running"] = True
    return _c(d, label)
def git(path, label, **kw):
    """git check: commits=N, branch=, noBranch=, head=, clean=, tracked=, untracked=, staged=, remote=, pushed=, message=, merged=, merging=, tag=, ignored="""
    d = {"type": "git", "path": path}
    d.update({k: v for k, v in kw.items() if v is not None})
    return _c(d, label)
def github(repo, label, **kw):
    """GitHub check: exists=, branch=, file=, commits=, prs=, merged=, issues="""
    d = {"type": "github", "repo": repo}
    d.update({k: v for k, v in kw.items() if v is not None})
    return _c(d, label)
def proc_gone(name, label): return _c({"type": "processGone", "name": name}, label)
def var(name, value, label): return _c({"type": "varEquals", "name": name, "value": value}, label)
def alias(name, label, value=None):
    d = {"type": "aliasExists", "name": name}
    if value is not None: d["value"] = value
    return _c(d, label)


def fcontains(path, label, text=None, regex=None):
    d = {"type": "fileContains", "path": path}
    if text is not None: d["text"] = text
    if regex is not None: d["regex"] = regex
    return _c(d, label)


def flines(path, n, label):
    """The file has exactly n lines."""
    return _c({"type": "fileContains", "path": path, "regex": "^(?:[^\\n]*\\n){%d}$" % n, "flags": ""}, label)


def fnot(path, label, text=None, regex=None):
    d = {"type": "fileNotContains", "path": path}
    if text is not None: d["text"] = text
    if regex is not None: d["regex"] = regex
    return _c(d, label)


def fequals(path, text, label): return _c({"type": "fileEquals", "path": path, "text": text}, label)


def owner(path, label, user=None, group=None):
    d = {"type": "ownerIs", "path": path}
    if user: d["owner"] = user
    if group: d["group"] = group
    return _c(d, label)


def count(path, label, eq=None, pattern=None, ftype=None, mn=None):
    d = {"type": "countIn", "path": path}
    if eq is not None: d["eq"] = eq
    if mn is not None: d["min"] = mn
    if pattern: d["pattern"] = pattern
    if ftype: d["fileType"] = ftype
    return _c(d, label)


# ---------------------------------------------------------------- steps

def theory(text, title=None, demo=None, terminal=True, setup=None):
    d = {"type": "theory", "text": text}
    if title: d["title"] = title
    if terminal is False: d["terminal"] = False
    if demo:
        d["demo"] = {"commands": demo}
        if setup is not None: d["demo"]["setup"] = setup
    return d


def reading(text, title=None):
    return theory(text, title=title, terminal=False)


def task(goal, checks, hint, cmd, solution, instructions=None, setup=None, prepare=None, prefill=None, xp=None, fix=False):
    d = {"type": "fix" if fix else "task", "goal": goal}
    if instructions: d["instructions"] = instructions
    if setup is not None: d["setup"] = setup
    if prepare: d["prepare"] = prepare
    d["checks"] = checks
    d["hints"] = {"direction": hint, "command": cmd}
    d["solution"] = solution
    if prefill is not None: d["prefill"] = prefill
    if xp: d["xp"] = xp
    return d


def quiz(question, options, answer, explanation=None):
    d = {"type": "quiz", "question": question, "options": options, "answer": answer}
    if explanation: d["explanation"] = explanation
    return d


def predict(command, options, answer, explanation=None, setup=None, prepare=None, context=None):
    d = {"type": "predict", "command": command, "options": options, "answer": answer}
    if setup is not None: d["setup"] = setup
    if prepare: d["prepare"] = prepare
    if context is not None: d["context"] = context
    if explanation: d["explanation"] = explanation
    return d


def build(goal, answer, distractors=None, explanation=None):
    d = {"type": "build", "goal": goal, "answer": answer}
    if distractors: d["distractors"] = distractors
    if explanation: d["explanation"] = explanation
    return d


def lesson(id, title, commands, steps, setup=None):
    d = {"id": id, "title": title, "commands": commands}
    if setup is not None: d["setup"] = setup
    d["steps"] = steps
    return d


def module(filename, id, path, icon, title, description, lessons):
    d = {"id": id, "path": path, "icon": icon, "title": title, "description": description, "lessons": lessons}
    _write(os.path.join(ROOT, 'modules', filename), d)


def fixture(name, spec):
    _write(os.path.join(ROOT, 'fixtures', f'{name}.json'), spec)


def _write(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print('wrote', os.path.relpath(path, ROOT))


# common labels
YES_CMD = lambda c: L(f"Use {c}", f"Используйте {c}", f"Використайте {c}")
