import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, type } from '../theme';

/**
 * Section – a titled block of content with an optional action link.
 *   <Section title="Active packages" action="View all" onAction={...}>…</Section>
 */
export default function Section({ title, subtitle, action, onAction, children, style }) {
  return (
    <View style={[styles.wrap, style]}>
      {title ? (
        <View style={styles.head}>
          <View style={styles.titles}>
            <Text style={type.h2}>{title}</Text>
            {subtitle ? <Text style={[type.tiny, styles.subtitle]}>{subtitle}</Text> : null}
          </View>
          {action ? (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
              <Text style={styles.action}>{action}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  titles: { flexShrink: 1, paddingRight: 12 },
  subtitle: { marginTop: 2 },
  action: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
});
