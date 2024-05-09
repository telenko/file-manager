import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DirItem, FileApi } from '../../services/FileApi';
import FilePathBreadCrumb from './FilePathBreadCrumb';
import { useNavigation } from '../../common/hooks/useNavigation';
import {
  VirtualizedList,
  View,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { HomeScreenContext } from './HomeScreenContext';
import DirectoryItemView from './DirectoryItemView';
import { ScrollView } from 'react-native-gesture-handler';
import { ReadDirItem } from 'react-native-fs';

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
      navigator.push('Home', { route: dir.path });
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
      setDirItems([]);
      try {
        const newDirItems = await FileApi.readDir(route ?? FileApi.ROOT_PATH);
        setDirItems(newDirItems.filter(file => !FileApi.isItemHidden(file)));
      } catch (e) {
        setDirError(e as Error);
        setDirItems([]);
      } finally {
        setDirLoading(false);
      }
    })();
  }, [route]);

  // virtualized memoized contents
  const renderItem: ListRenderItem<ReadDirItem> = useCallback(
    ({ item }) => <DirectoryItemView key={item.path} item={item} />,
    [],
  );
  const keyExtractor = useCallback((item: DirItem) => item.path, []);
  const getItemCount = useCallback((data: DirItem[]) => data.length, []);
  const getItem = useCallback(
    (data: DirItem[], index: number) => data[index],
    [],
  );

  return (
    <HomeScreenContext.Provider value={value}>
      <View style={styles.container}>
        <View style={styles.breadCrumbsContainer}>
          <FilePathBreadCrumb />
        </View>
        <VirtualizedList
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          removeClippedSubviews
          updateCellsBatchingPeriod={700}
          data={dirItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemCount={getItemCount}
          getItem={getItem}
        />
      </View>
    </HomeScreenContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 10,
  },
  breadCrumbsContainer: {
    marginBottom: 10,
  },
});

export default HomeScreen;
