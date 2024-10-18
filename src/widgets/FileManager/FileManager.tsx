import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FileTreeScreen from '../../screens/FileTreeScreen';
import { DirItem, FileApi } from '../../services/FileApi';
import { FileManagerNavigation } from '../../common/types/navigation';
import { useTranslation } from 'react-i18next';
import ImagePreviewScreen from '../../screens/ImagePreviewScreen';
import {
  FileLongOperationType,
  FileManagerContext,
  FileManagerContextType,
} from './FileManagerContext';
import { FileGuiHelper, getRouteDirectory } from './FileGuiHelper';
import RenameContentDialog from './dialogs/RenameContentDialog';
import CreateDirectoryDialog from './dialogs/CreateDirectoryDialog';
import FileDetailsDialog from './dialogs/FileDetailsDialog';
import DefaultFolderActions from './actions/DefaultFolderActions';
import AppHeader from '../../common/components/AppHeader';
import LongOperationDialog from './dialogs/LongOperationDialog';
import { useSnackbar } from 'react-native-paper-snackbar-stack';
import { ActivityIndicator } from 'react-native-paper';
import { useFsRoots } from './useFsRoots';
import { useLayout, useSort, useStoreLatestFolder } from './settings';
import SettingsDialog from './dialogs/SettingsDialog';
import { useInitialState } from './useInitialState';

const SNACK_DEFAULT_DURATION_MS = 4000;

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [reloadRequired, setReloadRequired] = useState(false);
  const [renameDialogActive, setRenameDialogActive] = useState<DirItem | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newDirName, setNewDirName] = useState<string>('');
  const [newDirPath, setNewDirPath] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<DirItem | null>(null);
  const [longOperation, setLongOperation] =
    useState<FileLongOperationType | null>(null);
  const hasLongOperationVisibleRef = useRef(false);
  const [sort, toggleSort] = useSort();
  const [layout, setLayout] = useLayout();
  const { setStoreLatestFolder, storeLatestFolder } = useStoreLatestFolder();
  const { refresh: refreshRoots, rootsReady, roots } = useFsRoots();
  const { state, ready: stateReady } = useInitialState(roots, rootsReady);

  const createDirectory = useCallback(
    (navigation: NavigationProp<FileManagerNavigation>) => {
      setNewDirName('');
      const directory = getRouteDirectory(navigation) ?? FileApi.ROOT_PATH;
      setNewDirPath(directory);
    },
    [],
  );

  const showFileDetails = useCallback((dirItem: DirItem) => {
    setFileDetails(dirItem);
  }, []);

  const performCopyContent = useCallback(
    async (
      sources: string[],
      destination: string,
      injectIfConflict: boolean,
    ) => {
      try {
        setLongOperation({
          message: t('copyInProgress'),
        });
        await FileApi.copyFilesOrDirectoriesBatched(
          sources,
          destination,
          injectIfConflict,
        );
        // user manually closed dialog of long operation
        if (!hasLongOperationVisibleRef.current) {
          enqueueSnackbar({
            variant: 'success',
            message: t('copyIsDone'),
            duration: SNACK_DEFAULT_DURATION_MS,
          });
        }
        refreshRoots();
      } catch (e: any) {
        throw e;
      } finally {
        setLongOperation(null);
      }
    },
    [],
  );

  const performMoveContent = useCallback(
    async (
      sources: string[],
      destination: string,
      injectIfConflict: boolean,
    ) => {
      try {
        setLongOperation({
          message: t('moveInProgress'),
        });
        await FileApi.moveFilesOrDirectoriesBatched(
          sources,
          destination,
          injectIfConflict,
        );
        // user manually closed dialog of long operation
        if (!hasLongOperationVisibleRef.current) {
          enqueueSnackbar({
            variant: 'success',
            message: t('moveIsDone'),
            duration: SNACK_DEFAULT_DURATION_MS,
          });
        }
        refreshRoots();
      } catch (e: any) {
        throw e;
      } finally {
        setLongOperation(null);
      }
    },
    [],
  );

  const deleteContent = useCallback(async (files: DirItem[]) => {
    let deleteInitiated = false;
    try {
      const res = await FileGuiHelper.deleteContent(files, () => {
        deleteInitiated = true;
        setLongOperation({
          message: t('deleteInProgress'),
        });
      });
      // user manually closed dialog of long operation
      if (deleteInitiated && !hasLongOperationVisibleRef.current) {
        enqueueSnackbar({
          variant: 'success',
          message: t('deleteIsDone'),
          duration: SNACK_DEFAULT_DURATION_MS,
        });
      }
      refreshRoots();
      return res;
    } catch (e: any) {
      throw e;
    } finally {
      if (deleteInitiated) {
        setLongOperation(null);
      }
    }
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
      performCopyContent,
      performMoveContent,
      deleteContent,
      roots,
      rootsReady,

      fileDetails,
      setFileDetails,
      showFileDetails,
      sort,
      longOperation,
      setLongOperation,
      toggleSort,
      layout,
      setLayout,
      settingsOpen,
      setSettingsOpen,
      storeLatestFolder,
      setStoreLatestFolder,
    }),
    [
      reloadRequired,
      renameDialogActive,
      newDirName,
      newDirPath,
      fileDetails,
      longOperation,
      roots,
      rootsReady,
      sort,
      layout,
      settingsOpen,
      storeLatestFolder,
    ],
  );

  useEffect(() => {
    hasLongOperationVisibleRef.current = !longOperation?.hidden;
  }, [longOperation]);

  useEffect(() => {
    refreshRoots();
  }, []);

  if (!rootsReady || !stateReady) {
    return <ActivityIndicator size={24} />;
  }

  return (
    <FileManagerContext.Provider value={ctxValue}>
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
              marginTop: -10,
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
    </FileManagerContext.Provider>
  );
}
