import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Screen, Header, Card, Button, Segmented, Badge, EmptyState, Loading } from '../../components';
import { ScheduleChart, Legend } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing, type } from '../../theme';
import { money } from '../../utils/format';
import { longDate } from '../../utils/date';

/**
 * MyPackagesScreen – summary, next payout, payout chart for the selected
 * package, and the purchases list (All / Active / Completed).
 * Data: api.getPackages(); chart points: api.getPackageSchedule(pkg)
 */
export default function MyPackagesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { data, loading, refresh } = useApi(api.getPackages);
  const [tab, setTab] = useState('All');
  const [selectedId, setSelectedId] = useState(null);

  if (!data) {
    return <Screen><Header title="My packages" /><Loading /></Screen>;
  }

  const { list, summary } = data;
  const selected = list.find(p => p.id === selectedId) || list.find(p => p.status === 'Active') || list[0];
  const schedule = selected ? api.getPackageSchedule(selected) : null;
  const filtered = list.filter(p => tab === 'All' || p.status === tab);
  const count = s => list.filter(p => s === 'All' || p.status === s).length;

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <Header
        title="My packages"
        right={<Button title="+ Buy" size="sm" onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)} />}
      />

      {/* Next payout clock */}
      <View style={styles.next}>
        <Svg width={108} height={108}>
          <Circle cx={54} cy={54} r={46} stroke={colors.line} strokeWidth={6} fill="none" />
          {[0, 90, 180, 270].map(a => {
            const r1 = 38;
            const r2 = 33;
            const rad = (a * Math.PI) / 180;
            return <Line key={a} x1={54 + r1 * Math.sin(rad)} y1={54 - r1 * Math.cos(rad)} x2={54 + r2 * Math.sin(rad)} y2={54 - r2 * Math.cos(rad)} stroke={colors.lineStrong} strokeWidth={2} />;
          })}
          <Line x1={54} y1={54} x2={54} y2={26} stroke={colors.gold} strokeWidth={3} strokeLinecap="round" />
          <Line x1={54} y1={54} x2={54} y2={34} stroke={colors.gold} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={54} cy={54} r={4} fill={colors.gold} />
        </Svg>
        <View style={styles.flex1}>
          <Text style={type.small}>Next payout · 12:00 AM IST</Text>
          <Text style={styles.nextValue}>+{money(summary.nextPayout)} <Text style={type.small}>USDT</Text></Text>
          <Text style={type.tiny}>From {summary.activeCount} active package{summary.activeCount === 1 ? '' : 's'}</Text>
        </View>
      </View>
      <Text style={[type.tiny, styles.mt12]}>Each package pays one credit a night at 12:00 AM IST. The purchase day stays at 0 until that midnight.</Text>

      <View style={styles.stats}>
        <Stat label="Invested" value={money(summary.invested)} sub={`${summary.activeCount} active · ${summary.totalCount} total`} />
        <Stat label="Earned" value={money(summary.earned)} sub="Credited" gold />
        <Stat label="Scheduled" value={money(summary.scheduled)} sub="Still to come" />
      </View>

      {/* Payout chart for the selected package */}
      {selected ? (
        <Card style={styles.mt16}>
          <View style={styles.rowBetween}>
            <Text style={type.h2}>{selected.planName} · {money(selected.amount, 0)} USDT</Text>
            <Text style={styles.goldSmall}>Day {selected.daysElapsed}/{selected.durationDays}</Text>
          </View>
          <Text style={[type.tiny, styles.mt4]}>{money(selected.earned)} of {money(selected.totalPayout)} USDT posted · tap a package below to switch</Text>
          <View style={styles.mt12}>
            <ScheduleChart scheduled={schedule.scheduled} posted={schedule.posted} width={width - spacing.screen * 2 - 32} />
          </View>
          <Legend items={[{ label: 'Posted', color: colors.gold }, { label: 'Scheduled', color: colors.subtle, dashed: true }]} />
        </Card>
      ) : null}

      <Text style={[type.h2, styles.mt28]}>Purchases</Text>
      <Segmented
        variant="underline"
        options={['All', 'Active', 'Completed'].map(s => ({ value: s, label: `${s} ${count(s)}` }))}
        value={tab}
        onChange={setTab}
        style={styles.mt8}
      />
      {filtered.length === 0 ? (
        <EmptyState icon="box" title="No packages in this view" actionLabel="Buy a package" onAction={() => navigation.navigate(ROUTES.BUY_PACKAGE)} />
      ) : (
        filtered.map(p => (
          <Pressable key={p.id} onPress={() => setSelectedId(p.id)} style={[styles.item, p.id === selected?.id && styles.itemOn]}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{p.planName} · {money(p.amount, 0)} USDT</Text>
              <Badge label={p.status} tone={p.status === 'Active' ? 'success' : 'neutral'} />
            </View>
            <View style={styles.track}><View style={[styles.fill, { width: `${p.progress * 100}%` }]} /></View>
            <View style={styles.rowBetween}>
              <Text style={type.tiny}>{p.id} · bought {longDate(p.purchasedOn)}</Text>
              <Text style={type.tiny}>{money(p.dailyAmount)}/day</Text>
            </View>
            <View style={styles.rowBetween}>
              <Text style={type.tiny}>Earned {money(p.earned)} USDT</Text>
              <Text style={type.tiny}>{p.status === 'Active' ? `Ends ${longDate(p.endsOn)}` : `Ended ${longDate(p.endsOn)}`}</Text>
            </View>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function Stat({ label, value, sub, gold }) {
  return (
    <Card style={styles.stat} padding={12}>
      <Text style={type.tiny}>{label}</Text>
      <Text style={[styles.statValue, gold && { color: colors.gold }]}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt28: { marginTop: 28 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 14 },
  nextValue: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginVertical: 2 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  stat: { flex: 1, gap: 4 },
  statValue: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  statSub: { fontFamily: fonts.regular, fontSize: 10, color: colors.subtle },
  goldSmall: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  item: { paddingVertical: 14, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  itemOn: { backgroundColor: 'rgba(227,185,110,0.04)' },
  itemTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.line },
  fill: { height: 5, borderRadius: 3, backgroundColor: colors.gold },
});
