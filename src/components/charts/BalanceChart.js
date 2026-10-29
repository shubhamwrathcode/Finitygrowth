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

const GOLD = '#E3BF7A';
const GOLD_HI = '#F6E2B3';
const INCOME_BAR = 'rgba(139, 124, 255, 0.7)';
const GRID = 'rgba(255,255,255,0.05)';
const AXIS = '#8c93a6';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MARGIN_TOP = 0.12;
const MARGIN_BOTTOM = 0.32;
const RANGE_DAYS = { '7D': 7, '30D': 30, '90D': 90, All: 0 };
const DAY_W = 16;
const Y_AXIS_W = 44;
const PAD_L = 8;
const PAD_T = 6;
const PAD_B = 26;
const X_TICK_EVERY = 4;

function shouldShowXLabel(index, total) {
  if (index % X_TICK_EVERY === 0) return true;
  if (index === total - 1) {
    const prevTick = Math.floor((total - 2) / X_TICK_EVERY) * X_TICK_EVERY;
    return index - prevTick >= 2;
  }
  return false;
}

/**
 * Wallet balance chart — web TradingChart look with Earnings-style
 * horizontal ScrollView so X labels stay locked to each day.
 */
export default function BalanceChart({ series, range = '30D', width, height = 200, onFocus }) {
  const scrollRef = useRef(null);
  const [focusIdx, setFocusIdx] = useState(-1);

  const all = series || [];
  const days = RANGE_DAYS[range] || 0;
  const data = useMemo(() => {
    if (!all.length) return [];
    if (!days || all.length <= days) return all;
    return all.slice(-days);
  }, [all, days]);

  const n = data.length;
  const viewportW = Math.max(width, 120);
  const plotNeed = n > 1 ? (n - 1) * DAY_W : DAY_W;
  const contentPlotW = Math.max(plotNeed, viewportW - PAD_L - Y_AXIS_W);
  const chartW = PAD_L + contentPlotW + Y_AXIS_W;
  const plotH = Math.max(height - PAD_T - PAD_B, 80);
  const chartH = PAD_T + plotH + PAD_B;
  const pxPerPoint = n > 1 ? contentPlotW / (n - 1) : contentPlotW;

  const layout = useMemo(() => {
    if (!n) return null;

    const values = data.map(p => Number(p.balance) || 0);
    const incomes = data.map(p => Number(p.income) || 0);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const dataSpan = rawMax - rawMin;
    const dataFrac = 1 - MARGIN_TOP - MARGIN_BOTTOM;

    let yMax;
    let yMin;
    if (dataSpan < 1e-9) {
      yMax = rawMax + 0.06;
      yMin = rawMin - 0.1;
    } else {
      yMax = rawMax + dataSpan * (MARGIN_TOP / dataFrac);
      yMin = rawMin - dataSpan * (MARGIN_BOTTOM / dataFrac);
    }

    const xAt = i => PAD_L + (n === 1 ? contentPlotW / 2 : i * pxPerPoint);
    const yAt = v => PAD_T + ((yMax - v) / (yMax - yMin)) * plotH;
    const bottomY = PAD_T + plotH;

    const points = values.map((v, i) => ({
      x: xAt(i),
      y: yAt(v),
      v,
      date: data[i].date || data[i].label,
      income: Number(data[i].income) || 0,
    }));

    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const areaD =
      points.length > 0
        ? `${lineD} L${points[n - 1].x.toFixed(2)} ${bottomY} L${points[0].x.toFixed(2)} ${bottomY} Z`
        : '';

    const incomeMax = Math.max(...incomes, 0.0001);
    const barMaxH = plotH * (1 - MARGIN_BOTTOM + 0.02) * 0.28;
    const barW = Math.min(5, Math.max(2.5, pxPerPoint * 0.45));
    const bars = incomes.map((v, i) => {
      const h = (v / incomeMax) * barMaxH;
      return { x: xAt(i) - barW / 2, y: bottomY - h, w: barW, h, show: v > 0 };
    });

    const yLabels = niceTicks(yMin, yMax, 6).map(v => ({ v, y: yAt(v) }));

    // Day-of-month labels locked to points (same cadence as Earnings X ticks)
    const xLabels = [];
    for (let i = 0; i < n; i += 1) {
      if (!shouldShowXLabel(i, n)) continue;
      const d = parseDay(data[i].date || data[i].label);
      if (!d) continue;
      xLabels.push({
        x: xAt(i),
        label: formatXLabel(d, i, n, data),
      });
    }

    return {
      points,
      lineD,
      areaD,
      bars,
      yLabels,
      xLabels,
      bottomY,
      last: points[n - 1],
    };
  }, [data, n, contentPlotW, plotH, pxPerPoint]);

  // Latest days first in view — scroll to end (like web default visible range)
  useEffect(() => {
    setFocusIdx(-1);
    onFocus?.(null);
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd?.({ animated: false });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, n, chartW]);

  const emitFocus = idx => {
    setFocusIdx(idx);
    if (idx < 0 || !data[idx]) {
      onFocus?.(null);
      return;
    }
    const p = data[idx];
    onFocus({ date: p.date, balance: p.balance, income: p.income || 0 });
  };

  const onChartPress = evt => {
    if (!layout || !n) return;
    const x = evt.nativeEvent.locationX;
    const idx = Math.round(Math.max(0, Math.min(n - 1, (x - PAD_L) / pxPerPoint)));
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
    <View style={[styles.wrap, { width: viewportW }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator
        bounces={false}
        style={{ width: viewportW }}
        contentContainerStyle={{ width: chartW }}>
        <Pressable onPress={onChartPress}>
          <Svg width={chartW} height={chartH}>
            <Defs>
              <LinearGradient id="balShadow" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={GOLD} stopOpacity="0.32" />
                <Stop offset="55%" stopColor={GOLD} stopOpacity="0.08" />
                <Stop offset="100%" stopColor={GOLD} stopOpacity="0.01" />
              </LinearGradient>
            </Defs>

            {layout.yLabels.map((t, i) => (
              <Line
                key={`h${i}`}
                x1={PAD_L}
                y1={t.y}
                x2={PAD_L + contentPlotW}
                y2={t.y}
                stroke={GRID}
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
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
            ))}

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
                <Circle cx={active.x} cy={active.y} r={4.5} fill={GOLD_HI} stroke="#07080c" strokeWidth={2} />
                <CrosshairLabels
                  active={active}
                  padL={PAD_L}
                  plotW={contentPlotW}
                  bottomY={layout.bottomY}
                  chartH={chartH}
                />
              </>
            ) : null}

            {layout.yLabels.map((t, i) => (
              <SvgText
                key={`yl${i}`}
                x={PAD_L + contentPlotW + 6}
                y={t.y + 3}
                fill={AXIS}
                fontSize="10"
                fontFamily={fonts.regular}>
                {formatPrice(t.v)}
              </SvgText>
            ))}

            {price ? (
              <>
                <Rect
                  x={PAD_L + contentPlotW + 2}
                  y={price.y - 8}
                  width={40}
                  height={15}
                  rx={2}
                  fill={GOLD}
                />
                <SvgText
                  x={PAD_L + contentPlotW + 22}
                  y={price.y + 3}
                  fill="#17120a"
                  fontSize="9"
                  fontFamily={fonts.semibold}
                  fontWeight="700"
                  textAnchor="middle">
                  {formatPrice(price.v)}
                </SvgText>
              </>
            ) : null}

            {layout.xLabels.map((t, i) => (
              <SvgText
                key={`xl${i}`}
                x={t.x}
                y={chartH - 6}
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
      <Text style={styles.tvMark}>TV</Text>
    </View>
  );
}

function formatPrice(v) {
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

/** Prefer day number; show month at first / month-change ticks for context */
function formatXLabel(date, index, total, data) {
  const day = String(date.getDate());
  if (index === 0) return `${day} ${MONTHS[date.getMonth()]}`;
  const prev = parseDay(data[index - 1]?.date || data[index - 1]?.label);
  if (prev && prev.getMonth() !== date.getMonth()) {
    return MONTHS[date.getMonth()];
  }
  if (index === total - 1) {
    const prevTick = Math.floor((total - 2) / X_TICK_EVERY) * X_TICK_EVERY;
    if (index - prevTick >= 2) return day;
  }
  return day;
}

function formatFocusDay(time) {
  const d = parseDay(time);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function CrosshairLabels({ active, padL, plotW, bottomY, chartH }) {
  const dateText = formatFocusDay(active.date);
  const valueText = formatPrice(active.v);
  const tipW = Math.max(88, dateText.length * 6.2);
  const tipH = 36;
  let tipX = active.x + 10;
  if (tipX + tipW > padL + plotW) tipX = active.x - tipW - 10;
  tipX = Math.max(padL, tipX);
  let tipY = active.y - tipH - 8;
  if (tipY < 4) tipY = active.y + 10;

  const dateW = Math.max(72, dateText.length * 6.2);
  let dateX = active.x - dateW / 2;
  dateX = Math.max(padL, Math.min(dateX, padL + plotW - dateW));
  const dateY = Math.min(bottomY + 2, chartH - 16);

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
      <SvgText x={tipX + 8} y={tipY + 14} fill="#8c93a6" fontSize="9" fontFamily={fonts.regular}>
        {dateText}
      </SvgText>
      <SvgText
        x={tipX + 8}
        y={tipY + 28}
        fill="#EEF0F5"
        fontSize="11"
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
  wrap: { position: 'relative', alignSelf: 'stretch' },
  empty: { color: AXIS, fontSize: 11, fontFamily: fonts.regular, paddingVertical: 20 },
  tvMark: {
    position: 'absolute',
    left: 6,
    bottom: 22,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.4,
  },
});
