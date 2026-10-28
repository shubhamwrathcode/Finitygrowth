import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Card, Badge, Icon, Loading } from '../../components';
import { SegmentGauge } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { percent } from '../../utils/format';

/**
 * LevelsScreen – how many of the 5 commission levels are unlocked
 * (half-circle gauge) and each level's rate, requirement and members.
 * Data: api.getLevels()
 */
export default function LevelsScreen() {
  const { data } = useApi(api.getLevels);
  const [open, setOpen] = useState(false);

  if (!data) {
    return <Screen><Header title="Commission levels" /><Loading /></Screen>;
  }

  const next = data.levels.find(l => l.upNext);

  return (
    <Screen>
      <Header title="Commission levels" />
      <Text style={styles.title}>Unlock up to 5 levels{'\n'}of team income</Text>

      <View style={styles.gauge}>
        <SegmentGauge filled={data.unlocked} total={5} label={`${data.unlocked}/5`} sublabel="levels unlocked" />
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillNum}>{data.buyingDirects}</Text>
        <Text style={styles.pillText}>
          package-buying directs{next ? <Text> · <Text style={styles.bold}>{next.moreNeeded} more</Text> unlocks Level {next.level}</Text> : ' · all levels unlocked'}
        </Text>
      </View>
      <Text style={[type.tiny, styles.center]}>Signups with no purchase do not count. One level for each package-buying direct, up to 5.</Text>

      <View style={styles.list}>
        {data.levels.map(l => (
          <Card key={l.level} tone={l.upNext ? 'outlineGold' : 'default'} style={styles.level} padding={14}>
            <View style={[styles.badge, l.unlocked && styles.badgeOn]}>
              <Text style={[styles.badgeSmall, l.unlocked && styles.ink]}>LEVEL</Text>
              <Text style={[styles.badgeBig, l.unlocked && styles.ink]}>{l.level}</Text>
            </View>
            <View style={styles.flex1}>
              <View style={styles.row}>
                {l.unlocked ? (
                  <Badge label="Unlocked" tone="gold" />
                ) : l.upNext ? (
                  <Badge label="Up next" tone="gold" />
                ) : (
                  <View style={styles.lock}><Icon name="lock" size={12} color={colors.subtle} strokeWidth={2} /><Text style={type.tiny}>Locked</Text></View>
                )}
                <Text style={type.tiny}>{l.members} members</Text>
              </View>
              <Text style={[type.small, styles.mt4]}>
                {l.unlocked ? `Needs ${l.directsRequired} package-buying direct${l.directsRequired > 1 ? 's' : ''} ✓` : `${l.moreNeeded} more package-buying direct${l.moreNeeded > 1 ? 's' : ''}`}
              </Text>
            </View>
            <View style={styles.rate}>
              <Text style={[styles.rateValue, l.unlocked || l.upNext ? { color: colors.gold } : null]}>{percent(l.rate)}</Text>
              <Text style={type.tiny}>of nightly ROI</Text>
            </View>
          </Card>
        ))}
      </View>

      <Pressable onPress={() => setOpen(o => !o)} style={styles.how}>
        <View style={styles.row}>
          <Text style={type.h2}>How levels work</Text>
          <Icon name="chevronDown" size={16} color={colors.subtle} strokeWidth={2} />
        </View>
        {open ? (
          <Text style={[type.small, styles.mt8]}>
            Your direct referral percent is paid once, on a friend’s first package, as a percent of that amount. These levels are separate. Each night you receive the unlocked level’s percent of that member’s ROI. A direct referral is Level 1. Someone they refer is Level 2, up to Level 5. A blocked upline is skipped, and that level is not passed on.
          </Text>
        ) : null}
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  center: { textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, color: colors.text, textAlign: 'center' },
  gauge: { alignItems: 'center', marginTop: 14 },
  pill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, marginTop: 8 },
  pillNum: { fontFamily: fonts.display, fontSize: 18, color: colors.gold },
  pillText: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSoft, flexShrink: 1 },
  bold: { fontFamily: fonts.semibold, color: colors.text },
  list: { gap: 10, marginTop: 24 },
  level: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  badge: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: colors.gold },
  badgeSmall: { fontFamily: fonts.semibold, fontSize: 8, color: colors.muted },
  badgeBig: { fontFamily: fonts.bold, fontSize: 18, color: colors.muted, lineHeight: 20 },
  ink: { color: colors.goldInk },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rate: { alignItems: 'flex-end' },
  rateValue: { fontFamily: fonts.display, fontSize: 22, color: colors.textSoft },
  how: { marginTop: 18, padding: 16, borderRadius: 16, backgroundColor: colors.surface },
});
