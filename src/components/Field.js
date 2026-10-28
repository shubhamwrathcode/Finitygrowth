import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from './Icon';
import { useKeyboardScroll } from './KeyboardScroll';
import { colors, fonts, radius } from '../theme';

/**
 * Field – labelled text input.
 *  variant 'filled' (default) | 'underline' (Login screen look)
 *  secure → password field with show/hide eye button
 *  right  → element inside the field on the right (e.g. 'USDT')
 *  hint / error → small text below
 */
export default function Field({
  label,
  hint,
  error,
  secure = false,
  right,
  variant = 'filled',
  style,
  inputStyle,
  labelRight,
  ...inputProps
}) {
  const wrapRef = useRef(null);
  const ensureVisible = useKeyboardScroll();
  const [hidden, setHidden] = useState(secure);
  const [focused, setFocused] = useState(false);
  const underline = variant === 'underline';
  const hasError = Boolean(error);

  return (
    <View ref={wrapRef} style={style} collapsable={false}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
          {labelRight}
        </View>
      ) : null}
      <View
        style={[
          styles.box,
          underline ? styles.underline : styles.filled,
          focused && !hasError && (underline ? styles.underlineFocus : styles.filledFocus),
          hasError && (underline ? styles.underlineError : styles.filledError),
        ]}>
        <TextInput
          placeholderTextColor={colors.placeholder}
          selectionColor={hasError ? colors.danger : colors.gold}
          secureTextEntry={hidden}
          style={[styles.input, inputStyle]}
          {...inputProps}
          onFocus={e => {
            setFocused(true);
            ensureVisible?.(wrapRef.current);
            inputProps.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden(h => !h)}
            hitSlop={10}
            style={styles.eye}>
            <Icon name={hidden ? 'eye' : 'eyeOff'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
        {right}
      </View>
      {hasError ? (
        <View style={styles.errorRow} accessibilityLiveRegion="polite">
          <Icon name="info" size={13} color={colors.danger} strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  labelError: { color: colors.danger, fontFamily: fonts.medium },
  box: { flexDirection: 'row', alignItems: 'center' },
  filled: {
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filledFocus: {
    borderColor: colors.goldLine,
    backgroundColor: colors.elevated,
  },
  filledError: {
    borderColor: 'rgba(242, 139, 130, 0.55)',
    backgroundColor: 'rgba(242, 139, 130, 0.08)',
  },
  underline: {
    height: 48,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.lineStrong,
  },
  underlineFocus: {
    borderBottomColor: colors.gold,
  },
  underlineError: {
    borderBottomColor: colors.danger,
    borderBottomWidth: 2,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 0 },
  eye: { paddingLeft: 10 },
  hint: { marginTop: 6, fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.danger,
  },
});
