import React, { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { FileApi } from '../../services/FileApi';
import { useTranslation } from 'react-i18next';

const CreateDirectoryDialog: React.FC = () => {
  const fileManager = useFileManager();

  const [text, setText] = useState('');

  const { t } = useTranslation();

  useEffect(() => {
    setText(fileManager.newDirName ?? '');
  }, [fileManager.newDirName]);

  if (!fileManager.newDirPath) {
    return null;
  }
  const hideDialog = () => {
    fileManager.setNewDirPath(null);
  };
  return (
    <Portal>
      <Dialog visible={!!fileManager.newDirPath} onDismiss={hideDialog}>
        <Dialog.Title>{t('createDirConfirm')}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label={t('createName')}
            // uncontrolled due to https://github.com/callstack/react-native-paper/issues/2565
            // value={text}
            onChangeText={setText}
            defaultValue={text}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={async () => {
              hideDialog();
              await FileApi.createFolder(`${fileManager.newDirPath}/${text}`);
              fileManager.setReloadRequired(true);
            }}>
            {t('done')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default CreateDirectoryDialog;
