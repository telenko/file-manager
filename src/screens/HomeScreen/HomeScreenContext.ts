import React, { useContext } from 'react';
import { DirItem, FileApi } from '../../services/FileApi';

export type HomeScreenContext = {
  route: string;
  dirLoading: boolean;
  dirError: Error | null;
  dirItems: DirItem[];
  openDirectory: (dir: DirItem) => void;
  openPreview: (item: DirItem) => void;
};

export const HomeScreenContext = React.createContext<HomeScreenContext>({
  route: FileApi.ROOT_PATH,
  dirLoading: false,
  dirError: null,
  dirItems: [],
  openDirectory: () => {},
  openPreview: () => {},
});

export const useHomeContext = (): HomeScreenContext => {
  const value = useContext(HomeScreenContext);
  return value;
};
