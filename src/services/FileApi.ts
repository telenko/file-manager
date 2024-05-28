import * as RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import { FileOpener } from './FileOpener';
import i18n from '../i18n/i18n';
import { makeQueueable } from '../common/utils/queue';

export type DirItem = RNFS.ReadDirItem;

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

let VIDEO_PREVIEW_CACHE: Record<string, string> = {};

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
  // @TODO Andrii if exists make (copy N) behavior
  copyFileOrDirectory: async (source: string, destination: string) => {
    const copyRecursive = async (source: string, destination: string) => {
      const stats = await RNFS.stat(source);
      const destStats = await RNFS.stat(destination);

      if (stats.isDirectory()) {
        if (await RNFS.exists(destination)) {
          throw new Error(
            'Failed to copy contents, as destination already exists',
          );
        }
        await RNFS.mkdir(destination);
        const items = await RNFS.readDir(source);

        for (const item of items) {
          const itemSourcePath = `${source}/${item.name}`;
          const itemDestinationPath = `${destination}/${item.name}`;

          await copyRecursive(itemSourcePath, itemDestinationPath);
        }
      } else {
        const fileName = stats.name || source.split('/').pop();
        let fileDest = destStats.isDirectory()
          ? `${destination}/${fileName}`
          : destination;

        if (await RNFS.exists(fileDest)) {
          throw new Error(
            'Failed to copy file, as destination file already exists',
          );
        }
        await RNFS.copyFile(source, fileDest);
      }
    };
    return copyRecursive(source, destination);
  },
  moveFileOrDirectory: async (source: string, destination: string) => {
    const moveRecursive = async (source: string, destination: string) => {
      const stats = await RNFS.stat(source);
      const destStats = await RNFS.stat(destination);
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
        const fileName = stats.name || source.split('/').pop();
        let fileDest = destStats.isDirectory()
          ? `${destination}/${fileName}`
          : destination;

        if (await RNFS.exists(fileDest)) {
          throw new Error(
            'Failed to move file, as destination file already exists',
          );
        }
        await RNFS.moveFile(source, fileDest);
      }
    };
    return moveRecursive(source, destination);
  },
  deleteItem: async (item: DirItem) => {
    await RNFS.unlink(item.path);
  },
  // Note, UNIX specific
  isItemHidden: (dirItem: DirItem) => {
    return dirItem.name.startsWith('.');
  },
  isFileImage: (file: DirItem): boolean => {
    if (!file.isFile()) {
      return false;
    }
    return (
      file.name.toLowerCase().endsWith('.jpg') ||
      file.name.toLowerCase().endsWith('.jpeg') ||
      file.name.toLowerCase().endsWith('.png')
    );
  },
  isFileVideo: (file: DirItem): boolean => {
    if (!file.isFile()) {
      return false;
    }
    return (
      file.name.endsWith('.mp4') ||
      file.name.endsWith('.avi') ||
      file.name.endsWith('.mov')
    );
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
