import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import {
  ErrorType,
  FileManagerError,
} from '../common/components/ExceptionHandler';
import i18n from '../i18n/i18n';

const LocalFileViewer = NativeModules.LocalFileViewer;
const eventEmitter = new NativeEventEmitter(LocalFileViewer);

let lastId = 0;

function open(
  path: string,
  options: {
    dialogTitle?: string;
    onDismiss?: () => void;
    showAppsSuggestions?: boolean;
    showOpenWithDialog?: boolean;
  } = {},
) {
  const {
    onDismiss,
    dialogTitle = 'Open File With',
    ...nativeOptions
  } = options;

  if (!['android', 'ios'].includes(Platform.OS)) {
    return LocalFileViewer.open(path, nativeOptions, dialogTitle);
  }

  return new Promise<void>((resolve, reject) => {
    const currentId = ++lastId;

    const openSubscription = eventEmitter.addListener(
      'LocalFileViewerDidOpen',
      ({ id, error }) => {
        if (id === currentId) {
          openSubscription.remove();
          return error
            ? reject(
                new FileManagerError(
                  i18n.t('failedToOpenPath'),
                  ErrorType.FILE_API,
                  error,
                ),
              )
            : resolve();
        }
      },
    );
    const dismissSubscription = eventEmitter.addListener(
      'LocalFileViewerDidDismiss',
      ({ id }) => {
        if (id === currentId) {
          dismissSubscription.remove();
          onDismiss && onDismiss();
        }
      },
    );

    LocalFileViewer.open(
      normalize(path),
      currentId,
      nativeOptions,
      dialogTitle,
    );
  });
}

function normalize(path: string) {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    const filePrefix = 'file://';
    if (path.startsWith(filePrefix)) {
      path = path.substring(filePrefix.length);
      try {
        path = decodeURI(path);
      } catch (e) {
        throw new FileManagerError(
          i18n.t('failedToOpenPath'),
          ErrorType.FILE_API,
          e,
        );
      }
    }
  }
  return path;
}

export const FileOpener = { open };
