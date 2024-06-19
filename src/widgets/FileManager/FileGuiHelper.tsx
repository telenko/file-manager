import { Alert } from 'react-native';
import i18n from '../../i18n/i18n';
import { DirItem, FileApi } from '../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../common/types/navigation';
import { getGlobalExceptionHandler } from '../../common/components/ExceptionHandler';

export const getRouteMetadatas = (
  navigator: NavigationProp<FileManagerNavigation>,
): any => {
  const { routes } = navigator.getState() ?? {};
  const lastRoute = routes[routes.length - 1];
  const { route, ...routeMetadatas } = lastRoute?.params ?? {};
  return routeMetadatas;
};

export const getRouteDirectory = (
  navigator: NavigationProp<FileManagerNavigation>,
): any => {
  const { routes } = navigator.getState() ?? {};
  const lastRoute = routes?.[routes.length - 1];
  const { route } = lastRoute?.params ?? {};
  return route;
};

export const FileGuiHelper = {
  deleteContent: (files: DirItem[]): Promise<boolean> => {
    let resolved = false;
    return new Promise((resolve, reject) => {
      Alert.alert(
        i18n.t('delete'),
        files.length === 1
          ? i18n.t('deleteConfirm')
          : i18n.t('deleteConfirmPlural', { n: files.length }),
        [
          {
            text: i18n.t('cancel'),
            style: 'cancel',
          },
          {
            text: i18n.t('delete'),
            onPress: async () => {
              await FileApi.deleteItemsBatched(files).catch(
                getGlobalExceptionHandler()?.handleError,
              );
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
    contents: DirItem[],
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    // @ts-ignore
    navigator.push('FileTree', {
      route: FileApi.ROOT_PATH,
      mode: 'copy',
      fromRoute: contents.map(c => c.path),
    });
  },
  moveContent: (
    contents: DirItem[],
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    // @ts-ignore
    navigator.push('FileTree', {
      route: FileApi.ROOT_PATH,
      mode: 'move',
      fromRoute: contents.map(c => c.path),
    });
  },
  openDirectory: (
    content: DirItem,
    navigator: NavigationProp<FileManagerNavigation>,
  ) => {
    if (!content.isDirectory()) {
      return;
    }
    // @ts-ignore
    navigator.push('FileTree', {
      route: content.path,
      ...getRouteMetadatas(navigator),
    });
  },
  openPreview: (
    content: DirItem,
    navigator: NavigationProp<FileManagerNavigation>,
    sort: 'asc' | 'desc' = 'asc',
  ) => {
    if (!FileApi.isFileViewable(content)) {
      return;
    }
    // @ts-ignore
    navigator.push('ImageViewer', {
      route: content.path,
      sort,
      ...getRouteMetadatas(navigator),
    });
  },
};
