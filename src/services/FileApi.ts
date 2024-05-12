import * as RNFS from 'react-native-fs';
import { NativeModules } from 'react-native';
import { FileOpener } from './FileOpener';
import i18n from '../i18n/i18n';

export type DirItem = RNFS.ReadDirItem;

export const FileApi = {
  ROOT_PATH: RNFS.ExternalStorageDirectoryPath,
  readDir: RNFS.readDir,
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
  // Note, UNIX specific
  isItemHidden: (dirItem: DirItem) => {
    return dirItem.name.startsWith('.');
  },
  isFileImage: (file: DirItem): boolean => {
    if (!file.isFile()) {
      return false;
    }
    return (
      file.name.endsWith('.jpg') ||
      file.name.endsWith('.jpeg') ||
      file.name.endsWith('.png')
    );
  },
  isFileVideo: (file: DirItem): boolean => {
    // return false; // @TODO Andrii resolve video preview issue
    if (!file.isFile()) {
      return false;
    }
    return (
      file.name.endsWith('.mp4') ||
      file.name.endsWith('.avi') ||
      file.name.endsWith('.mov')
    );
  },
  makeVideoPreview: (file: DirItem) => {
    // return null; // @TODO Andrii fix
    if (!FileApi.isFileVideo(file)) {
      return null;
    }
    // return createThumbnail({
    //   url: `file://${file.path}`,
    // });
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
};
