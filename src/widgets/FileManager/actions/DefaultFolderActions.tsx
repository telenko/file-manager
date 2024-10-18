import React from 'react';
import { View } from 'react-native';
import SortButton from './SortButton';
import NewFolderIcon from './NewFolderIcon';
import LayoutButton from './LayoutButton';
import SettingsButton from './SettingsButton';

const DefaultFolderActions = (props: { folderHasFiles?: boolean }) => {
  return (
    <View style={{ flexDirection: 'row' }}>
      {!!props.folderHasFiles ? <SortButton /> : null}
      <LayoutButton />
      <NewFolderIcon />
      <SettingsButton />
    </View>
  );
};

export default DefaultFolderActions;
