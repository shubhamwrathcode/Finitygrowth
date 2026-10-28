import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icon';
import { colors, fonts, spacing } from '../theme';

/**
 * AuthSelect – dropdown that matches AuthField underline look (web <select>).
 * options: [{ label, value }] or string[]
 */
export default function AuthSelect({
  label,
  placeholder = 'Select…',
  value,
  options = [],
  onChange,
  onBlur,
  error,
  style,
  searchable = true,
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const hasError = Boolean(error);

  const normalized = useMemo(
    () =>
      options.map(item =>
        typeof item === 'string' ? { label: item, value: item } : item,
      ),
    [options],
  );

  const selected = normalized.find(o => o.value === value);
  const display = selected?.label || '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(o => o.label.toLowerCase().includes(q));
  }, [normalized, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const pick = item => {
    onChange?.(item.value);
    close();
  };

  return (
    <View style={style}>
      {label ? (
        <Text style={[styles.label, hasError && styles.labelError]}>{label}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
        onPress={() => setOpen(true)}
        style={[styles.box, hasError && styles.boxError]}>
        <Text
          style={[styles.value, !display && styles.placeholder]}
          numberOfLines={2}>
          {display || placeholder}
        </Text>
        <Icon name="chevronDown" size={18} color={colors.muted} strokeWidth={2} />
      </Pressable>

      {hasError ? (
        <View style={styles.errorRow}>
          <Icon name="info" size={13} color={colors.danger} strokeWidth={2} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>{label || 'Select'}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityRole="button">
                <Text style={styles.done}>Done</Text>
              </Pressable>
            </View>

            {/* {searchable ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={colors.placeholder}
                autoCorrect={false}
                style={styles.search}
              />
            ) : null} */}

            <FlatList
              data={filtered}
              keyExtractor={item => String(item.value)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const on = item.value === value;
                return (
                  <Pressable
                    onPress={() => pick(item)}
                    style={[styles.option, on && styles.optionOn]}>
                    <Text style={[styles.optionText, on && styles.optionTextOn]}>
                      {item.label}
                    </Text>
                    {on ? <Icon name="check" size={16} color={colors.gold} strokeWidth={2.5} /> : null}
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginBottom: 6 },
  labelError: { color: colors.danger, fontFamily: fonts.medium },
  box: {
    minHeight: 48,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.lineStrong,
    gap: 8,
  },
  boxError: {
    borderBottomColor: colors.danger,
    borderBottomWidth: 2,
  },
  value: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  placeholder: { color: colors.placeholder },
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen,
    marginBottom: 10,
  },
  sheetTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.text,
  },
  done: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.gold,
  },
  search: {
    marginHorizontal: spacing.screen,
    marginBottom: 8,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  option: {
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: spacing.screen,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionOn: {
    backgroundColor: colors.goldSoft,
  },
  optionText: {
    flex: 1,
    flexShrink: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSoft,
  },
  optionTextOn: {
    color: colors.text,
    fontFamily: fonts.medium,
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
});
