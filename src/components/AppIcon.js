import React from 'react';
import { Image } from 'react-native';

/**
 * AppIcon – Finitygrowth app mark (PNG from finitygrowth-app-icon.svg).
 */
export default function AppIcon({ size = 72, style }) {
  return (
    <Image
      source={require('../../assets/images/finitygrowth-app-icon.png')}
      style={[{ width: size, height: size, borderRadius: size * 0.22 }, style]}
      accessibilityLabel="Finitygrowth"
    />
  );
}
