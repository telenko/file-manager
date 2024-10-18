import React from 'react';
import { useFileManager } from '../FileManagerContext';
import { IconButton } from 'react-native-paper';
import { theme } from '../../../theme';

const SortButton: React.FC = () => {
  const fileManager = useFileManager();
  return (
    <IconButton
      style={{ height: theme.sizes.HEADER_ICON }}
      icon={fileManager.sort === 'asc' ? 'sort-ascending' : 'sort-descending'}
      onPress={fileManager.toggleSort}
    />
  );
};

export default SortButton;
