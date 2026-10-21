import { DataProvider } from 'recyclerlistview';
import { DirItem } from '../../../services/FileApi';
import { FileTreeState } from '../../../store/fileTreeSlice';

export type DataManagerType = {
  load(): Promise<void>;
  loadNext?(): Promise<void>;
  items: DirItem[];
  isLoading: boolean;
  isLoadingNext?: boolean;
  error?: Error | null;
  loadingDone?: boolean;
  hasFiles: boolean;
};

export type DataManagerHookType = (route: {
  route: FileTreeState['route'];
  mode: FileTreeState['mode'];
  source: FileTreeState['source'];
}) => DataManagerType;
