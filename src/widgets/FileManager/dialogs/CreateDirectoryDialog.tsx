import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, MD3Colors, Portal, Text } from 'react-native-paper';
import { useFileManager } from '../FileManagerContext';
import { FileApi } from '../../../services/FileApi';
import { useTranslation } from 'react-i18next';
import { useExceptionHandler } from '../../../common/components/ExceptionHandler';
import { useItemExists } from '../useItemExists';
import { theme } from '../../../theme';
import TextInput from '../../../common/components/TextInput';

const CreateDirectoryDialog: React.FC = () => {
  const fileManager = useFileManager();
  const exceptionHandler = useExceptionHandler();

  const [text, setText] = useState('');
  const { t } = useTranslation();

  const { exists, loading } = useItemExists(fileManager.newDirPath ?? '', text);
  const error = useMemo(() => {
    if (exists) {
      return t('nameAlreadyExists');
    }
    return '';
  }, [exists]);

  useEffect(() => {
    setText(fileManager.newDirName ?? '');
  }, [fileManager.newDirName]);

  useEffect(() => {
    setText('');
  }, [fileManager.newDirPath]);

  if (!fileManager.newDirPath) {
    return null;
  }
  const hideDialog = () => {
    fileManager.setNewDirPath(null);
  };
  return (
    <Portal>
      <Dialog
        visible={!!fileManager.newDirPath}
        onDismiss={hideDialog}
        style={theme.dialogContainer}>
        <Dialog.Title>{t('createDirConfirm')}</Dialog.Title>
        <Dialog.Content>
          <TextInput
            label={t('createName')}
            // uncontrolled due to https://github.com/callstack/react-native-paper/issues/2565
            // value={text}
            onChangeText={setText}
            defaultValue={text}
            error={exists && !loading}
          />
          {error ? (
            <Text style={{ color: MD3Colors.error30 }}>{error}</Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            disabled={!text || loading || exists}
            textColor={theme.selectionColor}
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
