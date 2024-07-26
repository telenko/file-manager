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

const RenameContentDialog: React.FC = () => {
  const fileManager = useFileManager();
  const [error, setError] = useState('');
  const exceptionHandler = useExceptionHandler();

  const [text, setText] = useState('');
  const [textReady, setTextReady] = useState(false);

  const { t } = useTranslation();

  useEffect(() => {
    setText(fileManager.renameDialogItem?.name ?? '');
    setTimeout(() => {
      setTextReady(true);
    }, 100);
    return () => {
      setTextReady(false);
    };
  }, [fileManager.renameDialogItem]);

  if (!fileManager.renameDialogItem) {
    return null;
  }
  const hideDialog = () => {
    fileManager.setRenameDialogActive(null);
    setTextReady(false);
  };
  return (
    <Portal>
      <Dialog visible={!!fileManager.renameDialogItem} onDismiss={hideDialog}>
        <Dialog.Title>{t('renameConfirm')}</Dialog.Title>
        <Dialog.Content>
          {textReady && (
            <TextInput
              label={t('rename')}
              // uncontrolled due to https://github.com/callstack/react-native-paper/issues/2565
              // value={text}
              onChangeText={setText}
              defaultValue={text}
            />
          )}
          {error ? (
            <Text style={{ color: MD3Colors.error30 }}>{error}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            disabled={!text}
            onPress={async () => {
              hideDialog();
              await FileApi.renameItem(
                fileManager.renameDialogItem!,
                text,
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

export default RenameContentDialog;
