import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { DirItem, FileApi } from '../../services/FileApi';
import FilePathBreadCrumb from './FilePathBreadCrumb';
import { useNavigation } from '../../common/hooks/useNavigation';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { useFileTreeActions, useFileTreeContext } from './FileTreeContext';
import { DataProvider, LayoutProvider } from 'recyclerlistview';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  clearVideoPreviews,
  // setDirectoryItems,
} from '../../store/fileDataSlice';
// import { restoreFileItem, storeFileItem } from '../../store/fileData';
import { useTranslation } from 'react-i18next';
import { navigateFromSelectable } from '../../common/utils/navigator';
import { useFileManager } from '../../widgets/FileManager';
import EmptyData from '../../common/components/EmptyData';
import { RefreshControl, ScrollView } from 'react-native-gesture-handler';
import ActionButton from '../../common/components/ActionButton';
import MultiSelectActions from './MultiSelectActions';
import { useBackAction } from '../../common/hooks/useBackAction';
import { useExceptionHandler } from '../../common/components/ExceptionHandler';
import DefaultFolderActions from '../../widgets/FileManager/actions/DefaultFolderActions';
import StorageSelect from './StorageSelect';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';
import SelectorAction from './SelectorAction';
import {
  calcGridColumns,
  GRID_HEIGHT,
  LIST_HEIGHT,
} from '../../common/utils/layout';
import { useStoreLatestFolder } from '../../widgets/FileManager/settings';
import { useFocusEffect } from '@react-navigation/native';
import { ItemWithSkeleton } from './ItemWithSkeleton';
import FileTreeList from './FileTreeList';
import { useScrollIndicatorState } from '../../common/components/ScrollIndicator/ScrollIndicatorProvider';
// import { NativeModules } from 'react-native';
// import { SearchContextSelect } from './SearchContextSelect';
import { FileTreeState } from '../../store/fileTreeSlice';
import { useDataManager } from './DataManager/useDataManager';

// const { EmbeddingsModule } = NativeModules;

export type FileScreenProps = {
  route: {
    params: {
      route: string;
      mode?: FileTreeState['mode'];
      fromRoute?: string[];
    };
  };
};

const FileScreen: React.FC<FileScreenProps> = stackRoute => {
  const {
    route: {
      params: { route, ...routeMetadatas },
    },
  } = stackRoute;
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scrollIndicator = useScrollIndicatorState();
  const navigator = useNavigation();
  const { t } = useTranslation();
  // const [dirLoadingDone, setDirLoadingDone] = useState(false);
  // const directoryPath = route ?? FileApi.ROOT_PATH;
  // const storedDirItems = useSelector(
  //   (state: RootState) => state.fileData.directories[directoryPath] ?? [],
  // );
  // const dirItems = useMemo(
  //   () => storedDirItems.map(restoreFileItem),
  //   [storedDirItems],
  // );
  const dispatch = useDispatch<AppDispatch>();
  // const [dirLoading, setDirLoading] = useState<boolean>(false);
  // const [dirError, setDirError] = useState<Error | null>(null);
  const { selectedPaths } = useFileTreeContext();
  const source = useSelector((state: RootState) => state.fileTree.source);
  const { setSelectedPaths, setFileTree } = useFileTreeActions();
  const [copyInProgress, setCopyInProgress] = useState<boolean>(false);
  const [moveInProgress, setMoveInProgress] = useState<boolean>(false);
  const fileManager = useFileManager();
  const isMultiSelectActivated = selectedPaths.length > 0;
  const isStorageLevel = fileManager.roots.map(r => r.path).includes(route);
  const { saveLatestFolder } = useStoreLatestFolder();
  const dataManager = useDataManager({
    route,
    mode: routeMetadatas.mode || 'tree',
  });
  const isOperational = ['copy', 'move'].includes(routeMetadatas.mode || '');
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
          title = '';
          break;
        }
      }
    }
    navigator.setOptions({
      headerTitle: title,
      headerLeft:
        isStorageLevel && !isMultiSelectActivated && !isOperational
          ? () => <StorageSelect route={route ?? ''} />
          : undefined,
      headerRight: () =>
        fileManager.longOperation ? (
          <View style={{ marginRight: 10 }}>
            <ActivityIndicator size={24} />
          </View>
        ) : isMultiSelectActivated ? (
          <SelectorAction
            dirItems={dataManager.items}
            navigation={navigator}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPathsExternal}
          />
        ) : (
          <DefaultFolderActions
            folderHasFiles={dataManager.hasFiles}
            isOperational={isOperational}
          />
        ),
    });
  }, [
    routeMetadatas.mode,
    navigator,
    selectedPaths,
    dataManager.items,
    fileManager.longOperation,
    isStorageLevel,
  ]);

  // @TODO ANDRII MOVE
  // const reloadDir = useCallback(async () => {
  //   setDirLoading(true);
  //   setDirError(null);
  //   // @ts-ignore
  //   await new Promise(r => setTimeout(r, 100));
  //   try {
  //     const newDirItems = await FileApi.readDir(directoryPath);
  //     dispatch(
  //       setDirectoryItems({
  //         path: directoryPath,
  //         items: newDirItems
  //           .filter(file => !FileApi.isItemHidden(file))
  //           .map(storeFileItem),
  //       }),
  //     );
  //     setDirLoadingDone(true);
  //   } catch (e: any) {
  //     setDirError(e as Error);
  //     dispatch(setDirectoryItems({ path: directoryPath, items: [] }));
  //     exceptionHandler.handleError(e);
  //   } finally {
  //     setDirLoading(false);
  //   }
  // }, [directoryPath, dispatch]);

  // @TODO ANDRII MOVE
  // const sortedDirItems = useMemo<DirItem[]>(() => {
  //   return FileApi.sortDirItems(
  //     dirItems.filter(file => !FileApi.isItemHidden(file)),
  //     fileManager.sort,
  //   );
  // }, [dirItems, fileManager.sort]);
  const setSelectedPathsExternal = useCallback(
    (v: string[]) => {
      setSelectedPaths(v);
    },
    [setSelectedPaths],
  );

  useEffect(() => {
    if (fileManager.reloadRequired) {
      dataManager.load();
      fileManager.setReloadRequired(false);
      setSelectedPaths([]);
    }
  }, [fileManager.reloadRequired]);

  useEffect(() => {
    setSelectedPaths([]);
    dataManager.load();
    dispatch(clearVideoPreviews());
    return () => {
      setSelectedPaths([]);
    };
  }, [route, dataManager.load, dispatch, setSelectedPaths]);

  useFocusEffect(
    useCallback(() => {
      setFileTree(route ?? FileApi.ROOT_PATH, routeMetadatas.mode ?? 'tree');
      if (route && !isOperational && source !== 'search') {
        saveLatestFolder(route);
      }
    }, [
      route,
      routeMetadatas.mode,
      source,
      isOperational,
      saveLatestFolder,
      setFileTree,
    ]),
  );

  const backHandle = useCallback(() => {
    if (selectedPaths.length > 0) {
      setSelectedPaths([]);
      return true;
    }
    return false;
  }, [selectedPaths]);
  useBackAction(backHandle);

  const exceptionHandler = useExceptionHandler();
  // const [searchText, setSearchText] = useState('');
  // const [searchDirItems, setSearchDirItems] = useState<DirItem[]>([]);
  // const [searchContext, setSearchContext] = useState<'VISUAL' | 'TEXT' | 'ALL'>(
  //   'VISUAL',
  // );

  // virtualized memoized contents
  // @TODO ANDRII MOVE
  // const dataProvider = useMemo(
  //   () =>
  //     new DataProvider((r1, r2) => r1 !== r2).cloneWithRows(
  //       // !!searchText.trim() && searchDirItems?.length > 0
  //       //   ? searchDirItems
  //       /**:*/ sortedDirItems,
  //     ),
  //   [sortedDirItems /**, searchDirItems, searchText*/],
  // );
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
    (type: any, item: DirItem) => (
      <ItemWithSkeleton
        key={item.path}
        item={item}
        layout={fileManager.layout}
        isUserDragging={scrollIndicator.isUserDragging}
      />
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

  const timestamps = useMemo(
    () =>
      dataManager.items.map(item =>
        item.isFile() ? item.mtime?.getTime() : undefined,
      ),
    [dataManager.items],
  );

  const listStyle = useMemo(
    () =>
      fileManager.layout === 'grid'
        ? {
            marginTop: -5,
          }
        : undefined,
    [fileManager.layout],
  );

  // useEffect(() => {
  //   setSearchDirItems([]);
  // }, [searchText]);

  return (
    <>
      <View style={styles.container}>
        {source === 'search' ? null : (
          <>
            {!isStorageLevel ? (
              <View style={styles.breadCrumbsContainer}>
                <FilePathBreadCrumb />
              </View>
            ) : null}
            {isOperational && isStorageLevel ? (
              <View style={{ marginLeft: 10 }}>
                <StorageSelect route={route || ''} />
              </View>
            ) : null}
          </>
        )}

        <View
          style={{
            flexDirection: 'row',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
          {/* <TextInput
            label="Search..."
            value={searchText}
            onChangeText={setSearchText}
            style={{ flex: 3, marginRight: 10 }}
          />
          <SearchContextSelect
            value={searchContext}
            onSelect={setSearchContext}
          />
          <Button
            mode="contained"
            onPress={() => {
              if (searchText.trim() === '') {
                return;
              }
              EmbeddingsModule.searchFiles(searchText, searchContext, route, 50)
                .then((results: any) => {
                  console.log('Search results:', results);
                  setSearchDirItems(
                    results
                      .sort((a: any, b: any) => b.score - a.score)
                      .map((result: any) => ({
                        path: result.filePath,
                        name: result.fileName,
                        isFile: () => true,
                        mtime: new Date().getTime(), // Placeholder, adjust as needed,
                      })),
                  );
                })
                .catch((e: any) => console.error('Search error:', e));
            }}>
            Search
          </Button> */}
        </View>
        {dataManager.items.length === 0 ? (
          <ScrollView
            contentContainerStyle={{
              flex: 1,
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            refreshControl={
              <RefreshControl
                refreshing={dataManager.isLoading}
                onRefresh={dataManager.load}
              />
            }>
            {dataManager.loadingDone ? <EmptyData message={t('noDataHere')} /> : null}
          </ScrollView>
        ) : (
          <FileTreeList
            scrollKey={route ?? FileApi.ROOT_PATH}
            dataProvider={dataManager.dataProvider}
            layoutProvider={layoutProvider}
            rowRenderer={rowRenderer}
            listStyle={listStyle}
            dirLoading={dataManager.isLoading}
            reloadDir={dataManager.load}
            timestamps={timestamps}
            scrollIndicator={scrollIndicator}
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
            dirItems={dataManager.items}
            navigation={navigator}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPaths}
          />
        ) : null}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: 10,
    position: 'relative',
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
