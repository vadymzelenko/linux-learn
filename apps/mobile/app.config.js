/**
 * Dynamic part of the Expo config (the rest is app.json): CI passes the Play
 * versionCode (must grow with every upload) and the version name; the Pages
 * workflow passes WEB_BASE_URL for the browser version.
 */
module.exports = ({ config }) => ({
  ...config,
  version: process.env.APP_VERSION ?? config.version,
  // Web build served from a sub-path (GitHub Pages: /linux-learn/app). Empty = site root (Vercel).
  experiments: {
    ...config.experiments,
    ...(process.env.WEB_BASE_URL ? { baseUrl: process.env.WEB_BASE_URL } : {}),
  },
  android: {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? config.android?.versionCode ?? 1),
  },
});
