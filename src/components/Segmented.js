import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from '../theme';

/**
 * Segmented – one control, three looks, used for every tab/filter in the app.
 *   variant 'box'       → equal-width segments in a dark track (7D / 30D / 90D)
 *   variant 'pill'      → scrollable chips (statement filters)
 *   variant 'underline' → text tabs with a gold underline (Purchases, Support)
 *
 *   options: ['All', 'Income'] or [{ value: 'All', label: 'All 3' }]
 */
export default function Segmented({ options, value, onChange, variant = 'box', style }) {
  const items = options.map(o => (typeof o === 'string' ? { value: o, label: o } : o));

  if (variant === 'pill') {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pillRow, style]}>
        {items.map(o => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }

  if (variant === 'underline') {
    return (
      <View style={[styles.underRow, style]}>
        {items.map(o => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => onChange(o.value)}
              style={[styles.underTab, on && styles.underTabOn]}>
              <Text style={[styles.underText, on && styles.underTextOn]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.boxTrack, style]}>
      {items.map(o => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.boxItem, on && styles.boxItemOn]}>
            <Text style={[styles.boxText, on && styles.boxTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  boxTrack: { flexDirection: 'row', padding: 3, borderRadius: 12, backgroundColor: colors.surface },
  boxItem: { flex: 1, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  boxItemOn: { backgroundColor: colors.pressed },
  boxText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  boxTextOn: { color: colors.text, fontFamily: fonts.semibold },

  pillRow: { gap: 6, paddingRight: 8 },
  pill: { height: 32, paddingHorizontal: 13, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.text },
  pillOff: { borderWidth: 1, borderColor: colors.lineStrong },
  pillText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },
  pillTextOn: { color: colors.bg, fontFamily: fonts.semibold },

  underRow: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: colors.line },
  underTab: { height: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  underTabOn: { borderBottomColor: colors.gold },
  underText: { fontFamily: fonts.medium, fontSize: 13, color: colors.subtle },
  underTextOn: { color: colors.text, fontFamily: fonts.semibold },
});
