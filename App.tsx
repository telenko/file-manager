import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import FileManager from './src/widgets/FileManager';
import AppLegacy from './App_legacy';
import { useDeviceLocale } from './src/i18n/hooks/useDeviceLocale';
import { Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FileApi } from './src/services/FileApi';

// const App = AppLegacy;

const App = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  useDeviceLocale();
  const { t } = useTranslation();
  useEffect(() => {
    FileApi.askForStoragePermission().then(() => setPermissionGranted(true));
  }, []);
  return permissionGranted ? (
    <FileManager />
  ) : (
    <Text>{t('permissionRequired')}</Text>
  );
};

const styles = StyleSheet.create({});

export default App;
