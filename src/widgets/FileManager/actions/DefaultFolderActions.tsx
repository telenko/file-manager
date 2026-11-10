import React from 'react';
import { View } from 'react-native';
import SortButton from './SortButton';
import NewFolderIcon from './NewFolderIcon';
import LayoutButton from './LayoutButton';
import SettingsButton from './SettingsButton';
import { FileTreeState } from '../../../store/fileTreeSlice';

const DefaultFolderActions = (props: {
  folderHasFiles?: boolean;
  isOperational?: boolean;
  source?: FileTreeState['source'];
}) => {
  const isSourceSearch = props.source === 'search';
  return (
    <View style={{ flexDirection: 'row' }}>
      {!!props.folderHasFiles && !isSourceSearch ? <SortButton /> : null}
      <LayoutButton />
      {!isSourceSearch ? <NewFolderIcon /> : null}
      {!props.isOperational ? <SettingsButton /> : null}
    </View>
  );
};

export default DefaultFolderActions;
