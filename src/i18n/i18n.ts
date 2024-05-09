import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './translations/en.json';
import uk from './translations/uk.json';

const resources = {
  en: { translation: en },
  uk: { translation: uk },
};

export type I18nDictionary = keyof typeof en;

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources,
  lng: 'en', // Default language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
});

export const translate = (key: I18nDictionary) => {
  return i18n.t(key);
};

export default i18n;
