import { DirItem } from './FileApi';

const CACHE: Record<string, any> = {
  dirItems: {},
};

export const Cache = {
  putDirItems(dirPath: string, items: DirItem[]) {
    CACHE.dirItems[dirPath] = items;
  },

  getDirItems(dirPath: string): DirItem[] | null {
    return CACHE.dirItems[dirPath] ?? null;
  },

  clearDirItems() {
    CACHE.dirItems = {};
  },
};
