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
import { Cache } from '../../services/Cache';
import { useTranslation } from 'react-i18next';
import { Button } from 'react-native-paper';
import { navigateFromSelectable } from '../../common/utils/navigator';
import { useFileManager } from '../../widgets/FileManagerContext';

export type HomeScreenProps = {
  route: {
    params: {
      route: string;
      mode?: 'tree' | 'copy' | 'move';
      fromRoute?: string;
    };
  };
};

const SCREEN_WIDTH = Dimensions.get('window').width;

const HomeScreen: React.FC<HomeScreenProps> = ({
  route: {
    params: { route, ...routeMetadatas },
  },
}) => {
  const navigator = useNavigation();
  const { t } = useTranslation();
  const [dirItems, setDirItems] = useState<DirItem[]>([]);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [dirError, setDirError] = useState<Error | null>(null);
  const [copyInProgress, setCopyInProgress] = useState<boolean>(false);
  const [moveInProgress, setMoveInProgress] = useState<boolean>(false);
  const fileManager = useFileManager();

  useEffect(() => {
    let title = '';
    switch (routeMetadatas.mode) {
      case 'copy': {
        title = t('copyInto');
        break;
      }
      case 'move': {
        title = t('moveInto');
        break;
      }
      default: {
        title = t('title');
        break;
      }
    }
    navigator.setOptions({
      headerTitle: title,
    });
  }, [routeMetadatas.mode, navigator]);

  const reloadDir = useCallback(async () => {
    setDirLoading(true);
    setDirError(null);
    setDirItems([]);
    // @ts-ignore
    await new Promise(r => setTimeout(r, 100));
    try {
      const newDirItems = await FileApi.readDir(route ?? FileApi.ROOT_PATH);
      const sortedDirItems = FileApi.sortDirItems(
        newDirItems.filter(file => !FileApi.isItemHidden(file)),
      );
      setDirItems(sortedDirItems);
      Cache.putDirItems(route ?? FileApi.ROOT_PATH, sortedDirItems);
    } catch (e) {
      setDirError(e as Error);
      setDirItems([]);
    } finally {
      setDirLoading(false);
    }
  }, [route]);

  const openDirectory = useCallback(
    (dir: DirItem) => {
      if (!dir.isDirectory()) {
        return;
      }
      // @TODO Andrii solve parametrization typings
      // @ts-ignore
      navigator.push('Home', { route: dir.path, ...routeMetadatas });
    },
    [navigator, ...Object.values(routeMetadatas)],
  );
  const openPreview = useCallback(
    (file: DirItem) => {
      if (!file.isFile()) {
        return;
      }
      // @TODO Andrii solve parametrization typings
      // @ts-ignore
      navigator.push('ImageViewer', { route: file.path, ...routeMetadatas });
    },
    [navigator, ...Object.values(routeMetadatas)],
  );
  const copyDirItem = useCallback((dirItem: DirItem) => {
    // @ts-ignore
    navigator.push('Home', {
      route: FileApi.ROOT_PATH,
      mode: 'copy',
      fromRoute: dirItem.path,
    });
  }, []);
  const moveDirItem = useCallback((dirItem: DirItem) => {
    // @ts-ignore
    navigator.push('Home', {
      route: FileApi.ROOT_PATH,
      mode: 'move',
      fromRoute: dirItem.path,
    });
  }, []);
  const value = useMemo<HomeScreenContext>(
    () => ({
      route: route ?? FileApi.ROOT_PATH,
      dirItems,
      mode: routeMetadatas.mode ?? 'tree',
      dirLoading,
      dirError,
      openDirectory,
      openPreview,
      copyDirItem,
      moveDirItem,
      reloadDir,
    }),
    [
      route,
      dirItems,
      routeMetadatas.mode,
      dirLoading,
      dirError,
      openDirectory,
      openPreview,
      copyDirItem,
      moveDirItem,
      reloadDir,
    ],
  );

  // useEffect(() => {
  //   if (fileManager.reloadRequired) {
  //     reloadDir();
  //     fileManager.setReloadRequired(false);
  //   }
  // }, [fileManager.reloadRequired]);

  useEffect(() => {
    reloadDir();
    FileApi.clearVideoPreviewCache();
    return () => {
      Cache.clearDirItems();
    };
  }, [route, reloadDir]);

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
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingLeft: 20,
            paddingRight: 20,
          }}>
          {routeMetadatas.mode === 'copy' ? (
            <Button
              icon="content-copy"
              loading={copyInProgress}
              disabled={!routeMetadatas.fromRoute || !route || copyInProgress}
              onPress={() => {
                setCopyInProgress(true);
                FileApi.copyFileOrDirectory(routeMetadatas.fromRoute!, route)
                  .then(() => {
                    navigateFromSelectable(navigator);
                  })
                  // @TODO Andrii errors handling
                  .catch(console.error)
                  .finally(() => setCopyInProgress(false));
              }}>
              {t('copyHere')}
            </Button>
          ) : null}
          {routeMetadatas.mode === 'move' ? (
            <Button
              icon="file-move"
              loading={moveInProgress}
              disabled={!routeMetadatas.fromRoute || !route || copyInProgress}
              onPress={() => {
                setMoveInProgress(true);
                FileApi.moveFileOrDirectory(routeMetadatas.fromRoute!, route)
                  .then(() => {
                    navigateFromSelectable(navigator);
                    fileManager.setReloadRequired(true);
                  })
                  // @TODO Andrii errors handling
                  .catch(console.error)
                  .finally(() => setMoveInProgress(false));
              }}>
              {t('moveHere')}
            </Button>
          ) : null}
          {routeMetadatas.mode === 'copy' || routeMetadatas.mode === 'move' ? (
            <Button
              icon="close"
              onPress={() => {
                navigateFromSelectable(navigator);
              }}>
              {t('cancel')}
            </Button>
          ) : null}
        </View>
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
