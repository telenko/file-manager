import React, { useContext } from 'react';
import { FileGuiHelper } from './FileGuiHelper';
import { DirItem, StorageItem } from '../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../common/types/navigation';

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
  const ctx = useContext(FileManagerContext);
  return ctx;
};

export const FileManagerContext = React.createContext<FileManagerContextType>({
  sort: 'asc',
  layout: 'list',
  storeLatestFolder: false,
  setStoreLatestFolder: () => {},
  setLayout: () => {},
  toggleSort: () => {},
  reloadRequired: false,
  setReloadRequired: () => {},
  roots: [],
  rootsReady: false,

  renameContent: () => {},
  settingsOpen: false,
  setSettingsOpen: () => {},
  setRenameDialogActive: () => {},
  createDirectory: () => {},
  setNewDirName: () => {},
  setNewDirPath: () => {},

  showFileDetails: () => {},
  setFileDetails: () => {},
  longOperation: null,
  setLongOperation: () => {},
  performCopyContent: async () => {},
  performMoveContent: async () => {},

  ...FileGuiHelper,
});
