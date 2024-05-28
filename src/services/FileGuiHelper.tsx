import { Alert } from 'react-native';
import i18n from '../i18n/i18n';
import { DirItem, FileApi } from './FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../common/types/navigation';

const getRouteMetadatas = (
  navigator: NavigationProp<FileManagerNavigation>,
): any => {
  const { routes } = navigator.getState();
  const lastRoute = routes[routes.length - 1];
  const { route, ...routeMetadatas } = lastRoute?.params ?? {};
  return routeMetadatas;
};

export const FileGuiHelper = {
  deleteContent: (file: DirItem): Promise<boolean> => {
    let resolved = false;
    return new Promise((resolve, reject) => {
      Alert.alert(
        i18n.t('delete'),
        i18n.t('deleteConfirm'),
        [
          {
            text: i18n.t('cancel'),
            style: 'cancel',
          },
          {
            text: i18n.t('delete'),
            onPress: async () => {
              await FileApi.deleteItem(file);
              resolved = true;
              resolve(true);
            },
            style: 'destructive',
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            if (!resolved) {
              resolve(false);
            }
          },
        },
      );
    });
  },
  copyContent: (
    content: DirItem,
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    // @ts-ignore
    navigator.push('FileTree', {
      route: FileApi.ROOT_PATH,
      mode: 'copy',
      fromRoute: content.path,
    });
  },
  moveContent: (
    content: DirItem,
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    // @ts-ignore
    navigator.push('FileTree', {
      route: FileApi.ROOT_PATH,
      mode: 'move',
      fromRoute: content.path,
    });
  },
  openDirectory: (
    content: DirItem,
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    if (!content.isDirectory()) {
      return;
    }
    // @TODO Andrii solve parametrization typings
    // @ts-ignore
    navigator.push('FileTree', { route: content.path, ...getRouteMetadatas(navigator) });
  },
  openPreview: (
    content: DirItem,
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    if (!content.isFile() || !FileApi.isFileImage(content)) {
      return;
    }
    // @TODO Andrii solve parametrization typings
    // @ts-ignore
    navigator.push('ImageViewer', { route: content.path, ...getRouteMetadatas(navigator) });
  },
};
