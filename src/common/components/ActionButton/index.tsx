import React from 'react';
import { StyleProp, TextStyle, View } from 'react-native';
import { IconButton, IconButtonProps, Text } from 'react-native-paper';
import { theme } from '../../../theme';

const ActionButton: React.FC<
  IconButtonProps & { text: string; textStyle?: StyleProp<TextStyle> }
> = ({ text, style, textStyle, ...props }) => {
  return (
    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
      <IconButton {...props} style={{ marginBottom: -5 }} />
      <Text
        variant="labelSmall"
        style={[{ fontFamily: theme.regularText }, textStyle]}>
        {text}
      </Text>
    </View>
  );
};

export default ActionButton;
