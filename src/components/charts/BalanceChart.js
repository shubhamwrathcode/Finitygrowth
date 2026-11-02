import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { fonts } from '../../theme';

/**
 * Exact visual parity with web TradingChart (lightweight-charts):
 * gold area = balance, purple histogram = posted income,
 * right price scale, day-number X ticks, dotted last-price line.
 * Horizontal ScrollView pans history (web handleScroll).
 */

const GOLD = '#E3BF7A';
const GOLD_HI = '#F6E2B3';
const INCOME_BAR = 'rgba(139, 124, 255, 0.7)';
const GRID_H = 'rgba(255,255,255,0.05)';
const GRID_V = 'rgba(255,255,255,0.04)';
const AXIS = '#8c93a6';
const SURFACE = '#12141C';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Same margins as web: rightPriceScale scaleMargins + income scale
const MARGIN_TOP = 0.12;
const MARGIN_BOTTOM = 0.32;
const INCOME_TOP = 0.78; // web chart.priceScale("income") top margin
const RANGE_DAYS = { '7D': 7, '30D': 30, '90D': 90, All: 0 };
const Y_AXIS_W = 58;
const PAD_L = 4;
const PAD_R = 2; // rightOffset ≈ 2 logical bars on web
const PAD_T = 6;
const PAD_B = 24;
const MIN_DAY_W = 12;

export default function BalanceChart({ series, range = '30D', width, height = 280, onFocus }) {
  const scrollRef = useRef(null);
  const [focusIdx, setFocusIdx] = useState(-1);

  const all = series || [];
  const days = RANGE_DAYS[range] || 0;
  // Full history kept for pan; visible window drives Y-scale (web autoScale)
  const n = all.length;
  const visStart = days && n > days ? n - days : 0;
  const visible = useMemo(() => all.slice(visStart), [all, visStart]);

  const viewportW = Math.max(width, 120);
  const plotViewportW = Math.max(viewportW - Y_AXIS_W - PAD_L, 80);
  const plotH = Math.max(height - PAD_T - PAD_B, 120);
  const chartH = PAD_T + plotH + PAD_B;

  // ~visibleCount points fill the viewport (web setVisibleLogicalRange)
  const visibleCount = Math.max(visible.length, 2);
  const dayW = Math.max(MIN_DAY_W, plotViewportW / Math.max(visibleCount - 1, 1));
  const contentPlotW = Math.max((Math.max(n, 1) - 1) * dayW + PAD_R * dayW, plotViewportW);
  const scrollContentW = PAD_L + contentPlotW;

  const layout = useMemo(() => {
    if (!n) return null;

    // Y-scale from VISIBLE window only — matches web rightPriceScale autoScale
    const visValues = visible.map(p => Number(p.balance) || 0);
    const rawMin = Math.min(...visValues);
    const rawMax = Math.max(...visValues);
    const dataSpan = rawMax - rawMin;
    const dataFrac = 1 - MARGIN_TOP - MARGIN_BOTTOM;

    let yMax;
    let yMin;
    if (dataSpan < 1e-9) {
      const pad = Math.max(Math.abs(rawMax) * 0.02, 1);
      yMax = rawMax + pad;
      yMin = Math.max(0, rawMin - pad);
    } else {
      yMax = rawMax + dataSpan * (MARGIN_TOP / dataFrac);
      yMin = rawMin - dataSpan * (MARGIN_BOTTOM / dataFrac);
      if (yMin < 0 && rawMin >= 0) yMin = 0;
    }

    const values = all.map(p => Number(p.balance) || 0);
    const incomes = all.map(p => Number(p.income) || 0);

    const xAt = i => PAD_L + (n === 1 ? contentPlotW / 2 : i * dayW);
    const yAt = v => PAD_T + ((yMax - v) / (yMax - yMin || 1)) * plotH;
    const bottomY = PAD_T + plotH;

    const points = values.map((v, i) => ({
      x: xAt(i),
      y: yAt(v),
      v,
      date: all[i].date || all[i].label,
      income: Number(all[i].income) || 0,
    }));

    // Smooth-ish polyline (web AreaSeries)
    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const areaD =
      points.length > 0
        ? `${lineD} L${points[n - 1].x.toFixed(2)} ${bottomY} L${points[0].x.toFixed(2)} ${bottomY} Z`
        : '';

    // Income histogram — own scale in bottom band (web income priceScale top: 0.78)
    const incomeMax = Math.max(...incomes.slice(visStart), 0.0001);
    const incomeBandTop = PAD_T + plotH * INCOME_TOP;
    const incomeBandH = bottomY - incomeBandTop;
    const barW = Math.min(7, Math.max(3, dayW * 0.45));
    const bars = incomes.map((v, i) => {
      const h = Math.min(incomeBandH, (v / incomeMax) * incomeBandH * 0.92);
      return { x: xAt(i) - barW / 2, y: bottomY - h, w: barW, h, show: v > 0 };
    });

    // Y ticks like web: 5050.00, 5000.00, … always 2 decimals
    const yLabels = niceTicks(yMin, yMax, 10).map(v => ({ v, y: yAt(v) }));

    // X ticks: day numbers; month name at month boundary (TradingView timeScale)
    const xLabels = buildXLabels(all, points, dayW, plotViewportW);

    return {
      points,
      lineD,
      areaD,
      bars,
      yLabels,
      xLabels,
      bottomY,
      last: points[n - 1],
      yMin,
      yMax,
      yAt,
    };
  }, [all, n, visible, visStart, contentPlotW, plotH, dayW, plotViewportW]);

  // Scroll so last `days` fill the viewport (web setVisibleLogicalRange)
  useEffect(() => {
    setFocusIdx(-1);
    onFocus?.(null);
    const id = requestAnimationFrame(() => {
      const maxScroll = Math.max(0, scrollContentW - (plotViewportW + PAD_L));
      if (!days || n <= days) {
        scrollRef.current?.scrollTo?.({ x: maxScroll, animated: false });
        return;
      }
      const x = Math.min(maxScroll, visStart * dayW);
      scrollRef.current?.scrollTo?.({ x, animated: false });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, n, scrollContentW, dayW, days, plotViewportW, visStart]);

  const emitFocus = idx => {
    setFocusIdx(idx);
    if (idx < 0 || !all[idx]) {
      onFocus?.(null);
      return;
    }
    const p = all[idx];
    onFocus({ date: p.date, balance: p.balance, income: p.income || 0 });
  };

  const onChartPress = evt => {
    if (!layout || !n) return;
    const x = evt.nativeEvent.locationX;
    const idx = Math.round(Math.max(0, Math.min(n - 1, (x - PAD_L) / dayW)));
    emitFocus(focusIdx === idx ? -1 : idx);
  };

  if (!n || !layout) {
    return (
      <View style={[styles.wrap, { width: viewportW, height: 80 }]}>
        <Text style={styles.empty}>No ledger history yet to build a balance chart.</Text>
      </View>
    );
  }

  const active = focusIdx >= 0 ? layout.points[focusIdx] : null;
  const price = active || layout.last;

  return (
    <View style={[styles.wrap, { width: viewportW, height: chartH }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator
        bounces={false}
        decelerationRate="fast"
        style={{ width: viewportW - Y_AXIS_W, height: chartH }}
        contentContainerStyle={{ width: scrollContentW, height: chartH }}>
        <Pressable onPress={onChartPress} style={{ width: scrollContentW, height: chartH }}>
          <Svg width={scrollContentW} height={chartH}>
            <Defs>
              <LinearGradient id="balShadow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={GOLD} stopOpacity="0.32" />
                <Stop offset="55%" stopColor={GOLD} stopOpacity="0.08" />
                <Stop offset="100%" stopColor={GOLD} stopOpacity="0.01" />
              </LinearGradient>
            </Defs>

            {/* Horizontal grid */}
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

            {/* Vertical grid at X ticks */}
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

            {/* Income bars under the area */}
            {layout.bars.map((b, i) =>
              b.show ? (
                <Rect key={`b${i}`} x={b.x} y={b.y} width={b.w} height={b.h} fill={INCOME_BAR} rx={1} />
              ) : null,
            )}

            <Path d={layout.areaD} fill="url(#balShadow)" />
            <Path
              d={layout.lineD}
              stroke={GOLD}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Always-on last price line (web priceLineStyle: Dotted) */}
            {layout.last ? (
              <Line
                x1={PAD_L}
                y1={layout.last.y}
                x2={PAD_L + contentPlotW}
                y2={layout.last.y}
                stroke="rgba(227,191,122,0.5)"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            ) : null}

            {active ? (
              <>
                <Line
                  x1={active.x}
                  y1={PAD_T}
                  x2={active.x}
                  y2={layout.bottomY}
                  stroke="rgba(227,191,122,0.4)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Line
                  x1={PAD_L}
                  y1={active.y}
                  x2={PAD_L + contentPlotW}
                  y2={active.y}
                  stroke="rgba(227,191,122,0.25)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <Circle cx={active.x} cy={active.y} r={5} fill={GOLD_HI} stroke="#07080c" strokeWidth={2} />
                <CrosshairLabels
                  active={active}
                  padL={PAD_L}
                  plotW={contentPlotW}
                  bottomY={layout.bottomY}
                  chartH={chartH}
                />
              </>
            ) : null}

            {/* X-axis: day numbers + month name at boundary */}
            {layout.xLabels.map((t, i) => (
              <SvgText
                key={`xl${i}`}
                x={t.x}
                y={chartH - 7}
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

      {/* Fixed right price scale — web rightPriceScale */}
      <View style={[styles.yAxis, { width: Y_AXIS_W, height: chartH }]} pointerEvents="none">
        <Svg width={Y_AXIS_W} height={chartH}>
          <Rect x={0} y={0} width={Y_AXIS_W} height={chartH} fill={SURFACE} fillOpacity={0.94} />
          {layout.yLabels.map((t, i) => (
            <SvgText
              key={`yl${i}`}
              x={4}
              y={t.y + 3}
              fill={AXIS}
              fontSize="10"
              fontFamily={fonts.regular}>
              {formatAxisPrice(t.v)}
            </SvgText>
          ))}
          {price ? (
            <>
              <Rect x={1} y={price.y - 9} width={Y_AXIS_W - 2} height={17} rx={2} fill={GOLD} />
              <SvgText
                x={Y_AXIS_W / 2}
                y={price.y + 3}
                fill="#17120a"
                fontSize="10"
                fontFamily={fonts.semibold}
                fontWeight="700"
                textAnchor="middle">
                {formatAxisPrice(price.v)}
              </SvgText>
            </>
          ) : null}
        </Svg>
      </View>

      <Text style={styles.tvMark}>TV</Text>
    </View>
  );
}

/** Web priceFormat precision: 2 — never compress to "k" */
function formatAxisPrice(v) {
  if (!Number.isFinite(v)) return '0.00';
  return Number(v).toFixed(2);
}

function parseDay(value) {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatFocusDay(time) {
  const d = parseDay(time);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * TradingView-style X labels: "4","7","10"… and "Nov" on month change.
 * Spacing targets ~every 3 days when ~30 points are visible.
 */
function buildXLabels(data, points, dayW, plotViewportW) {
  const n = data.length;
  if (!n) return [];
  // Aim for ~9–11 labels in the visible width (matches screenshot cadence)
  const approxVisible = Math.max(2, Math.round(plotViewportW / dayW) + 1);
  const every = Math.max(1, Math.round(approxVisible / 10));
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const d = parseDay(data[i].date || data[i].label);
    if (!d) continue;
    const prev = i > 0 ? parseDay(data[i - 1].date || data[i - 1].label) : null;
    const monthChange = prev && prev.getMonth() !== d.getMonth();
    const onCadence = i % every === 0;
    const isLast = i === n - 1;
    if (!onCadence && !monthChange && !isLast) continue;
    // Skip last if too close to previous tick
    if (isLast && out.length) {
      const prevX = out[out.length - 1].x;
      if (points[i].x - prevX < dayW * 1.5 && !monthChange) continue;
    }
    out.push({
      x: points[i].x,
      label: monthChange ? MONTHS[d.getMonth()] : String(d.getDate()),
    });
  }
  return out;
}

function CrosshairLabels({ active, padL, plotW, bottomY, chartH }) {
  const dateText = formatFocusDay(active.date);
  const valueText = formatAxisPrice(active.v);
  const tipW = Math.max(96, dateText.length * 6.4);
  const tipH = 38;
  let tipX = active.x + 10;
  if (tipX + tipW > padL + plotW) tipX = active.x - tipW - 10;
  tipX = Math.max(padL, tipX);
  let tipY = active.y - tipH - 8;
  if (tipY < 4) tipY = active.y + 10;

  const dateW = Math.max(72, dateText.length * 6.2);
  let dateX = active.x - dateW / 2;
  dateX = Math.max(padL, Math.min(dateX, padL + plotW - dateW));
  const dateY = Math.min(bottomY + 3, chartH - 16);

  return (
    <>
      <Rect
        x={tipX}
        y={tipY}
        width={tipW}
        height={tipH}
        rx={6}
        fill="#1c2130"
        stroke="rgba(227,191,122,0.35)"
      />
      <SvgText x={tipX + 8} y={tipY + 15} fill="#8c93a6" fontSize="9" fontFamily={fonts.regular}>
        {dateText}
      </SvgText>
      <SvgText
        x={tipX + 8}
        y={tipY + 30}
        fill="#EEF0F5"
        fontSize="12"
        fontFamily={fonts.semibold}
        fontWeight="700">
        {valueText}
      </SvgText>
      <Rect x={dateX} y={dateY} width={dateW} height={14} rx={3} fill="#1c2130" />
      <SvgText
        x={dateX + dateW / 2}
        y={dateY + 10}
        fill={GOLD_HI}
        fontSize="9"
        fontFamily={fonts.semibold}
        textAnchor="middle">
        {dateText}
      </SvgText>
    </>
  );
}

function niceTicks(min, max, target = 10) {
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
  wrap: {
    position: 'relative',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  yAxis: {
    position: 'absolute',
    right: 0,
    top: 0,
  },
  empty: {
    color: AXIS,
    fontSize: 11,
    fontFamily: fonts.regular,
    paddingVertical: 20,
  },
  tvMark: {
    position: 'absolute',
    left: 6,
    bottom: 26,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.3,
  },
});
