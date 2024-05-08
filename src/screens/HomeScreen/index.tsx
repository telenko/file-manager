import React, { useEffect, useMemo, useState } from 'react';
import { DirItem, FileApi } from '../../services/FileApi';

export type HomeScreenProps = {
  route?: string;
};

type HomeScreenContext = {
  route: string;
  dirLoading: boolean;
  dirError: Error | null;
  dirItems: DirItem[];
};

const HomeScreenContext = React.createContext<HomeScreenContext>({
  route: FileApi.ROOT_PATH,
  dirLoading: false,
  dirError: null,
  dirItems: [],
});

const HomeScreen: React.FC<HomeScreenProps> = ({ route }) => {
  const [dirItems, setDirItems] = useState<DirItem[]>([]);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [dirError, setDirError] = useState<Error | null>(null);
  const value = useMemo<HomeScreenContext>(
    () => ({
      route: route ?? FileApi.ROOT_PATH,
      dirItems,
      dirLoading,
      dirError,
    }),
    [route, dirItems, dirLoading, dirError],
  );

  useEffect(() => {
    (async () => {
      setDirLoading(true);
      setDirError(null);
      try {
        const newDirItems = await FileApi.readDir(route ?? FileApi.ROOT_PATH);
        setDirItems(newDirItems);
      } catch (e) {
        setDirError(e as Error);
        setDirItems([]);
      } finally {
        setDirLoading(false);
      }
    })();
  }, [route]);

  return (
    <HomeScreenContext.Provider value={value}></HomeScreenContext.Provider>
  );
};

export default HomeScreen;
