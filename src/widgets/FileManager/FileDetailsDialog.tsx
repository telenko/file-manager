import React from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { useTranslation } from 'react-i18next';

const FileDetailsDialog: React.FC = () => {
  const fileManager = useFileManager();
  const { t } = useTranslation();

  if (!fileManager.fileDetails) {
    return;
  }

  const hideDialog = () => fileManager.setFileDetails(null);

  return (
    <Portal>
      <Dialog visible={!!fileManager.fileDetails} onDismiss={hideDialog}>
        <Dialog.Title>{t('details')}</Dialog.Title>
        <Dialog.Content>
          <Text>{fileManager.fileDetails.path}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={hideDialog}>{t('ok')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default FileDetailsDialog;
