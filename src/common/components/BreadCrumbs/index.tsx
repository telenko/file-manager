import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Icon, MD3Colors } from 'react-native-paper';

export type BreadCrumbItem = {
  id: string;
  name: string;
  onPress?: (id: string) => void;
};

type BreadCrumbsProps = {
  items: BreadCrumbItem[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ items }) => {
  return (
    <ScrollView horizontal contentContainerStyle={styles.container}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.itemContainer}>
          <Chip
            mode="flat"
            style={
              index === items.length - 1 ? styles.activeItem : styles.item
            }>
            {item.name}
          </Chip>
          {index >= 0 && index < items.length - 1 ? (
            <Icon size={20} source="chevron-right" />
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    backgroundColor: MD3Colors.neutral70,
  },
  activeItem: {
    backgroundColor: MD3Colors.neutral90,
  },
});

export default BreadCrumbs;
