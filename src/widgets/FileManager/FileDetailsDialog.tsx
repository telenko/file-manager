import React from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { theme } from '../../theme';
import { FileApi } from '../../services/FileApi';

const FileDetailsDialog: React.FC = () => {
  const fileManager = useFileManager();
  const { t } = useTranslation();

  if (!fileManager.fileDetails) {
    return;
  }

  const hideDialog = () => fileManager.setFileDetails(null);

  const details = [
    { label: t('fileName'), value: fileManager.fileDetails.name },
    { label: t('filePath'), value: fileManager.fileDetails.path },
    {
      label: t('fileSize'),
      value: FileApi.formatSize(fileManager.fileDetails.size),
    },
  ];

  return (
    <Portal>
      <Dialog visible={!!fileManager.fileDetails} onDismiss={hideDialog}>
        <Dialog.Title>{t('details')}</Dialog.Title>
        <Dialog.Content>
          {details.map(detail => {
            return (
              <View
                key={detail.label}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>
                <Text style={{ fontFamily: theme.regularText }}>
                  {detail.label}
                </Text>
                <Text style={{ fontFamily: theme.mediumText }}>
                  {detail.value}
                </Text>
              </View>
            );
          })}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={hideDialog}>{t('ok')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

export default FileDetailsDialog;
