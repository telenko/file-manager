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
import NewFolderIcon from './NewFolderIcon';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const [reloadRequired, setReloadRequired] = useState(false);
  const [renameDialogActive, setRenameDialogActive] = useState<DirItem | null>(
    null,
  );
  const [newDirName, setNewDirName] = useState<string>('');
  const [newDirPath, setNewDirPath] = useState<string | null>(null);

  const createDirectory = useCallback(
    (navigation: NavigationProp<FileManagerNavigation>) => {
      setNewDirName('');
      const directory = getRouteDirectory(navigation) ?? FileApi.ROOT_PATH;
      setNewDirPath(directory);
    },
    [],
  );
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
    }),
    [reloadRequired, renameDialogActive, newDirName, newDirPath],
  );
  return (
    <FileManagerContext.Provider value={ctxValue}>
      <RenameContentDialog />
      <CreateDirectoryDialog />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="FileTree"
            options={{
              title: t('title'),
              headerRight: () => <NewFolderIcon />,
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
