import React from 'react';
import { View } from 'react-native';
import SortButton from './SortButton';
import NewFolderIcon from './NewFolderIcon';
import LayoutButton from './LayoutButton';
import SettingsButton from './SettingsButton';

const DefaultFolderActions = (props: {
  folderHasFiles?: boolean;
  isOperational?: boolean;
}) => {
  return (
    <View style={{ flexDirection: 'row' }}>
      {!!props.folderHasFiles ? <SortButton /> : null}
      <LayoutButton />
      <NewFolderIcon />
      {!props.isOperational ? <SettingsButton /> : null}
    </View>
  );
};

export default DefaultFolderActions;
