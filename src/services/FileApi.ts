import * as RNFS from 'react-native-fs';
import FileViewer from 'react-native-file-viewer';

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
};
