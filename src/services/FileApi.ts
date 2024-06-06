import * as RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import Share from 'react-native-share';
import { FileOpener } from './FileOpener';
import i18n from '../i18n/i18n';
import { makeQueueable } from '../common/utils/queue';

export type DirItem = RNFS.ReadDirItem;

const resolveCounterConflictRecursive = async (
  destination: string,
  count: number,
): Promise<string> => {
  const dotTokens = destination.split('.');
  const ext = dotTokens.length > 1 ? dotTokens.pop() : '';
  const preExt = dotTokens.join('.');
  const pathTokens = preExt.split('/');
  const itemName = pathTokens.pop();
  const resultPath = `${pathTokens.join('/')}/${itemName} ${i18n.t(
    'copyCount',
    { n: count },
  )}${ext ? '.' + ext : ''}`;

  if (await RNFS.exists(resultPath)) {
    return resolveCounterConflictRecursive(destination, count + 1);
  }
  return resultPath;
};

const getMimeType = async (filePath: string) => {
  try {
    // const res = await RNFetchBlob.fs.readFile(filePath, 'base64');
    // const type = RNFetchBlob.config(res);
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
  } catch (error) {
    console.error('Error getting MIME type:', error);
    return null;
  }
};

const generateContentUri = async (filePath: string) => {
  try {
    return `content://${filePath}`;
  } catch (error) {
    console.error('Error generating content URI:', error);
    return null;
  }
};

const makeVideoPreviewQueued = makeQueueable(
  async (file: DirItem): Promise<string | null> => {
    if (!FileApi.isFileVideo(file)) {
      return null;
    }
    return new Promise((resolve, reject) => {
      const { ThumbnailModule } = NativeModules;
      ThumbnailModule.createVideoThumbnail(
        file.path,
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
  readDir: RNFS.readDir,
  getMetadata: async (path: string): Promise<DirItem> => {
    const res = await RNFS.stat(path);
    return {
      ...res,
      name: res.name ?? '',
      ctime: new Date(res.ctime),
      mtime: new Date(res.mtime),
    };
  },
  openFile: (item: DirItem) => {
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
    return RNFS.mkdir(path);
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

  // @TODO Andrii conflicts for move?
  moveFileOrDirectory: async (source: string, destination: string) => {
    const moveRecursive = async (source: string, destination: string) => {
      const stats = await RNFS.stat(source);
      if (stats.isDirectory()) {
        if (await RNFS.exists(destination)) {
          throw new Error(
            'Failed to move contents, as destination already exists',
          );
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
          throw new Error(
            'Failed to move file, as destination file already exists',
          );
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
  renameItem: async (dirItem: DirItem, newName: string) => {
    const dirItemPathTokens = dirItem.path.split('/');
    const fileName = dirItemPathTokens.pop();
    if (fileName === newName) {
      return;
    }
    const parentItem = dirItemPathTokens.join('/');
    const destinationPath = parentItem + '/' + newName;
    await FileApi.moveFileOrDirectory(dirItem.path, destinationPath);
  },
  deleteItem: async (item: DirItem) => {
    await RNFS.unlink(item.path);
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
    if (!file.isFile()) {
      return;
    }
    const contentUri = await generateContentUri(file.path);
    const mimeType = await getMimeType(file.path);
    if (!contentUri || !mimeType) {
      throw new Error('Failed to share file - file path seem to be invalid');
    }
    await Share.open({ url: contentUri, type: mimeType });
  },
  sortDirItems: (
    dirItems: DirItem[],
    sortDirection: 'asc' | 'desc' = 'asc',
  ): DirItem[] => {
    const koef = sortDirection === 'asc' ? 1 : -1;
    return [...dirItems].sort((dirItemA, dirItemB) => {
      let pointsA = 0;
      let pointsB = 0;
      if (dirItemA.isDirectory()) {
        pointsA -= 100;
      }
      if (dirItemB.isDirectory()) {
        pointsB -= 100;
      }
      if (dirItemA.name > dirItemB.name) {
        pointsA += 50;
      } else {
        pointsB += 50;
      }
      if (dirItemA.mtime! > dirItemB.mtime!) {
        pointsA += 20;
      } else {
        pointsB += 20;
      }
      return koef * (pointsA - pointsB);
    });
  },
};
