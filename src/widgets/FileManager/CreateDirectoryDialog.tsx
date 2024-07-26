import React, { useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  MD3Colors,
  Portal,
  Text,
  TextInput,
} from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { FileApi } from '../../services/FileApi';
import { useTranslation } from 'react-i18next';
import { useExceptionHandler } from '../../common/components/ExceptionHandler';
import { Cache } from '../../services/Cache';

const CreateDirectoryDialog: React.FC = () => {
  const fileManager = useFileManager();
  const exceptionHandler = useExceptionHandler();
  const [valid, setValid] = useState(true);
  const [error, setError] = useState('');

  const [text, setText] = useState('');

  const { t } = useTranslation();

  useEffect(() => {
    if (!fileManager.newDirPath) {
      setValid(true);
      setError('');
      return;
    }
    const dirItems = Cache.getDirItems(fileManager.newDirPath);
    if ((dirItems ?? []).some(dirItem => dirItem.name === text)) {
      setValid(false);
      setError(t('nameAlreadyExists'));
    } else {
      setValid(true);
      setError('');
    }
  }, [text, fileManager.renameDialogItem]);

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
            error={!valid}
          />
          {error ? (
            <Text style={{ color: MD3Colors.error30 }}>{error}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            disabled={!text || !valid}
            onPress={async () => {
              hideDialog();
              await FileApi.createFolder(
                `${fileManager.newDirPath}/${text}`,
              ).catch(exceptionHandler.handleError);
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
