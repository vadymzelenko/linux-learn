"""commands-l10n.json: translated summaries and option texts of every simulator
command (for "Explain a command" and the command reference). English comes
from the engine's built-in manual; a missing translation falls back to it."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from lib import ROOT
from commands_l10n_b import S, O

out = {name: {"summary": S[name], **({"options": O[name]} if O.get(name) else {})} for name in sorted(S)}
json.dump(out, open(os.path.join(ROOT, 'commands-l10n.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(ROOT, 'commands-l10n.json'), 'a').write('\n')
print(len(out), 'commands,', sum(len(v) for v in O.values()), 'options')
