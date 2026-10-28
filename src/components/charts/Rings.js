/**
 * Hand-drawn SVG charts (react-native-svg) for shapes the chart library
 * doesn't offer: a progress ring and a segmented half-circle gauge.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts } from '../../theme';

/** ProgressRing – circle filled to `progress` (0..1) with a label inside. */
export function ProgressRing({ progress = 0, size = 72, stroke = 6, color = colors.gold, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(Math.max(progress, 0), 1);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={styles.ringLabel}>{label ?? `${Math.round(p * 100)}%`}</Text>
      </View>
    </View>
  );
}

/**
 * SegmentGauge – half circle split into `total` segments; the first
 * `filled` are gold, the next one is a faint "up next" gold.
 */
export function SegmentGauge({ filled = 0, total = 5, width = 280, label, sublabel }) {
  const r = width / 2 - 20;
  const cx = width / 2;
  const cy = r + 14;
  const gap = 4; // degrees between segments
  const seg = 180 / total;
  const point = deg => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];

  const arcs = Array.from({ length: total }, (_, i) => {
    const a0 = 180 - i * seg - gap / 2;
    const a1 = 180 - (i + 1) * seg + gap / 2;
    const [x0, y0] = point(a0);
    const [x1, y1] = point(a1);
    const stroke = i < filled ? colors.gold : i === filled ? 'rgba(227,185,110,0.3)' : colors.line;
    return <Path key={i} d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`} stroke={stroke} strokeWidth={14} strokeLinecap="round" fill="none" />;
  });

  return (
    <View style={{ width, height: cy + 12 }}>
      <Svg width={width} height={cy + 12}>{arcs}</Svg>
      <View style={[styles.gaugeText, { top: cy - 54 }]}>
        <Text style={styles.gaugeValue}>{label}</Text>
        {sublabel ? <Text style={styles.gaugeSub}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  ringLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  gaugeText: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  gaugeValue: { fontFamily: fonts.display, fontSize: 38, color: colors.text },
  gaugeSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
