import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../../theme';

/** Legend – coloured dots with labels under a chart. items: [{ label, color, dashed? }] */
export default function Legend({ items, style }) {
  return (
    <View style={[styles.row, style]}>
      {items.map(i => (
        <View key={i.label} style={styles.item}>
          <View style={[styles.swatch, i.dashed ? { borderTopWidth: 2, borderStyle: 'dashed', borderColor: i.color, height: 0 } : { backgroundColor: i.color }]} />
          <Text style={styles.label}>{i.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  label: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
});
