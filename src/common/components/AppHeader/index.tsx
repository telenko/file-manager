import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';
import { IconButton } from 'react-native-paper';
import { NativeStackHeaderProps } from '@react-navigation/native-stack';

const AppHeader = ({
  navigation,
  route,
  options,
  back,
}: NativeStackHeaderProps) => {
  const title =
    options.headerTitle !== undefined
      ? options.headerTitle
      : options.title !== undefined
      ? options.title
      : route.name;

  return (
    <View style={styles.headerContainer}>
      {back ? (
        <IconButton onPress={navigation.goBack} icon={'arrow-left'} size={24} />
      ) : null}
      <Text style={[styles.headerTitle, options.headerTitleStyle]}>
        {title as string}
      </Text>
      {options.headerRight ? (
        // @ts-ignore
        <View style={styles.rightContainer}>{options.headerRight()}</View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 0,
    paddingHorizontal: 5,
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: theme.sizes.HEADER_TITLE_FONT,
    fontFamily: theme.regularText,
    color: theme.fileTitleColor,
    flex: 1,
  },
  rightContainer: {
    padding: 8,
  },
});

export default AppHeader;
