import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Screen,
  Header,
  Card,
  Button,
  Segmented,
  Badge,
  Loading,
  ErrorView,
} from '../../components';
import { EmptyRing, PayoutChart, ProgressRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { dayCredit, istDayIndex, istMidnight, planTotal, portfolioSeries } from '../../services/schedule';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing, type } from '../../theme';
import { money } from '../../utils/format';

const LIST_LIMIT = 9;
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];

const fmtDate = date =>
  date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

function moneyCur(value, currency) {
  return currency ? `${money(value)} ${currency}` : money(value);
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'completed') return 'gold';
  return 'neutral';
}

function PurchaseCard({ item, currency }) {
  const total = Number(item.expectedTotal ?? planTotal(item));
  const earned = Number(item.earnedAmount || 0);
  const pct = item.durationDays ? (item.creditedDays / item.durationDays) * 100 : 0;
  const start = istDayIndex(item.startDate);
  const end = istMidnight(start + item.durationDays);
  const left = Math.max(0, item.durationDays - item.creditedDays);
  const completed = String(item.status).toLowerCase() === 'completed';
  const earnPct = total ? Math.min(100, (earned / total) * 100) : 0;

  return (
    <Card style={[styles.ppCard, completed && styles.ppCompleted]} padding={16}>
      <View style={styles.ppTop}>
        <LinearGradient
          colors={GOLD_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mono}>
          <Text style={styles.monoText}>{(item.packageName || 'P').slice(0, 1)}</Text>
        </LinearGradient>
        <View style={styles.flex1}>
          <Text style={styles.ppName} numberOfLines={1}>
            {item.packageName}
          </Text>
          <Text style={styles.ppCode}>{item.packageCode}</Text>
        </View>
        <Badge
          label={String(item.status || '').replaceAll('_', ' ')}
          tone={statusTone(item.status)}
        />
      </View>

      <View style={styles.ppMid}>
        <ProgressRing
          progress={pct / 100}
          size={72}
          stroke={6}
          color={completed ? colors.success : colors.gold}
          label={`${pct.toFixed(0)}%`}
        />
        <View style={styles.ppDl}>
          <View style={styles.ppRow}>
            <Text style={styles.ppDt}>Invested</Text>
            <Text style={styles.ppDd}>{moneyCur(item.amount, currency)}</Text>
          </View>
          <View style={styles.ppRow}>
            <Text style={styles.ppDt}>Earned</Text>
            <Text style={[styles.ppDd, styles.gold]}>{moneyCur(earned, currency)}</Text>
          </View>
          <View style={styles.ppRow}>
            <Text style={styles.ppDt}>Plan total</Text>
            <Text style={styles.ppDd}>
              {money(total)}
              {item.multiplier ? (
                <Text style={styles.mult}> {item.multiplier}×</Text>
              ) : null}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ppProgress}>
        <View style={styles.ppBar}>
          <LinearGradient
            colors={GOLD_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.ppFill, { width: `${earnPct}%` }]}
          />
        </View>
        <View style={styles.ppBarText}>
          <Text style={styles.ppTiny}>
            {item.creditedDays}/{item.durationDays} nights
          </Text>
          <Text style={styles.ppTiny}>{left ? `${left} left` : 'Finished'}</Text>
        </View>
      </View>

      <View style={styles.ppFoot}>
        <View style={styles.ppFootItem}>
          <Text style={styles.ppTiny}>Each night</Text>
          <Text style={styles.ppFootVal}>{moneyCur(item.dailyEarning, currency)}</Text>
        </View>
        <View style={styles.ppFootItem}>
          <Text style={styles.ppTiny}>Started</Text>
          <Text style={styles.ppFootVal}>{fmtDate(new Date(item.startDate))}</Text>
        </View>
        <View style={styles.ppFootItem}>
          <Text style={styles.ppTiny}>Ends</Text>
          <Text style={styles.ppFootVal}>{fmtDate(end)}</Text>
        </View>
      </View>
    </Card>
  );
}

/**
 * MyPackagesScreen – same as web MyPackages.jsx:
 * portfolio stats, payout chart across all purchases, filtered purchase cards.
 */
export default function MyPackagesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [all, setAll] = useState(null);

  const list = useApi(
    () => api.getPurchases({ page, limit: LIST_LIMIT, status }),
    [page, status],
  );
  const wallet = useApi(api.getWallets);
  const currency = wallet.data?.currency || 'USDT';

  useEffect(() => {
    let live = true;
    api
      .loadAllPurchases()
      .then(rows => live && setAll(rows))
      .catch(() => live && setAll([]));
    return () => {
      live = false;
    };
  }, []);

  const summary = useMemo(() => {
    const rows = all || [];
    const active = rows.filter(row => row.status === 'active');
    const invested = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const earned = rows.reduce((sum, row) => sum + Number(row.earnedAmount || 0), 0);
    const remaining = active.reduce(
      (sum, row) =>
        sum + (Number(row.expectedTotal ?? planTotal(row)) - Number(row.earnedAmount || 0)),
      0,
    );
    const nextNight = active
      .filter(row => row.creditedDays < row.durationDays)
      .reduce((sum, row) => sum + dayCredit(row, row.creditedDays + 1), 0);
    const counts = rows.reduce(
      (acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }),
      {},
    );
    return {
      invested,
      earned,
      remaining,
      nextNight,
      active: active.length,
      total: rows.length,
      counts,
    };
  }, [all]);

  const series = useMemo(() => portfolioSeries(all || []), [all]);
  const rows = list.data?.data || [];
  const tabs = [
    { value: '', label: all ? `All ${summary.total}` : 'All' },
    { value: 'active', label: all ? `Active ${summary.counts.active || 0}` : 'Active' },
    {
      value: 'completed',
      label: all ? `Completed ${summary.counts.completed || 0}` : 'Completed',
    },
  ];

  const total = list.data?.total || 0;
  const limit = list.data?.limit || LIST_LIMIT;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  const refreshAll = async () => {
    await Promise.all([
      list.refresh(),
      wallet.refresh(),
      api
        .loadAllPurchases()
        .then(setAll)
        .catch(() => setAll([])),
    ]);
  };

  return (
    <Screen onRefresh={refreshAll} refreshing={list.loading && !!list.data}>
      <Header
        title="My packages"
        right={
          <Button
            title="+ Buy"
            size="sm"
            onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)}
          />
        }
      />
      <Text style={[type.small, styles.lede]}>
        Each package pays one credit a night at 12:00 AM IST. The purchase day stays at 0 until
        that midnight.
      </Text>

      <View style={styles.stats}>
        <Card style={[styles.stat, styles.statFeatured]} padding={14}>
          <Text style={styles.statLabel}>Total invested</Text>
          <Text style={styles.statValue}>{all ? money(summary.invested) : '…'}</Text>
          <Text style={styles.statSub}>
            {summary.active} active · {summary.total} total
          </Text>
        </Card>
        <Card style={styles.stat} padding={14}>
          <Text style={styles.statLabel}>Earned so far</Text>
          <Text style={[styles.statValue, styles.gold]}>
            {all ? money(summary.earned) : '…'}
          </Text>
          <Text style={styles.statSub}>{currency} credited from packages</Text>
        </Card>
        <Card style={styles.stat} padding={14}>
          <Text style={styles.statLabel}>Still scheduled</Text>
          <Text style={styles.statValue}>{all ? money(summary.remaining) : '…'}</Text>
          <Text style={styles.statSub}>Across active packages</Text>
        </Card>
        <Card style={styles.stat} padding={14}>
          <Text style={styles.statLabel}>Next payout · 12:00 AM IST</Text>
          <Text style={styles.statValue}>{all ? money(summary.nextNight) : '…'}</Text>
          <Text style={styles.statSub}>
            {summary.nextNight ? 'From active packages' : 'No credit scheduled'}
          </Text>
        </Card>
      </View>

      <Card style={styles.chartCard} padding={16}>
        {all === null ? (
          <Loading />
        ) : series.total.length ? (
          <PayoutChart
            series={series}
            currency={currency}
            width={width - spacing.screen * 2 - 32}
            height={220}
          />
        ) : (
          <View style={styles.chartEmpty}>
            <EmptyRing size={88} />
            <Text style={styles.emptyText}>Your payout chart appears once you buy a package.</Text>
            <Button
              title="Buy a package"
              size="md"
              onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)}
            />
          </View>
        )}
      </Card>

      <View style={styles.listHead}>
        <Text style={type.h2}>Purchases</Text>
        <Segmented
          variant="pill"
          options={tabs}
          value={status}
          onChange={value => {
            setStatus(value);
            setPage(1);
          }}
        />
      </View>

      {list.loading && !list.data ? (
        <Loading />
      ) : list.error && !list.data ? (
        <ErrorView message={list.error} onRetry={list.refresh} />
      ) : rows.length ? (
        <View style={styles.grid}>
          {rows.map(item => (
            <PurchaseCard key={item.id} item={item} currency={currency} />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyList}>No packages in this view.</Text>
      )}

      {pageCount > 1 ? (
        <View style={styles.pager}>
          <Button
            title="Previous"
            variant="ghost"
            size="md"
            disabled={page <= 1 || list.loading}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          />
          <Text style={styles.pagerText}>
            {page} / {pageCount}
          </Text>
          <Button
            title="Next"
            variant="ghost"
            size="md"
            disabled={page >= pageCount || list.loading}
            onPress={() => setPage(p => Math.min(pageCount, p + 1))}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  lede: { marginTop: 4, marginBottom: 4 },
  gold: { color: colors.gold },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  stat: { width: '47%', flexGrow: 1, gap: 4 },
  statFeatured: {
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.28)',
    backgroundColor: '#14131a',
  },
  statLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
  },
  statSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  chartCard: { marginTop: 14, minHeight: 160 },
  chartEmpty: { alignItems: 'center', gap: 14, paddingVertical: 28 },
  emptyText: { ...type.small, textAlign: 'center', maxWidth: 260 },
  listHead: { marginTop: 22, gap: 12 },
  grid: { marginTop: 12, gap: 12 },
  emptyList: {
    marginTop: 24,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  ppCard: {
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  ppCompleted: { borderColor: 'rgba(141,222,168,0.25)' },
  ppTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mono: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoText: { fontFamily: fonts.display, fontSize: 18, color: colors.goldInk },
  ppName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  ppCode: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, marginTop: 2 },
  ppMid: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ppDl: { flex: 1, gap: 8 },
  ppRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ppDt: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  ppDd: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  mult: { fontFamily: fonts.regular, fontSize: 12, color: colors.subtle, fontStyle: 'italic' },
  ppProgress: { gap: 6 },
  ppBar: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  ppFill: { height: '100%', borderRadius: 999 },
  ppBarText: { flexDirection: 'row', justifyContent: 'space-between' },
  ppTiny: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  ppFoot: { flexDirection: 'row', gap: 8 },
  ppFootItem: { flex: 1, gap: 2 },
  ppFootVal: { fontFamily: fonts.medium, fontSize: 12, color: colors.text },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  pagerText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
