import React from 'react';
import { useFileManager } from '../../../widgets/FileManager';
import { View } from 'react-native';
import { Checkbox, IconButton } from 'react-native-paper';
import { DirItem } from '../../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../../common/types/navigation';

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
  const allSelected = selectedPaths.length === dirItems.length;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}>
      <IconButton
        icon={'delete-outline'}
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
      <IconButton
        icon={'content-copy'}
        onPress={() => {
          fileManager.copyContent(dirItemsForOperations, navigation);
        }}
      />
      <IconButton
        icon={'file-move-outline'}
        onPress={() => {
          fileManager.moveContent(dirItemsForOperations, navigation);
        }}
      />
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
    </View>
  );
};

export default MultiSelectActions;
