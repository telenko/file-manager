import React from 'react';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { DirItem } from '../../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../../common/types/navigation';
import { useFileManager } from '../../../widgets/FileManager';
import { theme } from '../../../theme';

const SelectorAction: React.FC<{
  dirItems: DirItem[];
  navigation: NavigationProp<FileManagerNavigation>;
  selectedPaths: string[];
  setSelectedPaths: (v: string[]) => void;
}> = ({ dirItems, selectedPaths, setSelectedPaths }) => {
  const allSelected = selectedPaths.length === dirItems.length;
  const fileManager = useFileManager();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <IconButton
        icon="checkbox-multiple-marked-circle"
        onPress={() => {
          if (allSelected) {
            setSelectedPaths([]);
          } else {
            setSelectedPaths(dirItems.map(dirIt => dirIt.path));
          }
        }}
        style={{
          marginRight: -2,
        }}
        // +2 since icon is bigger
        size={theme.selectionIconSize + 2}
        iconColor={
          allSelected ? theme.selectionColor : theme.selectionNotCompleteColor
        }
      />
    </View>
  );
};

export default SelectorAction;
