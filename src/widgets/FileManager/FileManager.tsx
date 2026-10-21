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
import { View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useIndexedFiles } from '../../common/hooks/useIndexedFiles';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useSort();
  useLayout();
  const { refresh: refreshRoots, rootsReady, roots } = useFsRoots();
  const { state, ready: stateReady } = useInitialState(roots, rootsReady);

  // const { files, isIndexing } = useIndexedFiles();

  // useEffect(() => {
  //   console.log('FILES', files);
  //   console.log('IS INDEXING', isIndexing);
  //   console.log('FILES leength', files?.length);
  // }, [isIndexing, files]);

  useEffect(() => {
    refreshRoots();
  }, []);

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
