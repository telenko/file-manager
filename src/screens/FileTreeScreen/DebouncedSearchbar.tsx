import React, { useState, useEffect } from 'react';
import { Searchbar } from 'react-native-paper'; // Або звідки ти імпортуєш Searchbar
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setSearchQuery } from '../../store/fileTreeSlice';

interface DebouncedSearchbarProps {
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  iconColor?: string;
  placeholderTextColor?: string;
}

export const DebouncedSearchbar: React.FC<DebouncedSearchbarProps> = ({
  placeholder = 'Search files...',
  style,
  inputStyle,
  iconColor = '#6200ee',
  placeholderTextColor = '#888',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const globalSearchQuery = useSelector(
    (state: RootState) => state.fileTree.searchQuery || '',
  );

  // Локальний стейт для миттєвого відображення вводу без лагів
  const [localQuery, setLocalQuery] = useState(globalSearchQuery);

  // Синхронізуємо локальний стейт, якщо globalSearchQuery змінився ззовні
  useEffect(() => {
    if (globalSearchQuery !== localQuery) {
      setLocalQuery(globalSearchQuery);
    }
  }, [globalSearchQuery]);

  const handleChangeText = (query: string) => {
    setLocalQuery(query); // Миттєво оновлюємо UI
    dispatch(setSearchQuery(query)); // Оновлюємо Redux (наш хук з дебаунсом підхопить це)
  };

  const handleClear = () => {
    setLocalQuery('');
    dispatch(setSearchQuery(''));
  };

  return (
    <Searchbar
      placeholder={placeholder}
      value={localQuery}
      onChangeText={handleChangeText}
      onClearIconPress={handleClear}
      style={style}
      inputStyle={inputStyle}
      iconColor={iconColor}
      placeholderTextColor={placeholderTextColor}
    />
  );
};
