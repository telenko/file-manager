import React from 'react';
import { StyleSheet } from 'react-native';
import { ToggleButton } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';

const LayoutButton = () => {
  const fileManager = useFileManager();

  return (
    <ToggleButton.Group
      onValueChange={fileManager.setLayout}
      value={fileManager.layout}>
      <ToggleButton
        size={20}
        style={styles.btn}
        icon="view-list"
        value="list"
      />
      <ToggleButton
        size={20}
        style={styles.btn}
        icon="view-grid"
        value="grid"
      />
    </ToggleButton.Group>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 37,
  },
});

export default LayoutButton;
