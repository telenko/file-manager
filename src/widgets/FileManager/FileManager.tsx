import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  FileManagerLayout,
} from './FileManagerContext';
import { FileGuiHelper, getRouteDirectory } from './FileGuiHelper';
import RenameContentDialog from './RenameContentDialog';
import CreateDirectoryDialog from './CreateDirectoryDialog';
import FileDetailsDialog from './FileDetailsDialog';
import DefaultFolderActions from './DefaultFolderActions';
import AppHeader from '../../common/components/AppHeader';
import LongOperationDialog from './LongOperationDialog';
import { useSnackbar } from 'react-native-paper-snackbar-stack';
import { ActivityIndicator } from 'react-native-paper';
import { useFsRoots } from './useFsRoots';

const SNACK_DEFAULT_DURATION_MS = 4000;

const useSort = (): ['asc' | 'desc', () => void] => {
  const SORT_STORAGE_KEY = '__sort_direction__';
  const getSortDirection = async () => {
    try {
      const readValue = await AsyncStorage.getItem(SORT_STORAGE_KEY);
      return readValue === 'asc' ? 'asc' : 'desc';
    } catch {
      return 'asc';
    }
  };
  const setSortDirection = (s: 'asc' | 'desc') => {
    try {
      AsyncStorage.setItem(SORT_STORAGE_KEY, s);
    } catch {}
  };
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const sortRead = useRef(false);
  useEffect(() => {
    (async () => {
      setSort(await getSortDirection());
      sortRead.current = true;
    })();
  }, []);
  useEffect(() => {
    if (!sortRead.current) {
      return;
    }
    setSortDirection(sort);
  }, [sort]);
  const toggleSort = () => setSort(sort === 'asc' ? 'desc' : 'asc');
  return [sort, toggleSort];
};

const useLayout = (): [FileManagerLayout, (v: FileManagerLayout) => void] => {
  const LAYOUT_STORAGE_KEY = '__layout_type__';
  const getLayoutStore = async () => {
    try {
      const readValue = await AsyncStorage.getItem(LAYOUT_STORAGE_KEY);
      return readValue === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  };
  const setLayoutStore = (s: FileManagerLayout) => {
    try {
      AsyncStorage.setItem(LAYOUT_STORAGE_KEY, s);
    } catch {}
  };
  const [layout, setLayout] = useState<FileManagerLayout>('list');
  const layoutRead = useRef(false);
  useEffect(() => {
    (async () => {
      setLayout(await getLayoutStore());
      layoutRead.current = true;
    })();
  }, []);
  useEffect(() => {
    if (!layoutRead.current) {
      return;
    }
    setLayoutStore(layout);
  }, [layout]);
  return [layout, setLayout];
};

const Stack = createNativeStackNavigator<FileManagerNavigation>();
export default function FileManager() {
  const { t } = useTranslation();
  const { enqueueSnackbar } = useSnackbar();
  const [reloadRequired, setReloadRequired] = useState(false);
  const [renameDialogActive, setRenameDialogActive] = useState<DirItem | null>(
    null,
  );
  const [newDirName, setNewDirName] = useState<string>('');
  const [newDirPath, setNewDirPath] = useState<string | null>(null);
  const [fileDetails, setFileDetails] = useState<DirItem | null>(null);
  const [longOperation, setLongOperation] =
    useState<FileLongOperationType | null>(null);
  const hasLongOperationVisibleRef = useRef(false);
  const [sort, toggleSort] = useSort();
  const [layout, setLayout] = useLayout();
  const { refresh: refreshRoots, rootsReady, roots } = useFsRoots();

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
    ],
  );

  useEffect(() => {
    hasLongOperationVisibleRef.current = !longOperation?.hidden;
  }, [longOperation]);

  useEffect(() => {
    refreshRoots();
  }, []);

  if (!rootsReady) {
    return <ActivityIndicator size={24} />;
  }

  return (
    <FileManagerContext.Provider value={ctxValue}>
      <RenameContentDialog />
      <CreateDirectoryDialog />
      <FileDetailsDialog />
      <NavigationContainer>
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
