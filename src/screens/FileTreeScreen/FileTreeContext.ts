import React, { useContext } from 'react';
import { FileApi } from '../../services/FileApi';

export type FileTreeContextType = {
  route: string;
  mode: 'tree' | 'move' | 'copy';
  selectedPaths: string[];
  setSelectedPaths: (v: string[]) => void;
};

export const FileTreeContext = React.createContext<FileTreeContextType>({
  route: FileApi.ROOT_PATH,
  mode: 'tree',
  selectedPaths: [],
  setSelectedPaths: () => {},
});

export const useFileTreeContext = (): FileTreeContextType => {
  const value = useContext(FileTreeContext);
  return value;
};
