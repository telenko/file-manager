import { useSelector } from 'react-redux';
import type { FileTreeState } from '../../../store/fileTreeSlice';
import { DataManagerHookType, DataManagerType } from './DataManagerType';
import { useFileTreeDataManager } from './useFileTreeDataManager';
import { useSearchDataManager } from './useSearchDataManager';

export const useDataManager: DataManagerHookType = (route): DataManagerType => {
  const searchManager = useSearchDataManager(route);
  const fileTreeManager = useFileTreeDataManager(route);
  const source = useSelector((state: { fileTree: FileTreeState }) => state.fileTree.source);
  console.log("source", source);
  if (source === 'search') {
    return searchManager;
  }

  return fileTreeManager;
};
