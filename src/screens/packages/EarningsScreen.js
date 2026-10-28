import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Screen, Header, Card, Button, Segmented, TransactionRow, EmptyState, Loading } from '../../components';
import { StackedBarChart, ProgressRing, Legend } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing, type } from '../../theme';
import { money, percent } from '../../utils/format';

/**
 * EarningsScreen – total earned, split by source (rings), daily earnings
 * for the last 30 days (stacked bars) and history per source.
 * Data: api.getEarnings()
 */
const SERIES = [
  { key: 'roi', label: 'Package ROI', color: colors.gold },
  { key: 'direct', label: 'Direct', color: colors.goldDeep },
  { key: 'level', label: 'Level', color: colors.info },
];

export default function EarningsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { data, loading, refresh } = useApi(api.getEarnings);
  const [tab, setTab] = useState('Daily');

  if (!data) {
    return <Screen><Header title="Earnings" /><Loading /></Screen>;
  }

  const { bySource, total } = data;
  const history = data.history[tab];

  return (
    <Screen onRefresh={refresh} refreshing={loading}>
      <Header title="Earnings" />

      <View style={styles.hero}>
        <Text style={type.small}>Total earned · all sources</Text>
        <Text style={styles.total}>{money(total)}</Text>
        <Text style={type.small}>
          USDT · <Text style={styles.success}>+{money(data.last30)}</Text> in the last 30 days · {data.activePackages} active packages
        </Text>
        <View style={styles.pillRow}>
          <Text style={styles.pillText}>Balance <Text style={styles.strong}>{money(data.balance)}</Text></Text>
          <Button title="Withdraw" size="sm" variant="secondary" onPress={() => navigation.navigate(ROUTES.WITHDRAW)} />
          <Button title="Transfer" size="sm" variant="secondary" onPress={() => navigation.navigate(ROUTES.TRANSFER)} />
        </View>
      </View>

      {/* Source rings */}
      <View style={styles.rings}>
        <Source
          color={colors.gold}
          progress={bySource.roi / data.roiScheduledTotal}
          title="Package ROI"
          sub={`${money(bySource.roi, 0)} of ${money(data.roiScheduledTotal, 0)} scheduled`}
        />
        <Source color={colors.goldDeep} progress={total ? bySource.direct / total : 0} title="Direct" sub={`${money(bySource.direct)} · ${percent(total ? bySource.direct / total : 0, 1)} of all`} />
        <Source color={colors.info} progress={total ? bySource.level / total : 0} title="Level" sub={`${money(bySource.level)} · ${percent(total ? bySource.level / total : 0, 1)} of all`} />
      </View>

      {/* Daily stacked bars */}
      <Card style={styles.mt24}>
        <View style={styles.rowBetween}>
          <Text style={type.h2}>Daily earnings</Text>
          <Text style={type.tiny}>Last 30 days, by source</Text>
        </View>
        <View style={styles.mt12}>
          <StackedBarChart rows={data.daily} series={SERIES} width={width - spacing.screen * 2 - 32} />
        </View>
        <Legend items={SERIES} />
      </Card>

      {/* History */}
      <Text style={[type.h2, styles.mt28]}>History</Text>
      <Text style={[type.tiny, styles.mt4]}>Nightly package return, credited at 12:00 AM IST.</Text>
      <Segmented options={['Daily', 'Direct', 'Level']} value={tab} onChange={setTab} style={styles.mt12} />
      {history.length === 0 ? (
        <EmptyState icon="file" title="Nothing here yet" />
      ) : (
        history.map((h, i) => <TransactionRow key={h.id} item={h} last={i === history.length - 1} />)
      )}
    </Screen>
  );
}

function Source({ color, progress, title, sub }) {
  return (
    <View style={styles.source}>
      <ProgressRing progress={progress} color={color} />
      <Text style={styles.sourceTitle}>{title}</Text>
      <Text style={[type.tiny, styles.center]}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mt24: { marginTop: 24 },
  mt28: { marginTop: 28 },
  center: { textAlign: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hero: { alignItems: 'center', marginTop: 10, gap: 4 },
  total: { fontFamily: fonts.serif, fontSize: 60, color: colors.text, lineHeight: 66 },
  success: { color: colors.success, fontFamily: fonts.semibold },
  strong: { color: colors.text, fontFamily: fonts.semibold },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: colors.surface, borderRadius: 24, padding: 4, paddingLeft: 14 },
  pillText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginRight: 4 },
  rings: { flexDirection: 'row', marginTop: 28, gap: 8 },
  source: { flex: 1, alignItems: 'center', gap: 6 },
  sourceTitle: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
});
