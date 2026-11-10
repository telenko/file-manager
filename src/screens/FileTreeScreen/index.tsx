import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Searchbar } from 'react-native-paper';
import { FileApi } from '../../services/FileApi';
import FilePathBreadCrumb from './FilePathBreadCrumb';
import { useNavigation } from '../../common/hooks/useNavigation';
import {
  NativeModules,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useFileTreeActions, useFileTreeContext } from './FileTreeContext';
import { LayoutProvider } from 'recyclerlistview';
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
import { ActivityIndicator, Text } from 'react-native-paper';
import SelectorAction from './SelectorAction';
import {
  calcGridColumns,
  GRID_HEIGHT,
  LIST_HEIGHT,
} from '../../common/utils/layout';
import {
  SEARCH_INDEX_PATH,
  useStoreLatestFolder,
} from '../../widgets/FileManager/settings';
import { useFocusEffect } from '@react-navigation/native';
import { ItemWithSkeleton } from './ItemWithSkeleton';
import FileTreeList from './FileTreeList';
import { useScrollIndicatorState } from '../../common/components/ScrollIndicator/ScrollIndicatorProvider';
import { FileTreeState } from '../../store/fileTreeSlice';
import {
  useDataListProvider,
  useDataManager,
} from './DataManager/useDataManager';
import { DebouncedSearchbar } from './DebouncedSearchbar';
import { isGroupHeaderItem, type LayoutItem } from './DataManager/LayoutItem';
import { HeaderItem } from './HeaderItem';

export type FileScreenProps = {
  route: {
    params: {
      route: string;
      source?: FileTreeState['source'];
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

  const dispatch = useDispatch<AppDispatch>();
  const { selectedPaths } = useFileTreeContext();
  const reduxSource = useSelector((state: RootState) => state.fileTree.source);
  const source = routeMetadatas.source || reduxSource;
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
    source,
  });
  const dataProvider = useDataListProvider(dataManager);
  const layoutItemsRef = useRef(dataManager.layoutItems);
  layoutItemsRef.current = dataManager.layoutItems;
  const { dirItems, layoutItems } = dataManager;
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
            dirItems={dirItems}
            navigation={navigator}
            selectedPaths={selectedPaths}
            setSelectedPaths={setSelectedPathsExternal}
          />
        ) : (
          <DefaultFolderActions
            folderHasFiles={dataManager.hasFiles}
            isOperational={isOperational}
            source={source}
          />
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
      if (route && !isOperational) {
        saveLatestFolder(source === 'search' ? SEARCH_INDEX_PATH : route);
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

  const layoutProvider = useMemo(
    () =>
      new LayoutProvider(
        index => (isGroupHeaderItem(layoutItemsRef.current[index]) ? 2 : 1),
        (type, dim) => {
          if (type === 2) {
            dim.width = SCREEN_WIDTH - 20;
            dim.height = 40;
            return;
          }

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
    (type: string | number, item: LayoutItem) => {
      if (isGroupHeaderItem(item)) {
        return <HeaderItem {...item} />;
      }

      return (
        <ItemWithSkeleton
          key={item.path}
          item={item}
          layout={fileManager.layout}
          isUserDragging={scrollIndicator.isUserDragging}
        />
      );
    },
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
      layoutItems.map(item =>
        isGroupHeaderItem(item)
          ? item.dateTimeMs
          : item.isFile
          ? item.mtimeMs
          : undefined,
      ),
    [layoutItems],
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

  const verifyVisibleFiles = useCallback((paths: string[]) => {
    NativeModules.FileIndexer.verifyFilesExist(paths).catch((error: unknown) => {
      console.error('Failed to verify visible indexed files', error);
    });
  }, []);

  // useEffect(() => {
  //   setSearchDirItems([]);
  // }, [searchText]);

  // const searchQuery = useSelector(
  //   (state: RootState) => state.fileTree.searchQuery,
  // );
  // const searchContext = useSelector(
  //   (state: RootState) => state.fileTree.serchContext,
  // );

  return (
    <>
      <View style={styles.container}>
        {source === 'search' ? (
          <View style={styles.searchContainer}>
            <DebouncedSearchbar
              style={styles.searchBar}
              inputStyle={styles.searchInput}
              iconColor={'#6200ee'}
              placeholderTextColor="#888"
            />
          </View>
        ) : (
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
          }}></View>
        {layoutItems.length === 0 ? (
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
            {dataManager.loadingDone ? (
              <EmptyData message={t('noDataHere')} />
            ) : null}
          </ScrollView>
        ) : (
          <FileTreeList
            scrollKey={route ?? FileApi.ROOT_PATH}
            dataProvider={dataProvider}
            layoutProvider={layoutProvider}
            rowRenderer={rowRenderer}
            listStyle={listStyle}
            dirLoading={dataManager.isLoading}
            reloadDir={dataManager.load}
            timestamps={timestamps}
            scrollIndicator={scrollIndicator}
            loadNext={dataManager.loadNext}
            verifyVisibleFiles={verifyVisibleFiles}
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
  groupHeader: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  groupHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
  searchContainer: {
    // flex: 1,
    marginTop: -10,
    marginBottom: -5,
    // paddingBottom: 10,
    marginHorizontal: 0,
    justifyContent: 'center',
  },
  searchBar: {
    elevation: 0, // Прибираємо стандартну тінь Android для більш плоского та сучасного вигляду
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    height: 40,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 0, // Допомагає вирівняти текст по вертикалі у React Native Paper
  },
});

export default FileScreen;
