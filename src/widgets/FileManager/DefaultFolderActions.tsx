import React from 'react';
import { View } from 'react-native';
import SortButton from './SortButton';
import NewFolderIcon from './NewFolderIcon';
import LayoutButton from './LayoutButton';

const DefaultFolderActions = (props: { folderHasFiles?: boolean }) => {
  return (
    <View style={{ flexDirection: 'row' }}>
      {!!props.folderHasFiles ? <SortButton /> : null}
      <LayoutButton />
      <NewFolderIcon />
    </View>
  );
};

export default DefaultFolderActions;
