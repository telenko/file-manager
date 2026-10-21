import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { type DataProvider } from 'recyclerlistview';
import { NativeModules } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import type { DirItem } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import type { AppDispatch, RootState } from '../../../store';

import { setSearchFiles } from '../../../store/fileDataSlice';

const { EmbeddingsModule } = NativeModules;

export interface FileEmbeddingEntityRaw {
  id: number;
  filePath: string;
  fileName: string;
  mediaType: string;
  embeddingType: string;
  frameTimeMs: number;
  pageIndex: number;
}

export const adaptEmbeddingItemIntoDirItem = (
  entity: FileEmbeddingEntityRaw,
): DirItem => {
  const isFile = /\/[^/]+\.[a-zA-Z0-9]+$/.test(entity.filePath);

  return {
    ctimeMs: undefined,
    mtimeMs: undefined,
    name: entity.fileName || entity.filePath.split('/').pop() || '',
    path: entity.filePath,
    size: 0,
    isFile: isFile,
    isDirectory: !isFile,
  };
};

export const useSearchDataManager: DataManagerHookType = (
  route,
): DataManagerType => {
  const dispatch = useDispatch<AppDispatch>();

  const searchText = useSelector(
    (state: RootState) => state.fileTree.searchQuery || '',
  );

  const items = useSelector(
    (state: RootState) => state.fileData.searchFiles || [],
  );

  const dirItems = items;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const latestQueryRef = useRef(searchText.trim());
  latestQueryRef.current = searchText.trim();

  // Інвалідує результати старих запитів.
  const requestIdRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingDone, setLoadingDone] = useState(false);

  const updateItemsAndProvider = useCallback(
    (newItems: DirItem[]) => {
      itemsRef.current = newItems;

      dispatch(setSearchFiles(newItems));
    },
    [dispatch],
  );

  const loadPage = useCallback(
    async (offset = 0, size = 50): Promise<DirItem[]> => {
      const query = latestQueryRef.current;

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
        const rawResults: FileEmbeddingEntityRaw[] =
          await EmbeddingsModule.searchFiles(query, 'ALL', null, offset, size);

        // Ігноруємо результат, якщо запит уже не актуальний.
        if (
          requestId !== requestIdRef.current ||
          latestQueryRef.current !== query
        ) {
          return [];
        }

        const formattedItems: DirItem[] = (rawResults || []).map(
          adaptEmbeddingItemIntoDirItem,
        );

        const nextItems =
          offset === 0
            ? formattedItems
            : [...itemsRef.current, ...formattedItems];

        updateItemsAndProvider(nextItems);

        setLoadingDone(formattedItems.length < size);

        return formattedItems;
      } catch (err: unknown) {
        if (
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
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [updateItemsAndProvider],
  );

  useEffect(() => {
    const query = searchText.trim();

    // Інвалідуємо попередній пошук відразу після зміни запиту.
    ++requestIdRef.current;

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
  }, [searchText, loadPage, updateItemsAndProvider]);

  const load = useCallback(() => {
    if (!latestQueryRef.current) {
      return Promise.resolve();
    }

    return loadPage(0, 50).then(() => {});
  }, [loadPage]);

  const loadNext = useCallback(() => {
    if (!latestQueryRef.current || isLoading || loadingDone) {
      return Promise.resolve();
    }

    return loadPage(itemsRef.current.length, 500).then(() => {});
  }, [loadPage, isLoading, loadingDone]);

  return {
    load,
    loadNext,
    items: dirItems,
    isLoading,
    error,
    loadingDone,
    hasFiles: items.length > 0,
  };
};
