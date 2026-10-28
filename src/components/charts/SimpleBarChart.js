import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { fonts } from '../../theme';

/** Web TeamLevels Apex bar: gold → #b88a45 vertical gradient */
const BAR_GOLD = '#E3BF7A';
const BAR_GOLD_DEEP = '#B88A45';
const AXIS_MUTED = '#8c93a6';
const AXIS_DIM = '#6b7280';
const LABEL_INK = '#EEF0F5';

/**
 * SimpleBarChart – Team by level (L1–L5), matches web ApexCharts bar.
 * Library: react-native-gifted-charts → <BarChart>
 *
 * props
 *   items: [{ label, value, color? }]
 */
export default function SimpleBarChart({ items, width, height = 220 }) {
  const n = Math.max(items.length, 1);
  const chartW = Math.max(width - 8, 120);
  // ~46% column width like web plotOptions.bar.columnWidth
  const slot = chartW / n;
  const barWidth = Math.max(14, Math.min(36, Math.round(slot * 0.46)));
  const spacing = Math.max(8, Math.round(slot - barWidth));

  const maxRaw = Math.max(...items.map(i => Number(i.value) || 0), 0);
  const maxValue = niceMax(maxRaw);

  const data = useMemo(
    () =>
      items.map(i => ({
        value: Number(i.value) || 0,
        label: i.label,
        frontColor: i.color || BAR_GOLD,
        gradientColor: BAR_GOLD_DEEP,
      })),
    [items],
  );

  return (
    <View style={styles.wrap}>
      <BarChart
        data={data}
        width={chartW}
        height={height}
        barWidth={barWidth}
        spacing={spacing}
        initialSpacing={Math.round(spacing / 2)}
        endSpacing={Math.round(spacing / 2)}
        roundedTop
        roundedBottom={false}
        showGradient
        gradientColor={BAR_GOLD_DEEP}
        maxValue={maxValue}
        noOfSections={4}
        yAxisThickness={0}
        xAxisThickness={0}
        xAxisColor="transparent"
        rulesColor="rgba(255,255,255,0.05)"
        rulesType="solid"
        yAxisTextStyle={styles.axisY}
        xAxisLabelTextStyle={styles.axisX}
        yAxisLabelWidth={28}
        showValuesAsTopLabel
        topLabelTextStyle={styles.top}
        disableScroll
        isAnimated
        animationDuration={700}
      />
    </View>
  );
}

function niceMax(raw) {
  if (!(raw > 0)) return 4;
  const padded = raw * 1.25;
  const pow = 10 ** Math.floor(Math.log10(padded));
  const n = padded / pow;
  let step;
  if (n <= 1) step = 1;
  else if (n <= 2) step = 2;
  else if (n <= 5) step = 5;
  else step = 10;
  return step * pow;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, overflow: 'hidden' },
  top: {
    color: LABEL_INK,
    fontSize: 11,
    fontFamily: fonts.semibold,
    fontWeight: '600',
    marginBottom: 4,
  },
  axisX: { color: AXIS_MUTED, fontSize: 11, fontFamily: fonts.regular },
  axisY: { color: AXIS_DIM, fontSize: 10, fontFamily: fonts.regular },
});
