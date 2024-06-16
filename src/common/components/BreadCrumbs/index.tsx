import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Icon, MD3Colors, Menu } from 'react-native-paper';
import { theme } from '../../../theme';

export type BreadCrumbItem = {
  id: string;
  name: string;
  onPress?: (id: string) => void;
  menuItems?: (Omit<BreadCrumbItem, 'onPress'> & { onPress: () => void })[];
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
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {items.map((item, index) => {
        const hasMenu = !!item.menuItems && item.menuItems.length > 0;
        const isActive = index === items.length - 1;
        const chipLayout = (
          <Chip
            selected={isActive}
            mode="flat"
            onPress={() => {
              if (isActive) {
                if (hasMenu) {
                  setMenuOpen(true);
                }
                return;
              }
              item.onPress?.(item.id);
            }}
            onClose={hasMenu ? () => {} : undefined}
            closeIcon={hasMenu ? 'arrow-down' : undefined}
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
        );
        return (
          <View key={item.id} style={styles.itemContainer}>
            {hasMenu ? (
              <Menu
                visible={menuOpen}
                onDismiss={() => setMenuOpen(false)}
                anchor={chipLayout}>
                {item.menuItems?.map(item => (
                  <Menu.Item
                    key={item.id}
                    title={item.name}
                    onPress={() => {
                      setMenuOpen(false);
                      item.onPress();
                    }}
                  />
                ))}
              </Menu>
            ) : (
              chipLayout
            )}
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
    fontSize: 12,
    lineHeight: 14,
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
