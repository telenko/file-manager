import React, { useEffect, useRef } from 'react';
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
      {items.map((item, index) => (
        <View key={item.id} style={styles.itemContainer}>
          <Chip
            selected={index === items.length - 1}
            mode="flat"
            onPress={() => item.onPress?.(item.id)}
            textStyle={styles.text}
            style={{
              ...(index === items.length - 1
                ? styles.activeItem
                : styles.inactiveItem),
              ...styles.item,
            }}>
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
    // width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    // flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
  },
  item: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  inactiveItem: {
    backgroundColor: MD3Colors.neutral80,
  },
  activeItem: {
    backgroundColor: MD3Colors.neutral90,
  },
});

export default BreadCrumbs;
