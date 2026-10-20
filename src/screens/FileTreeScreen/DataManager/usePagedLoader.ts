import { useState, useCallback, useRef } from 'react';
import { StoredFileItem, storeFileItem } from '../../../store/fileData';
import { DirItem } from '../../../services/FileApi';

export const usePagedLoader = <TRawData>(
  fetchFunction: (offset: number, limit: number) => Promise<TRawData[]>,
  adapter: (rawData: TRawData) => DirItem,
  onDataUpdate: (newItems: StoredFileItem[]) => void,
  initialLoadSize = 1000,
  backgroundPageSize = 5000,
  backgroundDelayMs = 100,
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingDone, setLoadingDone] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);

  const load = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setIsLoading(true);
    setError(null);
    setLoadingDone(false);

    try {
      console.log(
        `[PagedLoader] Завантаження першої порції: ${initialLoadSize}`,
      );
      const initialRawFiles = await fetchFunction(0, initialLoadSize);

      const initialAdapted = initialRawFiles.map(adapter).map(storeFileItem);

      onDataUpdate(initialAdapted);
      setIsLoading(false);
      setLoadingDone(true);

      if (initialAdapted.length < initialLoadSize) {
        isFetchingRef.current = false;
        return;
      }

      let currentOffset = initialAdapted.length;

      const fetchRemainingInLoop = async () => {
        try {
          let hasMore = true;
          let accumulatedItems = [...initialAdapted];

          while (hasMore) {
            await new Promise(resolve =>
              setTimeout(resolve, backgroundDelayMs),
            );

            console.log(
              `[PagedLoader] Фонове довантаження offset: ${currentOffset}, limit: ${backgroundPageSize}`,
            );
            const batchRawFiles = await fetchFunction(
              currentOffset,
              backgroundPageSize,
            );

            const batchAdapted = batchRawFiles.map(adapter).map(storeFileItem);

            if (batchAdapted.length === 0) {
              hasMore = false;
            } else {
              currentOffset += batchAdapted.length;
              accumulatedItems = [...accumulatedItems, ...batchAdapted];
              onDataUpdate(accumulatedItems);

              if (batchAdapted.length < backgroundPageSize) {
                hasMore = false;
              }
            }
          }
        } catch (bgErr) {
          console.error(
            '[PagedLoader] Помилка у фоновому циклі завантаження:',
            bgErr,
          );
        } finally {
          isFetchingRef.current = false;
        }
      };

      fetchRemainingInLoop();
    } catch (err: any) {
      setError(err);
      setIsLoading(false);
      isFetchingRef.current = false;
      console.error('[PagedLoader] Помилка load:', err);
    }
  }, [
    fetchFunction,
    adapter,
    onDataUpdate,
    initialLoadSize,
    backgroundPageSize,
    backgroundDelayMs,
  ]);

  return {
    load,
    isLoading,
    error,
    loadingDone,
  };
};
