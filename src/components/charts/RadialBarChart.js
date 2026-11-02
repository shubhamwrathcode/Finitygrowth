import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts } from '../../theme';

/** Same palette as web ApexChart CHART.series */
export const RADIAL_COLORS = ['#bd8b30', '#8b7cff', '#24a194'];

const TRACK = 'rgba(255,255,255,0.05)';
const INK = '#EEF0F5';
const MUTED = '#8c93a6';

/**
 * RadialBarChart – web ApexCharts radialBar look.
 * Concentric progress rings with avg % in the hollow center.
 *
 * props
 *   items: [{ progress: 0..1 | percent: 0..100, color? }]
 *   size: outer diameter (default 210)
 *   stroke: ring thickness (default 12)
 *   gap: space between rings (default 8)
 */
export default function RadialBarChart({
  items = [],
  size = 210,
  stroke = 12,
  gap = 8,
  centerValue,
  centerLabel = 'Avg progress',
}) {
  const rings = useMemo(() => {
    return (items || []).slice(0, 3).map((item, i) => {
      const raw =
        item.percent != null
          ? Number(item.percent)
          : Math.round(Math.min(1, Math.max(0, Number(item.progress) || 0)) * 100);
      return {
        percent: Math.min(100, Math.max(0, raw)),
        color: item.color || RADIAL_COLORS[i % RADIAL_COLORS.length],
      };
    });
  }, [items]);

  const n = rings.length;
  if (!n) return null;

  const cx = size / 2;
  const cy = size / 2;
  // Outer ring near the edge; each next ring inset by stroke + gap (web track.margin: 6)
  const outerR = (size - stroke) / 2 - 2;

  const avg =
    centerValue != null
      ? centerValue
      : Math.round(rings.reduce((s, r) => s + r.percent, 0) / n);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <Svg width={size} height={size}>
        {rings.map((ring, i) => {
          const r = outerR - i * (stroke + gap);
          if (r <= stroke) return null;
          const c = 2 * Math.PI * r;
          const p = ring.percent / 100;
          return (
            <React.Fragment key={`ring-${i}`}>
              <Circle
                cx={cx}
                cy={cy}
                r={r}
                stroke={TRACK}
                strokeWidth={stroke}
                fill="none"
              />
              {p > 0 ? (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={ring.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.max(c * p, 0.01)} ${c}`}
                  transform={`rotate(-90 ${cx} ${cy})`}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={styles.value}>{avg}%</Text>
        <Text style={styles.label}>{centerLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: INK,
    letterSpacing: -0.3,
  },
  label: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: MUTED,
  },
});
