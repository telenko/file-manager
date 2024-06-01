import React, { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { FileApi } from '../../services/FileApi';
import { useTranslation } from 'react-i18next';

const RenameContentDialog: React.FC = () => {
  const fileManager = useFileManager();

  const [text, setText] = useState('');

  const { t } = useTranslation();

  useEffect(() => {
    setText(fileManager.renameDialogItem?.name ?? '');
  }, [fileManager.renameDialogItem]);

  if (!fileManager.renameDialogItem) {
    return null;
  }
  const hideDialog = () => fileManager.setRenameDialogActive(null);
  return (
    <Portal>
      <Dialog visible={!!fileManager.renameDialogItem} onDismiss={hideDialog}>
        <Dialog.Title>{t('renameConfirm')}</Dialog.Title>
        <Dialog.Content>
          <TextInput label={t('rename')} value={text} onChangeText={setText} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={async () => {
              hideDialog();
              await FileApi.renameItem(fileManager.renameDialogItem!, text);
              fileManager.setReloadRequired(true);
            }}>
            {t('done')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default RenameContentDialog;
