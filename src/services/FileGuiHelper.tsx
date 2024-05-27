import { Alert } from 'react-native';
import i18n from '../i18n/i18n';
import { DirItem, FileApi } from './FileApi';

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
};
