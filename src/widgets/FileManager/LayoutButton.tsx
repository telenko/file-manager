import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ToggleButton } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';

const LayoutButton = () => {
  const fileManager = useFileManager();

  // @TODO Andrii move to theme
  return (
    <View
      style={{
        backgroundColor: 'rgba(150, 150, 250, 0.1)',
        flexDirection: 'row',
        borderRadius: 4,
      }}>
      <ToggleButton.Group
        onValueChange={v => {
          if (v && v !== fileManager.layout) {
            fileManager.setLayout(v);
          }
        }}
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
    </View>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: 37,
  },
});

export default LayoutButton;
