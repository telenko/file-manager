import { useCallback, useEffect, useRef, useState } from 'react';
import { FileApi, StorageItem } from '../../services/FileApi';
import { useExceptionHandler } from '../../common/components/ExceptionHandler';

const REFRESH_ROOTS_INTERVAL = 2 * 60 * 1000; // 2 mins

export const useFsRoots = () => {
  const [roots, setRoots] = useState<StorageItem[]>([]);
  const [rootsLoading, setRootsLoading] = useState(false);
  const [rootsReady, setRootsReady] = useState(false);
  const rootsReadyLocalRef = useRef(false);
  const exceptionHandler = useExceptionHandler();
  const refresh = useCallback(async () => {
    setRootsLoading(true);
    try {
      const result = await FileApi.prepareFsRoots();
      setRoots(result);
      if (!rootsReadyLocalRef.current) {
        rootsReadyLocalRef.current = true;
        setRootsReady(true);
      }
    } catch (e: any) {
      if (!rootsReadyLocalRef.current) {
        exceptionHandler.handleError(e);
      }
    } finally {
      setRootsLoading(false);
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(refresh, REFRESH_ROOTS_INTERVAL);
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return {
    roots,
    rootsLoading,
    rootsReady,
    refresh,
  };
};
