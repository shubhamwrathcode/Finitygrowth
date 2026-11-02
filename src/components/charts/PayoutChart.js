import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { fonts } from '../../theme';
import { money } from '../../utils/format';

/**
 * Portfolio payout chart — exact web PayoutChart (lightweight-charts):
 * gold area = cumulative credited, dashed = full schedule, purple bars = nightly.
 */

const RANGES = [
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: 'All', days: 0 },
];

const GOLD = '#E3BF7A';
const GOLD_HI = '#F6E2B3';
const GOLD_GRAD = ['#F6E2B3', '#E3BF7A', '#B98B45'];
const AXIS = '#8c93a6';
const GRID_H = 'rgba(255,255,255,0.05)';
const GRID_V = 'rgba(255,255,255,0.04)';
const SURFACE = '#12141C';
const CHIP_UP_BG = 'rgba(141,222,168,0.1)';
const CHIP_UP = '#8ddea8';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// web rightPriceScale scaleMargins + nightly scale
const MARGIN_TOP = 0.1;
const MARGIN_BOTTOM = 0.28;
const NIGHTLY_TOP = 0.8;
const Y_AXIS_W = 58;
const PAD_L = 4;
const PAD_T = 8;
const PAD_B = 26;
const MIN_DAY_W = 3.5;

export default function PayoutChart({ series, currency = 'USDT', width, height = 280 }) {
  const scrollRef = useRef(null);
  const [range, setRange] = useState('All');
  const [focusIdx, setFocusIdx] = useState(-1);

  const totalAll = series?.total || [];
  const paidAll = series?.paid || [];
  const barsAll = series?.bars || [];
  const lastPaidIndex = series?.lastPaidIndex ?? -1;
  const n = totalAll.length;

  const days = RANGES.find(item => item.key === range)?.days || 0;
  const viewportW = Math.max(width || 280, 120);
  const plotViewportW = Math.max(viewportW - Y_AXIS_W - PAD_L, 80);
  const plotH = Math.max(height - PAD_T - PAD_B, 140);
  const chartH = PAD_T + plotH + PAD_B;

  // Visible count fills viewport (web setVisibleLogicalRange / fitContent)
  const visibleCount = days > 0 ? Math.min(days, Math.max(n, 1)) : Math.max(n, 1);
  const dayW = Math.max(MIN_DAY_W, plotViewportW / Math.max(visibleCount - 1, 1));
  const contentPlotW = Math.max((Math.max(n, 1) - 1) * dayW, plotViewportW);
  const scrollContentW = PAD_L + contentPlotW;

  const paidMap = useMemo(() => new Map(paidAll.map(p => [p.time, p.value])), [paidAll]);

  const layout = useMemo(() => {
    if (!n) return null;

    const values = totalAll.map(p => Number(p.value) || 0);
    const barVals = barsAll.map(p => Number(p.value) || 0);
    const rawMax = Math.max(...values, 0.01);
    const dataFrac = 1 - MARGIN_TOP - MARGIN_BOTTOM;
    const yMax = rawMax + rawMax * (MARGIN_TOP / dataFrac);
    const yMin = 0;

    const xAt = i => PAD_L + (n === 1 ? contentPlotW / 2 : i * dayW);
    const yAt = v => PAD_T + ((yMax - v) / (yMax - yMin || 1)) * plotH;
    const bottomY = PAD_T + plotH;

    // Schedule path (full cumulative)
    const schedPts = values.map((v, i) => ({ x: xAt(i), y: yAt(v), v }));
    const schedD = schedPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

    // Credited path + area (only through last paid)
    const paidPts = [];
    for (let i = 0; i < n; i += 1) {
      if (!paidMap.has(totalAll[i].time)) break;
      const v = Number(paidMap.get(totalAll[i].time)) || 0;
      paidPts.push({ x: xAt(i), y: yAt(v), v });
    }
    let paidD = '';
    let areaD = '';
    if (paidPts.length) {
      paidD = paidPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
      const lineBottom = PAD_T + plotH * (1 - MARGIN_BOTTOM);
      areaD = `${paidD} L${paidPts[paidPts.length - 1].x.toFixed(2)} ${lineBottom} L${paidPts[0].x.toFixed(2)} ${lineBottom} Z`;
    }

    // Nightly histogram — own scale in bottom band (web nightly top: 0.8)
    const barMax = Math.max(...barVals, 0.01);
    const incomeBandTop = PAD_T + plotH * NIGHTLY_TOP;
    const incomeBandH = bottomY - incomeBandTop;
    const barW = Math.min(5, Math.max(2, dayW * 0.65));
    const bars = barsAll.map((b, i) => {
      const v = Number(b.value) || 0;
      const h = Math.min(incomeBandH * 0.95, (v / barMax) * incomeBandH * 0.9);
      return {
        x: xAt(i) - barW / 2,
        y: bottomY - h,
        w: barW,
        h,
        show: v > 0,
        paid: !!b.paid,
        value: v,
      };
    });

    // Y ticks: 100.00, 200.00 … (web priceFormat toFixed(2))
    const yLabels = niceTicks(yMin, yMax, 6)
      .filter(v => v >= 0)
      .map(v => ({ v, y: yAt(v) }));

    // X ticks: month name; year at year boundary (TradingView timeScale)
    const xLabels = buildMonthLabels(totalAll, xAt);

    const lastSched = schedPts[n - 1];
    const lastPaidPt = paidPts.length ? paidPts[paidPts.length - 1] : null;

    return {
      schedD,
      paidD,
      areaD,
      bars,
      yLabels,
      xLabels,
      xAt,
      yAt,
      bottomY,
      lastSched,
      lastPaidPt,
      yMax,
    };
  }, [n, totalAll, barsAll, paidMap, contentPlotW, dayW, plotH]);

  // Scroll window: All → fit/end; 1M/3M → centre on last credited night (web)
  useEffect(() => {
    setFocusIdx(-1);
    const id = requestAnimationFrame(() => {
      const maxScroll = Math.max(0, scrollContentW - (plotViewportW + PAD_L));
      if (!days || n <= days) {
        scrollRef.current?.scrollTo?.({ x: 0, animated: false });
        return;
      }
      const anchor = Math.max(0, lastPaidIndex);
      const from = Math.max(0, Math.min(anchor - Math.floor(days / 2), n - days));
      scrollRef.current?.scrollTo?.({ x: Math.min(maxScroll, from * dayW), animated: false });
    });
    return () => cancelAnimationFrame(id);
  }, [range, n, scrollContentW, dayW, days, plotViewportW, lastPaidIndex]);

  const lastPaid = paidAll[paidAll.length - 1]?.value || 0;
  const lastTotal = totalAll[totalAll.length - 1]?.value || 0;
  const focus = focusIdx >= 0 ? totalAll[focusIdx] : null;
  const shownPaid = focus ? paidMap.get(focus.time) ?? lastPaid : lastPaid;
  const shownTotal = focus ? Number(focus.value) : lastTotal;
  const shownNight = focusIdx >= 0 ? barsAll[focusIdx]?.value : null;

  const onChartPress = evt => {
    if (!n) return;
    const x = evt.nativeEvent.locationX;
    const idx = Math.round(Math.max(0, Math.min(n - 1, (x - PAD_L) / dayW)));
    setFocusIdx(prev => (prev === idx ? -1 : idx));
  };

  if (!n || !layout) return null;

  const priceBadge = focusIdx >= 0 && paidMap.has(totalAll[focusIdx].time)
    ? { v: Number(paidMap.get(totalAll[focusIdx].time)) || 0, y: layout.yAt(Number(paidMap.get(totalAll[focusIdx].time)) || 0) }
    : layout.lastPaidPt
      ? { v: layout.lastPaidPt.v, y: layout.lastPaidPt.y }
      : null;

  return (
    <View>
      <View style={styles.head}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Payout schedule · all packages</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>
              {money(shownPaid ?? lastPaid)} {currency}
            </Text>
            <View style={styles.chip}>
              <Text style={styles.chipText}>of {money(shownTotal ?? lastTotal)} scheduled</Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaText}>{focus ? formatDay(focus.time) : 'Credited to date'}</Text>
            <View style={styles.legendKey}>
              <View style={styles.keyLine} />
              <Text style={styles.keyLabel}>Credited</Text>
            </View>
            <View style={styles.legendKey}>
              <View style={styles.keyDash} />
              <Text style={styles.keyLabel}>Full schedule</Text>
            </View>
            <View style={styles.legendKey}>
              <View style={styles.keyBar} />
              <Text style={styles.keyLabel}>
                Nightly payout
                {shownNight != null ? ` ${money(shownNight)} ${currency}` : ''}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.seg}>
          {RANGES.map(item => {
            const on = range === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setRange(item.key)}
                style={styles.segPress}>
                {on ? (
                  <LinearGradient
                    colors={GOLD_GRAD}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.segBtn}>
                    <Text style={styles.segTextOn}>{item.key}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.segBtn}>
                    <Text style={styles.segText}>{item.key}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={[styles.chartWrap, { width: viewportW, height: chartH }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator
          bounces={false}
          style={{ width: viewportW - Y_AXIS_W, height: chartH }}
          contentContainerStyle={{ width: scrollContentW, height: chartH }}>
          <Pressable onPress={onChartPress} style={{ width: scrollContentW, height: chartH }}>
            <Svg width={scrollContentW} height={chartH}>
              <Defs>
                <SvgLinearGradient id="payFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={GOLD} stopOpacity="0.35" />
                  <Stop offset="100%" stopColor={GOLD} stopOpacity="0.01" />
                </SvgLinearGradient>
              </Defs>

              {layout.yLabels.map((t, i) => (
                <Line
                  key={`h${i}`}
                  x1={PAD_L}
                  y1={t.y}
                  x2={PAD_L + contentPlotW}
                  y2={t.y}
                  stroke={GRID_H}
                  strokeWidth={1}
                />
              ))}

              {layout.xLabels.map((t, i) => (
                <Line
                  key={`v${i}`}
                  x1={t.x}
                  y1={PAD_T}
                  x2={t.x}
                  y2={layout.bottomY}
                  stroke={GRID_V}
                  strokeWidth={1}
                />
              ))}

              {layout.bars.map((b, i) =>
                b.show ? (
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}
              {layout.paidD ? (
                <Path
                  d={layout.paidD}
                  stroke={GOLD}
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {focusIdx >= 0 ? (
                <>
                  <Line
                    x1={layout.xAt(focusIdx)}
                    y1={PAD_T}
                    x2={layout.xAt(focusIdx)}
                    y2={layout.bottomY}
                    stroke="rgba(227,191,122,0.4)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  {paidMap.has(totalAll[focusIdx].time) ? (
                    <Circle
                      cx={layout.xAt(focusIdx)}
                      cy={layout.yAt(Number(paidMap.get(totalAll[focusIdx].time)) || 0)}
                      r={5}
                      fill={GOLD_HI}
                      stroke="#07080c"
                      strokeWidth={2}
                    />
                  ) : null}
                </>
              ) : null}

              {layout.xLabels.map((t, i) => (
                <SvgText
                  key={`xl${i}`}
                  x={t.x}
                  y={chartH - 8}
                  fill={AXIS}
                  fontSize="11"
                  fontFamily={fonts.regular}
                  textAnchor="middle">
                  {t.label}
                </SvgText>
              ))}
            </Svg>
          </Pressable>
        </ScrollView>

        {/* Fixed right price scale */}
        <View style={[styles.yAxis, { width: Y_AXIS_W, height: chartH }]} pointerEvents="none">
          <Svg width={Y_AXIS_W} height={chartH}>
            <Rect x={0} y={0} width={Y_AXIS_W} height={chartH} fill={SURFACE} fillOpacity={0.94} />
            {layout.yLabels.map((t, i) =>
              t.v < 0 ? null : (
                <SvgText
                  key={`yl${i}`}
                  x={4}
                  y={t.y + 3}
                  fill={AXIS}
                  fontSize="10"
                  fontFamily={fonts.regular}>
                  {formatAxis(t.v)}
                </SvgText>
              ),
            )}
            {/* Scheduled last value badge (web lastValueVisible on schedule line) */}
            {layout.lastSched ? (
              <>
                <Rect
                  x={1}
                  y={Math.max(2, layout.lastSched.y - 9)}
                  width={Y_AXIS_W - 2}
                  height={17}
                  rx={2}
                  fill={GOLD}
                />
                <SvgText
                  x={Y_AXIS_W / 2}
                  y={Math.max(2, layout.lastSched.y - 9) + 12}
                  fill="#17120a"
                  fontSize="10"
                  fontFamily={fonts.semibold}
                  fontWeight="700"
                  textAnchor="middle">
                  {formatAxis(layout.lastSched.v)}
                </SvgText>
              </>
            ) : null}
            {/* Credited last / focus badge */}
            {priceBadge ? (
              <>
                <Rect
                  x={1}
                  y={Math.min(chartH - 20, Math.max(2, priceBadge.y - 9))}
                  width={Y_AXIS_W - 2}
                  height={17}
                  rx={2}
                  fill={GOLD}
                />
                <SvgText
                  x={Y_AXIS_W / 2}
                  y={Math.min(chartH - 20, Math.max(2, priceBadge.y - 9)) + 12}
                  fill="#17120a"
                  fontSize="10"
                  fontFamily={fonts.semibold}
                  fontWeight="700"
                  textAnchor="middle">
                  {formatAxis(priceBadge.v)}
                </SvgText>
              </>
            ) : null}
          </Svg>
        </View>

        <Text style={styles.tvMark}>TV</Text>
      </View>
    </View>
  );
}

function formatAxis(v) {
  if (!Number.isFinite(v) || v < 0) return '';
  return Number(v).toFixed(2);
}

function formatDay(time) {
  if (!time) return '';
  const date = typeof time === 'string' ? new Date(`${time}T00:00:00`) : new Date(time);
  if (Number.isNaN(date.getTime())) return String(time);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseDay(time) {
  if (!time) return null;
  if (typeof time === 'string' && /^\d{4}-\d{2}-\d{2}/.test(time)) {
    const [y, m, d] = time.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const d = new Date(time);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** TradingView-style: Nov, Dec, 2027, Feb… */
function buildMonthLabels(points, xAt) {
  const out = [];
  let prev = null;
  for (let i = 0; i < points.length; i += 1) {
    const d = parseDay(points[i].time);
    if (!d) continue;
    const monthChange = !prev || prev.getMonth() !== d.getMonth();
    if (!monthChange) continue;
    const yearChange = prev && prev.getFullYear() !== d.getFullYear();
    out.push({
      x: xAt(i),
      label: yearChange ? String(d.getFullYear()) : MONTHS[d.getMonth()],
    });
    prev = d;
  }
  return out;
}

function niceTicks(min, max, target = 6) {
  const span = max - min;
  if (!(span > 0)) return [min];
  const rough = span / target;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const err = rough / pow;
  let step;
  if (err >= 7.5) step = 10 * pow;
  else if (err >= 3.5) step = 5 * pow;
  else if (err >= 1.5) step = 2 * pow;
  else step = pow;
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.001; v += step) {
    ticks.push(Number(v.toFixed(10)));
  }
  return ticks.length ? ticks : [min, max];
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: AXIS,
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  value: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: '#EEF0F5',
    letterSpacing: -0.4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: CHIP_UP_BG,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 11, color: CHIP_UP },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    columnGap: 12,
    marginTop: 6,
  },
  metaText: { fontFamily: fonts.regular, fontSize: 12, color: '#5f6678' },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyLine: { width: 14, height: 0, borderTopWidth: 2, borderTopColor: GOLD },
  keyDash: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
    borderTopColor: 'rgba(227,191,122,0.55)',
    borderStyle: 'dashed',
  },
  keyBar: { width: 8, height: 10, borderRadius: 2, backgroundColor: 'rgba(139,124,255,0.75)' },
  keyLabel: { fontFamily: fonts.regular, fontSize: 11, color: AXIS },
  seg: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  segPress: { borderRadius: 9 },
  segBtn: {
    minWidth: 40,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segText: { fontFamily: fonts.semibold, fontSize: 12, color: AXIS },
  segTextOn: { fontFamily: fonts.semibold, fontSize: 12, color: '#17120a' },
  chartWrap: { position: 'relative', overflow: 'hidden', alignSelf: 'stretch' },
  yAxis: { position: 'absolute', right: 0, top: 0 },
  tvMark: {
    position: 'absolute',
    left: 6,
    bottom: 28,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.3,
  },
});
