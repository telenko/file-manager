import React from 'react';
import { View } from 'react-native';
import { IconButton, IconButtonProps, Text } from 'react-native-paper';
import { theme } from '../../../theme';

const ActionButton: React.FC<IconButtonProps & { text: string }> = ({
  text,
  style,
  ...props
}) => {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <IconButton {...props} style={{ marginBottom: -5 }} />
      <Text variant="labelSmall" style={{ fontFamily: theme.regularText }}>
        {text}
      </Text>
    </View>
  );
};

export default ActionButton;
