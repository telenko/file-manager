import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
} from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../theme';
import { FileApi } from '../../services/FileApi';

const styles = StyleSheet.create({
  text: {
    flex: 1,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  loader: {
    flex: 2,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
});

const FileDetailsDialog: React.FC = () => {
  const fileManager = useFileManager();
  const { t } = useTranslation();
  const [size, setSize] = useState('');
  const [sizeLoading, setSizeLoading] = useState(false);
  const requestCounter = useRef(0);

  useEffect(() => {
    const currentRequest = ++requestCounter.current;
    const forCurrentTask = (cb: Function) => {
      if (currentRequest === requestCounter.current) {
        cb();
      }
    };
    setSize('');
    if (!fileManager?.fileDetails?.path) {
      return;
    }
    (async () => {
      setSizeLoading(true);
      try {
        const rawSize = await FileApi.getItemSize(
          fileManager?.fileDetails?.path!,
        );
        forCurrentTask(() => setSize(FileApi.formatSize(rawSize)));
      } catch {
      } finally {
        forCurrentTask(() => setSizeLoading(false));
      }
    })();
  }, [fileManager?.fileDetails?.path]);

  if (!fileManager.fileDetails) {
    return;
  }

  const hideDialog = () => fileManager.setFileDetails(null);

  const details = [
    { label: t('fileName'), value: fileManager.fileDetails.name },
    { label: t('filePath'), value: fileManager.fileDetails.path },
    {
      label: t('fileLastChange'),
      value: `${fileManager.fileDetails.mtime?.toLocaleDateString()} ${fileManager.fileDetails.mtime?.toLocaleTimeString()}`,
    },
    {
      label: t('fileSize'),
      loading: sizeLoading,
      value: size,
    },
  ];

  return (
    <Portal>
      <Dialog visible={!!fileManager.fileDetails} onDismiss={hideDialog}>
        <Dialog.Title>{t('details')}</Dialog.Title>
        <Dialog.Content>
          {details.map(detail => {
            return (
              <View key={detail.label} style={styles.row}>
                <Text style={[styles.text, { fontFamily: theme.regularText }]}>
                  {detail.label}
                </Text>
                {detail.loading ? (
                  <View style={styles.loader}>
                    <ActivityIndicator size={24} />
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.text,
                      { fontFamily: theme.mediumText, flex: 2 },
                    ]}>
                    {detail.value || '-'}
                  </Text>
                )}
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
