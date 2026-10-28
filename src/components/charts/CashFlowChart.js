import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { fonts } from '../../theme';

/** Web WeeklyFlow / CHART.series */
const SERIES = {
  income: '#bd8b30',
  deposits: '#8b7cff',
  out: '#24a194',
};
const AXIS_MUTED = '#8c93a6';
const AXIS_DIM = '#5f6678';
const ZERO_LINE = 'rgba(255,255,255,0.18)';
const RULE = 'rgba(255,255,255,0.06)';

/**
 * CashFlowChart – web WeeklyFlow stacked bars:
 * Income + Deposits above zero, Withdrawals & transfers out below.
 *
 * props
 *   weeks: [{ label, income, deposits, out }]
 *   out may already be negative (dashboard api) or positive absolute
 */
export default function CashFlowChart({ weeks = [], width, height = 220 }) {
  const n = Math.max(weeks.length, 1);
  const chartW = Math.max(width - 8, 160);
  // web columnWidth ~62%
  const slot = chartW / n;
  const barWidth = Math.max(10, Math.min(28, Math.round(slot * 0.62)));
  const spacing = Math.max(6, Math.round(slot - barWidth));

  const stackData = useMemo(
    () =>
      weeks.map(w => {
        const income = Math.max(0, Number(w.income) || 0);
        const deposits = Math.max(0, Number(w.deposits) || 0);
        const out = -Math.abs(Number(w.out) || 0);
        return {
          label: w.label,
          stacks: [
            {
              value: income,
              color: SERIES.income,
              borderTopLeftRadius: deposits > 0 ? 0 : 3,
              borderTopRightRadius: deposits > 0 ? 0 : 3,
            },
            {
              value: deposits,
              color: SERIES.deposits,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            },
            {
              value: out,
              color: SERIES.out,
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            },
          ],
        };
      }),
    [weeks],
  );

  const maxIn = Math.max(...weeks.map(w => (Number(w.income) || 0) + (Number(w.deposits) || 0)), 0);
  const maxOut = Math.max(...weeks.map(w => Math.abs(Number(w.out) || 0)), 0);
  // Integer steps like web Apex — empty data → 0, 1, 2 (no fractional → duplicate 0s)
  const scale = buildYScale(maxIn, maxOut);

  return (
    <View style={styles.wrap}>
      <View style={styles.legendRow}>
        <LegendDot color={SERIES.income} label="Income" />
        <LegendDot color={SERIES.deposits} label="Deposits" />
        <LegendDot color={SERIES.out} label="Withdrawals & transfers out" />
      </View>
      <BarChart
        stackData={stackData}
        width={chartW}
        height={height}
        barWidth={barWidth}
        spacing={spacing}
        initialSpacing={Math.round(spacing / 2)}
        endSpacing={Math.round(spacing / 2)}
        maxValue={scale.maxValue}
        stepValue={scale.step}
        mostNegativeValue={scale.mostNegative}
        noOfSections={scale.sections}
        noOfSectionsBelowXAxis={scale.sectionsBelow}
        yAxisThickness={0}
        xAxisThickness={1}
        xAxisColor={ZERO_LINE}
        rulesColor={RULE}
        rulesType="dashed"
        dashWidth={4}
        dashGap={4}
        yAxisTextStyle={styles.axisY}
        xAxisLabelTextStyle={styles.axisX}
        yAxisLabelWidth={34}
        formatYLabel={v => formatAxis(Number(v))}
        disableScroll
        isAnimated
        animationDuration={700}
        autoShiftLabelsForNegativeStacks={false}
      />
    </View>
  );
}

function LegendDot({ color, label }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

/** Web Apex-style nice Y scale: integer steps, empty → 0 / 1 / 2 */
function buildYScale(maxIn, maxOut) {
  const peak = Math.max(maxIn, maxOut, 0);
  const sections = 2;
  const step = peak > 0 ? niceStep(peak / sections) : 1;
  const maxValue = step * sections;
  const sectionsBelow = maxOut > 0 ? sections : 0;
  return {
    maxValue,
    step,
    mostNegative: sectionsBelow ? -maxValue : 0,
    sections,
    sectionsBelow,
  };
}

function niceStep(raw) {
  if (!(raw > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  if (n <= 1) return 1 * pow;
  if (n <= 2) return 2 * pow;
  if (n <= 5) return 5 * pow;
  return 10 * pow;
}

function formatAxis(v) {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${(abs / 1000).toFixed(1)}k`;
  return `${Math.round(abs)}`;
}

const styles = StyleSheet.create({
  wrap: { marginTop: 2 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 8,
    paddingRight: 2,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: fonts.regular, fontSize: 10, color: AXIS_MUTED },
  axisY: { color: AXIS_DIM, fontSize: 10, fontFamily: fonts.regular },
  axisX: { color: AXIS_MUTED, fontSize: 9, fontFamily: fonts.regular },
});
