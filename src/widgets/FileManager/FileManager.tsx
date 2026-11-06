import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FileTreeScreen from '../../screens/FileTreeScreen';
import { FileManagerNavigation } from '../../common/types/navigation';
import { useTranslation } from 'react-i18next';
import ImagePreviewScreen from '../../screens/ImagePreviewScreen';
import RenameContentDialog from './dialogs/RenameContentDialog';
import CreateDirectoryDialog from './dialogs/CreateDirectoryDialog';
import FileDetailsDialog from './dialogs/FileDetailsDialog';
import DefaultFolderActions from './actions/DefaultFolderActions';
import AppHeader from '../../common/components/AppHeader';
import LongOperationDialog from './dialogs/LongOperationDialog';
import { ActivityIndicator } from 'react-native-paper';
import { useFsRoots } from './useFsRoots';
import { useLayout, useSort } from './settings';
import SettingsDialog from './dialogs/SettingsDialog';
import { useInitialState } from './useInitialState';
import { theme } from '../../theme';
import { AppState, DeviceEventEmitter, NativeModules, View } from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store';
import { removeFiles } from '../../store/fileDataSlice';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useSort();
  useLayout();
  const { refresh: refreshRoots, rootsReady, roots } = useFsRoots();
  const { state, ready: stateReady } = useInitialState(roots, rootsReady);

  useEffect(() => {
    refreshRoots();
  }, []);

  useEffect(() => {
    const { FileIndexer } = NativeModules;
    const subscription = DeviceEventEmitter.addListener(
      'onIndexingStatus',
      (payload: { event?: string; removedPaths?: string[] }) => {
        if (payload.event === 'SCAN_REMOVE' && payload.removedPaths?.length) {
          console.log("HEAVY REMOVE", payload.removedPaths);
          dispatch(removeFiles(payload.removedPaths));
        }
      },
    );

    FileIndexer.startIndexing();
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          FileIndexer.startIndexing();
        } else {
          FileIndexer.stopIndexing();
        }
      },
    );

    return () => {
      subscription.remove();
      appStateSubscription.remove();
      FileIndexer.stopIndexing();
    };
  }, [dispatch]);

  if (!rootsReady || !stateReady) {
    return (
      <View
        style={{
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator
          size={theme.primaryLoaderSize}
          color={theme.selectionColor}
        />
      </View>
    );
  }

  return (
    <>
      <RenameContentDialog />
      <CreateDirectoryDialog />
      <FileDetailsDialog />
      <SettingsDialog />
      <NavigationContainer initialState={state}>
        <LongOperationDialog />
        <Stack.Navigator
          screenOptions={{
            header: props => <AppHeader {...props} />,
            contentStyle: {
              backgroundColor: '#fff',
              marginTop: insets.top,
              marginLeft: insets.left,
              marginRight: insets.right,
              marginBottom: insets.bottom,
            },
          }}>
          <Stack.Screen
            name="FileTree"
            options={{
              title: '',
              headerRight: () => <DefaultFolderActions />,
            }}
            // @ts-ignore
            component={FileTreeScreen}
            // initialParams={{
            //   // @ts-ignore
            //   route: FileApi.ROOT_PATH,
            // }}
          />
          <Stack.Screen
            name="ImageViewer"
            options={{
              title: t('imageViewer'),
            }}
            // @ts-ignore
            component={ImagePreviewScreen}
            initialParams={{
              // @ts-ignore
              route: null,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
