import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ToggleButton } from 'react-native-paper';
import { useFileManager } from './FileManagerContext';
import { theme } from '../../theme';

const LayoutButton = () => {
  const fileManager = useFileManager();

  return (
    <View
      style={{
        backgroundColor: theme.toggleBgColor,
        flexDirection: 'row',
        borderRadius: theme.radiusMedium,
      }}>
      <ToggleButton.Group
        onValueChange={v => {
          if (v && v !== fileManager.layout) {
            fileManager.setLayout(v);
          }
        }}
        value={fileManager.layout}>
        <ToggleButton
          size={theme.toggleBtnWidth}
          style={styles.btn}
          icon="view-list"
          value="list"
        />
        <ToggleButton
          size={theme.toggleBtnWidth}
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
    height: theme.toggleBtnHeight,
  },
});

export default LayoutButton;
