import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DirItem, FileApi } from '../../services/FileApi';
import { RootState } from '../../store';
import { restoreFileItem } from '../../store/fileData';

export const usePreviewableContextFiles = (
  route: string,
  sort: 'asc' | 'desc',
) => {
  const source = useSelector((state: RootState) => state.fileTree.source);
  const indexData = useSelector(
    (state: RootState) => state.fileData.indexFiles,
  );
  const isSearchQueried = useSelector(
    (state: RootState) => !!state.fileTree.searchQuery,
  );
  const searchData = useSelector(
    (state: RootState) => state.fileData.searchFiles,
  );

  const parentPath = FileApi.getParentDirectoryPath(route);
  const storedItems = useSelector(
    (state: RootState) => state.fileData.directories[parentPath],
  );

  // Обчислюємо відфільтровані та відсортовані файли залежно від контексту
  const imagesInFolderSorted = useMemo(() => {
    if (source === 'search') {
      const rawData = isSearchQueried ? searchData : indexData;
      return rawData
        .map(restoreFileItem)
        .filter(item => FileApi.isFileViewable(item));
    }

    // Для звичайної папки беремо з Redux (якщо є) або порожній масив (синхронно, асинхронне довантаження краще залишити в компоненті чи API за потреби)
    if (!storedItems) {
      return [];
    }

    const dirItems = storedItems.map(restoreFileItem);
    return FileApi.sortDirItems(dirItems, sort).filter(
      FileApi.isFileViewable,
    );
  }, [source, isSearchQueried, searchData, indexData, storedItems, sort]);

  return {
    imagesInFolderSorted,
    parentPath,
  };
};