import * as RNLocalize from 'react-native-localize';
import i18n from '../i18n';
import { useEffect } from 'react';

export const useDeviceLocale = () => {
  useEffect(() => {
    // Set the initial language based on device locale
    const locale = RNLocalize.getLocales()[0].languageCode;
    console.log('Detected locale...', locale);
    i18n.changeLanguage(locale);
  }, []);
};
