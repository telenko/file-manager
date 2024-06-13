import * as RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import Share from 'react-native-share';
import { FileOpener } from './FileOpener';
import i18n from '../i18n/i18n';
import { makeQueueable } from '../common/utils/queue';
import {
  ErrorType,
  FileManagerError,
} from '../common/components/ExceptionHandler';
export type DirItem = RNFS.ReadDirItem;

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

  if (await RNFS.exists(resultPath)) {
    return resolveCounterConflictRecursive(destination, count + 1);
  }
  return resultPath;
};

const getMimeType = async (filePath: string) => {
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

const generateContentUri = async (filePath: string) => {
  return `content://${filePath}`;
};

const makeVideoPreviewQueued = makeQueueable(
  async (file: DirItem, width: number = 0): Promise<string | null> => {
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
  },
  4,
);

export const FileApi = {
  ROOT_PATH: RNFS.ExternalStorageDirectoryPath,
  readDir: (path: string) => {
    try {
      return RNFS.readDir(path);
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
      const res = await RNFS.stat(path);
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
      return RNFS.mkdir(path);
    } catch (e) {
      throw new FileManagerError(
        i18n.t('createFolderFailed'),
        ErrorType.FILE_API,
        e,
      );
    }
  },
  copyFileOrDirectory: async (
    source: string,
    destination: string,
    injectCopyNIfConflict: boolean = false,
  ) => {
    const copyRecursive = async (source: string, destination: string) => {
      const stats = await RNFS.stat(source);
      if (stats.isDirectory()) {
        if (await RNFS.exists(destination)) {
          if (injectCopyNIfConflict) {
            destination = await resolveCounterConflictRecursive(destination, 1);
          } else {
            throw new Error(
              'Failed to copy contents, as destination already exists',
            );
          }
        }
        await RNFS.mkdir(destination);
        const items = await RNFS.readDir(source);

        for (const item of items) {
          const itemSourcePath = `${source}/${item.name}`;
          const itemDestinationPath = `${destination}/${item.name}`;

          await copyRecursive(itemSourcePath, itemDestinationPath);
        }
      } else {
        if (await RNFS.exists(destination)) {
          if (injectCopyNIfConflict) {
            destination = await resolveCounterConflictRecursive(destination, 1);
          } else {
            throw new Error(
              'Failed to copy file, as destination file already exists',
            );
          }
        }
        await RNFS.copyFile(source, destination);
      }
    };

    const destStats = await RNFS.stat(destination);
    const fileName = source.split('/').pop();
    let fileDest = destStats.isDirectory()
      ? `${destination}/${fileName}`
      : destination;

    return copyRecursive(source, fileDest);
  },

  copyFilesOrDirectoriesBatched: async (
    sources: string[],
    destination: string,
    injectCopyNIfConflict: boolean = false,
  ) => {
    try {
      return Promise.all(
        sources.map(source =>
          FileApi.copyFileOrDirectory(
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
    const moveRecursive = async (source: string, destination: string) => {
      const stats = await RNFS.stat(source);
      if (stats.isDirectory()) {
        if (await RNFS.exists(destination)) {
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
        await RNFS.mkdir(destination);
        const items = await RNFS.readDir(source);

        for (const item of items) {
          const itemSourcePath = `${source}/${item.name}`;
          const itemDestinationPath = `${destination}/${item.name}`;

          await moveRecursive(itemSourcePath, itemDestinationPath);
        }
        // Remove the original directory after moving all its contents
        await RNFS.unlink(source);
      } else {
        if (await RNFS.exists(destination)) {
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
        await RNFS.moveFile(source, destination);
      }
    };

    const isDestDirectory = await (async () => {
      try {
        const destStats = await RNFS.stat(destination);
        return destStats.isDirectory();
      } catch {
        return false;
      }
    })();

    const fileName = source.split('/').pop();
    let fileDest = isDestDirectory ? `${destination}/${fileName}` : destination;

    return moveRecursive(source, fileDest);
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
      await FileApi.moveFileOrDirectory(dirItem.path, destinationPath);
    } catch (e) {
      throw new FileManagerError(i18n.t('renameFailed'), ErrorType.FILE_API, e);
    }
  },
  deleteItem: async (item: DirItem) => {
    try {
      await RNFS.unlink(item.path);
    } catch (e) {
      throw new FileManagerError(i18n.t('deleteFailed'), ErrorType.FILE_API, e);
    }
  },
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
    return new Promise((resolve, reject) => {
      PermissionFile.checkAndGrantPermission(
        (err: any): any => {
          reject(err);
        },
        (res: any): any => {
          resolve(res);
        },
      );
    });
  },
  shareFile: async (file: DirItem) => {
    try {
      if (!file.isFile()) {
        return;
      }
      const contentUri = await generateContentUri(file.path);
      const mimeType = await getMimeType(file.path);
      await Share.open({ url: contentUri, type: mimeType });
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
        return -1 * koef;
      } else if (!dirItemA.isDirectory() && dirItemB.isDirectory()) {
        return 1 * koef;
      }
      if (dirItemA.isDirectory() && dirItemB.isDirectory()) {
        if (dirItemA.name < dirItemB.name) {
          return -1 * koef;
        } else if (dirItemA.name > dirItemB.name) {
          return 1 * koef;
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
  formatSize: (bytes: number) => {
    const kiloBytes = 1024;
    const megaBytes = kiloBytes * 1024;
    const gigaBytes = megaBytes * 1024;
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
