import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Dialog,
  MD2Colors,
  Portal,
  Text,
} from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { useTranslation } from 'react-i18next';
import { useBackAction } from '../../common/hooks/useBackAction';
import { View } from 'react-native';

const STARTUP_DELAY_MS = 3000;

const LongOperationDialog: React.FC = () => {
  const fileManager = useFileManager();
  const [dialogActive, setDialogActive] = useState(false);

  const backHandle = useCallback(() => {
    if (fileManager.longOperation) {
      return true;
    }
    return false;
  }, [fileManager.longOperation]);
  useBackAction(backHandle);

  useEffect(() => {
    if (!fileManager.longOperation) {
      setDialogActive(false);
      return;
    }
    const timer = setTimeout(() => {
      setDialogActive(true);
    }, STARTUP_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [fileManager.longOperation]);

  const { t } = useTranslation();

  if (!dialogActive) {
    return null;
  }
  const hideDialog = () => {
    fileManager.setLongOperation(null);
  };
  return (
    <Portal>
      <Dialog
        visible={!!dialogActive || fileManager.longOperation}
        dismissable={false}
        dismissableBackButton={false}>
        <Dialog.Title>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}>
            <View style={{ marginRight: 10 }}>
              <ActivityIndicator animating color={MD2Colors.blueA400} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16 }}>{fileManager.longOperation}</Text>
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
        </Dialog.Title>
      </Dialog>
    </Portal>
  );
};

export default LongOperationDialog;
