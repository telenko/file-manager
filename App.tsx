import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import FileManager from './src/widgets/FileManager';
import AppLegacy from './App_legacy';
import { useDeviceLocale } from './src/i18n/hooks/useDeviceLocale';
import {
  configureFonts,
  MD3LightTheme,
  PaperProvider,
  Text,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FileApi } from './src/services/FileApi';

// const App = AppLegacy;

const fontConfig = {
  customVariant: {
    fontFamily: Platform.select({
      default: 'OpenSans-Regular sans-serif arial',
    }),
    fontWeight: '200',
    letterSpacing: 0.3,
    lineHeight: 22,
    fontSize: 20,
  },
};

const theme = {
  ...MD3LightTheme,
  // @ts-ignore
  fonts: configureFonts({ config: fontConfig }),
};

const FontsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
};

const App = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  useDeviceLocale();
  const { t } = useTranslation();
  useEffect(() => {
    FileApi.askForStoragePermission().then(() => setPermissionGranted(true));
  }, []);
  return (
    <FontsProvider>
      {permissionGranted ? (
        <FileManager />
      ) : (
        <Text>{t('permissionRequired')}</Text>
      )}
    </FontsProvider>
  );
};

const styles = StyleSheet.create({});

export default App;
