import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fonts } from '../../theme';
import { money } from '../../utils/format';

/**
 * Portfolio payout chart — same idea as web PayoutChart.jsx:
 * gold area = cumulative credited, dashed = full schedule, bars = nightly.
 */

const RANGES = [
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: 'All', days: 0 },
];

const GOLD = '#E3BF7A';
const GOLD_HI = '#F6E2B3';
const AXIS = '#8c93a6';
const GRID = 'rgba(255,255,255,0.05)';
const DAY_W = 14;
const Y_AXIS_W = 44;
const PAD_L = 8;
const PAD_T = 8;
const PAD_B = 28;
const BAR_AREA = 0.22;

function formatDay(time) {
  if (!time) return '';
  const date = typeof time === 'string' ? new Date(`${time}T00:00:00`) : new Date(time);
  if (Number.isNaN(date.getTime())) return String(time);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function shortLabel(time) {
  if (!time) return '';
  const date = typeof time === 'string' ? new Date(`${time}T00:00:00`) : new Date(time);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function PayoutChart({ series, currency = 'USDT', width, height = 220 }) {
  const scrollRef = useRef(null);
  const [range, setRange] = useState('All');
  const [focusIdx, setFocusIdx] = useState(-1);

  const totalAll = series?.total || [];
  const paidAll = series?.paid || [];
  const barsAll = series?.bars || [];
  const lastPaidIndex = series?.lastPaidIndex ?? -1;

  const window = useMemo(() => {
    const length = totalAll.length;
    if (!length) return { from: 0, to: 0 };
    const days = RANGES.find(item => item.key === range)?.days || 0;
    if (!days || length <= days) return { from: 0, to: length };
    const anchor = Math.max(0, lastPaidIndex);
    const from = Math.max(0, Math.min(anchor - Math.floor(days / 2), length - days));
    return { from, to: from + days };
  }, [range, totalAll.length, lastPaidIndex]);

  const total = totalAll.slice(window.from, window.to);
  const bars = barsAll.slice(window.from, window.to);
  const paidMap = useMemo(() => {
    const map = new Map(paidAll.map(p => [p.time, p.value]));
    return map;
  }, [paidAll]);

  const n = total.length;
  const viewportW = Math.max(width || 280, 120);
  const plotNeed = n > 1 ? (n - 1) * DAY_W : DAY_W;
  const contentPlotW = Math.max(plotNeed, viewportW - PAD_L - Y_AXIS_W);
  const chartW = PAD_L + contentPlotW + Y_AXIS_W;
  const plotH = Math.max(height - PAD_T - PAD_B, 100);
  const chartH = PAD_T + plotH + PAD_B;
  const lineH = plotH * (1 - BAR_AREA);
  const barH = plotH * BAR_AREA;
  const pxPerPoint = n > 1 ? contentPlotW / (n - 1) : contentPlotW;

  const layout = useMemo(() => {
    if (!n) return null;
    const values = total.map(p => Number(p.value) || 0);
    const paidVals = total.map(p => Number(paidMap.get(p.time)) || 0);
    const barVals = bars.map(p => Number(p.value) || 0);
    const yMax = Math.max(...values, 0.01) * 1.08;
    const barMax = Math.max(...barVals, 0.01);

    const xAt = i => PAD_L + (n === 1 ? contentPlotW / 2 : i * pxPerPoint);
    const yAt = v => PAD_T + ((yMax - v) / yMax) * lineH;
    const bottomLine = PAD_T + lineH;

    const schedPts = values.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
    const paidPts = [];
    for (let i = 0; i < n; i += 1) {
      if (!paidMap.has(total[i].time)) break;
      paidPts.push({ x: xAt(i), y: yAt(paidVals[i]), v: paidVals[i] });
    }

    const schedD = schedPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    let areaD = '';
    let paidD = '';
    if (paidPts.length) {
      paidD = paidPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
      areaD = `${paidD} L${paidPts[paidPts.length - 1].x.toFixed(2)} ${bottomLine} L${paidPts[0].x.toFixed(2)} ${bottomLine} Z`;
    }

    const barBottom = PAD_T + plotH;
    const barRects = bars.map((b, i) => {
      const h = (Number(b.value) / barMax) * (barH - 4);
      const bw = Math.max(3, pxPerPoint * 0.55);
      return {
        x: xAt(i) - bw / 2,
        y: barBottom - Math.max(h, 0),
        w: bw,
        h: Math.max(h, 0),
        paid: !!b.paid,
        value: Number(b.value) || 0,
      };
    });

    const yTicks = [0, 0.5, 1].map(t => {
      const v = yMax * (1 - t);
      return { y: PAD_T + t * lineH, label: v >= 100 ? String(Math.round(v)) : v.toFixed(1) };
    });

    const xEvery = Math.max(1, Math.ceil(n / 5));
    const xLabels = total
      .map((p, i) => ({ i, label: shortLabel(p.time) }))
      .filter((_, i) => i % xEvery === 0 || i === n - 1);

    return { schedD, paidD, areaD, barRects, yTicks, xLabels, xAt, yAt, paidPts };
  }, [n, total, bars, paidMap, contentPlotW, pxPerPoint, lineH, barH, plotH]);

  const lastPaid = paidAll[paidAll.length - 1]?.value || 0;
  const lastTotal = totalAll[totalAll.length - 1]?.value || 0;
  const focus = focusIdx >= 0 && total[focusIdx] ? total[focusIdx] : null;
  const shownPaid = focus ? paidMap.get(focus.time) ?? lastPaid : lastPaid;
  const shownTotal = focus ? Number(focus.value) : lastTotal;
  const shownNight = focusIdx >= 0 ? bars[focusIdx]?.value : null;

  if (!n || !layout) {
    return null;
  }

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Payout schedule · all packages</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{money(shownPaid ?? lastPaid)}</Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>
                of {money(shownTotal ?? lastTotal)} scheduled
              </Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {focus ? formatDay(focus.time) : 'Credited to date'}
            {shownNight != null ? ` · night ${money(shownNight)} ${currency}` : ''}
          </Text>
          <View style={styles.keys}>
            <Text style={styles.key}>
              <Text style={styles.keyGold}>━ </Text>Credited
            </Text>
            <Text style={styles.key}>
              <Text style={styles.keyMuted}>┅ </Text>Full schedule
            </Text>
            <Text style={styles.key}>
              <Text style={styles.keyBar}>▮ </Text>Nightly
            </Text>
          </View>
        </View>
        <View style={styles.seg}>
          {RANGES.map(item => (
            <Pressable
              key={item.key}
              onPress={() => setRange(item.key)}
              style={[styles.segBtn, range === item.key && styles.segOn]}>
              <Text style={[styles.segText, range === item.key && styles.segTextOn]}>
                {item.key}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -4 }}>
        <View style={{ width: chartW, height: chartH }}>
          <Svg width={chartW} height={chartH}>
            <Defs>
              <LinearGradient id="payFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={GOLD} stopOpacity="0.35" />
                <Stop offset="1" stopColor={GOLD} stopOpacity="0.02" />
              </LinearGradient>
            </Defs>

            {layout.yTicks.map((t, i) => (
              <React.Fragment key={i}>
                <Line
                  x1={PAD_L}
                  y1={t.y}
                  x2={PAD_L + contentPlotW}
                  y2={t.y}
                  stroke={GRID}
                  strokeWidth={1}
                />
                <SvgText
                  x={chartW - 4}
                  y={t.y + 3}
                  fill={AXIS}
                  fontSize={10}
                  fontFamily={fonts.regular}
                  textAnchor="end">
                  {t.label}
                </SvgText>
              </React.Fragment>
            ))}

            {layout.barRects.map((b, i) =>
              b.value > 0 ? (
                <Rect
                  key={`b${i}`}
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx={1}
                  fill={b.paid ? 'rgba(227,191,122,0.75)' : 'rgba(139,124,255,0.45)'}
                />
              ) : null,
            )}

            {layout.areaD ? <Path d={layout.areaD} fill="url(#payFill)" /> : null}
            {layout.schedD ? (
              <Path
                d={layout.schedD}
                stroke="rgba(227,191,122,0.55)"
                strokeWidth={2}
                fill="none"
                strokeDasharray="6 5"
              />
            ) : null}
            {layout.paidD ? (
              <Path d={layout.paidD} stroke={GOLD} strokeWidth={2.5} fill="none" />
            ) : null}

            {focusIdx >= 0 ? (
              <>
                <Line
                  x1={layout.xAt(focusIdx)}
                  y1={PAD_T}
                  x2={layout.xAt(focusIdx)}
                  y2={PAD_T + plotH}
                  stroke="rgba(227,191,122,0.4)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                {paidMap.has(total[focusIdx].time) ? (
                  <Circle
                    cx={layout.xAt(focusIdx)}
                    cy={layout.yAt(Number(paidMap.get(total[focusIdx].time)) || 0)}
                    r={5}
                    fill={GOLD_HI}
                    stroke="#07080c"
                    strokeWidth={2}
                  />
                ) : null}
              </>
            ) : null}

            {layout.xLabels.map(({ i, label }) => (
              <SvgText
                key={`x${i}`}
                x={layout.xAt(i)}
                y={chartH - 8}
                fill={AXIS}
                fontSize={10}
                fontFamily={fonts.regular}
                textAnchor="middle">
                {label}
              </SvgText>
            ))}
          </Svg>

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {total.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => setFocusIdx(i === focusIdx ? -1 : i)}
                style={{
                  position: 'absolute',
                  left: layout.xAt(i) - pxPerPoint / 2,
                  top: 0,
                  width: Math.max(pxPerPoint, 12),
                  height: chartH,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  head: { gap: 12, marginBottom: 10 },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.subtle,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  valueRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 },
  value: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.goldSoft,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gold },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 },
  keys: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  key: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  keyGold: { color: GOLD },
  keyMuted: { color: 'rgba(227,191,122,0.55)' },
  keyBar: { color: 'rgba(139,124,255,0.8)' },
  seg: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  segBtn: {
    minWidth: 40,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segOn: { backgroundColor: colors.pressed },
  segText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  segTextOn: { fontFamily: fonts.semibold, color: colors.text },
});
