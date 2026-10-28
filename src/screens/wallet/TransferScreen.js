import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Header, Card, Button, Row, Segmented, TransactionRow, EmptyState, Badge, Icon, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

/**
 * TransferScreen – send USDT from balance to another member.
 * Amount is typed on an in-app number keypad (like payment apps).
 * Data: api.getTransfers(); Submit: api.sendTransfer() (simulated)
 */
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];

export default function TransferScreen({ navigation }) {
  const { data } = useApi(api.getTransfers);
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [historyTab, setHistoryTab] = useState('All');
  const [sending, setSending] = useState(false);

  if (!data) {
    return <Screen><Header title="Transfer" /><Loading /></Screen>;
  }

  const n = Number(amount) || 0;
  const over = n > data.balance;

  const press = key => {
    setAmount(a => {
      if (key === 'del') {
        return a.slice(0, -1);
      }
      if (key === '.') {
        return a.includes('.') ? a : (a || '0') + '.';
      }
      if (a.includes('.') && a.split('.')[1].length >= 2) {
        return a; // max 2 decimals
      }
      return a === '0' ? key : (a + key).slice(0, 9);
    });
  };

  const setPct = p => setAmount(String(Math.floor(data.balance * p * 100) / 100));

  const review = () => {
    Alert.alert('Confirm transfer', `Send ${money(n)} USDT to ${to}?\nFee ${money(data.fee)} · They receive ${money(n)} USDT.\nA transfer can’t be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          setSending(true);
          try {
            const res = await api.sendTransfer({ to, amount: n });
            Alert.alert('Transfer sent', `Reference ${res.reference}. (Demo: static data is not changed.)`);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Could not send', e.message);
          } finally {
            setSending(false);
          }
        },
      },
    ]);
  };

  const history = data.history.filter(h =>
    historyTab === 'All' ? true : historyTab === 'Sent' ? h.type === 'transfer_out' : h.type === 'transfer_in',
  );

  return (
    <Screen>
      <Header title="Transfer" right={<Badge label={`Fee ${money(data.fee, 0)}`} tone="success" />} />

      <Card style={styles.to} padding={14}>
        <Icon name="user" size={20} color={colors.muted} />
        <View style={styles.flex1}>
          <Text style={type.tiny}>Send to</Text>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="Email address or referral code"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            style={styles.toInput}
          />
        </View>
      </Card>

      <View style={styles.amountBox}>
        <Text style={type.small}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, !amount && { color: '#3A3F4D' }]}>{amount || '0'}</Text>
          <Text style={styles.unit}>USDT</Text>
        </View>
        <Text style={[type.small, over && { color: colors.warning }]}>
          {over ? `More than your ${money(data.balance)} USDT balance` : `${money(data.balance)} USDT available to send`}
        </Text>
        <View style={styles.pcts}>
          {[0.25, 0.5, 0.75, 1].map(p => (
            <Pressable key={p} onPress={() => setPct(p)} style={styles.pct}>
              <Text style={styles.pctText}>{p === 1 ? 'Max' : `${p * 100}%`}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.keypad}>
        {KEYS.map(k => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityLabel={k === 'del' ? 'Delete' : k}
            onPress={() => press(k)}
            style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.surface }]}>
            {k === 'del' ? <Icon name="backspace" size={24} /> : <Text style={styles.keyText}>{k}</Text>}
          </Pressable>
        ))}
      </View>

      {showNote ? (
        <TextInput
          value={note}
          onChangeText={t => setNote(t.slice(0, 200))}
          placeholder="Note (optional)"
          placeholderTextColor={colors.placeholder}
          style={styles.note}
          multiline
        />
      ) : (
        <Pressable onPress={() => setShowNote(true)} style={styles.addNote}>
          <Text style={type.small}>+ Add a note</Text>
          <Text style={type.tiny}>optional · {note.length}/200</Text>
        </Pressable>
      )}

      <Card style={styles.mt12} padding={0}>
        <View style={styles.summary}>
          <Row label="Fee" value={`${money(data.fee)} USDT`} />
          <Row label="They receive" value={`${money(n)} USDT`} />
          <Row label="Wallet after" value={`${money(Math.max(data.balance - n, 0))} USDT`} last />
        </View>
      </Card>

      <Button title="Review transfer" disabled={!to.trim() || !n || over} loading={sending} onPress={review} style={styles.mt14} />
      <Text style={[type.tiny, styles.mt10]}>
        From your balance only — locked withdrawal funds can’t be sent. The receiver must be an active member. A transfer can’t be undone, and it doesn’t buy a package or count as a referral.
      </Text>

      <View style={styles.month}>
        <Card style={styles.flex1} padding={12}>
          <Text style={type.tiny}>↗ Sent this month</Text>
          <Text style={styles.monthValue}>{money(data.sentThisMonth)} USDT</Text>
        </Card>
        <Card style={styles.flex1} padding={12}>
          <Text style={type.tiny}>↙ Received this month</Text>
          <Text style={styles.monthValue}>{money(data.receivedThisMonth)} USDT</Text>
        </Card>
      </View>

      <Text style={[type.h2, styles.mt24]}>History</Text>
      <Segmented variant="underline" options={['All', 'Sent', 'Received']} value={historyTab} onChange={setHistoryTab} style={styles.mt8} />
      {history.length === 0 ? (
        <EmptyState icon="send" text="No transfers in this view yet." />
      ) : (
        history.map((h, i) => <TransactionRow key={h.id} item={h} last={i === history.length - 1} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt8: { marginTop: 8 },
  mt10: { marginTop: 10 },
  mt12: { marginTop: 12 },
  mt14: { marginTop: 14 },
  mt24: { marginTop: 24 },
  to: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  toInput: { color: colors.text, fontFamily: fonts.regular, fontSize: 15, paddingVertical: 4 },
  amountBox: { alignItems: 'center', marginTop: 22, gap: 4 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  amount: { fontFamily: fonts.display, fontSize: 52, color: colors.text, letterSpacing: -1 },
  unit: { fontFamily: fonts.semibold, fontSize: 16, color: colors.muted },
  pcts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  pct: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.lineStrong, justifyContent: 'center' },
  pctText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14, paddingHorizontal: 8 },
  key: { width: '33.33%', height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  keyText: { fontFamily: fonts.displaySemi, fontSize: 24, color: colors.text },
  addNote: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.lineStrong, marginTop: 10 },
  note: { minHeight: 70, borderRadius: 14, backgroundColor: colors.surfaceAlt, color: colors.text, fontFamily: fonts.regular, fontSize: 14, padding: 14, marginTop: 10, textAlignVertical: 'top' },
  summary: { paddingHorizontal: 16 },
  month: { flexDirection: 'row', gap: 10, marginTop: 22 },
  monthValue: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, marginTop: 4 },
});
