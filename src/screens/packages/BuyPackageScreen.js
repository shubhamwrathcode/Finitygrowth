import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Header, Card, Button, Row, Notice, Icon, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';
import { money, percent } from '../../utils/format';

/**
 * BuyPackageScreen – choose plan → enter amount → review → confirm.
 * Data: api.getPlans() (plans + balance)
 * Live quote: api.quotePackage(planId, amount)
 * Submit: api.buyPackage() – validates range and balance (simulated).
 */
const PRESETS = [100, 500, 1000, 5000];

export default function BuyPackageScreen({ navigation }) {
  const { data } = useApi(api.getPlans);
  const [amount, setAmount] = useState('500');
  const [submitting, setSubmitting] = useState(false);

  if (!data) {
    return <Screen><Header title="Buy a package" /><Loading /></Screen>;
  }

  const plan = data.plans[0];
  const n = Number(amount) || 0;
  const quote = api.quotePackage(plan.id, n);
  const outOfRange = n > 0 && (n < plan.minAmount || n > plan.maxAmount);
  const notEnough = n > data.balance;

  const review = () => {
    Alert.alert(
      'Confirm purchase',
      `${plan.name} · ${money(n)} USDT\nPays about ${money(quote.daily)} USDT a day for ${quote.durationDays} days.\nTotal scheduled: ${money(quote.total)} USDT`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: confirm },
      ],
    );
  };

  const confirm = async () => {
    setSubmitting(true);
    try {
      await api.buyPackage({ planId: plan.id, amount: n });
      Alert.alert('Package activated', 'Your first credit arrives at the next 12:00 AM IST. (Demo: static data is not changed.)');
      navigation.navigate(ROUTES.MY_PACKAGES);
    } catch (e) {
      Alert.alert('Could not buy', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      footer={
        <View style={styles.gap8}>
          <Button title="Review purchase" disabled={!n || outOfRange || notEnough} loading={submitting} onPress={review} />
          <Text style={[type.tiny, styles.center]}>The quote is confirmed again when you submit.</Text>
        </View>
      }>
      <Header
        title="Buy a package"
        right={
          <Pressable onPress={() => navigation.navigate(ROUTES.DEPOSIT)} style={styles.balance}>
            <Text style={styles.balanceText}>{money(data.balance)} USDT</Text>
            <Text style={styles.addFunds}>+ Add</Text>
          </Pressable>
        }
      />
      <Text style={type.small}>Choose a plan, enter an amount, review, then confirm. Paid from your balance.</Text>

      <View style={styles.planHead}>
        <Text style={type.small}>{data.plans.length} plan available</Text>
        <Text style={styles.mono}>{plan.id}</Text>
      </View>
      <Card tone="outlineGold" style={styles.plan}>
        <View style={styles.medal}>
          <Text style={styles.medalBig}>{plan.totalReturn}×</Text>
          <Text style={styles.medalSmall}>RETURN</Text>
        </View>
        <View style={styles.flex1}>
          <View style={styles.planName}>
            <Text style={styles.planTitle}>{plan.name}</Text>
            <View style={styles.tick}><Icon name="check" size={11} color={colors.goldInk} strokeWidth={3.5} /></View>
          </View>
          <Text style={type.body}>{money(plan.minAmount, 0)} – {money(plan.maxAmount, 0)} USDT</Text>
          <Text style={type.tiny}>{plan.durationDays} days · {percent(plan.dailyRate)} daily · paid {plan.payoutTime}</Text>
        </View>
      </Card>

      <Text style={[type.small, styles.amountLabel]}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          accessibilityLabel="Amount in USDT"
          value={amount}
          onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
          keyboardType="decimal-pad"
          style={styles.amountInput}
          selectionColor={colors.gold}
          placeholder="0"
          placeholderTextColor={colors.lineStrong}
        />
        <Text style={styles.amountUnit}>USDT</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.presets}>
        {PRESETS.map(p => {
          const on = n === p;
          return (
            <Pressable key={p} onPress={() => setAmount(String(p))} style={[styles.preset, on && styles.presetOn]}>
              <Text style={[styles.presetText, on && styles.presetTextOn]}>{money(p, 0)}</Text>
            </Pressable>
          );
        })}
      </View>
      {outOfRange ? <Text style={styles.warn}>Enter between {plan.minAmount} and {money(plan.maxAmount, 0)} USDT.</Text> : null}

      <Card style={styles.summary} padding={0}>
        <View style={styles.summaryInner}>
          <Row label="Pays about" value={`${money(quote.daily)} USDT / day`} />
          <Row label="Duration" value={`${quote.durationDays} days`} />
          <Row label="Total scheduled" value={`${money(quote.total)} USDT`} strong />
          <Row label="First credit" value="Next 12:00 AM IST" last />
        </View>
      </Card>

      {notEnough ? (
        <View style={styles.mt14}>
          <Notice text={`Your balance is ${money(data.balance)} USDT. Add funds to buy this amount.`} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  gap8: { gap: 8 },
  center: { textAlign: 'center' },
  mt14: { marginTop: 14 },
  balance: { flexDirection: 'row', gap: 6, backgroundColor: colors.elevated, borderRadius: 17, height: 34, paddingHorizontal: 12, alignItems: 'center' },
  balanceText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  addFunds: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  mono: { fontFamily: fonts.mono, fontSize: 10, color: colors.subtle },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 18 },
  medal: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  medalBig: { fontFamily: fonts.serif, fontSize: 36, color: colors.gold, lineHeight: 40 },
  medalSmall: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.5, color: '#C9B48A' },
  planName: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  planTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  amountLabel: { textAlign: 'center', marginTop: 28 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  amountInput: { minWidth: 120, textAlign: 'center', fontFamily: fonts.display, fontSize: 48, color: colors.text, paddingVertical: 4 },
  amountUnit: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  divider: { height: 1, backgroundColor: colors.line, marginTop: 4 },
  presets: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 14 },
  preset: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.lineStrong, justifyContent: 'center' },
  presetOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  presetText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSoft },
  presetTextOn: { color: colors.goldInk },
  warn: { textAlign: 'center', marginTop: 10, fontFamily: fonts.regular, fontSize: 12, color: colors.warning },
  summary: { marginTop: 24 },
  summaryInner: { paddingHorizontal: 16, paddingVertical: 4 },
});
