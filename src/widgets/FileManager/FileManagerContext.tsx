import { useCallback, useMemo } from 'react';
import { FileGuiHelper, getRouteDirectory } from './FileGuiHelper';
import { DirItem, FileApi, StorageItem } from '../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../common/types/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState, store } from '../../store';
import {
  setFileDetails,
  setLongOperation,
  setNewDirName,
  setNewDirPath,
  setReloadRequired,
  setRenameDialogItem,
  setRoots,
  setSettingsOpen,
  setStoreLatestFolder,
  setLayout,
  toggleSort,
} from '../../store/fileManagerSlice';
import { useSnackbar } from 'react-native-paper-snackbar-stack';
import { useTranslation } from 'react-i18next';

export type FileLongOperationType = {
  message: string;
  hidden?: boolean;
};

export type FileManagerLayout = 'list' | 'grid';

export type FileManagerContextType = {
  sort: 'asc' | 'desc';
  layout: FileManagerLayout;
  storeLatestFolder: boolean;
  setStoreLatestFolder: (v: boolean) => void;
  setLayout: (v: FileManagerLayout) => void;
  toggleSort: () => void;
  reloadRequired?: boolean;
  setReloadRequired: (v: boolean) => void;
  roots: StorageItem[];
  rootsReady: boolean;

  renameContent: (dirItem: DirItem) => void;
  renameDialogItem?: DirItem | null;
  setRenameDialogActive: (v: DirItem | null) => void;

  createDirectory: (navigator: NavigationProp<FileManagerNavigation>) => void;
  newDirName?: string;
  newDirPath?: string | null;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  setNewDirName: (v: string) => void;
  setNewDirPath: (v: string | null) => void;

  performCopyContent: (
    sources: string[],
    destination: string,
    injectIfConflict: boolean,
  ) => Promise<void>;
  performMoveContent: (
    sources: string[],
    destination: string,
    injectIfConflict: boolean,
  ) => Promise<void>;

  showFileDetails: (dirItem: DirItem) => void;
  setFileDetails: (v: DirItem | null) => void;
  fileDetails?: DirItem | null;
  longOperation?: FileLongOperationType | null;
  setLongOperation: (v: FileLongOperationType | null) => void;
} & typeof FileGuiHelper;

export const useFileManager = (): FileManagerContextType => {
  const dispatch = useDispatch<AppDispatch>();
  const { enqueueSnackbar } = useSnackbar();
  const { t } = useTranslation();
  const state = useSelector((root: RootState) => root.fileManager);
  const roots = useMemo(() => state.roots, [state.roots]);

  const refreshRoots = useCallback(async () => {
    const nextRoots = await FileApi.prepareFsRoots();
    dispatch(setRoots(nextRoots));
  }, [dispatch]);

  const setRenameDialogActive = useCallback(
    (item: DirItem | null) => dispatch(setRenameDialogItem(item ? item : null)),
    [dispatch],
  );
  const setFileDetailsValue = useCallback(
    (item: DirItem | null) => dispatch(setFileDetails(item ? item : null)),
    [dispatch],
  );
  const showFileDetails = setFileDetailsValue;
  const createDirectory = useCallback(
    (navigation: NavigationProp<FileManagerNavigation>) => {
      dispatch(setNewDirName(''));
      dispatch(
        setNewDirPath(getRouteDirectory(navigation) ?? FileApi.ROOT_PATH),
      );
    },
    [dispatch],
  );
  const performCopyContent = useCallback(
    async (
      sources: string[],
      destination: string,
      injectIfConflict: boolean,
    ) => {
      dispatch(setLongOperation({ message: t('copyInProgress') }));
      try {
        await FileApi.copyFilesOrDirectoriesBatched(
          sources,
          destination,
          injectIfConflict,
        );
        if (!store.getState().fileManager.longOperation?.hidden) {
          enqueueSnackbar({
            variant: 'success',
            message: t('copyIsDone'),
            duration: 4000,
          });
        }
        await refreshRoots();
      } finally {
        dispatch(setLongOperation(null));
      }
    },
    [dispatch, enqueueSnackbar, refreshRoots, t],
  );
  const performMoveContent = useCallback(
    async (
      sources: string[],
      destination: string,
      injectIfConflict: boolean,
    ) => {
      dispatch(setLongOperation({ message: t('moveInProgress') }));
      try {
        await FileApi.moveFilesOrDirectoriesBatched(
          sources,
          destination,
          injectIfConflict,
        );
        if (!store.getState().fileManager.longOperation?.hidden) {
          enqueueSnackbar({
            variant: 'success',
            message: t('moveIsDone'),
            duration: 4000,
          });
        }
        await refreshRoots();
      } finally {
        dispatch(setLongOperation(null));
      }
    },
    [dispatch, enqueueSnackbar, refreshRoots, t],
  );
  const deleteContent = useCallback(
    async (items: DirItem[]) => {
      let deleteInitiated = false;
      try {
        const result = await FileGuiHelper.deleteContent(items, () => {
          deleteInitiated = true;
          dispatch(setLongOperation({ message: t('deleteInProgress') }));
        });
        if (result) {
          if (
            deleteInitiated &&
            !store.getState().fileManager.longOperation?.hidden
          ) {
            enqueueSnackbar({
              variant: 'success',
              message: t('deleteIsDone'),
              duration: 4000,
            });
          }
          await refreshRoots();
        }
        return result;
      } finally {
        if (deleteInitiated) {
          dispatch(setLongOperation(null));
        }
      }
    },
    [dispatch, enqueueSnackbar, refreshRoots, t],
  );

  return {
    ...FileGuiHelper,
    sort: state.sort,
    layout: state.layout,
    storeLatestFolder: state.storeLatestFolder,
    setStoreLatestFolder: value => dispatch(setStoreLatestFolder(value)),
    setLayout: value => dispatch(setLayout(value)),
    toggleSort: () => dispatch(toggleSort()),
    reloadRequired: state.reloadRequired,
    setReloadRequired: value => dispatch(setReloadRequired(value)),
    roots,
    rootsReady: state.rootsReady,
    renameContent: setRenameDialogActive,
    renameDialogItem: state.renameDialogItem ? state.renameDialogItem : null,
    setRenameDialogActive,
    createDirectory,
    newDirName: state.newDirName,
    newDirPath: state.newDirPath,
    settingsOpen: state.settingsOpen,
    setSettingsOpen: value => dispatch(setSettingsOpen(value)),
    setNewDirName: value => dispatch(setNewDirName(value)),
    setNewDirPath: value => dispatch(setNewDirPath(value)),
    performCopyContent,
    performMoveContent,
    showFileDetails,
    setFileDetails: setFileDetailsValue,
    fileDetails: state.fileDetails ? state.fileDetails : null,
    longOperation: state.longOperation,
    setLongOperation: value => dispatch(setLongOperation(value)),
    deleteContent,
  };
};
