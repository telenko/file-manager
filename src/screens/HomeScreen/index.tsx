import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DirItem, FileApi } from '../../services/FileApi';
import FilePathBreadCrumb from './FilePathBreadCrumb';
import { useNavigation } from '../../common/hooks/useNavigation';
import { View, StyleSheet, Dimensions } from 'react-native';
import { HomeScreenContext } from './HomeScreenContext';
import DirectoryItemView from './DirectoryItemView';
import LoadingIndicator from '../../common/components/LoadingIndicator';
import {
  DataProvider,
  LayoutProvider,
  RecyclerListView,
} from 'recyclerlistview';

export type HomeScreenProps = {
  route: { params: { route: string } };
};

const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const openPreview = useCallback(
    (file: DirItem) => {
      if (!file.isFile()) {
        return;
      }
      // @TODO Andrii solve parametrization typings
      // @ts-ignore
      navigator.push('ImageViewer', { route: file.path });
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
      openPreview,
    }),
    [route, dirItems, dirLoading, dirError, openDirectory, openPreview],
  );

  useEffect(() => {
    (async () => {
      setDirLoading(true);
      setDirError(null);
      setDirItems([]);
      // @ts-ignore
      await new Promise(r => setTimeout(r, 100));
      try {
        const newDirItems = await FileApi.readDir(route ?? FileApi.ROOT_PATH);
        setDirItems(
          FileApi.sortDirItems(
            newDirItems.filter(file => !FileApi.isItemHidden(file)),
          ),
        );
      } catch (e) {
        setDirError(e as Error);
        setDirItems([]);
      } finally {
        setDirLoading(false);
      }
    })();
  }, [route]);

  // virtualized memoized contents
  const dataProvider = useMemo(
    () => new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(dirItems),
    [dirItems],
  );
  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        () => 1, // All items have the same layout type
        (type, dim) => {
          dim.width = SCREEN_WIDTH;
          dim.height = 70;
        },
      ),
    [],
  );
  const rowRenderer = useCallback(
    (type: any, item: DirItem) => (
      <DirectoryItemView key={item.path} item={item} />
    ),
    [],
  );

  return (
    <HomeScreenContext.Provider value={value}>
      <View style={styles.container}>
        <View style={styles.breadCrumbsContainer}>
          <FilePathBreadCrumb />
        </View>
        {dirLoading ? (
          <LoadingIndicator />
        ) : (
          <RecyclerListView
            dataProvider={dataProvider}
            layoutProvider={layoutProvider}
            rowRenderer={rowRenderer}
            optimizeForInsertDeleteAnimations
          />
        )}
      </View>
    </HomeScreenContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 10,
    flex: 1,
  },
  breadCrumbsContainer: {
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;
