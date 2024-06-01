import React, { useContext } from 'react';
import { FileGuiHelper } from './FileGuiHelper';
import { DirItem } from '../../services/FileApi';

export type FileManagerContextType = {
  reloadRequired?: boolean;
  setReloadRequired: (v: boolean) => void;

  renameContent: (dirItem: DirItem) => void;
  renameDialogItem?: DirItem | null;
  setRenameDialogActive: (v: DirItem | null) => void;
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
  ...FileGuiHelper,
});
