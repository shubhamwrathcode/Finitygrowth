import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { fonts } from '../../theme';
import { money } from '../../utils/format';

/** Same as web ApexChart CHART.series */
export const DONUT_COLORS = ['#bd8b30', '#8b7cff', '#24a194'];

const INK = '#eef0f5';
const MUTED = '#8c93a6';
const SURFACE = '#0f1219';
const GOLD_TIP = '#bd8b30';

/**
 * DonutChart – web IncomeDonut (ApexCharts donut) look.
 * Center: total + "Total earned"; tap a slice → value + label + gold tooltip.
 *
 * props
 *   data: [{ value, color?, label }]
 *   currency: e.g. "USDT"
 *   holeColor: inner circle fill
 *   emptyMessage: copy when total is 0
 */
export default function DonutChart({
  data = [],
  size = 200,
  currency = 'USDT',
  holeColor,
  emptyMessage,
  centerLabel = 'Total earned',
}) {
  const [focus, setFocus] = useState(-1);
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0);
  const hole = holeColor || SURFACE;

  const slices = useMemo(
    () =>
      (data || [])
        .map((d, i) => ({
          value: Math.max(0, Number(d.value) || 0),
          color: d.color || DONUT_COLORS[i % DONUT_COLORS.length],
          label: d.label || '',
          index: i,
        }))
        .filter(s => s.value > 0),
    [data],
  );

  if (total <= 0) {
    return <EmptyRing size={Math.min(size, 120)} message={emptyMessage} />;
  }

  const radius = size / 2;
  // web donut.size: "74%"
  const innerRadius = radius * 0.74;
  const active = focus >= 0 ? slices[focus] : null;
  const centerValue = active ? active.value : total;
  const centerSub = active ? active.label : centerLabel;

  return (
    <View style={[styles.wrap, { width: size + 24, minHeight: size + (active ? 36 : 0) }]}>
      <PieChart
        donut
        data={slices.map((s, i) => ({
          value: s.value,
          color: s.color,
          onPress: () => setFocus(prev => (prev === i ? -1 : i)),
        }))}
        radius={radius}
        innerRadius={innerRadius}
        innerCircleColor={hole}
        strokeWidth={3}
        strokeColor={hole}
        focusOnPress
        toggleFocusOnPress
        extraRadius={6}
        isAnimated
        animationDuration={700}
        centerLabelComponent={() => (
          <Pressable onPress={() => setFocus(-1)} style={styles.center}>
            <Text style={styles.value}>{money(centerValue)}</Text>
            <Text style={styles.sub} numberOfLines={2}>
              {centerSub}
            </Text>
          </Pressable>
        )}
      />

      {active ? (
        <View style={styles.tooltip} pointerEvents="none">
          <Text style={styles.tooltipText}>
            {active.label}: {money(active.value)} {currency}
          </Text>
        </View>
      ) : null}
    </View>
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
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    maxWidth: 120,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 24,
    fontWeight: '700',
    color: INK,
    letterSpacing: -0.3,
  },
  sub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
  },
  tooltip: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: GOLD_TIP,
    maxWidth: 260,
  },
  tooltipText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  emptyWrap: { alignItems: 'center', gap: 12, paddingVertical: 18, paddingHorizontal: 12 },
  ring: {
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderTopColor: 'rgba(227, 191, 122, 0.4)',
  },
  emptyMsg: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
    textAlign: 'center',
    maxWidth: 260,
  },
});
