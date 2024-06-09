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
import FileDetailsDialog from './FileDetailsDialog';
import { theme } from '../../theme';

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
    }),
    [reloadRequired, renameDialogActive, newDirName, newDirPath, fileDetails],
  );
  return (
    <FileManagerContext.Provider value={ctxValue}>
      <RenameContentDialog />
      <CreateDirectoryDialog />
      <FileDetailsDialog />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerTitleStyle: {
              fontFamily: theme.regularText,
              fontSize: 20,
            },
            contentStyle: {
              backgroundColor: '#fff',
              marginTop: -10,
            }
          }}>
          <Stack.Screen
            name="FileTree"
            options={{
              title: t('title'),
              headerRight: () => <NewFolderIcon />,
              headerShadowVisible: false,
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
              headerShadowVisible: false,
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
