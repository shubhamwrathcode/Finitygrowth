import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Screen, Header, Card, Section, Icon, Loading, ErrorView } from '../../components';
import { ScheduleChart } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing, type } from '../../theme';
import { money, percent } from '../../utils/format';

/**
 * ExploreScreen – the public "home page" content: about, active package,
 * illustrative calculator (chart), how it works, income types, level
 * commission, withdrawal rules, travel reward, FAQs, support and legal.
 * Data: api.getProgram() + api.getIllustrativeSchedule(100)
 */
export default function ExploreScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { data: program, loading, error, refresh } = useApi(api.getProgram);
  const [openFaq, setOpenFaq] = useState(null);

  if (loading && !program) {
    return <Screen><Header title="Explore" /><Loading /></Screen>;
  }
  if (error) {
    return <Screen><Header title="Explore" /><ErrorView message={error} onRetry={refresh} /></Screen>;
  }

  const plan = program.plans[0];
  const example = api.getIllustrativeSchedule(plan.minAmount);
  const maxRate = Math.max(...program.referralRules.levels.map(l => l.rate));
  const chartWidth = width - spacing.screen * 2 - 32;

  return (
    <Screen>
      <Header title="Explore" />

      <Text style={styles.serifTitle}>{program.about.title}</Text>
      <Text style={[type.small, styles.mt8]}>{program.about.text}</Text>

      {/* Package "ticket" */}
      <Section title="Active package" subtitle={`${program.plans.length} plan published`}>
        <View style={styles.ticket}>
          <View style={styles.stub}>
            <Text style={styles.stubBig}>{plan.totalReturn}×</Text>
            <Text style={styles.stubSmall}>RETURN</Text>
          </View>
          <View style={styles.ticketBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.mono}>{plan.id}</Text>
            </View>
            <Text style={styles.range}>
              {money(plan.minAmount, 0)} – {money(plan.maxAmount, 0)} <Text style={type.tiny}>USDT</Text>
            </Text>
            <Text style={type.tiny}>
              {plan.durationDays} days · {percent(plan.dailyRate)} daily · paid {plan.payoutTime}
            </Text>
          </View>
        </View>
      </Section>

      {/* Illustrative calculator */}
      <Card style={styles.mt12}>
        <View style={styles.rowBetween}>
          <Text style={type.h2}>Illustrative calculator</Text>
          <Text style={styles.goldStrong}>{money(example.total)} USDT</Text>
        </View>
        <Text style={[type.tiny, styles.mt4]}>
          {money(plan.minAmount, 0)} USDT example · {money(example.daily)} USDT a day · principal included
        </Text>
        <View style={styles.mt12}>
          <ScheduleChart scheduled={example.points} posted={example.points} width={chartWidth} height={120} />
        </View>
        <Text style={[type.tiny, styles.mt8]}>Restates the published example. Not a forecast and does not credit a balance.</Text>
      </Card>

      {/* How it works – horizontal cards */}
      <Section title="How it works">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hList}>
          {program.howItWorks.map((s, i) => (
            <Card key={s.title} style={styles.stepCard}>
              <Text style={styles.stepNum}>{i + 1}</Text>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={type.tiny}>{s.text}</Text>
            </Card>
          ))}
        </ScrollView>
      </Section>

      {/* Income types – 2×2 grid */}
      <Section title="What the active rules can pay">
        <View style={styles.grid}>
          {program.incomeTypes.map(t => (
            <View key={t.key} style={styles.gridItem}>
              <Icon name={t.icon} size={20} color={colors.gold} />
              <Text style={styles.gridTitle}>{t.title}</Text>
              <Text style={type.tiny}>{t.text}</Text>
            </View>
          ))}
        </View>
      </Section>

      {/* Level commission – horizontal bars */}
      <Section title="Level commission" subtitle="Each night, % of a team member’s ROI">
        {program.referralRules.levels.map(l => (
          <View key={l.level} style={styles.levelRow}>
            <Text style={styles.levelLabel}>L{l.level}</Text>
            <View style={styles.levelTrack}>
              <View style={[styles.levelBar, { width: `${(l.rate / maxRate) * 100}%`, opacity: 0.5 + (l.rate / maxRate) * 0.5 }]} />
            </View>
            <Text style={styles.levelRate}>{percent(l.rate)}</Text>
            <Text style={styles.levelReq}>{l.directsRequired} direct{l.directsRequired > 1 ? 's' : ''}</Text>
          </View>
        ))}
        <Text style={[type.tiny, styles.mt8]}>Direct referral: {percent(program.referralRules.directRate)} of a referral’s first package, once.</Text>
      </Section>

      {/* Withdrawals */}
      <Section title="Withdrawals">
        <View style={styles.stats3}>
          <Stat value={money(program.walletRules.withdrawal.min, 0)} label="Min USDT" />
          <Stat value={money(program.walletRules.withdrawal.max, 0)} label="Max USDT" bordered />
          <Stat value={percent(program.walletRules.withdrawal.feeRate)} label="Fee" gold />
        </View>
        <Text style={[type.small, styles.mt8]}>
          Paid as USDT on {program.walletRules.network}. Transfers use available balance and don’t qualify a referral.
        </Text>
      </Section>

      {/* Reward banner */}
      <Card tone="gold" style={styles.mt20} onPress={() => navigation.navigate(ROUTES.REWARD)}>
        <View style={styles.banner}>
          <Icon name="plane" size={26} color={colors.goldInk} />
          <Text style={styles.bannerText}>Invest {money(program.travelReward.threshold, 0)} USDT+ and earn an international trip</Text>
          <Icon name="arrowRight" size={18} color={colors.goldInk} strokeWidth={2} />
        </View>
      </Card>

      {/* FAQs – accordion */}
      <Section title="FAQs">
        {program.faqs.map((f, i) => {
          const open = openFaq === i;
          return (
            <Pressable key={f.q} accessibilityRole="button" onPress={() => setOpenFaq(open ? null : i)} style={styles.faq}>
              <View style={styles.rowBetween}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Icon name="chevronDown" size={18} color={colors.subtle} strokeWidth={2} />
              </View>
              {open ? <Text style={[type.small, styles.mt8]}>{f.a}</Text> : null}
            </Pressable>
          );
        })}
      </Section>

      <View style={styles.mt20}>
        <Text style={type.tiny}>Support</Text>
        <Text style={styles.goldStrong}>{program.support.email}</Text>
        <Text style={type.tiny}>{program.support.hours} · sample hours</Text>
      </View>

      <View style={styles.legal}>
        {program.legal.links.map(l => (
          <Text key={l} style={styles.legalChip}>{l}</Text>
        ))}
      </View>
      <Text style={[type.tiny, styles.mt8]}>{program.legal.version} · © 2026 Finitygrowth</Text>
    </Screen>
  );
}

function Stat({ value, label, bordered, gold }) {
  return (
    <View style={[styles.stat, bordered && styles.statBorder]}>
      <Text style={[type.number, gold && { color: colors.gold }]}>{value}</Text>
      <Text style={type.tiny}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt20: { marginTop: 20 },
  serifTitle: { fontFamily: fonts.serifItalic, fontSize: 26, lineHeight: 30, color: colors.gold, marginTop: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  ticket: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },
  stub: { width: 92, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderRightWidth: 2, borderStyle: 'dashed', borderRightColor: colors.bg },
  stubBig: { fontFamily: fonts.serif, fontSize: 42, color: colors.goldInk, lineHeight: 46 },
  stubSmall: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.5, color: colors.goldInk },
  ticketBody: { flex: 1, padding: 14, gap: 6 },
  planName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  mono: { fontFamily: fonts.mono, fontSize: 9, color: colors.subtle },
  range: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  goldStrong: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  hList: { gap: 10, paddingRight: 20 },
  stepCard: { width: 200, gap: 6 },
  stepNum: { fontFamily: fonts.serif, fontSize: 34, color: colors.gold, lineHeight: 36 },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.line, gap: 1, borderRadius: 18, overflow: 'hidden' },
  gridItem: { width: '49.8%', flexGrow: 1, backgroundColor: colors.surface, padding: 14, gap: 6 },
  gridTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  levelLabel: { width: 22, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  levelTrack: { flex: 1, height: 22 },
  levelBar: { height: 22, borderRadius: 6, backgroundColor: colors.gold },
  levelRate: { width: 38, fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  levelReq: { width: 62, textAlign: 'right', fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  stats3: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerText: { flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: colors.goldInk },
  faq: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  faqQ: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  legal: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 18 },
  legalChip: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSoft,
    backgroundColor: colors.elevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
