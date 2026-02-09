import React, { use } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

type Props = {
  onGrantPermission: () => void;
  title: string;
  description: string;
};

const NoPermissionScreen: React.FC<Props> = ({
  onGrantPermission,
  title,
  description,
}) => {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Icon source="folder-lock" size={96} />
      <Text variant="headlineMedium" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.description}>
        {description}
      </Text>
      <Button
        mode="contained"
        icon="shield-check"
        onPress={onGrantPermission}
        style={styles.button}>
        {t('grantPermission')}
      </Button>
    </View>
  );
};

export default NoPermissionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  button: {
    marginTop: 8,
  },
});
