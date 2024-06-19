import React from 'react';
import { useState } from 'react';
import { useFileTreeContext } from '../FileTreeContext';
import {
  Button,
  Icon,
  List,
  MD3Colors,
  Menu,
  ProgressBar,
  Text,
} from 'react-native-paper';
import { FileApi } from '../../../services/FileApi';
import { useFileManager } from '../../../widgets/FileManager';
import { useNavigation } from '../../../common/hooks/useNavigation';
import { TouchableOpacity, View } from 'react-native';
import { theme } from '../../../theme';

const StorageSelect: React.FC = () => {
  const fileScreen = useFileTreeContext();
  const fileManager = useFileManager();
  const [open, setOpen] = useState(false);
  const navigator = useNavigation();

  const matchingRoot =
    FileApi.ROOTS.find(r => fileScreen.route.includes(r.path)) ??
    FileApi.ROOTS[0];
  return (
    <Menu
      onDismiss={() => setOpen(false)}
      // style={{ width: '50%' }}
      contentStyle={{ backgroundColor: theme.selectionColor }}
      anchor={
        <TouchableOpacity
          style={{
            alignSelf: 'flex-start',
            borderRadius: theme.radiusPrimary,
            flexDirection: 'row',
            backgroundColor: theme.selectionColor,
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 10,
          }}
          onPress={() => setOpen(true)}>
          <View style={{ marginRight: 5 }}>
            <Icon
              size={20}
              source={matchingRoot.isMainDeviceStorage ? 'memory' : 'sd'}
            />
          </View>
          <Text>{matchingRoot?.name}</Text>
          <View style={{ marginLeft: 5 }}>
            <Icon size={15} source={'arrow-down'} />
          </View>
        </TouchableOpacity>
      }
      visible={open}>
      {FileApi.ROOTS.map(root => (
        <List.Item
          key={root.path}
          left={() => (
            <View
              style={{
                paddingLeft: 10,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon
                size={25}
                source={root.isMainDeviceStorage ? 'memory' : 'sd'}
              />
            </View>
          )}
          title={root.name}
          onPress={() => {
            if (root.path === matchingRoot.path) {
              setOpen(false);
              return;
            }
            fileManager.openDirectory(root, navigator);
          }}
          description={() => {
            const percentage = 1 - (root.freeSpace ?? 0) / (root.totalSpace ?? 0);
            const progressColor = (() => {
              if (percentage < 0.8) {
                return MD3Colors.primary50;
              }
              return MD3Colors.error50;
            })();
            return (
              <View>
                <Text>
                  {FileApi.formatSize(root.freeSpace!)} /{' '}
                  {FileApi.formatSize(root.totalSpace!)}
                </Text>
                <View style={{ marginTop: 5 }}>
                  <ProgressBar progress={percentage} color={progressColor} />
                </View>
              </View>
            );
          }}
        />
        // <Menu.Item
        //   key={root.path}
        //   leadingIcon={root.isMainDeviceStorage ? 'memory' : 'sd'}
        //   title={root.name}
        // onPress={() => {
        //   if (root.path === matchingRoot.path) {
        //     setOpen(false);
        //     return;
        //   }
        //   fileManager.openDirectory(root, navigator);
        // }}
        // />
      ))}
    </Menu>
  );
};

export default StorageSelect;
