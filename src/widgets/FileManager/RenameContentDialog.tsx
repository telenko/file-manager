import React, { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { FileApi } from '../../services/FileApi';

const RenameContentDialog: React.FC = () => {
  const fileManager = useFileManager();

  const [text, setText] = useState('');

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
        <Dialog.Title>Alert</Dialog.Title>
        <Dialog.Content>
          <TextInput label="Rename item" value={text} onChangeText={setText} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={() => {
              hideDialog();
              FileApi.renameItem(fileManager.renameDialogItem!, text);
            }}>
            Done
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default RenameContentDialog;
