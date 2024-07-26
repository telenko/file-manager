import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from './translations/de.json';
import en from './translations/en.json';
import es from './translations/es.json';
import fr from './translations/fr.json';
import it from './translations/it.json';
import nl from './translations/nl.json';
import pl from './translations/pl.json';
import pt from './translations/pt.json';
import tr from './translations/tr.json';
import uk from './translations/uk.json';

const resources = {
  en: { translation: en },
  uk: { translation: uk },
  pl: { translation: pl },
  de: { translation: de },
  es: { translation: es },
  fr: { translation: fr },
  it: { translation: it },
  nl: { translation: nl },
  pt: { translation: pt },
  tr: { translation: tr },
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
