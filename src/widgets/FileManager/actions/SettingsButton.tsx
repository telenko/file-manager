import React from 'react';
import { useFileManager } from '../FileManagerContext';
import { IconButton } from 'react-native-paper';
import { theme } from '../../../theme';

const SettingsButton: React.FC = () => {
  const fileManager = useFileManager();

  return (
    <IconButton
      onPress={() => fileManager.setSettingsOpen(true)}
      size={theme.sizes.HEADER_ICON}
      style={{ height: theme.sizes.HEADER_ICON, marginLeft: -5 }}
      icon={'cog-outline'}
    />
  );
};

export default SettingsButton;
