import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Screen,
  Header,
  Card,
  Button,
  Segmented,
  Loading,
  ErrorView,
  IconCircle,
  Icon,
} from '../../components';
import { StackedBarChart, Legend, EmptyRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing, type } from '../../theme';
import { money } from '../../utils/format';

const DAY = 24 * 60 * 60 * 1000;
const WINDOW = 30;

/** Same sources as web Earnings.jsx */
const SOURCES = [
  {
    key: 'daily',
    type: 'daily_earning',
    label: 'Package ROI',
    short: 'Daily',
    hint: 'Nightly package return, credited at 12:00 AM IST.',
    icon: 'box',
    color: '#bd8b30',
  },
  {
    key: 'direct',
    type: 'direct_commission',
    label: 'Direct commission',
    short: 'Direct',
    hint:
      'Paid once, when a direct referral buys their first package. It is a percent of that amount and is added immediately. A later package by the same person does not pay it again.',
    icon: 'userCheck',
    color: '#8b7cff',
  },
  {
    key: 'levels',
    type: 'level_commission',
    label: 'Level commission',
    short: 'Level',
    hint:
      'A percent of a team member’s nightly ROI, paid at 12:00 AM IST. The note names the level. A blocked upline is skipped.',
    icon: 'bars',
    color: '#24a194',
  },
];

const SERIES = SOURCES.map(s => ({ key: s.key, label: s.label, color: s.color }));

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupByDay(rows) {
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY));
  const groups = [];
  rows.forEach(row => {
    const key = dayKey(row.createdAt);
    const label =
      key === today
        ? 'Today'
        : key === yesterday
          ? 'Yesterday'
          : new Date(row.createdAt).toLocaleDateString(undefined, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, label, rows: [row] });
  });
  return groups;
}

function buildDailyRows(recent) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: WINDOW }, (_, i) => new Date(today.getTime() - (WINDOW - 1 - i) * DAY));
  return days.map(d => {
    const key = dayKey(d);
    const row = {
      date: key,
      // Compact like web Apex labels: "30 Sep", "4 Oct"
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    };
    SOURCES.forEach(source => {
      const totals = (recent?.[source.key] || []).reduce((sum, item) => {
        if (dayKey(item.createdAt) !== key) return sum;
        return sum + Number(item.amount || 0);
      }, 0);
      row[source.key] = Math.round(totals * 100) / 100;
    });
    return row;
  });
}

/**
 * EarningsScreen – mirrors web Earnings.jsx:
 * summary hero, source cards, 30-day stacked chart, paginated history by source.
 */
export default function EarningsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const summary = useApi(api.getEarningsSummary);
  const wallet = useApi(api.getWallets);
  const [tab, setTab] = useState('daily');
  const [page, setPage] = useState(1);
  const list = useApi(() => api.getEarningsList(tab, { page, limit: 10 }), [tab, page]);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    let live = true;
    api
      .getEarningsChartRecent()
      .then(data => live && setRecent(data))
      .catch(() => live && setRecent({}));
    return () => {
      live = false;
    };
  }, []);

  const s = summary.data;
  const currency = wallet.data?.currency || 'USDT';
  const amounts = s
    ? {
        daily: Number(s.packageEarned || 0),
        direct: Number(s.directCommission || 0),
        levels: Number(s.levelCommission || 0),
      }
    : null;
  const total = amounts ? amounts.daily + amounts.direct + amounts.levels : 0;
  const last30 = recent
    ? SOURCES.reduce(
        (sum, source) =>
          sum + (recent[source.key] || []).reduce((a, row) => a + Number(row.amount || 0), 0),
        0,
      )
    : null;
  const source = SOURCES.find(item => item.key === tab) || SOURCES[0];
  const groups = groupByDay(list.data?.data || []);
  const dailyRows = useMemo(() => (recent ? buildDailyRows(recent) : []), [recent]);

  const totalPages = Math.max(1, Math.ceil((list.data?.total || 0) / (list.data?.limit || 10)));

  const onTab = key => {
    setTab(key);
    setPage(1);
  };

  const refreshing = summary.loading || list.loading;
  const onRefresh = () => {
    summary.refresh();
    wallet.refresh();
    list.refresh();
    api
      .getEarningsChartRecent()
      .then(setRecent)
      .catch(() => setRecent({}));
  };

  if (summary.loading && !s) {
    return (
      <Screen>
        <Header title="Earnings" />
        <Loading />
      </Screen>
    );
  }

  if (summary.error && !s) {
    return (
      <Screen>
        <Header title="Earnings" />
        <ErrorView message={summary.error} onRetry={summary.refresh} />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={onRefresh} refreshing={refreshing && !!s}>
      <Header title="Earnings" />

      <View style={styles.hero}>
        <Text style={type.small}>Total earned · all sources</Text>
        <Text style={styles.total}>{amounts ? money(total) : '…'}</Text>
        <Text style={styles.currency}>{currency}</Text>
        <View style={styles.metaRow}>
          {last30 != null ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>+{money(last30)} in the last 30 days</Text>
            </View>
          ) : null}
          {s ? (
            <Text style={type.tiny}>
              {s.activePurchases} active package{s.activePurchases === 1 ? '' : 's'}
            </Text>
          ) : null}
        </View>

        <View style={styles.walletCard}>
          <Text style={type.tiny}>Balance</Text>
          <Text style={styles.balance}>{s ? money(s.balance) : '…'}</Text>
          {s && Number(s.lockedBalance) > 0 ? (
            <Text style={type.tiny}>{money(s.lockedBalance)} locked for a withdrawal</Text>
          ) : null}
          <View style={styles.actions}>
            <Button
              title="Withdraw"
              size="sm"
              onPress={() => navigation.navigate(ROUTES.WITHDRAW)}
              style={styles.flex1}
            />
            <Button
              title="Transfer"
              size="sm"
              variant="secondary"
              onPress={() => navigation.navigate(ROUTES.TRANSFER)}
              style={styles.flex1}
            />
          </View>
        </View>
      </View>

      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sourcesRow}
        style={styles.sourcesScroll}>
        {SOURCES.map(item => {
          const value = amounts ? amounts[item.key] : 0;
          const share = total ? (value / total) * 100 : 0;
          const isDaily = item.key === 'daily';
          const barPct = isDaily
            ? s?.packageExpected
              ? Math.min(100, (Number(s.packageEarned || 0) / Number(s.packageExpected || 1)) * 100)
              : 0
            : share;
          const foot = isDaily
            ? `of ${money(s?.packageExpected || 0)} scheduled`
            : `${share.toFixed(1)}% of all earnings`;
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onTab(item.key)}
              style={[
                styles.sourceCard,
                active && styles.sourceCardActive,
                { borderColor: active ? item.color : colors.lineStrong },
              ]}>
              <View style={[styles.sourceAccent, { backgroundColor: item.color }]} />
              <View style={styles.sourceTop}>
                <View style={[styles.sourceIco, { backgroundColor: `${item.color}2E` }]}>
                  <Icon name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={styles.share}>{amounts ? `${share.toFixed(0)}%` : ''}</Text>
              </View>
              <Text style={styles.sourceLabel}>{item.label}</Text>
              <Text style={styles.sourceAmt}>{amounts ? money(value) : '…'}</Text>
              <View style={styles.sourceFoot}>
                <View style={styles.earnBar}>
                  <View style={[styles.earnBarFill, { width: `${barPct}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={styles.sourceFootText}>{foot}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Card style={[styles.mt24, styles.chartCard]}>
        <View style={styles.chartHead}>
          <View style={styles.flex1}>
            <Text style={type.h2}>Daily earnings</Text>
            <Text style={type.tiny}>Last 30 days, stacked by source</Text>
          </View>
          <Legend items={SERIES} style={styles.chartLegend} />
        </View>
        <View style={styles.chartWrap}>
          {recent ? (
            <StackedBarChart
              rows={dailyRows}
              series={SERIES}
              width={width - spacing.screen * 2 - 32}
              height={220}
              currency={currency}
            />
          ) : (
            <Loading />
          )}
        </View>
      </Card>

      <Card style={styles.mt24}>
        <Text style={type.h2}>{source.label} history</Text>
        <Text style={[type.tiny, styles.mt4]}>{source.hint}</Text>
        <Segmented
          variant="underline"
          options={SOURCES.map(item => ({ value: item.key, label: item.short }))}
          value={tab}
          onChange={onTab}
          style={styles.mt12}
        />

        {/* Same as web: loading → skel; else error; else rows; else empty copy (no endless spinner). */}
        {list.loading ? (
          <View style={styles.histLoading}>
            <Loading />
          </View>
        ) : list.error ? (
          <ErrorView message={list.error} onRetry={list.refresh} />
        ) : groups.length ? (
          groups.map(group => {
            const dayTotal = group.rows.reduce((a, row) => a + Number(row.amount || 0), 0);
            return (
              <View key={group.key} style={styles.group}>
                <View style={styles.dayRow}>
                  <Text style={styles.day}>{group.label}</Text>
                  <Text style={styles.daySum}>+{money(dayTotal)}</Text>
                </View>
                {group.rows.map((row, i) => {
                  const meta = SOURCES.find(x => x.type === row.type) || source;
                  return (
                    <View
                      key={row.id || `${group.key}-${i}`}
                      style={[styles.histRow, i < group.rows.length - 1 && styles.histLine]}>
                      <IconCircle name={meta.icon} size={36} color={meta.color} bg={`${meta.color}22`} />
                      <View style={styles.flex1}>
                        <Text style={styles.histTitle}>{meta.label}</Text>
                        <Text style={type.tiny} numberOfLines={2}>
                          {row.note || '—'}
                        </Text>
                      </View>
                      <View style={styles.histRight}>
                        <Text style={styles.histAmt}>+{money(row.amount)}</Text>
                        <Text style={type.tiny}>
                          {new Date(row.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })
        ) : (
          <EmptyRing message={`No ${source.label.toLowerCase()} yet.`} />
        )}

        {totalPages > 1 ? (
          <View style={styles.pager}>
            <Button
              title="Previous"
              variant="outline"
              size="md"
              disabled={page <= 1 || list.loading}
              onPress={() => setPage(p => Math.max(1, p - 1))}
            />
            <Text style={type.tiny}>
              {page} / {totalPages}
            </Text>
            <Button
              title="Next"
              variant="outline"
              size="md"
              disabled={page >= totalPages || list.loading}
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mt24: { marginTop: 24 },
  chartCard: { zIndex: 2 },
  chartHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  chartLegend: { marginTop: 0, flexShrink: 1, justifyContent: 'flex-end', maxWidth: '48%' },
  chartWrap: { marginTop: 8, zIndex: 3 },
  center: { textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hero: { alignItems: 'center', marginTop: 10, gap: 6 },
  total: { fontFamily: fonts.serif, fontSize: 56, color: colors.text, lineHeight: 62 },
  currency: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 8 },
  chip: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.success },
  walletCard: {
    alignSelf: 'stretch',
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  balance: { fontFamily: fonts.semibold, fontSize: 22, color: colors.text },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  sourcesScroll: { marginTop: 22, marginHorizontal: -spacing.screen },
  sourcesRow: { paddingHorizontal: spacing.screen, gap: 12, paddingVertical: 2 },
  sourceCard: {
    width: 200,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    gap: 3,
    overflow: 'hidden',
  },
  sourceCardActive: { backgroundColor: colors.elevated },
  sourceAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.7 },
  sourceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sourceIco: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  share: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  sourceLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  sourceAmt: { fontFamily: fonts.display, fontSize: 20, color: colors.text, letterSpacing: -0.4 },
  sourceFoot: { marginTop: 2, gap: 4 },
  earnBar: {
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  earnBarFill: { height: '100%', borderRadius: 999 },
  sourceFootText: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  group: { marginTop: 16 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  day: { fontFamily: fonts.medium, fontSize: 12, color: colors.subtle },
  daySum: { fontFamily: fonts.semibold, fontSize: 12, color: colors.success },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  histLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  histTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  histRight: { alignItems: 'flex-end', gap: 2 },
  histAmt: { fontFamily: fonts.semibold, fontSize: 14, color: colors.success },
  histLoading: { minHeight: 120, justifyContent: 'center' },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
});
