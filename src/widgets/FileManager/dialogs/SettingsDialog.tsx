import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFileManager } from '../FileManagerContext';
import { Button, Dialog, Portal, Switch, Text } from 'react-native-paper';
import { Linking, View } from 'react-native';
import { APP_LINK_SELF_URL } from '../settings';
import { theme } from '../../../theme';

const SettingsDialog: React.FC = () => {
  const fileManager = useFileManager();
  const { t } = useTranslation();

  if (!fileManager.settingsOpen) {
    return;
  }

  const hideDialog = () => fileManager.setSettingsOpen(false);

  return (
    <Portal>
      <Dialog visible={!!fileManager.settingsOpen} onDismiss={hideDialog}>
        <Dialog.Title>{t('settings')}</Dialog.Title>
        <Dialog.Content>
          <View style={{ flexDirection: 'row' }}>
            <Text>{t('storeLatestFolder')}</Text>
            <Switch
              color={theme.selectionColor}
              value={fileManager.storeLatestFolder}
              onValueChange={v => {
                fileManager.setStoreLatestFolder(v);
              }}
            />
          </View>

          <Button
            onPress={() => {
              Linking.openURL(APP_LINK_SELF_URL);
            }}>
            <Text>{t('checkForUpdates')}</Text>
          </Button>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
};

export default SettingsDialog;
