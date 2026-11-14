/**
 * Dynamic part of the Expo config (the rest is app.json): CI passes the Play
 * versionCode (must grow with every upload) and the version name.
 */
module.exports = ({ config }) => ({
  ...config,
  version: process.env.APP_VERSION ?? config.version,
  android: {
    ...config.android,
    versionCode: Number(process.env.ANDROID_VERSION_CODE ?? config.android?.versionCode ?? 1),
  },
});
