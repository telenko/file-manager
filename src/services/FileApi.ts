import * as RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import { FileOpener } from './FileOpener';
import i18n from '../i18n/i18n';

export type DirItem = RNFS.ReadDirItem;

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
  copyItem: async (item: DirItem, destFolder: DirItem) => {
    if (!destFolder.isDirectory()) {
      return;
    }
    await RNFS.copyFile(item.path, destFolder.path);
  },
  deleteItem: async (item: DirItem) => {
    await RNFS.unlink(item.path);
  },
  moveItem: async (item: DirItem, destFolder: DirItem) => {
    if (!destFolder.isDirectory()) {
      return;
    }
    await RNFS.moveFile(item.path, destFolder.path);
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
  makeVideoPreview: async (file: DirItem): Promise<string | null> => {
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
