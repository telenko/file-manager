import React, { useMemo } from 'react';
import { GroupHeaderItem } from './DataManager/LayoutItem';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import 'dayjs/locale/es';
import 'dayjs/locale/fr';
import 'dayjs/locale/it';
import 'dayjs/locale/nl';
import 'dayjs/locale/pl';
import 'dayjs/locale/pt';
import 'dayjs/locale/tr';
import 'dayjs/locale/uk';
import { useTranslation } from 'react-i18next';

export const HeaderItem = React.memo((item: GroupHeaderItem) => {
  const { i18n } = useTranslation();

  const locale = i18n.resolvedLanguage ?? i18n.language;

  const label = useMemo(() => {
    return dayjs(item.dateTimeMs)
      .locale(locale)
      .format('dddd, D MMMM YYYY')
      .replace(/^./u, firstCharacter =>
        firstCharacter.toLocaleUpperCase(locale),
      );
  }, [item.dateTimeMs, locale]);
  return (
    <View key={`group-header-${item.dateTimeMs}`} style={styles.groupHeader}>
      <Text style={styles.groupHeaderText}>{label}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  groupHeader: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  groupHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
});
