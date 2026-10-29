/**
 * Finitygrowth – app entry component.
 *
 * Wraps the whole app in:
 *   SafeAreaProvider → knows the notch/home-indicator sizes
 *   AuthProvider     → who is signed in (src/context/AuthContext.js)
 *   RootNavigator    → all screens (src/navigation/RootNavigator.js)
 *   SplashScreen     → Lottie splash until animation + auth hydration finish
 */
import React, { useCallback, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/components/SplashScreen';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

function AppContent() {
  const { hydrated } = useAuth();
  const [animDone, setAnimDone] = useState(false);
  const onSplashFinish = useCallback(() => setAnimDone(true), []);
  const ready = hydrated && animDone;

  return (
    <View style={styles.root}>
      {hydrated ? <RootNavigator /> : <View style={styles.root} />}
      {!ready ? <SplashScreen onFinish={onSplashFinish} /> : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
