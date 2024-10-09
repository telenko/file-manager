import React from 'react';
import { View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { DirItem } from '../../../services/FileApi';
import { NavigationProp } from '@react-navigation/native';
import { FileManagerNavigation } from '../../../common/types/navigation';

const SelectorAction: React.FC<{
  dirItems: DirItem[];
  navigation: NavigationProp<FileManagerNavigation>;
  selectedPaths: string[];
  setSelectedPaths: (v: string[]) => void;
}> = ({ dirItems, selectedPaths, setSelectedPaths }) => {
  const allSelected = selectedPaths.length === dirItems.length;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}>
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

export default SelectorAction;
