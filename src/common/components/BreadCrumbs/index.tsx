import React from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Icon, MD3Colors } from 'react-native-paper';

export type BreadCrumbItem = {
  id: string;
  name: string;
  needTranslate?: boolean;
  onPress?: (id: string) => void;
};

type BreadCrumbsProps = {
  items: BreadCrumbItem[];
};

const BreadCrumbs: React.FC<BreadCrumbsProps> = ({ items }) => {
  const { t } = useTranslation();
  return (
    <ScrollView horizontal contentContainerStyle={styles.container}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.itemContainer}>
          <Chip
            selected={index === items.length - 1}
            mode="flat"
            onPress={() => item.onPress?.(item.id)}
            style={
              index === items.length - 1 ? styles.activeItem : styles.item
            }>
            {item.needTranslate ? t(item.name) : item.name}
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
    backgroundColor: MD3Colors.neutral80,
  },
  activeItem: {
    backgroundColor: MD3Colors.neutral90,
  },
});

export default BreadCrumbs;
