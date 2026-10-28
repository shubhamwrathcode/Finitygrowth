import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Screen,
  Card,
  Section,
  Icon,
  TransactionRow,
  EmptyState,
  Loading,
  ErrorView,
} from '../../components';
import {
  BalanceChart,
  DonutChart,
  EmptyRing,
  SimpleBarChart,
  CashFlowChart,
} from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { INCOME_TYPES, toTransactionRow } from '../../services/dashboardData';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, radius, spacing, type } from '../../theme';
import { money, percent, round2 } from '../../utils/format';

/**
 * DashboardScreen (Home tab)
 * Layout mirrors web Dashboard: hero + quick actions + 2×2 stats +
 * wallet chart card + income donut, then packages / team / activity.
 * Same APIs + ledger rebuild as web useDashboardData.
 */
const RANGES = ['7D', '30D', '90D', 'All'];
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];
const INCOME_PURPLE = 'rgba(139, 124, 255, 0.75)';

function formatChartDay(time) {
  if (!time) return '—';
  const raw = typeof time === 'string' && /^\d{4}-\d{2}-\d{2}/.test(time) ? `${time.slice(0, 10)}T00:00:00` : time;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

const TX_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'income', label: 'Income', types: INCOME_TYPES },
  { key: 'wallet', label: 'Deposits', types: ['deposit'] },
  { key: 'out', label: 'Withdrawals', types: ['withdrawal', 'withdrawal_refund'] },
  { key: 'transfers', label: 'Transfers', types: ['transfer_in', 'transfer_out'] },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { data, loading, error, refresh } = useApi(api.getDashboard);
  const [range, setRange] = useState('30D');
  const [chartFocus, setChartFocus] = useState(null);
  const [txFilter, setTxFilter] = useState('all');

  if (!data) {
    return (
      <Screen withTabBar>
        {error ? <ErrorView message={error} onRetry={refresh} /> : <Loading />}
      </Screen>
    );
  }

  const { user, wallet, incomeBreakdown, team, currency } = data;
  const cardPad = spacing.screen * 2;
  const chartWidth = width - cardPad - 32;
  const fullBalance = data.series?.balance || [];
  // Full history — chart window/zoom handled inside BalanceChart (web TradingChart style)
  const series = api.getWalletChartSeries(data.series, 'All');
  const unit = currency || 'USDT';
  const firstName = user.firstName || 'Member';

  const income = [
    { key: 'roi', label: 'Package earnings', value: incomeBreakdown.roi, color: colors.gold },
    { key: 'direct', label: 'Direct commission', value: incomeBreakdown.direct, color: colors.goldDeep },
    { key: 'level', label: 'Level commission', value: incomeBreakdown.level, color: colors.info },
  ];

  const filterTypes = TX_FILTERS.find(item => item.key === txFilter)?.types;
  const ledgerSource = data.ledger?.length ? data.ledger : null;
  const recentRows = (
    ledgerSource
      ? (filterTypes ? ledgerSource.filter(row => filterTypes.includes(row.type)) : ledgerSource)
          .slice(0, 6)
          .map(toTransactionRow)
      : (filterTypes
          ? data.recentTransactions.filter(row => filterTypes.includes(row.type))
          : data.recentTransactions
        ).slice(0, 6)
  );

  // Change vs range baseline — same formula as web TradingChart
  const rangeDays = { '7D': 7, '30D': 30, '90D': 90 }[range] || 0;
  const latestBal = fullBalance[fullBalance.length - 1];
  const firstBal = fullBalance[rangeDays ? Math.max(0, fullBalance.length - rangeDays - 1) : 0];
  const rangeChange = latestBal && firstBal ? round2(latestBal.value - firstBal.value) : 0;
  const rangeChangePct = firstBal?.value ? (rangeChange / firstBal.value) * 100 : 0;
  const changeUp = rangeChange >= 0;

  const rangeSeries = api.getWalletChartSeries(data.series, range);
  const shownBalance = chartFocus?.balance ?? latestBal?.value ?? wallet.balance;
  const shownIncome =
    chartFocus?.income ?? rangeSeries[rangeSeries.length - 1]?.income ?? 0;
  const shownDate = chartFocus?.date ?? latestBal?.time ?? rangeSeries[rangeSeries.length - 1]?.date ?? null;

  const gap = 10;
  const statWidth = (width - cardPad - gap) / 2;

  return (
    <Screen withTabBar onRefresh={refresh} refreshing={loading}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.hello}>
            {greeting()}, <Text style={styles.helloGold}>{firstName}</Text>
          </Text>
          <Text style={styles.heroSub}>
            {user.loginId ? `Login ID ${user.loginId}. ` : ''}
            Here’s how your wallet, packages and team are moving.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)}
          style={styles.bell}>
          <Icon name="bell" size={20} color={colors.gold} />
          {data.unreadCount ? <View style={styles.dot} /> : null}
        </Pressable>
      </View>

      {/* Quick actions — pill row like web */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actions}
        style={styles.actionsScroll}>
        <Action
          icon="box"
          label="Buy package"
          primary
          onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)}
        />
        <Action icon="plus" label="Deposit" onPress={() => navigation.navigate(ROUTES.DEPOSIT)} />
        <Action icon="up" label="Withdraw" onPress={() => navigation.navigate(ROUTES.WITHDRAW)} />
        <Action icon="send" label="Transfer" onPress={() => navigation.navigate(ROUTES.TRANSFER)} />
      </ScrollView>

      {/* 2×2 stats — icons match web Dashboard StatCards */}
      <View style={styles.stats}>
        <StatCard
          width={statWidth}
          icon="wallet"
          label="Balance"
          value={`${money(wallet.balance)} ${unit}`}
          sub="Spendable. Deposits, ROI and transfers use this."
          featured
          onPress={() => navigation.navigate(ROUTES.WALLET)}
        />
        <StatCard
          width={statWidth}
          icon="coins"
          label="Locked"
          value={`${money(wallet.locked)} ${unit}`}
          sub="Pending withdrawal. Not spendable."
        />
        <StatCard
          width={statWidth}
          icon="trend"
          label="Income · 30 days"
          value={`${money(data.income30)} ${unit}`}
          sub="Package, direct and level"
          delta={data.incomeDelta}
          onPress={() => navigation.navigate(ROUTES.EARNINGS)}
        />
        <StatCard
          width={statWidth}
          icon="team"
          label="Team"
          value={String(team.total)}
          sub={`${team.directs} direct · ${team.activePackages} active package${
            team.activePackages === 1 ? '' : 's'
          }`}
          onPress={() => navigation.navigate(ROUTES.TEAM)}
        />
      </View>

      {/* Wallet balance — mirrors web TradingChart */}
      <Card style={styles.chartCard} padding={12}>
        <View style={styles.tvHead}>
          <View style={styles.tvLeft}>
            <View style={styles.tvTitleRow}>
              <Text style={styles.dashLabel}>Wallet balance</Text>
              <View style={styles.seg}>
                {RANGES.map(key => {
                  const on = range === key;
                  const chip = (
                    <Text style={[styles.rangeText, on && styles.rangeTextOn]}>{key}</Text>
                  );
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
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
                          style={[styles.rangeChip, styles.rangeGlow]}>
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
            <View style={styles.tvValueRow}>
              <Text style={styles.chartValue}>
                {money(shownBalance)} {unit}
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
            </View>
            <View style={styles.tvMeta}>
              <Text style={styles.tvMetaDate}>{shownDate ? formatChartDay(shownDate) : '—'}</Text>
              <View style={styles.legendKey}>
                <View style={styles.keyLine} />
                <Text style={styles.keyLabel}>Balance</Text>
              </View>
              <View style={styles.legendKey}>
                <View style={styles.keyBar} />
                <Text style={styles.keyLabel}>
                  Posted income {money(shownIncome)} {unit}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.chart}>
          {series.length ? (
            <BalanceChart
              series={series}
              range={range}
              width={chartWidth}
              height={188}
              onFocus={setChartFocus}
            />
          ) : (
            <Text style={type.tiny}>No ledger history yet to build a balance chart.</Text>
          )}
        </View>
      </Card>

      {/* Income breakdown */}
      <Card style={styles.blockCard} padding={16}>
        <View style={styles.cardHead}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Income breakdown</Text>
            <Text style={styles.cardSub}>All posted earnings by source</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => navigation.navigate(ROUTES.EARNINGS)}>
            <Text style={styles.cardLink}>Details</Text>
          </Pressable>
        </View>
        <View style={styles.donutWrap}>
          <DonutChart
            data={income}
            centerTitle={money(incomeBreakdown.total, 0)}
            centerSubtitle={unit}
            holeColor={colors.surface}
            emptyMessage="No earnings posted yet. They appear here once a package or commission pays."
          />
        </View>
        <View style={styles.legendCol}>
          {income.map(i => (
            <View key={i.key} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: i.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {i.label}
              </Text>
              <Text style={styles.legendValue} numberOfLines={1}>
                {money(i.value)} {unit}
              </Text>
              <Text style={styles.legendPct} numberOfLines={1}>
                {percent(incomeBreakdown.total ? i.value / incomeBreakdown.total : 0, 0)}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.blockCard} padding={16}>
        <View style={styles.cardHead}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Active packages</Text>
            <Text style={styles.cardSub}>Credited each night at 12:00 AM IST</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => navigation.navigate(ROUTES.MY_PACKAGES)}>
            <Text style={styles.cardLink}>View all</Text>
          </Pressable>
        </View>
        {data.activePackages.length === 0 ? (
          <EmptyRing size={120} message="No active package yet.">
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)}
              style={styles.pkgBuyBtn}>
              <LinearGradient colors={GOLD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pkgBuyGrad}>
                <Text style={styles.pkgBuyText}>Buy a package</Text>
              </LinearGradient>
            </Pressable>
          </EmptyRing>
        ) : (
          data.activePackages.slice(0, 3).map(p => (
            <Pressable
              key={p.id}
              style={styles.pkg}
              onPress={() => navigation.navigate(ROUTES.MY_PACKAGES)}>
              <View style={styles.pkgHead}>
                <Text style={styles.pkgName}>
                  {p.planName}
                  {p.amount ? ` · ${money(p.amount, 0)} ${unit}` : ''}
                </Text>
                <Text style={styles.pkgDaily}>+{money(p.dailyAmount)}/day</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${p.progress * 100}%` }]} />
              </View>
              <View style={styles.pkgHead}>
                <Text style={type.tiny}>
                  Day {p.daysElapsed} of {p.durationDays}
                </Text>
                <Text style={type.tiny}>
                  {money(p.earned)} / {money(p.totalPayout)} {unit}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </Card>

      <Card style={styles.blockCard} padding={16}>
        <View style={styles.cardHead}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Team by level</Text>
            <Text style={styles.cardSub}>
              {team.directs} direct · {team.total} across 5 levels
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => navigation.navigate(ROUTES.LEVELS)}>
            <Text style={styles.cardLink}>Levels</Text>
          </Pressable>
        </View>
        <SimpleBarChart
          width={width - spacing.screen * 2 - 32}
          height={220}
          items={(team.byLevel || [0, 0, 0, 0, 0]).slice(0, 5).map((v, i) => ({
            label: `L${i + 1}`,
            value: v,
          }))}
        />
      </Card>

      <Card tone="gold" style={styles.mt24} onPress={() => navigation.navigate(ROUTES.REFERRAL)}>
        <View style={styles.refRow}>
          <View>
            <Text style={styles.refLabel}>Your referral code</Text>
            <Text style={styles.refCode}>{data.referral.code || '—'}</Text>
          </View>
          <View style={styles.refBtn}>
            <Text style={styles.refBtnText}>Invite</Text>
          </View>
        </View>
        <Text style={styles.refStats}>
          DIRECT {team.directs} · TEAM {team.total} · PACKAGES {team.activePackages}
        </Text>
      </Card>

      <Card style={styles.blockCard} padding={16}>
        <View style={styles.cardHead}>
          <View style={styles.flex1}>
            <Text style={styles.cardTitle}>Cash flow</Text>
            <Text style={styles.cardSub}>
              Weekly totals, last 8 weeks · money in above the line, out below
            </Text>
          </View>
        </View>
        {data.cashFlow?.length ? (
          <CashFlowChart
            weeks={data.cashFlow}
            width={width - spacing.screen * 2 - 32}
            height={220}
          />
        ) : null}
      </Card>

      <Section
        title="Recent transactions"
        action="View all"
        onAction={() => navigation.navigate(ROUTES.WALLET)}>
        <View style={styles.filters}>
          {TX_FILTERS.map(item => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: txFilter === item.key }}
              onPress={() => setTxFilter(item.key)}
              style={[styles.filterChip, txFilter === item.key && styles.filterChipOn]}>
              <Text style={[styles.filterText, txFilter === item.key && styles.filterTextOn]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {recentRows.length ? (
          recentRows.map((t, i) => (
            <TransactionRow key={t.id || `${t.type}-${i}`} item={t} last={i === recentRows.length - 1} />
          ))
        ) : (
          <EmptyState icon="wallet" title="No transactions in this view yet" />
        )}
      </Section>

      <Text style={styles.dashNote}>
        Charts are built from your posted ledger. Scheduled package payouts are not counted until they
        post.
      </Text>
    </Screen>
  );
}

function Action({ icon, label, onPress, primary }) {
  const content = (
    <>
      <Icon name={icon} size={14} color={primary ? colors.goldInk : colors.gold} strokeWidth={2} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </>
  );

  if (primary) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionPress}>
        <LinearGradient
          colors={GOLD_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.action, styles.actionPrimary]}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.action}>
      {content}
    </Pressable>
  );
}

function StatCard({ width, icon, label, value, sub, featured, delta, onPress }) {
  const content = (
    <>
      <View style={styles.statTop}>
        <View style={styles.statIcon}>
          <Icon name={icon} size={16} color={colors.gold} strokeWidth={1.9} />
        </View>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        {delta != null ? (
          <View
            style={[
              styles.deltaChip,
              { backgroundColor: delta >= 0 ? colors.successSoft : colors.warningSoft },
            ]}>
            <Text style={{ color: delta >= 0 ? colors.success : colors.warning, fontSize: 10, fontFamily: fonts.bold }}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statSub} numberOfLines={2}>
        {sub}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.statCard,
          featured && styles.statFeatured,
          { width },
          pressed && { opacity: 0.88 },
        ]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.statCard, featured && styles.statFeatured, { width }]}>{content}</View>;
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt8: { marginTop: 8 },
  dashNote: {
    marginTop: 8,
    marginBottom: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtle,
  },
  mt24: { marginTop: 24 },

  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  heroText: { flex: 1, paddingRight: 4 },
  hello: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  helloGold: { color: colors.gold },
  heroSub: {
    marginTop: 6,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.subtle,
  },
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 11,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },

  actionsScroll: { marginTop: 14, marginHorizontal: -spacing.screen },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.screen,
  },
  actionPress: { borderRadius: radius.pill },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionPrimary: {
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: colors.gold,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
  },
  actionTextPrimary: { color: colors.goldInk },

  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
    minHeight: 118,
  },
  statFeatured: {
    borderColor: colors.goldLine,
    backgroundColor: '#12141C',
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(227,185,110,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.muted,
  },
  deltaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.text,
    letterSpacing: -0.3,
  },
  statSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: colors.subtle,
  },

  chartCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  blockCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tvHead: {
    marginBottom: 2,
  },
  tvLeft: { flex: 1, minWidth: 0 },
  tvTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dashLabel: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.muted,
  },
  tvValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tvMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    columnGap: 10,
  },
  tvMetaDate: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.subtle,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  cardSub: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.subtle,
  },
  cardLink: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.gold,
  },
  seg: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  rangePress: { borderRadius: 8 },
  rangeChip: {
    minHeight: 26,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeGlow: {
    shadowColor: colors.gold,
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  rangeText: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  rangeTextOn: { color: colors.goldInk },
  chartValue: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: colors.text,
    letterSpacing: -0.3,
  },
  changeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  changeText: { fontFamily: fonts.semibold, fontSize: 10 },
  legendKey: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyLine: { width: 12, height: 2, borderRadius: 1, backgroundColor: colors.gold },
  keyBar: { width: 7, height: 8, borderRadius: 2, backgroundColor: INCOME_PURPLE },
  keyLabel: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted },
  chart: { marginTop: 6 },

  donutWrap: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  legendCol: { gap: 4 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSoft,
    minWidth: 0,
  },
  legendValue: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  legendPct: {
    minWidth: 36,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.subtle,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },

  pkg: { marginBottom: 10, gap: 10, paddingTop: 4 },
  pkgHead: { flexDirection: 'row', justifyContent: 'space-between' },
  pkgName: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
    flex: 1,
    paddingRight: 8,
  },
  pkgDaily: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
  pkgBuyBtn: { marginTop: 4, borderRadius: 999, overflow: 'hidden' },
  pkgBuyGrad: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  pkgBuyText: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.goldInk,
  },

  refRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refLabel: { fontFamily: fonts.semibold, fontSize: 11, color: '#3D2F18' },
  refCode: {
    fontFamily: fonts.mono,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2,
    color: colors.goldInk,
    marginTop: 2,
  },
  refBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    backgroundColor: colors.goldInk,
    justifyContent: 'center',
  },
  refBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  refStats: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.goldInk,
    marginTop: 14,
  },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.elevated,
  },
  filterChipOn: { backgroundColor: colors.gold },
  filterText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  filterTextOn: { color: colors.goldInk },
});
