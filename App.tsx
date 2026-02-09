import React, { PropsWithChildren, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import FileManager from './src/widgets/FileManager/FileManager';
import { useDeviceLocale } from './src/i18n/hooks/useDeviceLocale';
import {
  Button,
  configureFonts,
  MD3LightTheme,
  PaperProvider,
} from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { FileApi } from './src/services/FileApi';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ExceptionHandler from './src/common/components/ExceptionHandler';
import { SnackbarProvider } from 'react-native-paper-snackbar-stack';
import NoPermissionScreen from './src/common/components/NoPermissionScreen';

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
 * @TODO Andrii:
 * CURRENT RELEASE BUGS:
 *
 * FUTURE IMPROVEMENTS/BUGS(Not Critical):
 * [FIX_ONGOING][BUG] startup - 07-27 15:38:00.282 E/AndroidRuntime(30891): java.lang.RuntimeException: Unable to start activity ComponentInfo{com.telenko.filemanager/com.telenko.filemanager.MainActivity}: androidx.fragment.app.Fragment$f: Unable to instantiate fragment com.swmansion.rnscreens.t: calling Fragment constructor caused an exception
 * 1. delete in gallery behavior: keep gallery open
 * 2. add device details into error report
 * 3. video restart
 * - rename folder animations
 * [BUG?] - slow image opening on dev
 * reorientation better animations, video to not interrupt
 * make cancelable long operations with percentage visible
 * refactor to Redux
 * bad animation when copy/move just started (navigated)
 * wrong total size of storage? some memory size is missing, system one?
 * blocking delete - looks like unkink operation is sync and blocking UI
 * more smart sorting (remember + folders sorting)
 * grid media view for images/videos
 * [IMP] video player - flushes of black background

 *
 * TEST:
 * 2. gallery sliding bug
 */

const App = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  useDeviceLocale();
  const { t } = useTranslation();
  const askPermission = () =>
    FileApi.askForStoragePermission()
      .then(() => setPermissionGranted(true))
      .catch(e => {
        // do nothing here...
      });
  useEffect(() => {
    askPermission();
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
          ) : (
            <NoPermissionScreen
              onGrantPermission={askPermission}
              title={t('permissionRequired')}
              description={t('permissionRequiredDescription')}
            />
          )}
        </FontsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
