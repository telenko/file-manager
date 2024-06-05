import React, { useContext } from 'react';
import { FileGuiHelper } from './FileGuiHelper';
import { DirItem } from '../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../common/types/navigation';

export type FileManagerContextType = {
  reloadRequired?: boolean;
  setReloadRequired: (v: boolean) => void;

  renameContent: (dirItem: DirItem) => void;
  renameDialogItem?: DirItem | null;
  setRenameDialogActive: (v: DirItem | null) => void;

  createDirectory: (navigator: NavigationProp<FileManagerNavigation>) => void;
  newDirName?: string;
  newDirPath?: string | null;
  setNewDirName: (v: string) => void;
  setNewDirPath: (v: string | null) => void;

  showFileDetails: (dirItem: DirItem) => void;
  setFileDetails: (v: DirItem | null) => void;
  fileDetails?: DirItem | null;
} & typeof FileGuiHelper;

export const useFileManager = (): FileManagerContextType => {
  const ctx = useContext(FileManagerContext);
  return ctx;
};

export const FileManagerContext = React.createContext<FileManagerContextType>({
  reloadRequired: false,
  setReloadRequired: () => {},

  renameContent: () => {},
  setRenameDialogActive: () => {},
  createDirectory: () => {},
  setNewDirName: () => {},
  setNewDirPath: () => {},

  showFileDetails: () => {},
  setFileDetails: () => {},

  ...FileGuiHelper,
});
