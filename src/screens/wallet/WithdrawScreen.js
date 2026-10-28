import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { Screen, Header, Card, Button, Field, Badge, Icon, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, radius, type } from '../../theme';
import { money, percent, shortAddress } from '../../utils/format';
import { longDate } from '../../utils/date';

/**
 * WithdrawScreen – amount + BEP20 address → live quote (gross, fee, net)
 * → review. Also shows how the request moves (tap a step) and past requests.
 * Data: api.getWithdrawals(); quote: api.quoteWithdrawal(); submit: api.requestWithdrawal()
 */
const STEPS = [
  { title: 'Request', text: 'Enter an amount and your BEP20 address, then confirm a code.' },
  { title: 'Locked', text: 'The full amount leaves your balance after the code is accepted.' },
  { title: 'Review', text: 'Admin checks the request. You can cancel while it is pending.' },
  { title: 'Paid', text: 'Approval sends the net amount on BSC. The request itself does not.' },
];

export default function WithdrawScreen({ navigation }) {
  const { data } = useApi(api.getWithdrawals);
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [step, setStep] = useState(0);
  const [sending, setSending] = useState(false);

  if (!data) {
    return <Screen><Header title="Withdraw" /><Loading /></Screen>;
  }

  const { rules } = data;
  const quote = api.quoteWithdrawal(amount);
  const set = v => setAmount(String(Math.floor(v * 100) / 100));

  const review = () => {
    Alert.alert('Confirm withdrawal', `Gross ${money(quote.gross)} USDT\nFee ${money(quote.fee)} USDT\nYou receive ${money(quote.net)} USDT on BEP20\nTo ${shortAddress(address)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setSending(true);
          try {
            await api.requestWithdrawal({ amount: quote.gross, address });
            Alert.alert('Request submitted', 'The amount is locked while admin reviews it. (Demo: static data is not changed.)');
            navigation.goBack();
          } catch (e) {
            Alert.alert('Check your request', e.message);
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen>
      <Header title="Withdraw" />
      <Text style={type.small}>The amount leaves your balance. The fee is cut from it, and admin sends the net amount on BEP20 after approval.</Text>

      <View style={styles.split}>
        <View style={styles.splitMain}>
          <Text style={type.tiny}>Available to withdraw</Text>
          <Text style={styles.splitValue}>{money(data.available)} <Text style={type.tiny}>USDT</Text></Text>
        </View>
        <View style={styles.splitSide}>
          <View style={styles.lockRow}><Icon name="lock" size={12} color={colors.muted} strokeWidth={2} /><Text style={type.tiny}>Locked</Text></View>
          <Text style={[styles.splitValue, { color: colors.muted }]}>{money(data.locked)}</Text>
        </View>
      </View>

      <Field
        style={styles.mt20}
        label="Amount"
        labelRight={<Text style={type.tiny}>{money(rules.min)} – {money(rules.max)} USDT</Text>}
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
        inputStyle={styles.amountInput}
        right={<Text style={styles.unit}>USDT</Text>}
      />
      <View style={styles.quick}>
        <Quick label="Min" onPress={() => set(rules.min)} />
        <Quick label="25%" onPress={() => set(data.available * 0.25)} />
        <Quick label="50%" onPress={() => set(data.available * 0.5)} />
        <Quick label="Max" onPress={() => set(Math.min(data.available, rules.max))} />
      </View>

      <Field
        style={styles.mt16}
        label="BEP20 address"
        placeholder="0x…"
        autoCapitalize="none"
        value={address}
        onChangeText={setAddress}
        inputStyle={styles.mono}
        hint="0x and 40 hex characters"
      />
      {data.savedAddresses.map(a => (
        <Pressable key={a} onPress={() => setAddress(a)} style={styles.saved}>
          <Icon name="wallet" size={14} color={colors.gold} />
          <Text style={styles.savedText}>Use saved {shortAddress(a)}</Text>
        </Pressable>
      ))}

      {/* Receipt-style quote */}
      <View style={styles.receipt}>
        <Text style={styles.receiptLabel}>QUOTE</Text>
        <ReceiptRow label="Gross amount" value={`${money(quote.gross)} USDT`} />
        <ReceiptRow label={`Fee · ${percent(rules.feeRate)}`} value={`−${money(quote.fee)} USDT`} />
        <View style={styles.receiptLine} />
        <View style={styles.receiptRow}>
          <Text style={styles.receiveLabel}>You receive</Text>
          <Text style={styles.receiveValue}>{money(quote.net)} <Text style={styles.receiveUnit}>USDT</Text></Text>
        </View>
      </View>
      <Svg width="100%" height={10} viewBox="0 0 350 10" preserveAspectRatio="none">
        <Polygon
          points="0,0 350,0 350,2 343,10 336,2 329,10 322,2 315,10 308,2 301,10 294,2 287,10 280,2 273,10 266,2 259,10 252,2 245,10 238,2 231,10 224,2 217,10 210,2 203,10 196,2 189,10 182,2 175,10 168,2 161,10 154,2 147,10 140,2 133,10 126,2 119,10 112,2 105,10 98,2 91,10 84,2 77,10 70,2 63,10 56,2 49,10 42,2 35,10 28,2 21,10 14,2 7,10 0,2"
          fill="#EEF0F5"
        />
      </Svg>

      <Button title="Review withdrawal" disabled={!quote.gross || !address} loading={sending} onPress={review} style={styles.mt16} />

      {/* How it works – tap a step */}
      <Text style={[type.h2, styles.mt28]}>How it works</Text>
      <View style={styles.steps}>
        {STEPS.map((s, i) => (
          <Pressable key={s.title} onPress={() => setStep(i)} style={styles.step}>
            <View style={[styles.stepDot, i === step && styles.stepDotOn]}>
              <Text style={[styles.stepNum, i === step && { color: colors.goldInk }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepTitle, i === step && { color: colors.text }]}>{s.title}</Text>
          </Pressable>
        ))}
      </View>
      <Card padding={14}><Text style={type.small}>{STEPS[step].text}</Text></Card>

      <Text style={[type.h2, styles.mt28]}>Your withdrawal requests</Text>
      {data.requests.map(r => (
        <View key={r.id} style={styles.request}>
          <View style={styles.flex1}>
            <Text style={styles.reqTitle}>{money(r.gross)} USDT → {money(r.net)} net</Text>
            <Text style={type.tiny}>{longDate(r.date)} · {shortAddress(r.address)}</Text>
          </View>
          <Badge label={r.status} tone={r.status === 'Paid' ? 'success' : 'warning'} />
        </View>
      ))}
    </Screen>
  );
}

function Quick({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.quickBtn}>
      <Text style={styles.quickText}>{label}</Text>
    </Pressable>
  );
}

function ReceiptRow({ label, value }) {
  return (
    <View style={styles.receiptRow}>
      <Text style={styles.receiptKey}>{label}</Text>
      <Text style={styles.receiptVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt28: { marginTop: 28 },
  split: { flexDirection: 'row', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surface, marginTop: 16 },
  splitMain: { flex: 1.4, padding: 14, gap: 4 },
  splitSide: { flex: 1, padding: 14, gap: 4, backgroundColor: colors.surfaceAlt },
  splitValue: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amountInput: { fontFamily: fonts.display, fontSize: 22 },
  unit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  quick: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickBtn: { flex: 1, height: 34, borderRadius: 10, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },
  mono: { fontFamily: fonts.mono, fontSize: 13 },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, minHeight: 32 },
  savedText: { fontFamily: fonts.medium, fontSize: 12, color: colors.gold },
  receipt: { marginTop: 18, backgroundColor: '#EEF0F5', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, paddingBottom: 18, gap: 8 },
  receiptLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.5, color: '#5A6070' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  receiptKey: { fontFamily: fonts.regular, fontSize: 13, color: '#4A5060' },
  receiptVal: { fontFamily: fonts.medium, fontSize: 13, color: '#0B0C10' },
  receiptLine: { height: 1, backgroundColor: '#CDD0D8', marginVertical: 4 },
  receiveLabel: { fontFamily: fonts.semibold, fontSize: 13, color: '#0B0C10' },
  receiveValue: { fontFamily: fonts.display, fontSize: 20, color: '#0B0C10' },
  receiveUnit: { fontSize: 12 },
  steps: { flexDirection: 'row', marginTop: 14, marginBottom: 10 },
  step: { flex: 1, alignItems: 'center', gap: 6, minHeight: 60 },
  stepDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  stepDotOn: { backgroundColor: colors.gold },
  stepNum: { fontFamily: fonts.bold, fontSize: 12, color: colors.muted },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 11, color: colors.subtle },
  request: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  reqTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, marginBottom: 2 },
});
