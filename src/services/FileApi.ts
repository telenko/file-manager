import * as RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';
import { createThumbnail } from 'react-native-create-thumbnail';

export type DirItem = RNFS.ReadDirItem;

export const FileApi = {
  ROOT_PATH: RNFS.ExternalStorageDirectoryPath,
  readDir: RNFS.readDir,
  openFile: (item: DirItem) => {
    if (!item.isFile()) {
      return;
    }
    return FileViewer.open(item.path, {
      showAppsSuggestions: true,
      showOpenWithDialog: true,
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
    return null; // @TODO Andrii fix
    if (!FileApi.isFileVideo(file)) {
      return null;
    }
    return createThumbnail({
      url: `file://${file.path}`,
    });
  },
};
