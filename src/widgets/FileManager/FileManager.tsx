import React, { useMemo, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import { FileGuiHelper } from './FileGuiHelper';
import RenameContentDialog from './RenameContentDialog';

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const [reloadRequired, setReloadRequired] = useState(false);
  const [renameDialogActive, setRenameDialogActive] = useState<DirItem | null>(
    null,
  );
  const ctxValue = useMemo<FileManagerContextType>(
    () => ({
      reloadRequired,
      setReloadRequired,
      ...FileGuiHelper,
      renameContent: setRenameDialogActive,
      renameDialogItem: renameDialogActive,
      setRenameDialogActive,
    }),
    [reloadRequired, renameDialogActive],
  );
  return (
    <FileManagerContext.Provider value={ctxValue}>
      <RenameContentDialog />
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen
            name="FileTree"
            options={{
              title: t('title'),
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
