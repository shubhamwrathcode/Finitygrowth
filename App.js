/**
 * Finitygrowth – app entry component.
 *
 * Wraps the whole app in:
 *   SafeAreaProvider → knows the notch/home-indicator sizes
 *   AuthProvider     → who is signed in (src/context/AuthContext.js)
 *   RootNavigator    → all screens (src/navigation/RootNavigator.js)
 */
import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
