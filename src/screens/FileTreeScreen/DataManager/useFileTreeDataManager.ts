import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DirItem, FileApi } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import {
  resolveFilePaths,
  setDirectoryItems,
} from '../../../store/fileDataSlice';
import { useExceptionHandler } from '../../../common/components/ExceptionHandler';

const EMPTY_PATHS: string[] = [];
const EMPTY_FILE_RECORD: Record<string, DirItem> = {};

export const useFileTreeDataManager: DataManagerHookType = ({
  route,
  isActive = true,
}): DataManagerType => {
  const directoryPath = route ?? FileApi.ROOT_PATH;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dirLoadingDone, setDirLoadingDone] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const exceptionHandler = useExceptionHandler();
  const isActiveRef = useRef(isActive);
  const requestIdRef = useRef(0);
  isActiveRef.current = isActive;

  const sort = useSelector((state: RootState) => state.fileManager.sort);

  const storedDirPaths = useSelector(
    (state: RootState) =>
      isActive
        ? state.fileData.directories[directoryPath] ?? EMPTY_PATHS
        : EMPTY_PATHS,
  );
  const fileRecord = useSelector(
    (state: RootState) =>
      isActive ? state.fileData.fileRecord : EMPTY_FILE_RECORD,
  );

  const dirItems = useMemo(
    () => resolveFilePaths(storedDirPaths, fileRecord),
    [storedDirPaths, fileRecord],
  );

  const sortedDirItems = useMemo<DirItem[]>(() => {
    return FileApi.sortDirItems(
      dirItems.filter(file => !FileApi.isItemHidden(file)),
      sort,
    );
  }, [dirItems, sort]);

  const load = useCallback(async () => {
    if (!isActiveRef.current) {
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!isActiveRef.current || requestId !== requestIdRef.current) {
        return;
      }

      const newDirItems = await FileApi.readDir(directoryPath);
      if (!isActiveRef.current || requestId !== requestIdRef.current) {
        return;
      }
      dispatch(
        setDirectoryItems({
          path: directoryPath,
          items: newDirItems.filter(file => !FileApi.isItemHidden(file)),
        }),
      );
      setDirLoadingDone(true);
    } catch (e: unknown) {
      if (!isActiveRef.current || requestId !== requestIdRef.current) {
        return;
      }
      const loadError =
        e instanceof Error ? e : new Error('Failed to load directory');
      setError(loadError);
      dispatch(setDirectoryItems({ path: directoryPath, items: [] }));
      exceptionHandler.handleError(loadError);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [directoryPath, dispatch, exceptionHandler, isActive]);

  useEffect(() => {
    if (!isActive) {
      ++requestIdRef.current;
      setIsLoading(false);
    }
  }, [isActive]);

  const hasFiles = useMemo(
    () => sortedDirItems.filter(item => item.isFile).length > 0,
    [sortedDirItems],
  );

  return {
    isActive,
    dirItems: sortedDirItems,
    layoutItems: sortedDirItems,
    isLoading,
    error,
    load,
    loadingDone: dirLoadingDone,
    hasFiles,
  };
};
