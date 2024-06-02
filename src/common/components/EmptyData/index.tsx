import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { theme } from '../../../theme';

const EmptyData = ({ message }: { message: string }) => {
  return (
    <View
      style={{
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
      }}>
      <Icon size={theme.sizes.NO_DATA_ICON} color={theme.fileDescriptionColor} source={'cancel'} />
      <Text style={{ fontFamily: theme.regularText }}>{message}</Text>
    </View>
  );
};

export default EmptyData;
