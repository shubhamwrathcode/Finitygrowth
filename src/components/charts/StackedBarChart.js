import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, fonts } from '../../theme';
import { money } from '../../utils/format';

const Y_AXIS_W = 34;
const TOOLTIP_W = 200;
const X_TICK_EVERY = 4;
const BAR_W = 10;
const SPACING = 4;
const INITIAL = 4;
const END = 12;

function shouldShowXLabel(index, total) {
  if (index % X_TICK_EVERY === 0) return true;
  if (index === total - 1) {
    const prevTick = Math.floor((total - 2) / X_TICK_EVERY) * X_TICK_EVERY;
    return index - prevTick >= 2;
  }
  return false;
}

/**
 * StackedBarChart – web DailyChart look + horizontal ScrollView when content is wide.
 */
export default function StackedBarChart({
  rows,
  series,
  width,
  height = 220,
  currency = 'USDT',
}) {
  const [selected, setSelected] = useState(-1);
  const n = rows.length || 1;
  const viewportW = Math.max(width - 8, 120);
  const contentW = Y_AXIS_W + INITIAL + n * (BAR_W + SPACING) - SPACING + END;
  const chartW = Math.max(contentW, viewportW);
  const xLabelWidth = 40;

  const stackData = rows.map((r, i) => {
    const show = shouldShowXLabel(i, n);
    return {
      label: show ? r.label : '',
      labelWidth: show ? xLabelWidth : 0,
      labelTextStyle: show ? styles.axisX : styles.axisXHidden,
      stacks: series.map(s => {
        const value = Number(r[s.key]) || 0;
        return {
          value,
          color:
            value <= 0
              ? 'transparent'
              : selected >= 0 && selected !== i
                ? fade(s.color, 0.28)
                : s.color,
        };
      }),
      onPress: () => setSelected(prev => (prev === i ? -1 : i)),
    };
  });

  const rawMax = Math.max(
    0,
    ...rows.map(r => series.reduce((sum, s) => sum + (Number(r[s.key]) || 0), 0)),
  );
  const maxValue = niceMax(rawMax);
  const active = selected >= 0 ? rows[selected] : null;

  return (
    <View style={[styles.wrap, { width: viewportW }]}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator
        bounces={false}
        style={{ width: viewportW }}
        contentContainerStyle={{ width: chartW }}>
        <BarChart
          stackData={stackData}
          width={chartW}
          height={height}
          barWidth={BAR_W}
          spacing={SPACING}
          initialSpacing={INITIAL}
          endSpacing={END}
          barBorderTopLeftRadius={2}
          barBorderTopRightRadius={2}
          maxValue={maxValue}
          noOfSections={4}
          yAxisLabelWidth={Y_AXIS_W}
          yAxisColor="transparent"
          xAxisColor={colors.lineStrong}
          rulesColor="rgba(255,255,255,0.06)"
          rulesType="dashed"
          dashWidth={4}
          dashGap={4}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axisX}
          xAxisLabelsHeight={28}
          labelWidth={xLabelWidth}
          formatYLabel={formatY}
          roundToDigits={rawMax < 10 ? 1 : 0}
          showFractionalValues={rawMax < 10}
          disableScroll
          isAnimated={false}
          activeOpacity={0.85}
          onPress={(_item, index) => setSelected(prev => (prev === index ? -1 : index))}
        />
      </ScrollView>

      {active ? (
        <Pressable
          onPress={() => setSelected(-1)}
          style={[styles.tooltip, { left: Math.max(4, (viewportW - TOOLTIP_W) / 2) }]}>
          <View style={styles.tooltipHead}>
            <Text style={styles.tooltipDate}>{active.label}</Text>
          </View>
          {series.map(s => (
            <View key={s.key} style={styles.tooltipRow}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.tooltipLabel}>{s.label}:</Text>
              <Text style={styles.tooltipValue}>
                {money(active[s.key] || 0)} {currency}
              </Text>
            </View>
          ))}
        </Pressable>
      ) : null}
    </View>
  );
}

function formatY(label) {
  const v = Number(label);
  if (!Number.isFinite(v)) return label;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(v < 10 ? 1 : 0);
}

function niceMax(max) {
  if (max <= 0) return 1;
  if (max <= 2) return Math.ceil(max * 2) / 2 || 1;
  if (max <= 5) return Math.ceil(max);
  if (max <= 10) return Math.ceil(max);
  if (max < 1000) return Math.ceil(max / 5) * 5;
  return Math.ceil(max / 100) * 100;
}

function fade(hex, opacity) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'center' },
  axis: { color: '#5f6678', fontSize: 10, fontFamily: fonts.regular },
  axisX: {
    color: '#8c93a6',
    fontSize: 9,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  axisXHidden: { width: 0, height: 0, opacity: 0, fontSize: 0 },
  tooltip: {
    position: 'absolute',
    top: 10,
    width: TOOLTIP_W,
    zIndex: 30,
    elevation: 30,
    backgroundColor: '#151822',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  tooltipHead: {
    backgroundColor: '#1B1E28',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tooltipDate: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  tooltipLabel: { flexShrink: 1, fontFamily: fonts.regular, fontSize: 11, color: colors.textSoft },
  tooltipValue: { flexShrink: 0, fontFamily: fonts.semibold, fontSize: 11, color: colors.text },
});
