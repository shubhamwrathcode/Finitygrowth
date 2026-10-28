import React from 'react';
import { StyleSheet } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { colors, fonts } from '../../theme';

/**
 * StackedBarChart – daily earnings, each bar split by source.
 * Library: react-native-gifted-charts → <BarChart stackData />
 *
 * props
 *   rows:   [{ label, roi, direct, level }]   (from api.getEarnings().daily)
 *   series: [{ key: 'roi', color }, …]       bottom → top order
 */
export default function StackedBarChart({ rows, series, width, height = 150 }) {
  const n = rows.length;
  const barWidth = Math.max(Math.floor((width - 60) / n) - 3, 4);
  const stackData = rows.map((r, i) => ({
    label: i % 7 === 0 ? r.label : '',
    stacks: series.map(s => ({ value: r[s.key] || 0, color: s.color })),
  }));
  const max = Math.max(...rows.map(r => series.reduce((sum, s) => sum + (r[s.key] || 0), 0)));

  return (
    <BarChart
      stackData={stackData}
      width={width - 44}
      height={height}
      barWidth={barWidth}
      spacing={3}
      initialSpacing={2}
      endSpacing={0}
      barBorderTopLeftRadius={2}
      barBorderTopRightRadius={2}
      maxValue={Math.ceil(max / 10) * 10 || 10}
      noOfSections={4}
      yAxisLabelWidth={30}
      yAxisColor="transparent"
      xAxisColor={colors.lineStrong}
      rulesColor={colors.line}
      rulesType="solid"
      yAxisTextStyle={styles.axis}
      xAxisLabelTextStyle={styles.axisX}
      disableScroll
      isAnimated
    />
  );
}

const styles = StyleSheet.create({
  axis: { color: colors.subtle, fontSize: 10, fontFamily: fonts.regular },
  axisX: { color: colors.subtle, fontSize: 9, fontFamily: fonts.regular, width: 40 },
});
