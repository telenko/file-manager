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

  putVideoPreview(filePath: string, previewB64: string) {
    CACHE.videoPreviews[filePath] = previewB64;
  },

  clearVideoPreviews() {
    CACHE.videoPreviews = {};
  },

  getVideoPreview(filePath: string): string | null {
    return CACHE.videoPreviews[filePath] ?? null;
  },
};
