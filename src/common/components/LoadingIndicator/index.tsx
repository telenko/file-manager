import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  ActivityIndicatorProps,
  MD2Colors,
} from 'react-native-paper';

const LoadingIndicator: React.FC<ActivityIndicatorProps> = props => {
  const [fadeIn] = useState(new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <View style={styles.loadingContainer}>
      <Animated.View style={{ opacity: fadeIn }}>
        <ActivityIndicator animating color={MD2Colors.blueA400} {...props} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingIndicator;
