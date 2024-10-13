import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { DirItem, FileApi } from '../../services/FileApi';
import FilePathBreadCrumb from './FilePathBreadCrumb';
import { useNavigation } from '../../common/hooks/useNavigation';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { FileTreeContext, FileTreeContextType } from './FileTreeContext';
import DirectoryItemView from './DirectoryItemView';
import {
  DataProvider,
  LayoutProvider,
  RecyclerListView,
} from 'recyclerlistview';
import { Cache } from '../../services/Cache';
import { useTranslation } from 'react-i18next';
import { navigateFromSelectable } from '../../common/utils/navigator';
import { useFileManager } from '../../widgets/FileManager';
import EmptyData from '../../common/components/EmptyData';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import ActionButton from '../../common/components/ActionButton';
import MultiSelectActions from './MultiSelectActions';
import { useBackAction } from '../../common/hooks/useBackAction';
import { useExceptionHandler } from '../../common/components/ExceptionHandler';
import DefaultFolderActions from '../../widgets/FileManager/DefaultFolderActions';
import StorageSelect from './StorageSelect';
import { ActivityIndicator } from 'react-native-paper';
import DirectoryGridItemView from './DirectoryGridItemView';
import SelectorAction from './SelectorAction';
import {
  calcGridColumns,
  GRID_HEIGHT,
  LIST_HEIGHT,
} from '../../common/utils/layout';

export type FileScreenProps = {
  route: {
    params: {
      route: string;
      mode?: 'tree' | 'copy' | 'move';
      fromRoute?: string[];
    };
  };
};

const hapticFallbackOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};
const selectVibrate = () => {
  ReactNativeHapticFeedback.trigger('impactLight', hapticFallbackOptions);
};

const FileScreen: React.FC<FileScreenProps> = ({
  route: {
    params: { route, ...routeMetadatas },
  },
}) => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const navigator = useNavigation();
  const { t } = useTranslation();
  const [dirLoadingDone, setDirLoadingDone] = useState(false);
  const [dirItems, setDirItems] = useState<DirItem[]>([]);
  const [dirLoading, setDirLoading] = useState<boolean>(false);
  const [dirError, setDirError] = useState<Error | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [copyInProgress, setCopyInProgress] = useState<boolean>(false);
  const [moveInProgress, setMoveInProgress] = useState<boolean>(false);
  const fileManager = useFileManager();
  const isMultiSelectActivated = selectedPaths.length > 0;
  const isStorageLevel = fileManager.roots.map(r => r.path).includes(route);
  const hasFiles = useMemo(
    () => dirItems.some(dirIt => dirIt.isFile()),
    [dirItems],
  );
  useEffect(() => {
    let title = '';
    if (isMultiSelectActivated) {
      title = t('selectedNItems', { n: selectedPaths.length });
    } else {
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
          title = isStorageLevel ? t('title') : '';
          break;
        }
      }
    }
    navigator.setOptions({
      headerTitle: title,
      headerRight: () =>
        fileManager.longOperation ? (
          <View style={{ marginRight: 10 }}>
            <ActivityIndicator size={24} />
          </View>
        ) : isMultiSelectActivated ? (
          <SelectorAction
            dirItems={dirItems}
            navigation={navigator}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPathsExternal}
          />
        ) : (
          <DefaultFolderActions folderHasFiles={hasFiles} />
        ),
    });
  }, [
    routeMetadatas.mode,
    navigator,
    selectedPaths,
    dirItems,
    fileManager.longOperation,
    isStorageLevel,
  ]);

  const reloadDir = useCallback(async () => {
    setDirLoading(true);
    setDirError(null);
    // @ts-ignore
    await new Promise(r => setTimeout(r, 100));
    try {
      const newDirItems = await FileApi.readDir(route ?? FileApi.ROOT_PATH);
      setDirItems(newDirItems.filter(file => !FileApi.isItemHidden(file)));
      setDirLoadingDone(true);
    } catch (e: any) {
      setDirError(e as Error);
      setDirItems([]);
      exceptionHandler.handleError(e);
    } finally {
      setDirLoading(false);
    }
  }, [route]);

  const sortedDirItems = useMemo<DirItem[]>(() => {
    return FileApi.sortDirItems(
      dirItems.filter(file => !FileApi.isItemHidden(file)),
      fileManager.sort,
    );
  }, [dirItems, fileManager.sort]);
  useEffect(() => {
    Cache.putDirItems(route ?? FileApi.ROOT_PATH, sortedDirItems);
  }, [sortedDirItems]);

  const setSelectedPathsExternal = useCallback((v: string[]) => {
    selectVibrate();
    setSelectedPaths([...new Set(v)]);
  }, []);

  const value = useMemo<FileTreeContextType>(
    () => ({
      route: route ?? FileApi.ROOT_PATH,
      mode: routeMetadatas.mode ?? 'tree',
      selectedPaths,
      setSelectedPaths: setSelectedPathsExternal,
    }),
    [route, routeMetadatas.mode, selectedPaths],
  );

  useEffect(() => {
    if (fileManager.reloadRequired) {
      reloadDir();
      fileManager.setReloadRequired(false);
      setSelectedPaths([]);
    }
  }, [fileManager.reloadRequired]);

  useEffect(() => {
    setSelectedPaths([]);
    reloadDir();
    Cache.clearVideoPreviews();
    return () => {
      Cache.clearDirItems();
      setDirLoadingDone(false);
      setDirItems([]);
      setSelectedPaths([]);
    };
  }, [route, reloadDir]);

  const backHandle = useCallback(() => {
    if (selectedPaths.length > 0) {
      setSelectedPaths([]);
      return true;
    }
    return false;
  }, [selectedPaths]);
  useBackAction(backHandle);

  const exceptionHandler = useExceptionHandler();

  // virtualized memoized contents
  const dataProvider = useMemo(
    () => new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(sortedDirItems),
    [sortedDirItems],
  );
  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        () => 1, // All items have the same layout type
        (type, dim) => {
          if (fileManager.layout === 'list') {
            dim.width = SCREEN_WIDTH;
            dim.height = LIST_HEIGHT;
          } else {
            dim.width = SCREEN_WIDTH / calcGridColumns(SCREEN_WIDTH) - 5;
            dim.height = GRID_HEIGHT;
          }
        },
      ),
    [SCREEN_WIDTH, fileManager.layout],
  );
  const rowRenderer = useCallback(
    (type: any, item: DirItem) =>
      fileManager.layout === 'list' ? (
        <DirectoryItemView key={item.path} item={item} />
      ) : (
        <DirectoryGridItemView key={item.path} item={item} />
      ),
    [fileManager.layout],
  );

  const isMoveFolderToSame = () => {
    return !!routeMetadatas.fromRoute?.some(fromRoute => {
      const fromRouteTokens = fromRoute.split('/');
      fromRouteTokens.pop();
      const fromRouteFolder = fromRouteTokens.join('/');
      return fromRouteFolder === route;
    });
  };

  return (
    <FileTreeContext.Provider value={value}>
      <View style={styles.container}>
        <View style={styles.breadCrumbsContainer}>
          {isStorageLevel ? <StorageSelect /> : <FilePathBreadCrumb />}
        </View>
        {sortedDirItems.length === 0 ? (
          <ScrollView
            contentContainerStyle={{
              flex: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            refreshControl={
              <RefreshControl refreshing={dirLoading} onRefresh={reloadDir} />
            }>
            {dirLoadingDone ? <EmptyData message={t('noDataHere')} /> : null}
          </ScrollView>
        ) : (
          <RecyclerListView
            canChangeSize
            dataProvider={dataProvider}
            layoutProvider={layoutProvider}
            rowRenderer={rowRenderer}
            optimizeForInsertDeleteAnimations
            refreshControl={
              <RefreshControl refreshing={dirLoading} onRefresh={reloadDir} />
            }
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
            <ActionButton
              icon="content-copy"
              text={t('copyHere')}
              loading={copyInProgress}
              disabled={!routeMetadatas.fromRoute || !route || copyInProgress}
              onPress={async () => {
                setCopyInProgress(true);
                try {
                  const promise = fileManager.performCopyContent(
                    routeMetadatas.fromRoute!,
                    route,
                    true,
                  );
                  navigateFromSelectable(navigator);
                  await promise;
                  fileManager.setReloadRequired(true);
                } catch (e: any) {
                  exceptionHandler.handleError(e);
                } finally {
                  setCopyInProgress(false);
                }
              }}
            />
          ) : null}
          {routeMetadatas.mode === 'move' ? (
            <ActionButton
              icon="file-move-outline"
              text={t('moveHere')}
              loading={moveInProgress}
              style={styles.actionButton}
              disabled={
                !routeMetadatas.fromRoute ||
                !route ||
                moveInProgress ||
                isMoveFolderToSame()
              }
              onPress={async () => {
                setMoveInProgress(true);
                try {
                  const promise = fileManager.performMoveContent(
                    routeMetadatas.fromRoute!,
                    route,
                    true,
                  );
                  navigateFromSelectable(navigator);
                  await promise;
                  fileManager.setReloadRequired(true);
                } catch (e: any) {
                  exceptionHandler.handleError(e);
                } finally {
                  setMoveInProgress(false);
                }
              }}
            />
          ) : null}
          {routeMetadatas.mode === 'copy' || routeMetadatas.mode === 'move' ? (
            <ActionButton
              icon="close"
              text={t('cancel')}
              onPress={() => {
                navigateFromSelectable(navigator);
              }}
            />
          ) : null}
        </View>
        {isMultiSelectActivated ? (
          <MultiSelectActions
            dirItems={dirItems}
            navigation={navigator}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPaths}
          />
        ) : null}
      </View>
    </FileTreeContext.Provider>
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
  actionButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    marginBottom: -5,
  },
});

export default FileScreen;
