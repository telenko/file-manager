import type { LayoutItem } from './LayoutItem';
import type { DirItem } from '../../../services/FileApi';
import { FileTreeState } from '../../../store/fileTreeSlice';

export type DataManagerType = {
  isActive: boolean;
  load(): Promise<void>;
  loadNext?(): Promise<void>;
  dirItems: DirItem[];
  layoutItems: LayoutItem[];
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
  isActive?: boolean;
}) => DataManagerType;
