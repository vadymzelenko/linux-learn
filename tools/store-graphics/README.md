# Store graphics and listings

Generates the Google Play assets in `docs/store/{free,pro}/` from the real web build.

```bash
cd apps/mobile
EXPO_PUBLIC_EDITION=free npx expo export --platform web --output-dir /tmp/web-free
APP_EDITION=pro EXPO_PUBLIC_EDITION=pro npx expo export --platform web --output-dir /tmp/web-pro
(cd /tmp/web-free && python3 -m http.server 8801) &
(cd /tmp/web-pro && python3 -m http.server 8802) &
cd ../../tools/store-graphics
RAW_DIR=/tmp/raw node capture.js      # raw app screenshots (phone 3x, tablets 2x)
RAW_DIR=/tmp/raw node compose.js      # framed slides + feature graphics -> docs/store/*/graphics
python3 icon.py                       # icon-512.png for both editions
python3 listings.py                   # listing.md for both editions (checks Play length limits)
```

`compose.js` loads the Onest and JetBrains Mono fonts from `node_modules/@expo-google-fonts` (run `pnpm install` first); slide captions live in its `SLIDES` table.
The website images in `apps/mobile/public/site/img/` are downscaled copies of these slides (540×960 WebP).
