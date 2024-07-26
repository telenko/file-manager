import RnfsQueued, { limitFileApi, ReadDirItem } from './RnfsQueued';
import { NativeModules } from 'react-native';
import Share from 'react-native-share';
import { FileOpener } from './FileOpener';
import i18n from '../i18n/i18n';
import {
  ErrorType,
  FileManagerError,
} from '../common/components/ExceptionHandler';

export type DirItem = ReadDirItem & { isStorage?: boolean };
export type StorageItem = {
  isMainDeviceStorage?: boolean;
  isSdCardStorage?: boolean;
  isStorage?: boolean;
  freeSpace?: number;
  totalSpace?: number;
  name: string;
  path: string;
} & DirItem;

const resolveCounterConflictRecursive = async (
  destination: string,
  count: number,
  langKey: string = 'copyCount',
): Promise<string> => {
  const dotTokens = destination.split('.');
  const ext = dotTokens.length > 1 ? dotTokens.pop() : '';
  const preExt = dotTokens.join('.');
  const pathTokens = preExt.split('/');
  const itemName = pathTokens.pop();
  const resultPath = `${pathTokens.join('/')}/${itemName} ${i18n.t(langKey, {
    n: count,
  })}${ext ? '.' + ext : ''}`;

  if (await RnfsQueued.exists(resultPath)) {
    return resolveCounterConflictRecursive(destination, count + 1);
  }
  return resultPath;
};

const getMimeType = (filePath: string) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Add more file extensions and corresponding MIME types as needed
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    // Add more here...
  };

  return mimeTypes[extension ?? ''] || 'application/octet-stream'; // Default to binary if MIME type not found
};

const generateContentUri = (filePath: string) => {
  return `content://${filePath}`;
};

const copyRecursive = async (
  source: string,
  destination: string,
  injectCopyNIfConflict: boolean,
) => {
  const stats = await RnfsQueued.stat(source);
  if (stats.isDirectory()) {
    if (await RnfsQueued.exists(destination)) {
      if (injectCopyNIfConflict) {
        destination = await resolveCounterConflictRecursive(destination, 1);
      } else {
        throw new Error(
          'Failed to copy contents, as destination already exists',
        );
      }
    }
    await RnfsQueued.mkdir(destination);
    const items = await RnfsQueued.readDir(source);

    for (const item of items) {
      const itemSourcePath = `${source}/${item.name}`;
      const itemDestinationPath = `${destination}/${item.name}`;

      await copyRecursive(
        itemSourcePath,
        itemDestinationPath,
        injectCopyNIfConflict,
      );
    }
  } else {
    if (await RnfsQueued.exists(destination)) {
      if (injectCopyNIfConflict) {
        destination = await resolveCounterConflictRecursive(destination, 1);
      } else {
        throw new Error(
          'Failed to copy file, as destination file already exists',
        );
      }
    }
    await RnfsQueued.copyFile(source, destination);
  }
};
const moveRecursive = async (
  source: string,
  destination: string,
  injectCopyNIfConflict: boolean,
) => {
  const stats = await RnfsQueued.stat(source);
  if (stats.isDirectory()) {
    if (await RnfsQueued.exists(destination)) {
      if (injectCopyNIfConflict) {
        destination = await resolveCounterConflictRecursive(
          destination,
          1,
          'moveCount',
        );
      } else {
        throw new Error(
          'Failed to move contents, as destination already exists',
        );
      }
    }
    await RnfsQueued.mkdir(destination);
    const items = await RnfsQueued.readDir(source);

    for (const item of items) {
      const itemSourcePath = `${source}/${item.name}`;
      const itemDestinationPath = `${destination}/${item.name}`;

      await moveRecursive(
        itemSourcePath,
        itemDestinationPath,
        injectCopyNIfConflict,
      );
    }
    // Remove the original directory after moving all its contents
    await RnfsQueued.unlink(source);
  } else {
    if (await RnfsQueued.exists(destination)) {
      if (injectCopyNIfConflict) {
        destination = await resolveCounterConflictRecursive(
          destination,
          1,
          'moveCount',
        );
      } else {
        throw new Error(
          'Failed to move file, as destination file already exists',
        );
      }
    }
    await RnfsQueued.moveFile(source, destination);
  }
};
const deleteItem = async (item: DirItem) => {
  try {
    await RnfsQueued.unlink(item.path);
  } catch (e) {
    throw new FileManagerError(i18n.t('deleteFailed'), ErrorType.FILE_API, e);
  }
};

const getSafeSize = async (path: string) => {
  const fileStats = await RnfsQueued.stat(path);
  if (fileStats.isFile()) {
    return fileStats.size;
  }
  let totalSize = 0;
  const files = await RnfsQueued.readDir(path);
  for (const file of files) {
    totalSize += await getSafeSize(file.path);
  }
  return totalSize;
};

const makeVideoPreview = async (
  file: DirItem,
  width: number = 0,
): Promise<string | null> => {
  if (!FileApi.isFileVideo(file)) {
    return null;
  }
  return new Promise((resolve, reject) => {
    const { ThumbnailModule } = NativeModules;
    ThumbnailModule.createVideoThumbnail(
      file.path,
      width,
      (base64Thumbnail: string) => {
        resolve(`data:image/jpeg;base64,${base64Thumbnail}`);
      },
      (error: string) => {
        reject(error);
      },
    );
  });
};
const makeVideoPreviewQueued: typeof makeVideoPreview = (...args) =>
  limitFileApi(() => makeVideoPreview(...args));

let ROOTS: StorageItem[] = [];

export const FileApi = {
  get ROOT_STORAGE() {
    if (!ROOTS) {
      return null;
    }
    let result = ROOTS.find(r => r.isMainDeviceStorage) ?? null;
    if (!result) {
      result = ROOTS[0];
    }
    return result;
  },
  get ROOT_PATH() {
    return this.ROOT_STORAGE?.path!;
  },
  get ROOTS() {
    return ROOTS;
  },
  prepareFsRoots: async (): Promise<StorageItem[]> => {
    try {
      const rootDirs: StorageItem[] =
        await NativeModules.StorageMetaReader.readAll();
      const resultDirItems: StorageItem[] = rootDirs.map(storageItem => {
        return {
          ...storageItem,
          name: storageItem.isMainDeviceStorage
            ? i18n.t('deviceRoot')
            : i18n.t('sdCardRoot', { name: storageItem.name }),
          isDirectory: () => true,
          isFile: () => false,
          isStorage: true,
        };
      });

      ROOTS = resultDirItems;

      return ROOTS;
    } catch (e) {
      throw new FileManagerError(
        i18n.t('readDirFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },
  getItemSize: async (path: string) => {
    try {
      return await getSafeSize(path);
    } catch (e) {
      throw new FileManagerError(
        i18n.t('readDirFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },
  readDir: async (path: string) => {
    try {
      return await RnfsQueued.readDir(path);
    } catch (e) {
      throw new FileManagerError(
        i18n.t('readDirFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },
  getMetadata: async (path: string): Promise<DirItem> => {
    try {
      const res = await RnfsQueued.stat(path);
      return {
        ...res,
        name: res.name ?? '',
        ctime: new Date(res.ctime),
        mtime: new Date(res.mtime),
      };
    } catch (e) {
      throw new FileManagerError(
        i18n.t('fileMetadataFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },
  openFile: async (item: DirItem) => {
    if (!item.isFile()) {
      return;
    }

    return FileOpener.open(item.path, {
      showAppsSuggestions: true,
      showOpenWithDialog: true,
      dialogTitle: i18n.t('openWithTitle'),
    });
  },
  createFolder: async (path: string) => {
    try {
      if (await RnfsQueued.exists(path)) {
        throw new Error('Folder or file with such name already exists');
      }
      return RnfsQueued.mkdir(path);
    } catch (e) {
      throw new FileManagerError(
        i18n.t('createFolderFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },
  _copyFileOrDirectory: async (
    source: string,
    destination: string,
    injectCopyNIfConflict: boolean = false,
  ) => {
    const destStats = await RnfsQueued.stat(destination);
    const fileName = source.split('/').pop();
    let fileDest = destStats.isDirectory()
      ? `${destination}/${fileName}`
      : destination;

    return copyRecursive(source, fileDest, injectCopyNIfConflict);
  },

  _validateItemSizesToDest: async (sources: string[], destination: string) => {
    try {
      const sizes = await Promise.all(
        sources.map(source => getSafeSize(source)),
      );
      const sizeCombined = sizes.reduce((acc, size) => {
        return size + acc;
      }, 0);
      const targetStorage = ROOTS.find(root => destination.includes(root.path));
      if (!targetStorage) {
        throw new Error('Destination folder is not valid');
      }
      if (targetStorage.freeSpace! < sizeCombined) {
        throw new Error('Not enough space in disk');
      }
    } catch (e) {
      throw new FileManagerError(
        i18n.t('notEnoughSpace'),
        ErrorType.FILE_API,
        e,
      );
    }
  },

  copyFilesOrDirectoriesBatched: async (
    sources: string[],
    destination: string,
    injectCopyNIfConflict: boolean = false,
  ) => {
    await FileApi._validateItemSizesToDest(sources, destination);
    try {
      return Promise.all(
        sources.map(source =>
          FileApi._copyFileOrDirectory(
            source,
            destination,
            injectCopyNIfConflict,
          ),
        ),
      );
    } catch (e) {
      throw new FileManagerError(
        i18n.t('copyBatchFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },

  moveFileOrDirectory: async (
    source: string,
    destination: string,
    injectCopyNIfConflict: boolean = false,
  ) => {
    const isDestDirectory = await (async () => {
      try {
        const destStats = await RnfsQueued.stat(destination);
        return destStats.isDirectory();
      } catch {
        return false;
      }
    })();

    const fileName = source.split('/').pop();
    let fileDest = isDestDirectory ? `${destination}/${fileName}` : destination;

    return moveRecursive(source, fileDest, injectCopyNIfConflict);
  },

  moveFilesOrDirectoriesBatched: async (
    sources: string[],
    destination: string,
    injectCopyNIfConflict: boolean = false,
  ) => {
    try {
      return Promise.all(
        sources.map(source =>
          FileApi.moveFileOrDirectory(
            source,
            destination,
            injectCopyNIfConflict,
          ),
        ),
      );
    } catch (e) {
      throw new FileManagerError(
        i18n.t('moveBatchFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },

  renameItem: async (dirItem: DirItem, newName: string) => {
    try {
      const dirItemPathTokens = dirItem.path.split('/');
      const fileName = dirItemPathTokens.pop();
      if (fileName === newName) {
        return;
      }
      const parentItem = dirItemPathTokens.join('/');
      const destinationPath = parentItem + '/' + newName;
      if (await RnfsQueued.exists(destinationPath)) {
        throw new Error('Folder or file with such name already exists');
      }
      await FileApi.moveFileOrDirectory(dirItem.path, destinationPath);
    } catch (e) {
      throw new FileManagerError(i18n.t('renameFailed'), ErrorType.FILE_API, e);
    }
  },
  deleteItem,
  deleteItemsBatched: async (items: DirItem[]) => {
    try {
      return Promise.all(items.map(FileApi.deleteItem));
    } catch (e) {
      throw new FileManagerError(i18n.t('deleteFailed'), ErrorType.FILE_API, e);
    }
  },
  // Note, UNIX specific
  isItemHidden: (dirItem: DirItem) => {
    return dirItem.name.startsWith('.');
  },
  isFileImage: (file: DirItem): boolean => {
    const fileOrig = file.name || file.path;
    return (
      fileOrig.toLowerCase().endsWith('.gif') ||
      fileOrig.toLowerCase().endsWith('.jpg') ||
      fileOrig.toLowerCase().endsWith('.jpeg') ||
      fileOrig.toLowerCase().endsWith('.png')
    );
  },
  isFileVideo: (file: DirItem): boolean => {
    const fileOrig = file.name || file.path;
    return (
      fileOrig.toLowerCase().endsWith('.mp4') ||
      fileOrig.toLowerCase().endsWith('.avi') ||
      fileOrig.toLowerCase().endsWith('.mov')
    );
  },
  isFileViewable: (file: DirItem): boolean => {
    return FileApi.isFileImage(file) || FileApi.isFileVideo(file);
  },
  isFileMusical: (file: DirItem): boolean => {
    const audioExtensions = [
      'mp3',
      'wav',
      'aac',
      'flac',
      'ogg',
      'm4a',
      'wma',
      'aiff',
      'alac',
    ];
    const fileExtension = file.path?.split('.')?.pop()?.toLowerCase();
    return audioExtensions.includes(fileExtension ?? '');
  },
  isFileArchive: (item: DirItem) => {
    return /\.(zip|rar|tar|gz|bz2|7z|xz|iso|tgz)$/i.test(item.path);
  },
  makeVideoPreview: makeVideoPreviewQueued,
  getParentDirectoryPath: (filePath: string) => {
    const normalizedPath = filePath.endsWith('/')
      ? filePath.slice(0, -1)
      : filePath;
    const lastSlashIndex = normalizedPath.lastIndexOf('/');
    return normalizedPath.substring(0, lastSlashIndex);
  },
  askForStoragePermission: () => {
    const PermissionFile = NativeModules.PermissionFile;
    return new Promise<void>((resolve, reject) => {
      PermissionFile.checkAndGrantPermission(
        (err: any): any => {
          reject(err);
        },
        (granted: boolean): any => {
          if (!granted) {
            reject('permission is not granted');
          } else {
            resolve();
          }
        },
      );
    });
  },
  shareFile: async (files: DirItem[]) => {
    try {
      const filesChecked = files.filter(f => f.isFile());
      if (filesChecked.length === 0) {
        return;
      }
      const contentUris = filesChecked.map(file =>
        generateContentUri(file.path),
      );
      const mimeTypes = filesChecked.map(file => getMimeType(file.path));
      const targetMimeType: string = (() => {
        if (new Set(mimeTypes).size > 1) {
          return 'application/octet-stream';
        }
        return mimeTypes[0];
      })();
      await Share.open({ urls: contentUris, type: targetMimeType });
    } finally {
    }
  },
  sortDirItems: (
    dirItems: DirItem[],
    sortDirection: 'asc' | 'desc' = 'asc',
  ): DirItem[] => {
    const koef = sortDirection === 'asc' ? 1 : -1;
    return [...dirItems].sort((dirItemA, dirItemB) => {
      if (dirItemA.isDirectory() && !dirItemB.isDirectory()) {
        return -1;
      } else if (!dirItemA.isDirectory() && dirItemB.isDirectory()) {
        return 1;
      }
      if (dirItemA.isDirectory() && dirItemB.isDirectory()) {
        if (dirItemA.name < dirItemB.name) {
          return -1;
        } else if (dirItemA.name > dirItemB.name) {
          return 1;
        }
        return 0;
      }
      if (!dirItemA.isDirectory() && !dirItemB.isDirectory()) {
        if (dirItemA.mtime! < dirItemB.mtime!) {
          return -1 * koef;
        } else if (dirItemA.mtime! > dirItemB.mtime!) {
          return 1 * koef;
        }
        if (dirItemA.name < dirItemB.name) {
          return -1 * koef;
        } else if (dirItemA.name > dirItemB.name) {
          return 1 * koef;
        }
        return 0;
      }
      return 0;
    });
  },
  formatSize: (bytes: number, base: 1000 | 1024 = 1000) => {
    const kiloBytes = base;
    const megaBytes = kiloBytes * base;
    const gigaBytes = megaBytes * base;
    /**
 *  "gigabytes": "Гб",
    "megabytes": "Мб",
    "kilobytes": "Кб",
    "bytes": "байт"
 */
    if (bytes >= gigaBytes) {
      return (bytes / gigaBytes).toFixed(2) + ` ${i18n.t('gigabytes')}`;
    } else if (bytes >= megaBytes) {
      return (bytes / megaBytes).toFixed(2) + ` ${i18n.t('megabytes')}`;
    } else if (bytes >= kiloBytes) {
      return (bytes / kiloBytes).toFixed(2) + ` ${i18n.t('kilobytes')}`;
    } else {
      return bytes + ` ${i18n.t('bytes')}`;
    }
  },
};
