/**
 * Release signing from environment variables, so CI (GitHub Actions) can sign
 * the APK/AAB with the Play upload key without committing it:
 *   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
 * Without them the release build is signed with the debug key — fine for
 * installing on a test phone, not accepted by Google Play.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE = `
        release {
            if (System.getenv('ANDROID_KEYSTORE_PATH')) {
                storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes("System.getenv('ANDROID_KEYSTORE_PATH')")) return cfg;
    g = g.replace(/signingConfigs\s*\{/, (m) => m + RELEASE);
    // in buildTypes.release: use the upload key when it is provided
    g = g.replace(/(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/, "$1signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug");
    cfg.modResults.contents = g;
    return cfg;
  });
};
