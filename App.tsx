import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import FileManager from './src/widgets/FileManager/FileManager';
import { useDeviceLocale } from './src/i18n/hooks/useDeviceLocale';
import {
  configureFonts,
  MD3LightTheme,
  PaperProvider,
  Text,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FileApi } from './src/services/FileApi';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExceptionHandler from './src/common/components/ExceptionHandler';
import { SnackbarProvider } from 'react-native-paper-snackbar-stack';

const MAX_SNACK = 2;

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

/**
 * @TODO Andrii now:
 * 5. release beta
 * 8. deobfuscation
 * PROD BUG: 1st launch only ----> nullpointer - attempt to invoke virtual method void android.app.Activity.startActivityForResult(android.content.Intent, int) on a null object reference at com.telenko.filemanager.fspermissions.PermissionFileModule.requestPermission(PermissionFileModule.java:75) at --> checkAndGrantPermission(.java:45)
 *
 * FUTURE IMPS: * 1. delete in gallery behavior: keep gallery open
 * 2. add device details into error report
 * 3. video restart
 * - rename folder animations
 * [BUG?] - slow image opening on dev
 * reorientation better animations, video to not interrupt
 * cancelable long operations with percentage visible
 * refactor to Redux
 * bad animation when copy/move just started (navigated)
 * wrong total size of storage? some memory size is missing, system one?
 * blocking delete - looks like unkink operation is sync and blocking UI
 *
 * TEST:
 * 2. gallery sliding bug
 */

const App = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  useDeviceLocale();
  const { t } = useTranslation();
  useEffect(() => {
    FileApi.askForStoragePermission().then(() => setPermissionGranted(true));
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <FontsProvider>
          {permissionGranted ? (
            <ExceptionHandler>
              <SnackbarProvider maxSnack={MAX_SNACK}>
                <FileManager />
              </SnackbarProvider>
            </ExceptionHandler>
          ) : null}
          {!permissionGranted ? <Text>{t('permissionRequired')}</Text> : null}
        </FontsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
