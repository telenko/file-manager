import React from 'react';
import { View } from 'react-native';
import { Checkbox, IconButton } from 'react-native-paper';
import { DirItem } from '../../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../../common/types/navigation';
import { useFileManager } from '../../../widgets/FileManager';

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
      {fileManager.layout === 'list' ? (
        <Checkbox
          onPress={() => {
            if (allSelected) {
              setSelectedPaths([]);
            } else {
              setSelectedPaths(dirItems.map(dirIt => dirIt.path));
            }
          }}
          status={allSelected ? 'checked' : 'indeterminate'}
        />
      ) : null}
      {fileManager.layout === 'grid' ? (
        <IconButton
          icon="checkbox-multiple-marked-circle"
          onPress={() => {
            if (allSelected) {
              setSelectedPaths([]);
            } else {
              setSelectedPaths(dirItems.map(dirIt => dirIt.path));
            }
          }}
          size={27}
          // @TODO Andrii theme
          iconColor={allSelected ? 'rgb(52,116,235)' : 'grey'}
        />
      ) : null}
    </View>
  );
};

export default SelectorAction;
