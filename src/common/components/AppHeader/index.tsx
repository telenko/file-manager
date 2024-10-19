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
        <IconButton
          style={{ marginRight: -5 }}
          onPress={navigation.goBack}
          icon={'arrow-left'}
          size={24}
        />
      ) : null}
      {title ? (
        <Text style={[styles.headerTitle, options.headerTitleStyle]}>
          {title as string}
        </Text>
      ) : null}
      {options.headerLeft ? (
        // @ts-ignore
        <View style={styles.leftContainer}>{options.headerLeft()}</View>
      ) : null}

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
  // @TODO Andrii think on copy/move title
  headerTitle: {
    fontSize: theme.sizes.HEADER_TITLE_FONT,
    fontFamily: theme.regularText,
    color: theme.fileTitleColor,
    flex: 1,
    marginLeft: 10,
  },
  rightContainer: {
    padding: 8,
    paddingRight: 0,
  },
  leftContainer: {
    padding: 8,
    paddingLeft: 5,
    marginRight: 10,
    marginTop: 3,
  },
});

export default AppHeader;
