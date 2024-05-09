import React from 'react';
import { StyleSheet } from 'react-native';
import FileManager from './src/widgets/FileManager';
import AppLegacy from './App_legacy';
import { useDeviceLocale } from './src/i18n/hooks/useDeviceLocale';

// const App = AppLegacy;

const App = () => {
  useDeviceLocale();
  return <FileManager />;
};

const styles = StyleSheet.create({});

export default App;
