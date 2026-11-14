# Store graphics and listing

Generates everything in `google-play/` from the real web build: framed screenshots, the feature graphic, the 512 icon and `google-play.txt`.

```bash
cd apps/mobile && npx expo export --platform web --output-dir /tmp/web
# serve it with an SPA fallback (any static server that answers unknown paths with index.html) on :8801
cd ../../tools/store-graphics
RAW_DIR=/tmp/raw node capture.js      # raw app screens (phone 3x, tablets 2x)
RAW_DIR=/tmp/raw node compose.js      # framed slides + feature graphic -> google-play/
python3 icon.py                       # google-play/icon-512.png
python3 listings.py                   # google-play/google-play.txt (checks Play length limits)
```

`compose.js` loads the Onest and JetBrains Mono fonts from `node_modules/@expo-google-fonts` (run `pnpm install` first); captions live in its `SLIDES` table.
The website images in `apps/mobile/public/site/img/` are downscaled copies of the phone slides.
