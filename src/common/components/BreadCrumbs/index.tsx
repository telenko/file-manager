import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Icon, MD3Colors } from 'react-native-paper';
import { theme } from '../../../theme';

export type BreadCrumbItem = {
  id: string;
  name: string;
  onPress?: (id: string) => void;
};

type BreadCrumbsProps = {
  items: BreadCrumbItem[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ items }) => {
  const scrollViewRef = useRef<any>(null);
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [items]);
  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {items.map((item, index) => {
        const isActive = index === items.length - 1;
        return (
          <View key={item.id} style={styles.itemContainer}>
            <Chip
              selected={isActive}
              mode="flat"
              onPress={() => {
                item.onPress?.(item.id);
              }}
              textStyle={{
                ...styles.text,
                fontFamily: isActive ? theme.mediumText : theme.regularText,
              }}
              style={{
                ...styles.item,
                ...(isActive ? styles.activeItem : styles.inactiveItem),
              }}>
              {item.name}
            </Chip>
            {index >= 0 && index < items.length - 1 ? (
              <Icon size={20} source="chevron-right" />
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    lineHeight: 14,
  },
  item: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  inactiveItem: {
    backgroundColor: theme.filePathColor,
  },
  activeItem: {
    backgroundColor: theme.filePathColor,
  },
});

export default BreadCrumbs;
