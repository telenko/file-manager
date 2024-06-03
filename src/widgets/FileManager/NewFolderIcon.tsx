import React from 'react';
import { IconButton } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { useNavigation } from '../../common/hooks/useNavigation';
import { theme } from '../../theme';

const NewFolderIcon = () => {
  const fileManager = useFileManager();
  const navigation = useNavigation();

  return (
    <IconButton
      onPress={() => fileManager.createDirectory(navigation)}
      size={theme.sizes.HEADER_ICON}
      style={{ height: theme.sizes.HEADER_ICON }}
      icon={'folder-plus'}
    />
  );
};

export default NewFolderIcon;
