import React, { useContext } from 'react';

export type FileManagerContextType = {
  reloadRequired?: boolean;
  setReloadRequired: (v: boolean) => void;
};

export const useFileManager = (): FileManagerContextType => {
  const ctx = useContext(FileManagerContext);
  return ctx;
};

export const FileManagerContext = React.createContext<FileManagerContextType>({
  reloadRequired: true,
  setReloadRequired: () => {},
});
