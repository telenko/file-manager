import React, { useState } from 'react';
import { Button, Dialog, MD3Colors, Modal, Text } from 'react-native-paper';
import { ErrorType, FileManagerError } from '.';
import { theme } from '../../../theme';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Linking, ScrollView, View } from 'react-native';

const EMAIL = 'mangolik931@gmail.com';

const ErrorReport: React.FC<{
  error: FileManagerError | Error | any;
  onDismiss: () => void;
}> = ({ error, onDismiss }) => {
  const { t } = useTranslation();
  return (
    <Modal
      visible
      onDismiss={onDismiss}
      contentContainerStyle={{ flex: 1, backgroundColor: '#fff' }}>
      <SafeAreaView style={{ flex: 1 }}>
        <Text style={{ fontFamily: theme.strongText, fontSize: 20 }}>
          Please send email into "{EMAIL}" with topic "Error occured in File
          Manager app" and content below
        </Text>
        <ScrollView style={{ flex: 1 }}>
          <Text>{error.stack}</Text>
        </ScrollView>
      </SafeAreaView>
      <Button mode="outlined" onPress={onDismiss}>
        {t('ok')}
      </Button>
    </Modal>
  );
};

const ErrorModal: React.FC<{
  error: FileManagerError | Error | any;
  onDismiss: () => void;
}> = ({ error, onDismiss }) => {
  const { t } = useTranslation();
  const [reportView, setReportView] = useState(false);
  return (
    <>
      <Dialog visible onDismiss={onDismiss}>
        <Dialog.Title>
          <Text
            style={{
              fontFamily: theme.strongText,
              color: MD3Colors.error0,
            }}>
            {t('errorOccured')}
          </Text>
        </Dialog.Title>
        <Dialog.Content>
          <Text
            style={{
              fontFamily: theme.mediumText,
              color: MD3Colors.error10,
            }}>
            {error.message ?? error}
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          {error.code !== ErrorType.FILE_API ? (
            <Button
              mode="contained"
              onPress={() => {
                const subject = encodeURIComponent(`Error in File Manager app`);
                const details = encodeURIComponent(error.stack);
                const link = `mailto:${EMAIL}?subject=${subject}&body=${details}`;

                Linking.canOpenURL(link)
                  .then(supported => {
                    if (supported) {
                      Linking.openURL(link);
                    } else {
                      setReportView(true);
                    }
                  })
                  .catch(() => setReportView(true));
              }}>
              {t('report')}
            </Button>
          ) : null}

          <Button onPress={onDismiss}>{t('ok')}</Button>
        </Dialog.Actions>
      </Dialog>
      {reportView ? (
        <ErrorReport error={error} onDismiss={() => setReportView(false)} />
      ) : null}
    </>
  );
};

export default ErrorModal;
