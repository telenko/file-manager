import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DirItem, FileApi } from '../../services/FileApi';
import FilePathBreadCrumb from './FilePathBreadCrumb';
import { useNavigation } from '../../common/hooks/useNavigation';
import { VirtualizedList, View, StyleSheet } from 'react-native';
import { HomeScreenContext } from './HomeScreenContext';
import DirectoryItemView from './DirectoryItemView';

export type HomeScreenProps = {
  route: { params: { route: string } };
};

const HomeScreen: React.FC<HomeScreenProps> = ({
  route: {
    params: { route },
  },
}) => {
  const navigator = useNavigation();
  const [dirItems, setDirItems] = useState<DirItem[]>([]);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [dirError, setDirError] = useState<Error | null>(null);
  const openDirectory = useCallback(
    (dir: DirItem) => {
      if (!dir.isDirectory()) {
        return;
      }
      // @TODO Andrii solve parametrization typings
      // @ts-ignore
      navigator.navigate('Home', { route: dir.path });
    },
    [navigator],
  );
  const value = useMemo<HomeScreenContext>(
    () => ({
      route: route ?? FileApi.ROOT_PATH,
      dirItems,
      dirLoading,
      dirError,
      openDirectory,
    }),
    [route, dirItems, dirLoading, dirError, openDirectory],
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
    <HomeScreenContext.Provider value={value}>
      <View style={styles.container}>
        <FilePathBreadCrumb />
        <VirtualizedList
          initialNumToRender={10}
          data={dirItems}
          renderItem={({ item }) => (
            <DirectoryItemView key={item.path} item={item} />
          )}
          keyExtractor={(item: DirItem) => item.path}
          getItemCount={data => data.length}
          getItem={(data, index) => data[index]}
        />
      </View>
    </HomeScreenContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
});

export default HomeScreen;
