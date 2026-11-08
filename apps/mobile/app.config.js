/**
 * Dynamic part of the Expo config (the rest is app.json).
 *
 * APP_EDITION=free (default) | pro — two Google Play apps from one code base:
 *   free: "Linux Terminal Trainer"      com.vadymzelenko.linuxtrainer      green icon
 *   pro:  "Linux Terminal Trainer Pro"  com.vadymzelenko.linuxtrainer.pro  gold icon
 * CI also passes the Play versionCode (must grow with every upload) and the version name.
 */
module.exports = ({ config }) => {
  const edition = (process.env.APP_EDITION ?? process.env.EXPO_PUBLIC_EDITION) === 'pro' ? 'pro' : 'free';
  const pro = edition === 'pro';
  const asset = (name) => (pro ? `./assets/pro/${name}` : `./assets/${name}`);
  const plugins = (config.plugins ?? []).map((p) =>
    Array.isArray(p) && p[0] === 'expo-splash-screen' ? [p[0], { ...p[1], image: asset('splash-icon.png') }] : p,
  );
  return {
    ...config,
    name: pro ? 'Linux Terminal Trainer Pro' : config.name,
    slug: config.slug,
    scheme: pro ? 'linuxtrainerpro' : config.scheme,
    version: process.env.APP_VERSION ?? config.version,
    icon: asset('icon.png'),
    plugins,
    web: { ...config.web, favicon: asset('favicon.png') },
    ios: { ...config.ios, bundleIdentifier: pro ? `${config.ios.bundleIdentifier}.pro` : config.ios.bundleIdentifier },
    android: {
      ...config.android,
      package: pro ? `${config.android.package}.pro` : config.android.package,
      adaptiveIcon: {
        ...config.android.adaptiveIcon,
        foregroundImage: asset('android-icon-foreground.png'),
        backgroundImage: asset('android-icon-background.png'),
        monochromeImage: asset('android-icon-monochrome.png'),
      },
      versionCode: Number(process.env.ANDROID_VERSION_CODE ?? config.android?.versionCode ?? 1),
    },
    extra: { ...config.extra, edition },
  };
};
