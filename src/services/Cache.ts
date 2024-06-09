import { DirItem } from './FileApi';

const CACHE: Record<string, any> = {
  dirItems: {},
  videoPreviews: {},
};

// Non-React store to keep some heavily computed content
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

  putVideoPreview(filePath: string, previewB64: string, width: number = 0) {
    CACHE.videoPreviews[`${filePath}_${width}`] = previewB64;
  },

  clearVideoPreviews() {
    CACHE.videoPreviews = {};
  },

  getVideoPreview(filePath: string, width: number = 0): string | null {
    return CACHE.videoPreviews[`${filePath}_${width}`] ?? null;
  },
};
