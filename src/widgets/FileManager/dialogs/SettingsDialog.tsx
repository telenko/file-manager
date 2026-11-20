import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFileManager } from '../FileManagerContext';
import {
  Button,
  Dialog,
  IconButton,
  Portal,
  ProgressBar,
  Switch,
  Text,
} from 'react-native-paper';
import { Linking, View } from 'react-native';
import { APP_LINK_SELF_URL } from '../settings';
import { theme } from '../../../theme';
import Popover from 'react-native-popover-view';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

const SettingsDialog: React.FC = () => {
  const fileManager = useFileManager();
  const { t } = useTranslation();
  const searchProgress = useSelector(
    (state: RootState) => state.fileManager.searchIndexProgress,
  );

  if (!fileManager.settingsOpen) {
    return null;
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
          <View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                width: '100%',
              }}>
              <View style={{ flex: 1 }}>
                <ProgressBar
                  progress={searchProgress.percentage / 100}
                  color={theme.selectionColor}
                />
              </View>
              <Popover
                from={
                  <IconButton
                    icon="lightning-bolt"
                    accessibilityLabel={t('searchIndexChargingInfo')}
                    style={{ margin: 0, width: 30, marginLeft: 10 }}
                  />
                }>
                <View style={{ padding: 10, borderRadius: theme.radiusMedium }}>
                  <Text>{t('searchIndexChargingInfo')}</Text>
                </View>
              </Popover>
            </View>
            <Text>
              {t('searchIndexingProgress', {
                percentage: searchProgress.percentage,
              })}
            </Text>
          </View>

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
