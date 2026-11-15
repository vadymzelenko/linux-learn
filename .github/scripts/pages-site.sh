#!/usr/bin/env bash
# Lays out apps/mobile/public/site for GitHub Pages under /linux-learn/ in $1
# (the browser version of the app must already be exported to $1/app).
set -euo pipefail
SRC=apps/mobile/public/site
OUT=${1:-_site}
test -s "$OUT/app/index.html" || { echo "the web app is missing in $OUT/app"; exit 1; }
rm -rf "$OUT/app/site"                       # the site's own copy inside the app export
mkdir -p "$OUT/privacy" "$OUT/support"
cp -r $SRC/img $SRC/style.css "$OUT/"
fix() {
  sed -e 's#href="/site/privacy.html"#href="/linux-learn/privacy/"#g' \
      -e 's#href="/site/support.html"#href="/linux-learn/support/"#g' \
      -e 's#"/site/#"/linux-learn/#g' \
      -e 's#href="/"#href="/linux-learn/app/"#g' "$1" > "$2"
}
fix $SRC/index.html   "$OUT/index.html"
fix $SRC/privacy.html "$OUT/privacy/index.html"
fix $SRC/support.html "$OUT/support/index.html"
# GitHub Pages has no SPA fallback: a reload of /linux-learn/app/lesson/x gets 404.html,
# so 404.html is the app shell for /app/ paths and sends anything else to the home page.
python3 - "$OUT" <<'PY'
import sys
out = sys.argv[1]
app = open(f'{out}/app/index.html', encoding='utf-8').read()
guard = ('<script>if(!location.pathname.startsWith("/linux-learn/app/"))'
         'location.replace("/linux-learn/");</script>')
open(f'{out}/404.html', 'w', encoding='utf-8').write(app.replace('<head>', '<head>' + guard, 1))
PY
touch "$OUT/.nojekyll"
if grep -n '"/site/\|href="/"' "$OUT"/*.html "$OUT"/*/index.html | grep -v "^$OUT/app/"; then echo "unrewritten links"; exit 1; fi
for p in index.html privacy/index.html support/index.html 404.html app/index.html style.css; do
  test -s "$OUT/$p" || { echo "missing $p"; exit 1; }
done
echo "site ready in $OUT"
