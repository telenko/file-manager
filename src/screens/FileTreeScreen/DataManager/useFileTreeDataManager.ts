import { useCallback, useMemo, useState } from 'react';
import { DirItem, FileApi } from '../../../services/FileApi';
import type { DataManagerHookType, DataManagerType } from './DataManagerType';
import { AppDispatch, RootState } from '../../../store';
import { useDispatch, useSelector } from 'react-redux';
import { setDirectoryItems } from '../../../store/fileDataSlice';
import { useExceptionHandler } from '../../../common/components/ExceptionHandler';

const EMPTY_DIR_ITEMS: DirItem[] = [];

export const useFileTreeDataManager: DataManagerHookType = ({
  route,
}): DataManagerType => {
  const directoryPath = route ?? FileApi.ROOT_PATH;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [dirLoadingDone, setDirLoadingDone] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const exceptionHandler = useExceptionHandler();

  const sort = useSelector((state: RootState) => state.fileManager.sort);

  const storedDirItems = useSelector(
    (state: RootState) =>
      state.fileData.directories[directoryPath] ?? EMPTY_DIR_ITEMS,
  );

  const dirItems = useMemo(() => storedDirItems, [storedDirItems]);

  const sortedDirItems = useMemo<DirItem[]>(() => {
    return FileApi.sortDirItems(
      dirItems.filter(file => !FileApi.isItemHidden(file)),
      sort,
    );
  }, [dirItems, sort]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // @ts-ignore
    await new Promise(r => setTimeout(r, 100));
    try {
      const newDirItems = await FileApi.readDir(directoryPath);
      dispatch(
        setDirectoryItems({
          path: directoryPath,
          items: newDirItems.filter(file => !FileApi.isItemHidden(file)),
        }),
      );
      setDirLoadingDone(true);
    } catch (e: any) {
      setError(e as Error);
      dispatch(setDirectoryItems({ path: directoryPath, items: [] }));
      exceptionHandler.handleError(e);
    } finally {
      setIsLoading(false);
    }
  }, [directoryPath, dispatch]);

  const hasFiles = useMemo(
    () => sortedDirItems.filter(item => item.isFile).length > 0,
    [sortedDirItems],
  );

  return {
    items: sortedDirItems,
    isLoading,
    error,
    load,
    loadingDone: dirLoadingDone,
    hasFiles,
  };
};
