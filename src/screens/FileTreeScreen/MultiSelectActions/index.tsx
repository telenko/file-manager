import React, { useMemo, useState } from 'react';
import { useFileManager } from '../../../widgets/FileManager';
import { View } from 'react-native';
import { Menu } from 'react-native-paper';
import { DirItem, FileApi } from '../../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../../common/types/navigation';
import ActionButton from '../../../common/components/ActionButton';
import { useTranslation } from 'react-i18next';
import { useExceptionHandler } from '../../../common/components/ExceptionHandler';

const ICON_STYLE = {
  marginRight: 0,
  marginLeft: 0,
};

const MultiSelectActions: React.FC<{
  dirItems: DirItem[];
  navigation: NavigationProp<FileManagerNavigation>;
  selectedPaths: string[];
  setSelectedPaths: (v: string[]) => void;
}> = ({ dirItems, navigation, selectedPaths, setSelectedPaths }) => {
  const fileManager = useFileManager();
  const dirItemsForOperations = dirItems.filter(dirItem => {
    return selectedPaths.includes(dirItem.path);
  });
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const exceptionHandler = useExceptionHandler();

  const menuItems = useMemo(() => {
    if (dirItemsForOperations.length !== 1) {
      return [];
    }
    const item = dirItemsForOperations[0];
    return [
      {
        title: t('openWith'),
        icon: 'open-in-app',
        key: 'openWith',
        enabled: item.isFile(),
        onPress: () => {
          FileApi.openFile(item).catch(exceptionHandler.handleError);
        },
      },
      {
        title: t('rename'),
        icon: 'form-textbox',
        key: 'rename',
        enabled: true,
        onPress: () => {
          fileManager.renameContent(item);
        },
      },
      {
        title: t('details'),
        key: 'details',
        icon: 'information-outline',
        enabled: true,
        onPress: () => {
          fileManager.showFileDetails(item);
        },
      },
    ]
      .filter(menuItem => menuItem.enabled)
      .map(menuItem => ({
        ...menuItem,
        onPress: async () => {
          setMenuOpen(false);
          await new Promise<void>(r => setTimeout(r, 200));
          menuItem.onPress();
        },
      }));
  }, [dirItemsForOperations]);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}>
      <ActionButton
        text={t('share')}
        icon={'share-outline'}
        disabled={dirItemsForOperations.some(dirItem => dirItem.isDirectory())}
        style={ICON_STYLE}
        onPress={() => {
          FileApi.shareFile(dirItemsForOperations);
        }}
      />
      <ActionButton
        text={t('delete')}
        icon={'delete-outline'}
        style={ICON_STYLE}
        onPress={() => {
          fileManager.deleteContent(dirItemsForOperations).then(isDone => {
            if (isDone) {
              fileManager.setReloadRequired(true);
              setSelectedPaths(
                selectedPaths.filter(selectedPath =>
                  dirItemsForOperations.map(d => d.path).includes(selectedPath),
                ),
              );
            }
          });
        }}
      />
      <ActionButton
        text={t('copy')}
        icon={'content-copy'}
        style={ICON_STYLE}
        onPress={() => {
          fileManager.copyContent(dirItemsForOperations, navigation);
        }}
      />
      <ActionButton
        text={t('move')}
        icon={'file-move-outline'}
        style={ICON_STYLE}
        onPress={() => {
          fileManager.moveContent(dirItemsForOperations, navigation);
        }}
      />
      <Menu
        anchor={
          <ActionButton
            text={t('more')}
            icon={'dots-vertical'}
            disabled={dirItemsForOperations.length !== 1}
            style={ICON_STYLE}
            onPress={() => {
              setMenuOpen(true);
            }}
          />
        }
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}>
        {menuItems.map(menuItem => (
          <Menu.Item
            {...menuItem}
            key={menuItem.key}
            leadingIcon={menuItem.icon}
          />
        ))}
      </Menu>
    </View>
  );
};

export default MultiSelectActions;
