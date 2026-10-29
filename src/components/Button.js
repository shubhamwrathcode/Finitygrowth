import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from './Icon';
import { colors, fonts } from '../theme';

/** Web --gold-grad: 135deg gold-hi → gold → gold-lo */
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];

/**
 * Button
 *  variant: 'primary' (gold gradient) | 'secondary' (dark) | 'outline' | 'ghost' | 'danger'
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
  const sizeStyle = sizes[size];
  const label = (
    loading ? (
      <ActivityIndicator color={v.text} />
    ) : (
      <View style={styles.inner}>
        {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 18} color={v.text} strokeWidth={2} /> : null}
        <Text style={[styles.label, { color: v.text, fontSize: size === 'sm' ? 12 : size === 'md' ? 13 : 15 }]}>{title}</Text>
      </View>
    )
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        variant !== 'primary' && { backgroundColor: v.bg, borderColor: v.border },
        variant === 'primary' && styles.primaryWrap,
        pressed && { opacity: 0.85 },
        isDisabled && { opacity: 0.5 },
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={GOLD_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradFill,
            { borderRadius: sizeStyle.borderRadius, paddingHorizontal: sizeStyle.paddingHorizontal },
          ]}>
          {label}
        </LinearGradient>
      ) : (
        label
      )}
    </Pressable>
  );
}

const variants = {
  primary: { bg: colors.gold, text: colors.goldInk, border: 'transparent' },
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
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  primaryWrap: { borderColor: 'transparent', paddingHorizontal: 0 },
  gradFill: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.semibold },
});
