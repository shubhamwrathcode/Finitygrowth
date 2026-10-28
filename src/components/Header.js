import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from './Icon';
import { type } from '../theme';

/**
 * Header – back arrow + title + optional right-side element.
 *   <Header title="Deposit" right={<Text>…</Text>} />
 * Set back={false} on tab screens (no back arrow).
 */
export default function Header({ title, right, back = true, onBack, large = false }) {
  const navigation = useNavigation();
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={onBack || (() => navigation.goBack())}
            style={styles.back}>
            <Icon name="back" size={22} strokeWidth={2} />
          </Pressable>
        ) : null}
        {title ? <Text style={large ? type.h1 : type.title} numberOfLines={1}>{title}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    marginBottom: 4,
  },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
});

