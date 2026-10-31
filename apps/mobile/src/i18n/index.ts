import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { LANGS, type Lang } from '@linux-learn/content';
import en from './locales/en';
import uk from './locales/uk';
import ru from './locales/ru';
import pl from './locales/pl';

export const LANGUAGE_NAMES: Record<Lang, string> = { en: 'English', uk: 'Українська', ru: 'Русский', pl: 'Polski' };

export function systemLang(): Lang {
  try {
    for (const l of getLocales()) {
      const code = l.languageCode as Lang | null;
      if (code && (LANGS as readonly string[]).includes(code)) return code;
    }
  } catch {
    /* web without Intl */
  }
  return 'en';
}

export function resolveLang(setting: 'system' | Lang): Lang {
  return setting === 'system' ? systemLang() : setting;
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, uk: { translation: uk }, ru: { translation: ru }, pl: { translation: pl } },
  lng: systemLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
