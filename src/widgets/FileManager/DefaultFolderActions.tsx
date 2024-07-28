import React from 'react';
import { View } from 'react-native';
import SortButton from './SortButton';
import NewFolderIcon from './NewFolderIcon';

const DefaultFolderActions = (props: { folderHasFiles?: boolean }) => {
  return (
    <View style={{ flexDirection: 'row' }}>
      {!!props.folderHasFiles ? <SortButton /> : null}
      <NewFolderIcon />
    </View>
  );
};

export default DefaultFolderActions;
