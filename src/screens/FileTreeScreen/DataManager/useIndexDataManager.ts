import { useCallback, useMemo } from 'react';
import { NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { DirItem, IndexedFile } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import {
  appendIndexFiles,
  resolveFilePaths,
  setIndexFiles,
} from '../../../store/fileDataSlice';
import { usePagedLoader } from './usePagedLoader';
import { wrapDirItemsWithDates } from './wrapDirItemsWithDates';

const { FileIndexer } = NativeModules;
const EMPTY_PATHS: string[] = [];
const EMPTY_FILE_RECORD: Record<string, DirItem> = {};

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

export const useIndexDataManager: DataManagerHookType = ({
  isActive = true,
}): DataManagerType => {
  const { i18n } = useTranslation();
  const paths = useSelector((state: RootState) =>
    isActive ? state.fileData.indexFiles : EMPTY_PATHS,
  );
  const fileRecord = useSelector(
    (state: RootState) =>
      (isActive && state.fileData.fileRecord) || EMPTY_FILE_RECORD,
  );
  const items = useMemo(
    () => resolveFilePaths(paths, fileRecord),
    [paths, fileRecord],
  );
  const language = i18n.resolvedLanguage ?? i18n.language;
  const layoutItems = useMemo(
    () => (isActive ? wrapDirItemsWithDates(items, language) : []),
    [items, language, isActive],
  );
  const dispatch = useDispatch<AppDispatch>();

  const setItems = useCallback(
    (newItems: DirItem[], append: boolean) => {
      dispatch(append ? appendIndexFiles(newItems) : setIndexFiles(newItems));
    },
    [dispatch],
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
    setItems,
    1000,
    5000,
    100,
    isActive,
  );

  return {
    isActive,
    load,
    dirItems: items,
    layoutItems,
    isLoading,
    error,
    loadingDone,
    hasFiles: items.length > 0,
  };
};
