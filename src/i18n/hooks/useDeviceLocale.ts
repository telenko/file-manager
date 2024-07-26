import * as RNLocalize from 'react-native-localize';
import i18n from '../i18n';
import { useEffect } from 'react';

export const useDeviceLocale = () => {
  useEffect(() => {
    // Get device locale and country
    const locales = RNLocalize.getLocales();
    const locale = locales[0]?.languageCode;
    const language = locale?.split('-')[0] ?? 'en';
    const country = RNLocalize.getCountry();

    console.debug('Detected locale...', language);
    console.debug('Detected country...', country);

    if ((country === 'UA' && locale === 'ru') || language === 'ua') {
      i18n.changeLanguage('uk');
    } else {
      i18n.changeLanguage(language);
    }
  }, []);
};
