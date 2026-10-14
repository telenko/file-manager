import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  FileManagerLayout,
  FileLongOperationType,
} from '../widgets/FileManager/FileManagerContext';
import { StoredFileItem } from './fileData';

type FileManagerState = {
  sort: 'asc' | 'desc';
  layout: FileManagerLayout;
  storeLatestFolder: boolean;
  reloadRequired: boolean;
  roots: StoredFileItem[];
  rootsReady: boolean;
  renameDialogItem: StoredFileItem | null;
  newDirName: string;
  newDirPath: string | null;
  settingsOpen: boolean;
  fileDetails: StoredFileItem | null;
  longOperation: FileLongOperationType | null;
};

const initialState: FileManagerState = {
  sort: 'asc',
  layout: 'list',
  storeLatestFolder: false,
  reloadRequired: false,
  roots: [],
  rootsReady: false,
  renameDialogItem: null,
  newDirName: '',
  newDirPath: null,
  settingsOpen: false,
  fileDetails: null,
  longOperation: null,
};

const fileManagerSlice = createSlice({
  name: 'fileManager',
  initialState,
  reducers: {
    setSort(state, action: PayloadAction<'asc' | 'desc'>) {
      state.sort = action.payload;
    },
    toggleSort(state) {
      state.sort = state.sort === 'asc' ? 'desc' : 'asc';
    },
    setLayout(state, action: PayloadAction<FileManagerLayout>) {
      state.layout = action.payload;
    },
    setStoreLatestFolder(state, action: PayloadAction<boolean>) {
      state.storeLatestFolder = action.payload;
    },
    setReloadRequired(state, action: PayloadAction<boolean>) {
      state.reloadRequired = action.payload;
    },
    setRoots(state, action: PayloadAction<StoredFileItem[]>) {
      state.roots = action.payload;
      state.rootsReady = true;
    },
    setRenameDialogItem(state, action: PayloadAction<StoredFileItem | null>) {
      state.renameDialogItem = action.payload;
    },
    setNewDirName(state, action: PayloadAction<string>) {
      state.newDirName = action.payload;
    },
    setNewDirPath(state, action: PayloadAction<string | null>) {
      state.newDirPath = action.payload;
    },
    setSettingsOpen(state, action: PayloadAction<boolean>) {
      state.settingsOpen = action.payload;
    },
    setFileDetails(state, action: PayloadAction<StoredFileItem | null>) {
      state.fileDetails = action.payload;
    },
    setLongOperation(
      state,
      action: PayloadAction<FileLongOperationType | null>,
    ) {
      state.longOperation = action.payload;
    },
  },
});

export const {
  setSort,
  toggleSort,
  setLayout,
  setStoreLatestFolder,
  setReloadRequired,
  setRoots,
  setRenameDialogItem,
  setNewDirName,
  setNewDirPath,
  setSettingsOpen,
  setFileDetails,
  setLongOperation,
} = fileManagerSlice.actions;
export default fileManagerSlice.reducer;
