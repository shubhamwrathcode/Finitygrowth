import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fonts } from '../theme';
import { signed } from '../utils/format';
import { shortDate } from '../utils/date';

/**
 * TransactionRow – one wallet ledger entry (see src/data/ledger.js).
 * The icon and colour come from the entry `type`.
 */
const look = {
  // Mock / legacy types
  roi: { icon: 'box', color: colors.gold, bg: colors.goldSoft },
  level: { icon: 'layers', color: colors.info, bg: 'rgba(110,139,201,0.14)' },
  direct: { icon: 'userPlus', color: colors.goldDeep, bg: 'rgba(185,139,69,0.16)' },
  package: { icon: 'box', color: colors.textSoft, bg: colors.elevated },
  // Live API types (same as web activityLabel keys)
  daily_earning: { icon: 'box', color: colors.gold, bg: colors.goldSoft },
  level_commission: { icon: 'layers', color: colors.info, bg: 'rgba(110,139,201,0.14)' },
  direct_commission: { icon: 'userPlus', color: colors.goldDeep, bg: 'rgba(185,139,69,0.16)' },
  purchase: { icon: 'box', color: colors.textSoft, bg: colors.elevated },
  deposit: { icon: 'arrowDown', color: colors.success, bg: colors.successSoft },
  transfer_in: { icon: 'arrowDownLeft', color: colors.success, bg: colors.successSoft },
  transfer_out: { icon: 'send', color: colors.warning, bg: colors.warningSoft },
  withdrawal: { icon: 'arrowUp', color: colors.warning, bg: colors.warningSoft },
  withdrawal_refund: { icon: 'arrowDown', color: colors.success, bg: colors.successSoft },
};

export default function TransactionRow({ item, last = false }) {
  const l = look[item.type] || look.package;
  const positive = item.amount >= 0;
  return (
    <View style={[styles.row, !last && styles.line]}>
      <View style={[styles.icon, { backgroundColor: l.bg }]}>
        <Icon name={l.icon} size={18} color={l.color} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: positive ? colors.success : colors.text }]}>{signed(item.amount)}</Text>
        <Text style={styles.sub}>{item.status ? item.status : shortDate(item.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  line: { borderBottomWidth: 1, borderBottomColor: colors.line },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: fonts.semibold, fontSize: 14 },
});
