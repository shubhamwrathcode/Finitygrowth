import React from 'react';
import { StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colors, fonts } from '../../theme';

/**
 * ScheduleChart – a package's cumulative payout:
 *   dashed grey line = full scheduled amount over the duration
 *   solid gold area  = what has actually been posted so far
 * Library: react-native-gifted-charts → <LineChart data data2 />
 *
 * props
 *   scheduled: [{ day, value }]
 *   posted:    [{ day, value }]   (subset of scheduled, from day 0)
 */
export default function ScheduleChart({ scheduled, posted, width, height = 140 }) {
  const spacing = (width - 70) / Math.max(scheduled.length - 1, 1);
  const every = Math.ceil(scheduled.length / 4);
  const toPoint = (p, i) => ({ value: p.value, label: i % every === 0 ? `D${p.day}` : '' });
  const max = Math.max(...scheduled.map(p => p.value));

  return (
    <LineChart
      data={scheduled.map(toPoint)}
      data2={posted.map(toPoint)}
      width={width - 44}
      height={height}
      spacing={spacing}
      initialSpacing={4}
      endSpacing={0}
      color1={colors.subtle}
      thickness1={1.5}
      strokeDashArray1={[4, 4]}
      color2={colors.gold}
      thickness2={2.5}
      areaChart2
      startFillColor2={colors.gold}
      endFillColor2={colors.gold}
      startOpacity2={0.22}
      endOpacity2={0.02}
      hideDataPoints1
      hideDataPoints2
      maxValue={Math.ceil((max * 1.1) / 10) * 10}
      noOfSections={3}
      yAxisLabelWidth={40}
      yAxisColor="transparent"
      xAxisColor={colors.lineStrong}
      rulesColor={colors.line}
      rulesType="solid"
      yAxisTextStyle={styles.axis}
      xAxisLabelTextStyle={styles.axisX}
      formatYLabel={v => String(Math.round(Number(v)))}
      disableScroll
    />
  );
}

const styles = StyleSheet.create({
  axis: { color: colors.subtle, fontSize: 10, fontFamily: fonts.regular },
  axisX: { color: colors.subtle, fontSize: 10, fontFamily: fonts.regular, width: 40 },
});
