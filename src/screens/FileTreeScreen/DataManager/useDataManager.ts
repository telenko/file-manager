import { useSelector } from 'react-redux';
import type { FileTreeState } from '../../../store/fileTreeSlice';
import { DataManagerHookType, DataManagerType } from './DataManagerType';
import { useFileTreeDataManager } from './useFileTreeDataManager';
import { useIndexDataManager } from './useIndexDataManager';
import { RootState } from '../../../store';
import { useSearchDataManager } from './useSearchDataManager';

export const useDataManager: DataManagerHookType = (route): DataManagerType => {
  const indexManager = useIndexDataManager(route);
  const searchManager = useSearchDataManager(route);
  const fileTreeManager = useFileTreeDataManager(route);
  const isSearchActivated = useSelector(
    (state: RootState) => !!state.fileTree.searchQuery?.trim(),
  );
  const reduxSource = useSelector(
    (state: { fileTree: FileTreeState }) => state.fileTree.source,
  );
  const source = route.source || reduxSource;
  if (source === 'search') {
    if (isSearchActivated) {
      return searchManager;
    }
    return indexManager;
  }

  return fileTreeManager;
};
