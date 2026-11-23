import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Badge,
  Button,
  Chip,
  Dialog,
  IconButton,
  Portal,
  Searchbar,
  Text,
} from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import {
  MediaType,
  setSearchQuery,
  setSelectedMediaTypes,
} from '../../store/fileTreeSlice';
import { ScrollView, StyleSheet, View } from 'react-native';
import { theme } from '../../theme';

interface DebouncedSearchbarProps {
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  iconColor?: string;
  placeholderTextColor?: string;
}

const MEDIA_TYPES_STORAGE_KEY = '__selected_media_types__';
const MEDIA_TYPE_VALUES: MediaType[] = [
  'IMAGE',
  'VIDEO',
  'MUSIC',
  'TEXT',
  'OTHER',
];
const MEDIA_TYPE_VALUE_SET: ReadonlySet<string> = new Set(MEDIA_TYPE_VALUES);

const filterMediaTypes: {
  labelKey: string;
  icon: string;
  value: MediaType;
}[] = [
  { labelKey: 'mediaTypeImages', icon: 'image-outline', value: 'IMAGE' },
  { labelKey: 'mediaTypeVideos', icon: 'movie-outline', value: 'VIDEO' },
  { labelKey: 'mediaTypeMusic', icon: 'music-note', value: 'MUSIC' },
  {
    labelKey: 'mediaTypeText',
    icon: 'file-document-outline',
    value: 'TEXT',
  },
  { labelKey: 'mediaTypeOther', icon: 'file-outline', value: 'OTHER' },
];

export const DebouncedSearchbar: React.FC<DebouncedSearchbarProps> = ({
  placeholder = 'Search files...',
  style,
  inputStyle,
  iconColor = "#2020f6",
  placeholderTextColor = '#888',
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const globalSearchQuery = useSelector(
    (state: RootState) => state.fileTree.searchQuery || '',
  );
  const selectedMediaTypes = useSelector(
    (state: RootState) => state.fileTree.selectedMediaTypes || [],
  );
  const [mediaFilterOpened, setMediaFilterOpened] = useState(false);
  const [mediaTypesStorageReady, setMediaTypesStorageReady] = useState(false);
  const [draftMediaTypes, setDraftMediaTypes] = useState<MediaType[]>([]);
  const searchQueryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedMediaTypeCount = filterMediaTypes.filter(item =>
    selectedMediaTypes.includes(item.value),
  ).length;

  // Локальний стейт для миттєвого відображення вводу без лагів
  const [localQuery, setLocalQuery] = useState(globalSearchQuery);

  useEffect(() => {
    let isMounted = true;

    const loadMediaTypes = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(
          MEDIA_TYPES_STORAGE_KEY,
        );
        if (!isMounted) {
          return;
        }

        if (storedValue !== null) {
          const parsedValue: unknown = JSON.parse(storedValue);
          if (!Array.isArray(parsedValue)) {
            throw new Error('Stored media filters must be an array');
          }
          const storedMediaTypes = parsedValue.filter(
            (value): value is MediaType =>
              typeof value === 'string' && MEDIA_TYPE_VALUE_SET.has(value),
          );
          dispatch(setSelectedMediaTypes(storedMediaTypes));
        }
      } catch (error) {
        console.error('Failed to load media type filters', error);
      } finally {
        if (isMounted) {
          setMediaTypesStorageReady(true);
        }
      }
    };

    void loadMediaTypes();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!mediaTypesStorageReady) {
      return;
    }

    AsyncStorage.setItem(
      MEDIA_TYPES_STORAGE_KEY,
      JSON.stringify(selectedMediaTypes),
    ).catch(error => {
      console.error('Failed to save media type filters', error);
    });
  }, [mediaTypesStorageReady, selectedMediaTypes]);

  useEffect(
    () => () => {
      if (searchQueryTimeout.current !== null) {
        clearTimeout(searchQueryTimeout.current);
      }
    },
    [],
  );

  const handleChangeText = (query: string) => {
    setLocalQuery(query); // Миттєво оновлюємо UI
    if (searchQueryTimeout.current !== null) {
      clearTimeout(searchQueryTimeout.current);
    }
    searchQueryTimeout.current = setTimeout(() => {
      dispatch(setSearchQuery(query));
      searchQueryTimeout.current = null;
    }, 100);
  };

  const clearSearchQuery = () => {
    if (searchQueryTimeout.current !== null) {
      clearTimeout(searchQueryTimeout.current);
      searchQueryTimeout.current = null;
    }
    setLocalQuery('');
    dispatch(setSearchQuery(''));
  };

  const openMediaFilter = () => {
    setDraftMediaTypes([...selectedMediaTypes]);
    setMediaFilterOpened(true);
  };

  const toggleDraftMediaType = (mediaType: MediaType) => {
    setDraftMediaTypes(current =>
      current.includes(mediaType)
        ? current.filter(type => type !== mediaType)
        : [...current, mediaType],
    );
  };

  const applyMediaFilter = () => {
    dispatch(setSelectedMediaTypes(draftMediaTypes));
    setMediaFilterOpened(false);
  };

  return (
    <>
      <Searchbar
        placeholder={placeholder}
        value={localQuery}
        onChangeText={handleChangeText}
        style={style}
        inputStyle={inputStyle}
        iconColor={iconColor}
        placeholderTextColor={placeholderTextColor}
        mode="bar"
        right={() => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {localQuery.length > 0 && (
              <IconButton
                icon="close"
                size={20}
                accessibilityLabel={t('clearSearch')}
                onPress={clearSearchQuery}
              />
            )}
            <View style={styles.filterAnchor}>
              <IconButton
                icon="filter"
                size={20}
                disabled={!mediaTypesStorageReady}
                onPress={openMediaFilter}
              />
              {selectedMediaTypeCount < filterMediaTypes.length && (
                <View
                  pointerEvents="none"
                  style={styles.filterBadgeContainer}>
                  <Badge style={styles.filterBadge}>
                    {selectedMediaTypeCount}
                  </Badge>
                </View>
              )}
            </View>
          </View>
        )}
      />
      <Portal>
        <Dialog
          visible={mediaFilterOpened}
          onDismiss={() => setMediaFilterOpened(false)}
          style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <View style={styles.dialogHeading}>
              <Text variant="titleLarge" style={styles.dialogTitle}>
                {t('mediaFilterTitle')}
              </Text>
              <Text variant="bodyMedium" style={styles.dialogDescription}>
                {t('mediaFilterDescription')}
              </Text>
            </View>
            <Button
              compact
              onPress={() => setDraftMediaTypes([])}
              textColor={theme.selectionColor}>
              {t('mediaFilterReset')}
            </Button>
          </View>
          <Dialog.Content>
            <ScrollView
              style={styles.chipScroll}
              contentContainerStyle={styles.chipContainer}
              showsVerticalScrollIndicator={false}>
              <Chip
                mode="outlined"
                icon={
                  draftMediaTypes.length === filterMediaTypes.length
                    ? 'check'
                    : 'select-all'
                }
                selected={draftMediaTypes.length === filterMediaTypes.length}
                style={[
                  styles.filterChip,
                  draftMediaTypes.length === filterMediaTypes.length &&
                    styles.selectedFilterChip,
                ]}
                onPress={() => setDraftMediaTypes([...MEDIA_TYPE_VALUES])}>
                {t('mediaFilterAllFiles')}
              </Chip>
              {filterMediaTypes.map(item => {
                const isSelected = draftMediaTypes.includes(item.value);
                return (
                  <Chip
                    key={item.value}
                    mode="outlined"
                    icon={isSelected ? 'check' : item.icon}
                    selected={isSelected}
                    style={[
                      styles.filterChip,
                      isSelected && styles.selectedFilterChip,
                    ]}
                    onPress={() => toggleDraftMediaType(item.value)}>
                    {t(item.labelKey)}
                  </Chip>
                );
              })}
            </ScrollView>
            <View style={styles.selectionSummary}>
              <IconButton
                icon="information-outline"
                size={20}
                iconColor={theme.selectionColor}
                style={styles.summaryIcon}
              />
              <Text variant="bodyMedium" style={styles.summaryText}>
                {t('mediaFilterSelectionSummary', {
                  selected: draftMediaTypes.length,
                  total: filterMediaTypes.length,
                })}
              </Text>
            </View>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setMediaFilterOpened(false)}>
              {t('cancel')}
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.selectionColor}
              onPress={applyMediaFilter}>
              {t('mediaFilterApply')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: '#f8f9fc',
    borderRadius: 24,
    marginHorizontal: 20,
  },
  dialogHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  dialogHeading: {
    flex: 1,
  },
  dialogTitle: {
    color: '#202431',
    fontWeight: '700',
  },
  dialogDescription: {
    color: '#5d6472',
    marginTop: 4,
  },
  chipScroll: {
    maxHeight: 300,
  },
  chipContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 4,
  },
  filterChip: {
    marginBottom: 8,
    marginRight: 8,
  },
  selectedFilterChip: {
    backgroundColor: '#e3edff',
    borderColor: theme.selectionColor,
  },
  selectionSummary: {
    alignItems: 'center',
    backgroundColor: '#edf2fb',
    borderRadius: 16,
    flexDirection: 'row',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  summaryIcon: {
    margin: 0,
  },
  summaryText: {
    color: '#414958',
    flex: 1,
  },
  dialogActions: {
    borderTopColor: '#e2e6ee',
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filterAnchor: {
    position: 'relative',
    marginLeft: -15,
  },
  filterBadgeContainer: {
    position: 'absolute',
    right: 4,
    top: 4,
    zIndex: 1,
  },
  filterBadge: {
    backgroundColor: '#3474eb',
    color: '#fff',
  },
});
