import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Menu, TextInput, TouchableRipple } from 'react-native-paper';

// Описуємо enum/тип для контексту пошуку
export type SearchContext = 'VISUAL' | 'TEXT' | 'ALL';

interface SearchContextSelectProps {
  value: SearchContext;
  onSelect: (context: SearchContext) => void;
}

const CONTEXT_OPTIONS: { label: string; value: SearchContext; icon: string }[] = [
  { label: 'Візуальний (Visual)', value: 'VISUAL', icon: 'image' },
  { label: 'Текстовий (Text)', value: 'TEXT', icon: 'file-text' },
];

export const SearchContextSelect: React.FC<SearchContextSelectProps> = ({
  value,
  onSelect,
}) => {
  const [visible, setVisible] = useState(false);

  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);

  const selectedOption = CONTEXT_OPTIONS.find((opt) => opt.value === value);

  return (
    <View style={styles.container}>
      <Menu
        visible={visible}
        onDismiss={closeMenu}
        anchor={
          <TouchableRipple onPress={openMenu} rippleColor="rgba(0, 0, 0, .1)">
            <View pointerEvents="none">
              <TextInput
                label="Контекст пошуку"
                value={selectedOption?.label ?? ''}
                mode="outlined"
                right={<TextInput.Icon icon={visible ? 'chevron-up' : 'chevron-down'} />}
                editable={false}
              />
            </View>
          </TouchableRipple>
        }
      >
        {CONTEXT_OPTIONS.map((option) => (
          <Menu.Item
            key={option.value}
            onPress={() => {
              onSelect(option.value);
              closeMenu();
            }}
            title={option.label}
            leadingIcon={option.icon}
            trailingIcon={value === option.value ? 'check' : undefined}
          />
        ))}
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    flex: 1,
  },
});