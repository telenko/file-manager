import React, { useContext } from 'react';
import { DirItem, FileApi } from '../../services/FileApi';

export type HomeScreenContext = {
  route: string;
  mode: 'tree' | 'move' | 'copy';
  dirLoading: boolean;
  dirError: Error | null;
  dirItems: DirItem[];
  openDirectory: (dir: DirItem) => void;
  openPreview: (item: DirItem) => void;
  copyDirItem: (dirItem: DirItem) => void;
  moveDirItem: (dirItem: DirItem) => void;
};

export const HomeScreenContext = React.createContext<HomeScreenContext>({
  route: FileApi.ROOT_PATH,
  mode: 'tree',
  dirLoading: false,
  dirError: null,
  dirItems: [],
  openDirectory: () => {},
  openPreview: () => {},
  copyDirItem: () => {},
  moveDirItem: () => {},
});

export const useHomeContext = (): HomeScreenContext => {
  const value = useContext(HomeScreenContext);
  return value;
};
