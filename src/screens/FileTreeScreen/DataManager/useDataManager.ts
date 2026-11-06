import { useSelector } from 'react-redux';
import type { FileTreeState } from '../../../store/fileTreeSlice';
import { DataManagerHookType, DataManagerType } from './DataManagerType';
import { useFileTreeDataManager } from './useFileTreeDataManager';
import { useIndexDataManager } from './useIndexDataManager';
import { RootState } from '../../../store';
import { useSearchDataManager } from './useSearchDataManager';
import { dataProviderBuilder } from './dataProviderBuilder';
import { DataProvider } from 'recyclerlistview';
import { useEffect, useState } from 'react';

export const useDataManager: DataManagerHookType = (route): DataManagerType => {
  const isSearchActivated = useSelector(
    (state: RootState) => !!state.fileTree.searchQuery?.trim(),
  );
  const reduxSource = useSelector(
    (state: { fileTree: FileTreeState }) => state.fileTree.source,
  );
  const source = route.source || reduxSource;
  const isSearchSource = source === 'search';
  const isSearchManagerActive = isSearchSource && isSearchActivated;
  const isIndexManagerActive = isSearchSource && !isSearchActivated;
  const isFileTreeManagerActive = !isSearchSource;

  const indexManager = useIndexDataManager({
    ...route,
    isActive: isIndexManagerActive,
  });
  const searchManager = useSearchDataManager({
    ...route,
    isActive: isSearchManagerActive,
  });
  const fileTreeManager = useFileTreeDataManager({
    ...route,
    isActive: isFileTreeManagerActive,
  });

  const manager = (() => {
    if (source === 'search') {
      if (isSearchManagerActive) {
        return searchManager;
      }
      return indexManager;
    }
    return fileTreeManager;
  })();

  return manager;
};

export const useDataListProvider = (
  manager: DataManagerType,
) => {
  const [dataProvider, setDataProvider] = useState<DataProvider>(
    dataProviderBuilder(manager.layoutItems),
  );
  useEffect(() => {
    setDataProvider(prev => prev.cloneWithRows(manager.layoutItems));
  }, [manager.layoutItems]);

  return dataProvider;
};
