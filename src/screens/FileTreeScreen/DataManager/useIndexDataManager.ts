import { useState, useCallback, useMemo } from 'react';
import { DataProvider } from 'recyclerlistview';
import { NativeModules } from 'react-native';
import { DirItem } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import { IndexedFile } from '../../../common/hooks/useIndexedFiles';
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import { setIndexFiles } from '../../../store/fileDataSlice';
import {
  restoreFileItem,
  StoredFileItem,
} from '../../../store/fileData';
import { usePagedLoader } from './usePagedLoader';

const { FileIndexer } = NativeModules;

/**
 * Адаптер для перетворення IndexedFile у DirItem.
 */
export const adaptIndexedItemIntoDirItem = (
  indexedFile: IndexedFile,
): DirItem => {
  const hasFileExtensionRegex = /\/[^\/]+\.[a-zA-Z0-9]+$/;
  const isFileCheck = hasFileExtensionRegex.test(indexedFile.filePath);

  return {
    ctime: undefined,
    mtime: indexedFile.lastModified
      ? new Date(indexedFile.lastModified)
      : undefined,
    name: indexedFile.filePath.split('/').pop() ?? '',
    path: indexedFile.filePath,
    size: indexedFile.fileSize,
    isFile: () => isFileCheck,
    isDirectory: () => !isFileCheck,
  };
};

export const useIndexDataManager: DataManagerHookType = (
  route,
): DataManagerType => {
  const items = useSelector((state: RootState) => state.fileData.indexFiles);
  const dirItems = useMemo(() => items.map(restoreFileItem), [items]);
  const dispatch = useDispatch<AppDispatch>();

  const setItems = useCallback(
    (newItems: StoredFileItem[]) => {
      dispatch(setIndexFiles(newItems));
    },
    [dispatch],
  );

  const [dataProvider, setDataProvider] = useState<DataProvider>(
    new DataProvider((r1, r2) => r1 !== r2),
  );

  const updateItemsAndProvider = useCallback(
    (newStoredItems: StoredFileItem[]) => {
      setItems(newStoredItems);
      setDataProvider(prev =>
        prev.cloneWithRows(newStoredItems.map(restoreFileItem)),
      );
    },
    [setItems],
  );

  const fetcher = useCallback(async (offset: number, limit: number) => {
    return await FileIndexer.getFilesPaged(
      ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'],
      offset,
      limit,
    );
  }, []);

  // Викликаємо універсальний хук, передаючи адаптер як аргумент
  const { load, isLoading, error, loadingDone } = usePagedLoader<IndexedFile>(
    fetcher,
    adaptIndexedItemIntoDirItem,
    updateItemsAndProvider,
    1000, // INITIAL_LOAD_SIZE (1-а порція)
    5000, // BACKGROUND_PAGE_SIZE (наступні порції)
  );

  return {
    load,
    dataProvider,
    items: dirItems,
    isLoading,
    error,
    loadingDone,
    hasFiles: items.length > 0,
  };
};