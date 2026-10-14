import { useState, useCallback, useRef, useMemo } from 'react';
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
  storeFileItem,
} from '../../../store/fileData';

const { FileIndexer } = NativeModules;

// Константи за розмірами порцій
const INITIAL_LOAD_SIZE = 500; // N - перша порція для миттєвого відображення
const BACKGROUND_PAGE_SIZE = 5000; // M - розмір наступних фонових порцій
const BACKGROUND_DELAY_MS = 100; // Пауза між ітераціями фонового завантаження

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

export const useSearchDataManager: DataManagerHookType = (
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

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingDone, setLoadingDone] = useState<boolean>(false);

  // Реф для запобігання паралельним/дублюючим циклам завантаження
  const isFetchingRef = useRef<boolean>(false);

  // DataProvider для RecyclerListView
  const [dataProvider, setDataProvider] = useState<DataProvider>(
    new DataProvider((r1, r2) => r1 !== r2),
  );

  // Допоміжна функція для оновлення локального стейту та DataProvider
  const updateItemsAndProvider = useCallback(
    (newStoredItems: StoredFileItem[]) => {
      setItems(newStoredItems);
      setDataProvider(prev =>
        prev.cloneWithRows(newStoredItems.map(restoreFileItem)),
      );
    },
    [setItems],
  );

  // Головна функція завантаження: миттєвий старт N елементів + фоновий цикл порціями M
  const load = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);
    setLoadingDone(false);

    try {
      // Крок 1: Миттєво вантажимо першу порцію N (INITIAL_LOAD_SIZE)
      console.log(`[Search] Завантаження першої порції: ${INITIAL_LOAD_SIZE}`);
      const initialRawFiles: IndexedFile[] = await FileIndexer.getFilesPaged(
        ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'],
        0,
        INITIAL_LOAD_SIZE,
      );

      const initialAdapted = initialRawFiles
        .map(adaptIndexedItemIntoDirItem)
        .map(storeFileItem);

      updateItemsAndProvider(initialAdapted);
      setIsLoading(false);
      setLoadingDone(true); // Показуємо дані на екрані одразу

      // Якщо перша порція порожня або менша за ліміт — далі немає чого вантажити
      if (initialAdapted.length < INITIAL_LOAD_SIZE) {
        isFetchingRef.current = false;
        return;
      }

      // Крок 2: Фоновий цикл для довантаження решти порціями M (BACKGROUND_PAGE_SIZE)
      let currentOffset = initialAdapted.length;

      // Використовуємо асинхронну функцію для циклу з паузами
      const fetchRemainingInLoop = async () => {
        try {
          let hasMore = true;
          let accumulatedItems = [...initialAdapted];

          while (hasMore) {
            // Робимо затримку перед наступним запитом, щоб не навантажувати міст та UI
            await new Promise(resolve => setTimeout(resolve, BACKGROUND_DELAY_MS));

            console.log(`[Search] Фонове довантаження offset: ${currentOffset}, limit: ${BACKGROUND_PAGE_SIZE}`);
            const batchRawFiles: IndexedFile[] = await FileIndexer.getFilesPaged(
              ['IMAGE', 'VIDEO', 'AUDIO', 'TEXT'],
              currentOffset,
              BACKGROUND_PAGE_SIZE,
            );

            const batchAdapted = batchRawFiles
              .map(adaptIndexedItemIntoDirItem)
              .map(storeFileItem);

            if (batchAdapted.length === 0) {
              hasMore = false;
            } else {
              currentOffset += batchAdapted.length;
              accumulatedItems = [...accumulatedItems, ...batchAdapted];
              // Оновлюємо дані у реальному часі без лоадера на весь екран
              updateItemsAndProvider(accumulatedItems);

              if (batchAdapted.length < BACKGROUND_PAGE_SIZE) {
                hasMore = false;
              }
            }
          }
        } catch (bgErr) {
          console.error('[Search] Помилка у фоновому циклі завантаження:', bgErr);
        } finally {
          isFetchingRef.current = false;
        }
      };

      // Запускаємо фоновий процес, не блокуючи завершення початкового `load`
      fetchRemainingInLoop();

    } catch (err: any) {
      setError(err);
      setIsLoading(false);
      isFetchingRef.current = false;
      console.error('[useSearchDataManager] Помилка load:', err);
    }
  }, [updateItemsAndProvider]);

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