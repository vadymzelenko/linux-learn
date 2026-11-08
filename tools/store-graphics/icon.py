"""512×512 store icons as 32-bit PNG (RGBA), from the app icons."""
import os, sys
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..', '..')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'docs', 'store')
for ed, src in (('free', 'icon.png'), ('pro', 'pro/icon.png')):
    im = Image.open(os.path.join(root, 'apps', 'mobile', 'assets', src)).convert('RGBA').resize((512, 512), Image.LANCZOS)
    os.makedirs(os.path.join(out, ed, 'graphics'), exist_ok=True)
    im.save(os.path.join(out, ed, 'graphics', 'icon-512.png'), optimize=True)
    print(ed, im.mode, im.size)
