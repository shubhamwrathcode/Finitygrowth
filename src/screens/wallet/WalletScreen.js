import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Screen,
  Header,
  Card,
  Button,
  Segmented,
  Loading,
  ErrorView,
  Icon,
} from '../../components';
import { BalanceChart, EmptyRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { activityLabel, buildSeries, loadLedger } from '../../services/dashboardData';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing, type } from '../../theme';
import { money } from '../../utils/format';

const DAY = 24 * 60 * 60 * 1000;
const PER_PAGE = 12;
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];
const RANGES = ['7D', '30D', '90D', 'All'];

const KIND = {
  deposit: { group: 'deposits', icon: 'arrowDown' },
  purchase: { group: 'purchases', icon: 'box' },
  daily_earning: { group: 'income', icon: 'clock' },
  direct_commission: { group: 'income', icon: 'userCheck' },
  level_commission: { group: 'income', icon: 'bars' },
  transfer_in: { group: 'transfers', icon: 'arrowDownLeft' },
  transfer_out: { group: 'transfers', icon: 'send' },
  withdrawal: { group: 'withdrawals', icon: 'arrowUp' },
  withdrawal_refund: { group: 'withdrawals', icon: 'arrowDown' },
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'deposits', label: 'Deposits' },
  { value: 'purchases', label: 'Packages' },
  { value: 'transfers', label: 'Transfers' },
  { value: 'withdrawals', label: 'Withdrawals' },
];

const ACTIONS = [
  { label: 'Deposit', route: ROUTES.DEPOSIT, sub: 'Add funds', icon: 'arrowDown', primary: true },
  { label: 'Buy package', route: ROUTES.BUY_PACKAGE, sub: 'Start earning', icon: 'box' },
  { label: 'Transfer', route: ROUTES.TRANSFER, sub: 'To a member', icon: 'send' },
  { label: 'Withdraw', route: ROUTES.WITHDRAW, sub: 'To your address', icon: 'arrowUp' },
];

function moneyCur(value, currency) {
  return currency ? `${money(value)} ${currency}` : money(value);
}

function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(Date.now() - DAY);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatChartDay(time) {
  if (!time) return '—';
  const raw =
    typeof time === 'string' && /^\d{4}-\d{2}-\d{2}/.test(time) ? `${time.slice(0, 10)}T00:00:00` : time;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * WalletScreen – same as web WalletHome.jsx:
 * wallets + ledger rebuild → balance card, actions, 30d flow, TradingChart, statement.
 */
export default function WalletScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const walletQ = useApi(api.getWallets);
  const [ledger, setLedger] = useState(null);
  const [ledgerError, setLedgerError] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [range, setRange] = useState('30D');
  const [chartFocus, setChartFocus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const wallet = walletQ.data;
  const currency = wallet?.currency || 'USDT';
  const balance = Number(wallet?.balance || 0);
  const locked = Number(wallet?.lockedBalance || 0);

  const loadBooks = useCallback(async () => {
    setLedgerError('');
    try {
      const rows = await loadLedger();
      setLedger(rows);
    } catch (error) {
      setLedger([]);
      setLedgerError(error.message || 'Could not load statement');
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([walletQ.refresh(), loadBooks()]);
    setRefreshing(false);
  };

  const flow = useMemo(() => {
    const since = Date.now() - 30 * DAY;
    let inflow = 0;
    let outflow = 0;
    (ledger || []).forEach(row => {
      if (new Date(row.createdAt).getTime() < since) return;
      if (row.direction === 'debit') outflow += Number(row.amount || 0);
      else inflow += Number(row.amount || 0);
    });
    return { inflow, outflow, net: inflow - outflow };
  }, [ledger]);

  const seriesRaw = useMemo(
    () => (ledger && wallet ? buildSeries(ledger, balance) : null),
    [ledger, wallet, balance],
  );

  const chartSeries = useMemo(
    () => (seriesRaw ? api.getWalletChartSeries(seriesRaw, 'All') : []),
    [seriesRaw],
  );

  const filtered = useMemo(
    () => (ledger || []).filter(row => filter === 'all' || KIND[row.type]?.group === filter),
    [ledger, filter],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const groups = rows.reduce((acc, row) => {
    const label = dayLabel(row.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.rows.push(row);
    else acc.push({ label, rows: [row] });
    return acc;
  }, []);

  const fullBalance = seriesRaw?.balance || [];
  const rangeDays = { '7D': 7, '30D': 30, '90D': 90 }[range] || 0;
  const latestBal = fullBalance[fullBalance.length - 1];
  const rangeBase =
    rangeDays && fullBalance.length
      ? fullBalance[Math.max(0, fullBalance.length - rangeDays)]
      : fullBalance[0];
  const rangeChange = (latestBal?.value || 0) - (rangeBase?.value || 0);
  const rangeChangePct = rangeBase?.value ? (rangeChange / rangeBase.value) * 100 : 0;
  const changeUp = rangeChange >= 0;

  const rangeSeries = seriesRaw ? api.getWalletChartSeries(seriesRaw, range) : [];
  const shownBalance = chartFocus?.balance ?? latestBal?.value ?? balance;
  const shownIncome = chartFocus?.income ?? rangeSeries[rangeSeries.length - 1]?.income ?? 0;
  const shownDate =
    chartFocus?.date ?? latestBal?.time ?? rangeSeries[rangeSeries.length - 1]?.date ?? null;

  const chartWidth = width - spacing.screen * 2 - 24;

  if (walletQ.error && !wallet) {
    return (
      <Screen withTabBar>
        <Header back={false} title="Wallet" large />
        <ErrorView message={walletQ.error} onRetry={walletQ.refresh} />
      </Screen>
    );
  }

  if (walletQ.loading && !wallet) {
    return (
      <Screen withTabBar>
        <Header back={false} title="Wallet" large />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen withTabBar onRefresh={refresh} refreshing={refreshing || (walletQ.loading && !!wallet)}>
      <Header
        back={false}
        title="Wallet"
        large
        right={<Text style={styles.chip}>{currency} · BEP20</Text>}
      />

      <View style={styles.balanceCard}>
        <LinearGradient
          colors={['rgba(227,191,122,0.18)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(122,108,255,0.12)', 'transparent']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.2, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.cardTop}>
          <Text style={styles.cardLabel}>Spendable balance</Text>
          <View style={styles.live}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Available</Text>
          </View>
        </View>
        <Text style={styles.balanceAmt}>{money(balance)}</Text>
        <Text style={styles.balanceCur}>{currency}</Text>
        <View style={styles.cardFoot}>
          <View style={styles.footCell}>
            <Text style={styles.footLabel}>Locked</Text>
            <Text style={styles.footVal}>{moneyCur(locked, currency)}</Text>
          </View>
          <View style={styles.footCell}>
            <Text style={styles.footLabel}>Total incl. locked</Text>
            <Text style={styles.footVal}>{moneyCur(balance + locked, currency)}</Text>
          </View>
        </View>
        <Text style={styles.cardNote}>
          The only spendable amount. Deposits, nightly ROI, commissions and incoming transfers add to
          it. Locked funds are held for a pending withdrawal until it is cancelled or rejected.
        </Text>
      </View>

      <View style={styles.actions}>
        {ACTIONS.map(action => {
          const content = (
            <>
              <View style={[styles.actionIco, action.primary && styles.actionIcoPrimary]}>
                <Icon
                  name={action.icon}
                  size={18}
                  color={action.primary ? colors.goldInk : colors.gold}
                />
              </View>
              <Text style={[styles.actionTitle, action.primary && styles.actionTitlePrimary]}>
                {action.label}
              </Text>
              <Text style={[styles.actionSub, action.primary && styles.actionSubPrimary]}>
                {action.sub}
              </Text>
            </>
          );
          return (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              onPress={() => navigation.navigate(action.route)}
              style={({ pressed }) => [styles.actionPress, pressed && { opacity: 0.88 }]}>
              {action.primary ? (
                <LinearGradient
                  colors={GOLD_GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.action}>
                  {content}
                </LinearGradient>
              ) : (
                <View style={styles.action}>{content}</View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.flowGrid}>
        <FlowTile tone="in" mark="↙" label="Money in · 30 days" value={ledger ? `+${money(flow.inflow)}` : '…'} />
        <FlowTile tone="out" mark="↗" label="Money out · 30 days" value={ledger ? `−${money(flow.outflow)}` : '…'} />
        <FlowTile
          tone={flow.net >= 0 ? 'in' : 'out'}
          mark="±"
          label="Net change · 30 days"
          value={
            ledger
              ? `${flow.net >= 0 ? '+' : '−'}${money(Math.abs(flow.net))}`
              : '…'
          }
          valueTone={flow.net >= 0 ? 'pos' : 'neg'}
        />
        {wallet?.withdrawal ? (
          <View style={styles.flowTile}>
            <View style={styles.flowIco}>
              <Text style={styles.flowMark}>%</Text>
            </View>
            <Text style={styles.flowLabel}>Withdrawal</Text>
            <Text style={styles.flowVal}>{wallet.withdrawal.feePercent}% fee</Text>
            <Text style={styles.flowEm}>
              {money(wallet.withdrawal.minWithdrawal)} – {money(wallet.withdrawal.maxWithdrawal)}{' '}
              {currency}
            </Text>
          </View>
        ) : null}
      </View>

      <Card style={styles.chartCard} padding={12}>
        <View style={styles.tvTitleRow}>
          <Text style={styles.dashLabel}>Wallet balance</Text>
          <View style={styles.seg}>
            {RANGES.map(key => {
              const on = range === key;
              const chip = <Text style={[styles.rangeText, on && styles.rangeTextOn]}>{key}</Text>;
              return (
                <Pressable
                  key={key}
                  onPress={() => {
                    setRange(key);
                    setChartFocus(null);
                  }}
                  style={styles.rangePress}>
                  {on ? (
                    <LinearGradient
                      colors={GOLD_GRAD}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.rangeChip}>
                      {chip}
                    </LinearGradient>
                  ) : (
                    <View style={styles.rangeChip}>{chip}</View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
        <Text style={styles.chartValue}>
          {money(shownBalance)} {currency}
        </Text>
        {!chartFocus ? (
          <View
            style={[
              styles.changeChip,
              { backgroundColor: changeUp ? 'rgba(141,222,168,0.1)' : 'rgba(240,160,160,0.1)' },
            ]}>
            <Text style={[styles.changeText, { color: changeUp ? '#8ddea8' : '#f4a097' }]}>
              {changeUp ? '▲' : '▼'} {money(Math.abs(rangeChange))} ({Math.abs(rangeChangePct).toFixed(1)}
              %) · {range}
            </Text>
          </View>
        ) : null}
        <View style={styles.tvMeta}>
          <Text style={styles.tvMetaDate}>{shownDate ? formatChartDay(shownDate) : '—'}</Text>
          <Text style={styles.keyLabel}>Posted income {money(shownIncome)} {currency}</Text>
        </View>
        <View style={styles.chart}>
          {chartSeries.length ? (
            <BalanceChart
              series={chartSeries}
              range={range}
              width={chartWidth}
              height={176}
              onFocus={setChartFocus}
            />
          ) : ledger === null ? (
            <Loading />
          ) : (
            <Text style={type.tiny}>No ledger history yet to build a balance chart.</Text>
          )}
        </View>
      </Card>

      <Card style={styles.mt16}>
        <Text style={type.h2}>Statement</Text>
        <Text style={[type.tiny, styles.mt4]}>Every movement on your wallet</Text>
        <Segmented
          variant="pill"
          options={FILTERS}
          value={filter}
          onChange={key => {
            setFilter(key);
            setPage(1);
          }}
          style={styles.mt12}
        />

        {ledger === null ? (
          <View style={styles.histLoading}>
            <Loading />
          </View>
        ) : ledgerError && !ledger.length ? (
          <ErrorView message={ledgerError} onRetry={loadBooks} />
        ) : groups.length ? (
          groups.map(group => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.day}>{group.label}</Text>
              {group.rows.map(row => {
                const debit = row.direction === 'debit';
                const meta = KIND[row.type] || KIND.deposit;
                return (
                  <View key={row.id} style={styles.row}>
                    <View style={[styles.rowIco, debit ? styles.rowIcoOut : styles.rowIcoIn]}>
                      <Icon
                        name={meta.icon}
                        size={15}
                        color={debit ? colors.danger : colors.success}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {activityLabel[row.type] || row.type}
                      </Text>
                      <Text style={styles.rowNote} numberOfLines={1}>
                        {row.note || '—'}
                      </Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={[styles.rowAmt, debit ? styles.amtOut : styles.amtIn]}>
                        {debit ? '−' : '+'}
                        {moneyCur(row.amount, currency)}
                      </Text>
                      <Text style={styles.rowTime}>
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
          ))
        ) : (
          <EmptyRing size={100} message="No transactions in this view yet." />
        )}

        {pages > 1 ? (
          <View style={styles.pager}>
            <Button
              title="Previous"
              variant="outline"
              size="md"
              disabled={page <= 1}
              onPress={() => setPage(p => Math.max(1, p - 1))}
            />
            <Text style={type.tiny}>
              {page} / {pages}
            </Text>
            <Button
              title="Next"
              variant="outline"
              size="md"
              disabled={page >= pages}
              onPress={() => setPage(p => Math.min(pages, p + 1))}
            />
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

function FlowTile({ tone, mark, label, value, valueTone }) {
  return (
    <View style={styles.flowTile}>
      <View style={[styles.flowIco, tone === 'in' ? styles.flowIn : tone === 'out' ? styles.flowOut : null]}>
        <Text style={[styles.flowMark, tone === 'in' && styles.markIn, tone === 'out' && styles.markOut]}>
          {mark}
        </Text>
      </View>
      <Text style={styles.flowLabel}>{label}</Text>
      <Text
        style={[
          styles.flowVal,
          valueTone === 'pos' && styles.amtIn,
          valueTone === 'neg' && styles.amtOut,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  chip: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSoft,
    backgroundColor: colors.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  balanceCard: {
    marginTop: 8,
    padding: 18,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.3)',
    backgroundColor: '#10131b',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(141,222,168,0.1)',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#8ddea8' },
  liveText: { fontFamily: fonts.bold, fontSize: 11, color: '#8ddea8' },
  balanceAmt: {
    marginTop: 10,
    fontFamily: fonts.display,
    fontSize: 40,
    color: colors.text,
    letterSpacing: -1,
    lineHeight: 44,
  },
  balanceCur: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1.6,
    marginTop: 2,
  },
  cardFoot: { flexDirection: 'row', gap: 8, marginTop: 14 },
  footCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: colors.line,
    gap: 2,
  },
  footLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  footVal: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  cardNote: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.subtle,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  actionPress: { width: '48%', flexGrow: 1 },
  action: {
    minHeight: 108,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    gap: 2,
  },
  actionIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.25)',
  },
  actionIcoPrimary: {
    backgroundColor: 'rgba(23,18,10,0.12)',
    borderColor: 'rgba(23,18,10,0.2)',
  },
  actionTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  actionTitlePrimary: { color: colors.goldInk },
  actionSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  actionSubPrimary: { color: 'rgba(23,18,10,0.65)' },
  flowGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  flowTile: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  flowIco: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
    marginBottom: 4,
  },
  flowIn: { backgroundColor: 'rgba(141,222,168,0.1)' },
  flowOut: { backgroundColor: 'rgba(240,160,160,0.1)' },
  flowMark: { fontSize: 14, color: colors.gold, fontFamily: fonts.bold },
  markIn: { color: '#8ddea8' },
  markOut: { color: '#f0a0a0' },
  flowLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  flowVal: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.text },
  flowEm: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  chartCard: { marginTop: 14, zIndex: 2 },
  tvTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  dashLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  seg: { flexDirection: 'row', gap: 4 },
  rangePress: { borderRadius: 999, overflow: 'hidden' },
  rangeChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.elevated,
  },
  rangeText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  rangeTextOn: { color: colors.goldInk },
  chartValue: {
    marginTop: 8,
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.4,
  },
  changeChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  changeText: { fontFamily: fonts.semibold, fontSize: 11 },
  tvMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  tvMetaDate: { fontFamily: fonts.medium, fontSize: 11, color: colors.subtle },
  keyLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  chart: { marginTop: 4 },
  histLoading: { minHeight: 120, justifyContent: 'center' },
  group: { marginTop: 14 },
  day: { fontFamily: fonts.medium, fontSize: 12, color: colors.subtle, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIco: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcoIn: { backgroundColor: 'rgba(141,222,168,0.1)' },
  rowIcoOut: { backgroundColor: 'rgba(240,160,160,0.1)' },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  rowNote: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, marginTop: 1 },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowAmt: { fontFamily: fonts.semibold, fontSize: 13 },
  amtIn: { color: colors.success },
  amtOut: { color: colors.danger },
  rowTime: { fontFamily: fonts.regular, fontSize: 10, color: colors.subtle },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 12,
  },
});
