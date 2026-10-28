import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colors, fonts } from '../../theme';

/**
 * DonutChart – share of a total by category (e.g. income by source).
 * Empty (total = 0) → web `.empty-ring` spinner: muted track + gold tip, 6s spin.
 *
 * props
 *   data: [{ value, color, label }]
 *   centerTitle / centerSubtitle: text in the hole (when data present)
 *   emptyMessage: optional copy under the spinner (web chart-empty)
 */
export default function DonutChart({
  data,
  size = 120,
  centerTitle,
  centerSubtitle,
  holeColor,
  emptyMessage,
}) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const hole = holeColor || colors.bg;

  if (total <= 0) {
    return <EmptyRing size={size} message={emptyMessage} />;
  }

  return (
    <PieChart
      donut
      data={data.map(d => ({ value: d.value, color: d.color }))}
      radius={size / 2}
      innerRadius={size / 2 - 14}
      innerCircleColor={hole}
      strokeWidth={2}
      strokeColor={hole}
      centerLabelComponent={() => (
        <View style={styles.center}>
          <Text style={styles.title}>{centerTitle}</Text>
          {centerSubtitle ? <Text style={styles.sub}>{centerSubtitle}</Text> : null}
        </View>
      )}
    />
  );
}

/** Web `.empty-ring`: muted track + gold tip, spin 6s linear infinite */
export function EmptyRing({ size = 120, message, children }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const border = Math.max(12, Math.round(size * 0.117));

  return (
    <View style={styles.emptyWrap}>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: border,
            transform: [{ rotate }],
          },
        ]}
      />
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  title: { fontFamily: fonts.display, fontSize: 15, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 9, color: colors.subtle },
  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 12 },
  ring: {
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderTopColor: 'rgba(227, 191, 122, 0.4)',
  },
  emptyMsg: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    textAlign: 'center',
    maxWidth: 260,
  },
});
