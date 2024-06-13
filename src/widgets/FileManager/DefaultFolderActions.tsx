import React from 'react';
import { View } from 'react-native';
import SortButton from './SortButton';
import NewFolderIcon from './NewFolderIcon';

const DefaultFolderActions = () => {
  return (
    <View style={{ flexDirection: 'row' }}>
      <SortButton />
      <NewFolderIcon />
    </View>
  );
};

export default DefaultFolderActions;
