#!/usr/bin/env bash
# Creates the Google Play UPLOAD key on YOUR computer and prepares the 4 GitHub secrets.
#   bash scripts/make-upload-key.sh
# Result (folder ~/linux-trainer-upload-key):
#   upload.jks          — the key. Keep 2 copies (e.g. password manager + USB/cloud backup).
#   secrets.txt         — the 4 values for GitHub → Settings → Secrets and variables → Actions.
# With the GitHub CLI (gh) logged in, it can also add the secrets for you.
set -euo pipefail
REPO=vadymzelenko/linux-learn
DIR="$HOME/linux-trainer-upload-key"
ALIAS=upload

# keytool: from PATH, Android Studio's bundled Java (macOS/Linux/Windows Git Bash) or JAVA_HOME
KT=$(command -v keytool || true)
for c in "/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
         "$HOME/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/keytool" \
         "/opt/android-studio/jbr/bin/keytool" \
         "/c/Program Files/Android/Android Studio/jbr/bin/keytool.exe" \
         "${JAVA_HOME:-/nonexistent}/bin/keytool"; do
  [ -z "$KT" ] && [ -x "$c" ] && KT="$c"
done
if [ -z "$KT" ]; then
  echo "keytool not found. Install Java (macOS: brew install openjdk) or Android Studio and run again."; exit 1
fi

if [ -e "$DIR/upload.jks" ]; then
  echo "$DIR/upload.jks already exists — not overwriting it. Delete it first only if it was never used in Play."; exit 1
fi
mkdir -p "$DIR"; chmod 700 "$DIR"
PASS=$(head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | cut -c1-32)

"$KT" -genkeypair -v -storetype PKCS12 -keystore "$DIR/upload.jks" -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 -storepass "$PASS" -keypass "$PASS" \
  -dname "CN=Linux Terminal Trainer upload key, O=VZstudio" >/dev/null

B64=$(base64 < "$DIR/upload.jks" | tr -d '\n')
cat > "$DIR/secrets.txt" <<TXT
GitHub → $REPO → Settings → Secrets and variables → Actions → New repository secret

ANDROID_KEYSTORE_BASE64
$B64

ANDROID_KEYSTORE_PASSWORD
$PASS

ANDROID_KEY_ALIAS
$ALIAS

ANDROID_KEY_PASSWORD
$PASS

Upload certificate fingerprints (Play Console may show them):
$("$KT" -list -v -keystore "$DIR/upload.jks" -storepass "$PASS" | grep -E "SHA1:|SHA256:")
TXT
chmod 600 "$DIR/upload.jks" "$DIR/secrets.txt"
echo "Key created: $DIR/upload.jks"
echo "Secrets:     $DIR/secrets.txt"

if command -v gh >/dev/null && gh auth status >/dev/null 2>&1; then
  read -r -p "Add the 4 secrets to $REPO with gh now? [y/N] " ans
  if [ "${ans:-n}" = y ] || [ "${ans:-n}" = Y ]; then
    printf '%s' "$B64"   | gh secret set ANDROID_KEYSTORE_BASE64   -R "$REPO"
    printf '%s' "$PASS"  | gh secret set ANDROID_KEYSTORE_PASSWORD -R "$REPO"
    printf '%s' "$ALIAS" | gh secret set ANDROID_KEY_ALIAS         -R "$REPO"
    printf '%s' "$PASS"  | gh secret set ANDROID_KEY_PASSWORD      -R "$REPO"
    echo "Secrets added. Run Actions → Android → Run workflow."
  fi
else
  echo "Copy the 4 values from secrets.txt into GitHub (see the first line of the file)."
fi
echo "IMPORTANT: back up upload.jks and the password. Without them you cannot publish updates."
