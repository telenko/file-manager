import React from 'react';
import { Button, Dialog, MD3Colors, Modal, Text } from 'react-native-paper';
import { FileManagerError } from '.';
import { theme } from '../../../theme';
import { useTranslation } from 'react-i18next';

const ErrorModal: React.FC<{
  error: FileManagerError | Error | any;
  onDismiss: () => void;
}> = ({ error, onDismiss }) => {
  const { t } = useTranslation();
  return (
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
        <Button onPress={onDismiss}>{t('ok')}</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default ErrorModal;
