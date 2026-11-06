import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FileApi, type DirItem } from '../../services/FileApi';
import { RootState } from '../../store';
import { resolveFilePaths } from '../../store/fileDataSlice';

const EMPTY_PATHS: string[] = [];
const EMPTY_FILE_RECORD: Record<string, DirItem> = {};

export const usePreviewableContextFiles = (
  route: string,
  sort: 'asc' | 'desc',
) => {
  const source = useSelector((state: RootState) => state.fileTree.source);
  const indexPaths = useSelector(
    (state: RootState) => state.fileData.indexFiles,
  );
  const isSearchQueried = useSelector(
    (state: RootState) => !!state.fileTree.searchQuery,
  );
  const searchPaths = useSelector(
    (state: RootState) => state.fileData.searchFiles,
  );
  const fileRecord = useSelector(
    (state: RootState) => state.fileData.fileRecord || EMPTY_FILE_RECORD,
  );

  const parentPath = FileApi.getParentDirectoryPath(route);
  const storedPaths = useSelector(
    (state: RootState) =>
      state.fileData.directories[parentPath] || EMPTY_PATHS,
  );

  // Обчислюємо відфільтровані та відсортовані файли залежно від контексту
  const imagesInFolderSorted = useMemo(() => {
    if (source === 'search') {
      const rawPaths = isSearchQueried ? searchPaths : indexPaths;
      const rawData = resolveFilePaths(rawPaths, fileRecord);
      return rawData
        .filter(item => FileApi.isFileViewable(item));
    }

    const dirItems = resolveFilePaths(storedPaths, fileRecord);
    return FileApi.sortDirItems(dirItems, sort).filter(
      FileApi.isFileViewable,
    );
  }, [
    source,
    isSearchQueried,
    searchPaths,
    indexPaths,
    storedPaths,
    fileRecord,
    sort,
  ]);

  return {
    imagesInFolderSorted,
    parentPath,
  };
};