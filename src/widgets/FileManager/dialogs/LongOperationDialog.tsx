import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Dialog,
  MD2Colors,
  Portal,
  Text,
} from 'react-native-paper';
import { useFileManager } from '../FileManagerContext';
import { useTranslation } from 'react-i18next';
import { useBackAction } from '../../../common/hooks/useBackAction';
import { View } from 'react-native';
import { theme } from '../../../theme';

const STARTUP_DELAY_MS = 1500;

const LongOperationDialog: React.FC = () => {
  const fileManager = useFileManager();
  const [dialogActive, setDialogActive] = useState(false);
  const hasLongOperation = !!fileManager.longOperation;
  const isVisibleLongOperation =
    hasLongOperation && !fileManager.longOperation?.hidden;
  const backHandle = useCallback(() => {
    if (isVisibleLongOperation) {
      return true;
    }
    return false;
  }, [isVisibleLongOperation]);
  useBackAction(backHandle);

  useEffect(() => {
    if (!isVisibleLongOperation) {
      setDialogActive(false);
      return;
    }
    const timer = setTimeout(() => {
      setDialogActive(true);
    }, STARTUP_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isVisibleLongOperation]);

  const { t } = useTranslation();

  if (!dialogActive) {
    return null;
  }
  const hideDialog = () => {
    if (!fileManager.longOperation) {
      return;
    }
    fileManager.setLongOperation({
      message: fileManager.longOperation?.message,
      hidden: true,
    });
  };
  return (
    <Portal>
      <Dialog
        style={theme.dialogContainer}
        visible={!!dialogActive && isVisibleLongOperation}
        dismissable={false}
        dismissableBackButton={false}>
        <Dialog.Content>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}>
            <View style={{ marginRight: 15 }}>
              <ActivityIndicator animating color={MD2Colors.blueA400} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, flexWrap: 'wrap', width: '100%' }}>
                {fileManager.longOperation?.message}
              </Text>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <Button
                disabled={!fileManager.longOperation}
                onPress={async () => {
                  hideDialog();
                }}>
                {t('hide')}
              </Button>
            </View>
          </View>
        </Dialog.Content>
      </Dialog>
    </Portal>
  );
};

export default LongOperationDialog;
