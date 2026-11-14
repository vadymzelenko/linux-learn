"""512x512 store icon as a 32-bit PNG (RGBA), from the app icon."""
import os, sys
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..', '..')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'google-play')
os.makedirs(out, exist_ok=True)
im = Image.open(os.path.join(root, 'apps', 'mobile', 'assets', 'icon.png')).convert('RGBA').resize((512, 512), Image.LANCZOS)
im.save(os.path.join(out, 'icon-512.png'), optimize=True)
print(im.mode, im.size)
