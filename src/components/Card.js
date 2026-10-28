import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

/**
 * Card – a dark rounded surface. Pass onPress to make it tappable.
 *  tone: 'default' | 'gold' (filled gold) | 'outlineGold' | 'dashed'
 */
export default function Card({ children, style, onPress, tone = 'default', padding = 16 }) {
  const toneStyle = tones[tone];
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.base, { padding }, toneStyle, pressed && styles.pressed, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.base, { padding }, toneStyle, style]}>{children}</View>;
}

const tones = {
  default: { backgroundColor: colors.surface },
  gold: { backgroundColor: colors.gold },
  outlineGold: { backgroundColor: '#15130E', borderWidth: 1, borderColor: colors.goldLine },
  dashed: { backgroundColor: 'transparent', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong },
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg },
  pressed: { opacity: 0.85 },
});
