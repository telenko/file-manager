import React, { useCallback, useMemo, useState } from 'react';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FileTreeScreen from '../../screens/FileTreeScreen';
import { DirItem, FileApi } from '../../services/FileApi';
import { FileManagerNavigation } from '../../common/types/navigation';
import { useTranslation } from 'react-i18next';
import ImagePreviewScreen from '../../screens/ImagePreviewScreen';
import {
  FileManagerContext,
  FileManagerContextType,
} from './FileManagerContext';
import { FileGuiHelper, getRouteDirectory } from './FileGuiHelper';
import RenameContentDialog from './RenameContentDialog';
import CreateDirectoryDialog from './CreateDirectoryDialog';
import FileDetailsDialog from './FileDetailsDialog';
import DefaultFolderActions from './DefaultFolderActions';
import AppHeader from '../../common/components/AppHeader';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const [reloadRequired, setReloadRequired] = useState(false);
  const [renameDialogActive, setRenameDialogActive] = useState<DirItem | null>(
    null,
  );
  const [newDirName, setNewDirName] = useState<string>('');
  const [newDirPath, setNewDirPath] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<DirItem | null>(null);
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');

  const createDirectory = useCallback(
    (navigation: NavigationProp<FileManagerNavigation>) => {
      setNewDirName('');
      const directory = getRouteDirectory(navigation) ?? FileApi.ROOT_PATH;
      setNewDirPath(directory);
    },
    [],
  );

  const showFileDetails = useCallback((dirItem: DirItem) => {
    if (!dirItem.isFile()) {
      return;
    }
    setFileDetails(dirItem);
  }, []);

  const ctxValue = useMemo<FileManagerContextType>(
    () => ({
      reloadRequired,
      setReloadRequired,
      ...FileGuiHelper,
      renameContent: setRenameDialogActive,
      renameDialogItem: renameDialogActive,
      setRenameDialogActive,
      createDirectory,
      newDirName,
      setNewDirName,
      newDirPath,
      setNewDirPath,

      fileDetails,
      setFileDetails,
      showFileDetails,
      sort,
      toggleSort: () => setSort(sort === 'asc' ? 'desc' : 'asc'),
    }),
    [
      reloadRequired,
      renameDialogActive,
      newDirName,
      newDirPath,
      fileDetails,
      sort,
    ],
  );
  return (
    <FileManagerContext.Provider value={ctxValue}>
      <RenameContentDialog />
      <CreateDirectoryDialog />
      <FileDetailsDialog />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            header: props => <AppHeader {...props} />,
            contentStyle: {
              backgroundColor: '#fff',
              marginTop: -10,
            },
          }}>
          <Stack.Screen
            name="FileTree"
            options={{
              title: t('title'),
              headerRight: () => <DefaultFolderActions />,
            }}
            // @ts-ignore
            component={FileTreeScreen}
            initialParams={{
              // @ts-ignore
              route: FileApi.ROOT_PATH,
            }}
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
    </FileManagerContext.Provider>
  );
}
