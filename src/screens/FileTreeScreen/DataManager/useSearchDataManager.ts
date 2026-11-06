import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import type { DirItem, SearchFile } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import type { AppDispatch, RootState } from '../../../store';

import {
  appendSearchFiles,
  resolveFilePaths,
  setSearchFiles,
} from '../../../store/fileDataSlice';
import { wrapDirItemsWithDates } from './wrapDirItemsWithDates';

const { SearchFilesModule } = NativeModules;
const EMPTY_PATHS: string[] = [];
const EMPTY_FILE_RECORD: Record<string, DirItem> = {};

export const adaptEmbeddingItemIntoDirItem = (
  entity: SearchFile,
  fileRecord: Record<string, DirItem> = EMPTY_FILE_RECORD,
): DirItem | null => {
  const existingItem = fileRecord[entity.filePath];
  if (existingItem) {
    return existingItem;
  }

  return null;
};

export const useSearchDataManager: DataManagerHookType = ({
  isActive = true,
}): DataManagerType => {
  const { i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const searchText = useSelector(
    (state: RootState) => state.fileTree.searchQuery || '',
  );

  const paths = useSelector((state: RootState) =>
    isActive ? state.fileData.searchFiles : EMPTY_PATHS,
  );
  const fileRecord = useSelector(
    (state: RootState) =>
      (isActive && state.fileData.fileRecord) || EMPTY_FILE_RECORD,
  );
  const fileRecordRef = useRef(fileRecord);
  fileRecordRef.current = fileRecord;
  const items = useMemo(
    () => resolveFilePaths(paths, fileRecord),
    [paths, fileRecord],
  );

  const language = i18n.resolvedLanguage ?? i18n.language;
  const layoutItems = useMemo(
    () => (isActive ? wrapDirItemsWithDates(items, language) : []),
    [items, language, isActive],
  );

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const latestQueryRef = useRef(searchText.trim());
  latestQueryRef.current = searchText.trim();
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  // Інвалідує результати старих запитів.
  const requestIdRef = useRef(0);
  const nextSearchOffsetRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingDone, setLoadingDone] = useState(false);

  const updateItemsAndProvider = useCallback(
    (newItems: DirItem[], append = false) => {
      itemsRef.current = append ? [...itemsRef.current, ...newItems] : newItems;
      dispatch(append ? appendSearchFiles(newItems) : setSearchFiles(newItems));
    },
    [dispatch],
  );

  const loadPage = useCallback(
    async (offset = 0, size = 50): Promise<DirItem[]> => {
      const query = latestQueryRef.current;

      if (!isActiveRef.current) {
        return [];
      }

      // Без запиту нативний модуль не викликається.
      if (!query) {
        ++requestIdRef.current;
        setIsLoading(false);
        setLoadingDone(false);
        setError(null);
        return [];
      }

      const requestId = ++requestIdRef.current;

      setIsLoading(true);
      setError(null);

      try {
        const rawResults: SearchFile[] = await SearchFilesModule.searchFiles(
          query,
          'ALL',
          null,
          offset,
          size,
        );

        // Ігноруємо результат, якщо запит уже не актуальний.
        if (
          !isActiveRef.current ||
          requestId !== requestIdRef.current ||
          latestQueryRef.current !== query
        ) {
          return [];
        }

        const formattedItems = (rawResults || [])
          .map(entity =>
            adaptEmbeddingItemIntoDirItem(entity, fileRecordRef.current),
          )
          .filter((item): item is DirItem => item !== null);

        updateItemsAndProvider(formattedItems, offset !== 0);

        nextSearchOffsetRef.current = offset + rawResults.length;
        setLoadingDone(rawResults.length < size);

        return formattedItems;
      } catch (err: unknown) {
        if (
          isActiveRef.current &&
          requestId === requestIdRef.current &&
          latestQueryRef.current === query
        ) {
          const message =
            err instanceof Error
              ? err.message
              : 'Unknown search error occurred';

          setError(new Error(message));
        }

        return [];
      } finally {
        if (isActiveRef.current && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [updateItemsAndProvider],
  );

  useEffect(() => {
    if (!isActive) {
      ++requestIdRef.current;
      setIsLoading(false);
      return;
    }

    const query = searchText.trim();

    // Інвалідуємо попередній пошук відразу після зміни запиту.
    ++requestIdRef.current;
    nextSearchOffsetRef.current = 0;

    if (!query) {
      updateItemsAndProvider([]);
      setIsLoading(false);
      setLoadingDone(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setLoadingDone(false);

    const timer = setTimeout(() => {
      // Не запускаємо пошук, якщо користувач уже ввів інший запит.
      if (latestQueryRef.current === query) {
        void loadPage(0, 50);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [isActive, searchText, loadPage, updateItemsAndProvider]);

  const load = useCallback(() => {
    if (!isActiveRef.current || !latestQueryRef.current) {
      return Promise.resolve();
    }

    return loadPage(0, 50).then(() => {});
  }, [loadPage]);

  const loadNext = useCallback(() => {
    if (
      !isActiveRef.current ||
      !latestQueryRef.current ||
      isLoading ||
      loadingDone
    ) {
      return Promise.resolve();
    }

    return loadPage(nextSearchOffsetRef.current, 500).then(() => {});
  }, [loadPage, isLoading, loadingDone]);

  return {
    isActive,
    load,
    loadNext,
    dirItems: items,
    layoutItems,
    isLoading,
    error,
    loadingDone,
    hasFiles: items.length > 0,
  };
};
