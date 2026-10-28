import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fonts } from '../theme';

/**
 * Button
 *  variant: 'primary' (gold) | 'secondary' (dark) | 'outline' | 'ghost' | 'danger'
 *  size:    'lg' (54px) | 'md' (44px) | 'sm' (36px)
 *  icon:    optional Icon name shown before the label
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  style,
}) {
  const v = variants[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizes[size],
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 18} color={v.text} strokeWidth={2} /> : null}
          <Text style={[styles.label, { color: v.text, fontSize: size === 'sm' ? 12 : size === 'md' ? 13 : 15 }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const variants = {
  primary: { bg: colors.gold, text: colors.goldInk, border: colors.gold },
  secondary: { bg: colors.elevated, text: colors.text, border: colors.elevated },
  outline: { bg: 'transparent', text: colors.textSoft, border: colors.lineStrong },
  ghost: { bg: 'transparent', text: colors.gold, border: 'transparent' },
  danger: { bg: 'transparent', text: colors.danger, border: '#3A2A2A' },
};

const sizes = {
  lg: { height: 54, borderRadius: 27, paddingHorizontal: 22 },
  md: { height: 44, borderRadius: 22, paddingHorizontal: 18 },
  sm: { height: 36, borderRadius: 18, paddingHorizontal: 14 },
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.semibold },
});

