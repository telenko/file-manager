import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setRoots } from '../../store/fileManagerSlice';
import { restoreFileItem, storeFileItem } from '../../store/fileData';
import { FileApi, StorageItem } from '../../services/FileApi';
import { useExceptionHandler } from '../../common/components/ExceptionHandler';

const REFRESH_ROOTS_INTERVAL = 2 * 60 * 1000; // 2 mins

export const useFsRoots = () => {
  const dispatch = useDispatch<AppDispatch>();
  const storedRoots = useSelector(
    (state: RootState) => state.fileManager.roots,
  );
  const rootsReady = useSelector(
    (state: RootState) => state.fileManager.rootsReady,
  );
  const roots = storedRoots.map(root => restoreFileItem(root) as StorageItem);
  const [rootsLoading, setRootsLoading] = useState(false);
  const exceptionHandler = useExceptionHandler();
  const refresh = useCallback(async () => {
    setRootsLoading(true);
    try {
      const result = await FileApi.prepareFsRoots();
      dispatch(setRoots(result.map(storeFileItem)));
    } catch (e: any) {
      if (!rootsReady) {
        exceptionHandler.handleError(e);
      }
    } finally {
      setRootsLoading(false);
    }
  }, [dispatch, exceptionHandler, rootsReady]);

  useEffect(() => {
    const intervalId = setInterval(refresh, REFRESH_ROOTS_INTERVAL);
    return () => {
      clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    roots,
    rootsLoading,
    rootsReady,
    refresh,
  };
};
