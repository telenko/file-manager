import { useState, useCallback, useMemo } from 'react';
import { NativeModules } from 'react-native';
import { DirItem } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import { IndexedFile } from '../../../common/hooks/useIndexedFiles';
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import { setIndexFiles } from '../../../store/fileDataSlice';
import { usePagedLoader } from './usePagedLoader';
import { type DataProvider } from 'recyclerlistview';

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
    ctimeMs: undefined,
    mtimeMs: indexedFile.lastModified,
    name: indexedFile.filePath.split('/').pop() ?? '',
    path: indexedFile.filePath,
    size: indexedFile.fileSize,
    isFile: isFileCheck,
    isDirectory: !isFileCheck,
  };
};

export const useIndexDataManager: DataManagerHookType = (
  route,
): DataManagerType => {
  const items = useSelector((state: RootState) => state.fileData.indexFiles);
  const dirItems = items;
  const dispatch = useDispatch<AppDispatch>();

  const setItems = useCallback(
    (newItems: DirItem[]) => {
      dispatch(setIndexFiles(newItems));
    },
    [dispatch],
  );

  const updateItemsAndProvider = useCallback(
    (newStoredItems: DirItem[]) => {
      setItems(newStoredItems);
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
    items: dirItems,
    isLoading,
    error,
    loadingDone,
    hasFiles: items.length > 0,
  };
};
