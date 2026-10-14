import { DirItem } from '../services/FileApi';

export type StoredFileItem = Record<string, unknown> & {
  path: string;
  name: string;
  isDirectory: boolean;
  isFile: boolean;
};

export const storeFileItem = (item: DirItem): StoredFileItem => {
  const stored: Record<string, unknown> = {};
  Object.entries(item).forEach(([key, value]) => {
    if (
      key === 'isDirectory' ||
      key === 'isFile' ||
      typeof value === 'function'
    ) {
      return;
    }
    stored[key] = value instanceof Date ? value.getTime() : value;
  });
  return {
    ...stored,
    path: item.path,
    name: item.name,
    isDirectory: item.isDirectory(),
    isFile: item.isFile(),
  };
};

export const restoreFileItem = (item: StoredFileItem): DirItem => {
  const restored: Record<string, unknown> = { ...item };
  Object.entries(restored).forEach(([key, value]) => {
    if ((key === 'mtime' || key === 'ctime') && typeof value === 'number') {
      restored[key] = new Date(value);
    }
  });
  const isDirectory = item.isDirectory;
  const isFile = item.isFile;
  delete restored.isDirectory;
  delete restored.isFile;
  return {
    ...restored,
    isDirectory: () => isDirectory,
    isFile: () => isFile,
  } as DirItem;
};
