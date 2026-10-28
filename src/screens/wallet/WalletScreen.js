import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';
import { Screen, Header, Section, Segmented, TransactionRow, EmptyState, Icon, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, radius, type } from '../../theme';
import { money, percent, signed } from '../../utils/format';

/**
 * WalletScreen (Wallet tab) – balance card, 4 actions, last-30-days flow
 * and the full statement with filters.
 * Data: api.getWallet() and api.getStatement(filter)
 */
const FILTERS = ['All', 'Income', 'Deposits', 'Packages', 'Transfers', 'Withdrawals'];

export default function WalletScreen({ navigation }) {
  const [filter, setFilter] = useState('All');
  const wallet = useApi(api.getWallet);
  const statement = useApi(() => api.getStatement(filter), [filter]);

  const w = wallet.data;
  const refresh = () => {
    wallet.refresh();
    statement.refresh();
  };

  return (
    <Screen withTabBar onRefresh={refresh} refreshing={wallet.loading && !!w}>
      <Header back={false} title="Wallet" large right={<Text style={styles.chip}>USDT · BEP20</Text>} />
      {!w ? (
        <Loading />
      ) : (
        <>
          {/* Balance card */}
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardLabel}>SPENDABLE BALANCE</Text>
              <Svg width={34} height={26}>
                <Rect x={0.5} y={0.5} width={33} height={25} rx={5} fill={colors.gold} stroke={colors.goldDeep} />
                <Path d="M0 9h11M0 17h11M23 9h11M23 17h11M11 0v26M23 0v26" stroke={colors.goldDeep} strokeWidth={1} />
              </Svg>
            </View>
            <View style={styles.cardBalance}>
              <Text style={type.hero}>{money(w.balance)}</Text>
              <Text style={styles.cardUnit}>USDT available</Text>
            </View>
            <View style={styles.flex1} />
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardMini}>Locked</Text>
                <Text style={styles.cardMiniValue}>{money(w.locked)}</Text>
              </View>
              <View>
                <Text style={styles.cardMini}>Total incl. locked</Text>
                <Text style={styles.cardMiniValue}>{money(w.total)}</Text>
              </View>
              <Text style={styles.cardBrand}>FINITYGROWTH</Text>
            </View>
          </View>
          <Text style={[type.tiny, styles.mt12]}>
            The only spendable amount. Deposits, nightly ROI, commissions and incoming transfers add to it. Locked funds are held for a pending withdrawal until it is cancelled or rejected.
          </Text>

          {/* Actions */}
          <View style={styles.tiles}>
            <Tile icon="arrowDown" title="Deposit" sub="Add funds" onPress={() => navigation.navigate(ROUTES.DEPOSIT)} />
            <Tile icon="box" title="Buy package" sub="Start earning" gold onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)} />
            <Tile icon="send" title="Transfer" sub="To a member" onPress={() => navigation.navigate(ROUTES.TRANSFER)} />
            <Tile icon="arrowUp" title="Withdraw" sub="To your address" onPress={() => navigation.navigate(ROUTES.WITHDRAW)} />
          </View>

          {/* Last 30 days */}
          <Section title="Last 30 days" subtitle={`Balance ${w.change30 >= 0 ? '▲' : '▼'} ${signed(w.change30)} (${percent(w.change30Pct, 1)})`}>
            <FlowRow icon="↙" label="Money in" value={signed(w.moneyIn)} tone="in" />
            <FlowRow icon="↗" label="Money out" value={signed(w.moneyOut)} tone="out" />
            <FlowRow icon="±" label="Net change" value={signed(w.net)} last />
            <View style={styles.rule}>
              <Text style={styles.ruleSymbol}>%</Text>
              <Text style={type.small}>
                Withdrawal · {percent(w.rules.withdrawal.feeRate)} fee · {money(w.rules.withdrawal.min)} – {money(w.rules.withdrawal.max)} USDT
              </Text>
            </View>
          </Section>
        </>
      )}

      {/* Statement */}
      <Section title="Statement" subtitle="Every movement on your wallet">
        <Segmented variant="pill" options={FILTERS} value={filter} onChange={setFilter} />
        {!statement.data ? (
          <Loading />
        ) : statement.data.length === 0 ? (
          <EmptyState icon="file" text="No transactions in this view yet." />
        ) : (
          statement.data.map((t, i) => <TransactionRow key={t.id} item={t} last={i === statement.data.length - 1} />)
        )}
      </Section>
    </Screen>
  );
}

function Tile({ icon, title, sub, onPress, gold }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.tile, gold && styles.tileGold, pressed && { opacity: 0.85 }]}>
      <View style={styles.tileTop}>
        <Icon name={icon} size={22} color={gold ? colors.goldInk : colors.gold} />
        <Icon name="arrowUpRight" size={14} color={gold ? colors.goldInk : colors.subtle} strokeWidth={2} />
      </View>
      <View>
        <Text style={[styles.tileTitle, gold && { color: colors.goldInk }]}>{title}</Text>
        <Text style={[type.tiny, gold && { color: '#3D2F18' }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function FlowRow({ icon, label, value, tone, last }) {
  const c = tone === 'in' ? colors.success : tone === 'out' ? colors.warning : colors.textSoft;
  const bg = tone === 'in' ? colors.successSoft : tone === 'out' ? colors.warningSoft : colors.elevated;
  return (
    <View style={[styles.flow, !last && styles.flowLine]}>
      <View style={[styles.flowIcon, { backgroundColor: bg }]}><Text style={{ color: c }}>{icon}</Text></View>
      <Text style={[type.body, styles.flex1]}>{label}</Text>
      <Text style={styles.flowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt12: { marginTop: 12 },
  chip: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSoft, backgroundColor: colors.elevated, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  card: { height: 212, borderRadius: 22, backgroundColor: '#17130D', borderWidth: 1, borderColor: 'rgba(227,185,110,0.35)', padding: 20, marginTop: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontFamily: fonts.medium, fontSize: 11, letterSpacing: 1.5, color: '#C9B48A' },
  cardBalance: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 14 },
  cardUnit: { fontFamily: fonts.semibold, fontSize: 13, color: '#C9B48A' },
  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: 26 },
  cardMini: { fontFamily: fonts.regular, fontSize: 11, color: '#A99A7B' },
  cardMiniValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginTop: 2 },
  cardBrand: { marginLeft: 'auto', fontFamily: fonts.display, fontSize: 11, letterSpacing: 2, color: colors.gold },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 20 },
  tile: { width: '48%', flexGrow: 1, height: 96, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 14, justifyContent: 'space-between' },
  tileGold: { backgroundColor: colors.gold },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between' },
  tileTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 },
  flowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  flowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flowValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: colors.surface, marginTop: 10 },
  ruleSymbol: { fontFamily: fonts.semibold, color: colors.gold },
});
