import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
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

/**
 * Wallet balance chart — web TradingChart (lightweight-charts) behaviour:
 * - visible window = last N days for range (7D/30D/90D/All)
 * - X ticks = TickMarks._buildMarksImpl + defaultTickMarkFormatter
 * - horizontal pan shifts the window; X labels update with it
 */
export default function BalanceChart({ series, range = '30D', width, height = 200, onFocus }) {
  const n = series?.length || 0;
  const windowSize = useMemo(() => {
    const days = RANGE_DAYS[range] || 0;
    if (!days || !n) return Math.max(n, 1);
    return Math.min(days, n);
  }, [range, n]);

  // How many bars we’ve panned back from the latest (0 = latest window, like web default)
  const [back, setBack] = useState(0);
  const backRef = useRef(0);
  const [focusIdx, setFocusIdx] = useState(-1);
  const focusRef = useRef(-1);
  const dragRef = useRef({ mode: null, startBack: 0, startX: 0 });

  const maxBack = Math.max(0, n - windowSize);

  useEffect(() => {
    backRef.current = back;
  }, [back]);

  // Range change → latest window (web setVisibleLogicalRange to end)
  useEffect(() => {
    setBack(0);
    backRef.current = 0;
    setFocusIdx(-1);
    focusRef.current = -1;
    onFocus?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, n, windowSize]);

  const end = n - 1 - back;
  const start = Math.max(0, end - windowSize + 1);
  const visible = useMemo(
    () => (n ? series.slice(start, end + 1) : []),
    [series, start, end, n],
  );
  const vn = visible.length;

  const padL = 4;
  const padR = 44;
  const padT = 6;
  const padB = 22;
  const plotW = Math.max(width - padL - padR, 80);
  const plotH = Math.max(height - padT - padB, 80);
  const chartH = padT + plotH + padB;
  const chartW = padL + plotW + padR;
  const pxPerPoint = vn > 1 ? plotW / (vn - 1) : plotW;

  const layout = useMemo(() => {
    if (!vn) return null;

    const values = visible.map(p => Number(p.balance) || 0);
    const incomes = visible.map(p => Number(p.income) || 0);
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

    const xAt = i => padL + (vn === 1 ? plotW / 2 : i * pxPerPoint);
    const yAt = v => padT + ((yMax - v) / (yMax - yMin)) * plotH;
    const bottomY = padT + plotH;

    const points = values.map((v, i) => ({
      x: xAt(i),
      y: yAt(v),
      v,
      date: visible[i].date || visible[i].label,
      income: Number(visible[i].income) || 0,
    }));

    const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
    const areaD =
      points.length > 0
        ? `${lineD} L${points[vn - 1].x.toFixed(2)} ${bottomY} L${points[0].x.toFixed(2)} ${bottomY} Z`
        : '';

    const incomeMax = Math.max(...incomes, 0.0001);
    const barMaxH = plotH * (1 - MARGIN_BOTTOM + 0.02) * 0.28;
    const barW = Math.min(5, Math.max(2, pxPerPoint * 0.4));
    const bars = incomes.map((v, i) => {
      const h = (v / incomeMax) * barMaxH;
      return { x: xAt(i) - barW / 2, y: bottomY - h, w: barW, h, show: v > 0 };
    });

    const yLabels = niceTicks(yMin, yMax, 8).map(v => ({ v, y: yAt(v) }));

    // X labels — exact lightweight-charts TickMarks (same as web TradingChart)
    const xLabels = buildLwcXLabels(series, start, end, i => xAt(i - start), plotW);

    return {
      points,
      lineD,
      areaD,
      bars,
      yLabels,
      xLabels,
      bottomY,
      last: points[vn - 1],
      yAt,
      pxPerPoint,
    };
  }, [series, start, end, visible, vn, plotW, plotH, pxPerPoint, padL, padT]);

  const emitFocus = idx => {
    if (focusRef.current === idx) return;
    focusRef.current = idx;
    setFocusIdx(idx);
    if (idx < 0 || !visible[idx]) {
      onFocus?.(null);
      return;
    }
    const p = visible[idx];
    onFocus({ date: p.date, balance: p.balance, income: p.income || 0 });
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 6,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: e => {
          dragRef.current = {
            mode: null,
            startBack: backRef.current,
            startX: e.nativeEvent.locationX,
          };
        },
        onPanResponderMove: (e, g) => {
          if (!layout) return;
          const absX = Math.abs(g.dx);
          const absY = Math.abs(g.dy);
          const drag = dragRef.current;

          if (!drag.mode) {
            if (absX < 8 && absY < 8) return;
            drag.mode = maxBack > 0 && absX > absY ? 'scroll' : 'focus';
          }

          if (drag.mode === 'scroll') {
            // Finger right → older history (increase back)
            const shift = Math.round(g.dx / layout.pxPerPoint);
            const next = Math.max(0, Math.min(maxBack, drag.startBack + shift));
            if (next !== backRef.current) {
              backRef.current = next;
              setBack(next);
            }
            emitFocus(-1);
            return;
          }

          const x = e.nativeEvent.locationX;
          const t = Math.max(0, Math.min(1, (x - padL) / plotW));
          emitFocus(Math.round(t * (vn - 1)));
        },
        onPanResponderRelease: e => {
          const drag = dragRef.current;
          if (drag.mode !== 'scroll' && layout) {
            const x = e.nativeEvent.locationX;
            const t = Math.max(0, Math.min(1, (x - padL) / plotW));
            emitFocus(Math.round(t * (vn - 1)));
            setTimeout(() => emitFocus(-1), 2200);
          } else {
            emitFocus(-1);
          }
          dragRef.current.mode = null;
        },
        onPanResponderTerminate: () => {
          emitFocus(-1);
          dragRef.current.mode = null;
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, vn, maxBack, plotW, padL],
  );

  if (!vn || !layout) {
    return (
      <View style={[styles.wrap, { width, height: 80 }]}>
        <Text style={styles.empty}>No ledger history yet to build a balance chart.</Text>
      </View>
    );
  }

  const active = focusIdx >= 0 ? layout.points[focusIdx] : null;
  const price = active || layout.last;

  return (
    <View style={[styles.wrap, { width: chartW, height: chartH }]} {...pan.panHandlers}>
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
            x1={padL}
            y1={t.y}
            x2={padL + plotW}
            y2={t.y}
            stroke={GRID}
            strokeWidth={1}
          />
        ))}

        {layout.xLabels.map((t, i) => (
          <Line
            key={`v${i}`}
            x1={t.x}
            y1={padT}
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
              y1={padT}
              x2={active.x}
              y2={layout.bottomY}
              stroke="rgba(227,191,122,0.4)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <Circle cx={active.x} cy={active.y} r={4.5} fill={GOLD_HI} stroke="#07080c" strokeWidth={2} />
            <CrosshairLabels active={active} padL={padL} plotW={plotW} bottomY={layout.bottomY} chartH={chartH} />
          </>
        ) : null}

        {/* Y-axis */}
        {layout.yLabels.map((t, i) => (
          <SvgText
            key={`yl${i}`}
            x={padL + plotW + 6}
            y={t.y + 3}
            fill={AXIS}
            fontSize="10"
            fontFamily={fonts.regular}>
            {formatPrice(t.v)}
          </SvgText>
        ))}

        {price ? (
          <>
            <Rect x={padL + plotW + 2} y={price.y - 8} width={40} height={15} rx={2} fill={GOLD} />
            <SvgText
              x={padL + plotW + 22}
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

        {/* X-axis — days from the visible window only */}
        {layout.xLabels.map((t, i) => (
          <SvgText
            key={`xl${i}`}
            x={t.x}
            y={chartH - 5}
            fill={AXIS}
            fontSize="11"
            fontFamily={fonts.regular}
            textAnchor="middle">
            {t.label}
          </SvgText>
        ))}
      </Svg>
      <Text style={styles.tvMark}>TV</Text>
    </View>
  );
}

function formatPrice(v) {
  if (!Number.isFinite(v)) return '0.00';
  return Number(v).toFixed(2);
}

/**
 * X-axis ticks — port of lightweight-charts TickMarks._buildMarksImpl +
 * defaultTickMarkFormatter (web TradingChart uses createChart defaults, no custom formatter).
 *
 * Weights (HorzScaleBehaviorTime.weightByTime):
 *   Year 70 · Month 60 · Day 50
 * Spacing: maxLabelWidth = (fontSize + 4) * 5, maxIndexesPerMark = ceil(maxLabelWidth / barSpacing)
 * Labels: Year → year, Month → short month, Day → day-of-month number
 */
function buildLwcXLabels(series, start, end, xAtGlobal, plotW) {
  const n = series?.length || 0;
  const vn = end - start + 1;
  if (!n || vn <= 0 || start < 0 || end >= n) return [];

  // TradingChart: setVisibleLogicalRange → barSpacing = width / days;
  // All / short history → fitContent() with rightOffset: 2 → width / (bars + 2)
  const fitContent = start === 0 && end === n - 1;
  const barSpacing = plotW / Math.max(fitContent ? vn + 2 : vn, 1);
  const fontSize = 11;
  const maxLabelWidth = (fontSize + 4) * 5;
  const maxIndexesPerMark = Math.max(1, Math.ceil(maxLabelWidth / barSpacing));

  const dates = new Array(n);
  for (let i = 0; i < n; i += 1) {
    dates[i] = parseDayUtc(series[i].date || series[i].label);
  }

  const weights = fillLwcTimeWeights(dates);
  const marksByWeight = new Map();
  for (let i = 0; i < n; i += 1) {
    const w = weights[i];
    if (!marksByWeight.has(w)) marksByWeight.set(w, []);
    marksByWeight.get(w).push({ index: i, weight: w, date: dates[i] });
  }

  const marks = buildLwcMarksImpl(marksByWeight, maxIndexesPerMark);
  const out = [];
  for (let i = 0; i < marks.length; i += 1) {
    const tm = marks[i];
    if (tm.index < start || tm.index > end) continue;
    if (!tm.date) continue;
    out.push({ x: xAtGlobal(tm.index), label: formatLwcTick(tm.date, tm.weight) });
  }
  return out;
}

/** UTC calendar date from YYYY-MM-DD (business-day, same as LWC string converter) */
function parseDayUtc(value) {
  if (!value) return null;
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const y = Number(s.slice(0, 4));
    const m = Number(s.slice(5, 7));
    const d = Number(s.slice(8, 10));
    return new Date(Date.UTC(y, m - 1, d));
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function lwcWeightByTime(current, prev) {
  if (current.getUTCFullYear() !== prev.getUTCFullYear()) return 70;
  if (current.getUTCMonth() !== prev.getUTCMonth()) return 60;
  if (current.getUTCDate() !== prev.getUTCDate()) return 50;
  return 50;
}

/** fillWeightsForPoints from lightweight-charts */
function fillLwcTimeWeights(dates) {
  const n = dates.length;
  const weights = new Array(n).fill(50);
  if (!n) return weights;

  let totalDiff = 0;
  for (let i = 1; i < n; i += 1) {
    const cur = dates[i];
    const prev = dates[i - 1];
    if (cur && prev) {
      weights[i] = lwcWeightByTime(cur, prev);
      totalDiff += (cur.getTime() - prev.getTime()) / 1000;
    }
  }
  if (n > 1 && dates[0]) {
    const avg = Math.ceil(totalDiff / (n - 1));
    const approxPrev = new Date(dates[0].getTime() - avg * 1000);
    weights[0] = lwcWeightByTime(dates[0], approxPrev);
  }
  return weights;
}

/** TickMarks._private__buildMarksImpl — higher weights first, then fill gaps */
function buildLwcMarksImpl(marksByWeight, maxIndexesPerMark) {
  let marks = [];
  const weights = Array.from(marksByWeight.keys()).sort((a, b) => b - a);
  for (let wi = 0; wi < weights.length; wi += 1) {
    const prevMarks = marks;
    marks = [];
    const prevMarksLength = prevMarks.length;
    let prevMarksPointer = 0;
    const currentWeight = marksByWeight.get(weights[wi]) || [];
    let rightIndex = Infinity;
    let leftIndex = -Infinity;
    for (let i = 0; i < currentWeight.length; i += 1) {
      const mark = currentWeight[i];
      const currentIndex = mark.index;
      while (prevMarksPointer < prevMarksLength) {
        const lastMark = prevMarks[prevMarksPointer];
        const lastIndex = lastMark.index;
        if (lastIndex < currentIndex) {
          prevMarksPointer += 1;
          marks.push(lastMark);
          leftIndex = lastIndex;
          rightIndex = Infinity;
        } else {
          rightIndex = lastIndex;
          break;
        }
      }
      if (rightIndex - currentIndex >= maxIndexesPerMark && currentIndex - leftIndex >= maxIndexesPerMark) {
        marks.push(mark);
        leftIndex = currentIndex;
      }
    }
    for (; prevMarksPointer < prevMarksLength; prevMarksPointer += 1) {
      marks.push(prevMarks[prevMarksPointer]);
    }
  }
  return marks;
}

/** defaultTickMarkFormatter + weightToTickMarkType (timeVisible=false) */
function formatLwcTick(date, weight) {
  if (weight >= 70) {
    return String(date.getUTCFullYear());
  }
  if (weight >= 60) {
    return MONTHS[date.getUTCMonth()];
  }
  return String(date.getUTCDate());
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
      <Rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6} fill="#1c2130" stroke="rgba(227,191,122,0.35)" />
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

function niceTicks(min, max, target = 8) {
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
    bottom: 20,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    letterSpacing: 0.4,
  },
});
