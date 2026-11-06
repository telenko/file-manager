import { useState, useCallback, useRef, useEffect } from 'react';
import { DirItem } from '../../../services/FileApi';

export const usePagedLoader = <TRawData>(
  fetchFunction: (offset: number, limit: number) => Promise<TRawData[]>,
  adapter: (rawData: TRawData) => DirItem,
  onDataUpdate: (newItems: DirItem[], append: boolean) => void,
  initialLoadSize = 1000,
  backgroundPageSize = 5000,
  backgroundDelayMs = 100,
  isActive = true,
) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [loadingDone, setLoadingDone] = useState<boolean>(false);

  const isFetchingRef = useRef<boolean>(false);
  const isActiveRef = useRef(isActive);
  const generationRef = useRef(0);
  isActiveRef.current = isActive;

  useEffect(() => {
    if (!isActive) {
      generationRef.current += 1;
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [isActive]);

  const load = useCallback(async () => {
    if (!isActiveRef.current || isFetchingRef.current) return;
    isFetchingRef.current = true;
    const generation = generationRef.current;

    setIsLoading(true);
    setError(null);
    setLoadingDone(false);

    try {
      console.log(
        `[PagedLoader] Завантаження першої порції: ${initialLoadSize}`,
      );
      const initialRawFiles = await fetchFunction(0, initialLoadSize);
      if (!isActiveRef.current || generation !== generationRef.current) {
        return;
      }

      const initialAdapted = initialRawFiles.map(adapter);

      onDataUpdate(initialAdapted, false);
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

          while (
            hasMore &&
            isActiveRef.current &&
            generation === generationRef.current
          ) {
            await new Promise(resolve =>
              setTimeout(resolve, backgroundDelayMs),
            );
            if (
              !isActiveRef.current ||
              generation !== generationRef.current
            ) {
              break;
            }

            console.log(
              `[PagedLoader] Фонове довантаження offset: ${currentOffset}, limit: ${backgroundPageSize}`,
            );
            const batchRawFiles = await fetchFunction(
              currentOffset,
              backgroundPageSize,
            );
            if (
              !isActiveRef.current ||
              generation !== generationRef.current
            ) {
              break;
            }

            const batchAdapted = batchRawFiles.map(adapter);

            if (batchAdapted.length === 0) {
              hasMore = false;
            } else {
              currentOffset += batchAdapted.length;
              onDataUpdate(batchAdapted, true);

              if (batchAdapted.length < backgroundPageSize) {
                hasMore = false;
              }
            }
          }
        } catch (bgErr) {
          if (
            isActiveRef.current &&
            generation === generationRef.current
          ) {
            console.error(
              '[PagedLoader] Помилка у фоновому циклі завантаження:',
              bgErr,
            );
          }
        } finally {
          if (generation === generationRef.current) {
            isFetchingRef.current = false;
          }
        }
      };

      void fetchRemainingInLoop();
    } catch (err: unknown) {
      if (
        !isActiveRef.current ||
        generation !== generationRef.current
      ) {
        return;
      }
      setError(err instanceof Error ? err : new Error('Index loading failed'));
      setIsLoading(false);
      isFetchingRef.current = false;
      console.error('[PagedLoader] Помилка load:', err);
    }
  }, [
    isActive,
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
