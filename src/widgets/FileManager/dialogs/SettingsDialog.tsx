import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFileManager } from '../FileManagerContext';
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  Switch,
  Text,
} from 'react-native-paper';
import { Linking, View } from 'react-native';
import { APP_LINK_SELF_URL } from '../settings';
import { theme } from '../../../theme';
import Popover from 'react-native-popover-view';

const SettingsDialog: React.FC = () => {
  const fileManager = useFileManager();
  const { t } = useTranslation();

  if (!fileManager.settingsOpen) {
    return;
  }

  const hideDialog = () => fileManager.setSettingsOpen(false);

  return (
    <Portal>
      <Dialog
        visible={!!fileManager.settingsOpen}
        onDismiss={hideDialog}
        style={theme.dialogContainer}>
        <Dialog.Title>{t('settings')}</Dialog.Title>
        <Dialog.Content
          style={{
            minHeight: 120,
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Text>{t('storeLatestFolder')}</Text>
            <View style={{ marginRight: 'auto' }}>
              <Popover from={<IconButton icon="information" />}>
                <View style={{ padding: 10, borderRadius: theme.radiusMedium }}>
                  <Text>{t('storeLatestFolderInfo')}</Text>
                </View>
              </Popover>
            </View>
            <Switch
              color={theme.selectionColor}
              value={fileManager.storeLatestFolder}
              onValueChange={v => {
                fileManager.setStoreLatestFolder(v);
              }}
            />
          </View>

          <Button
            style={{ marginTop: 'auto', borderRadius: theme.radiusMedium }}
            mode="outlined"
            textColor={theme.selectionColor}
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
