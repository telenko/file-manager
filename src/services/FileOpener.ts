import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

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
          return error ? reject(new Error(error)) : resolve();
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
      } catch (e) {}
    }
  }
  return path;
}

export const FileOpener = { open };
