import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Screen, Header, Button, Card, TransactionRow, EmptyState, Loading, Icon } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

/**
 * DepositScreen – QR + deposit address, 3-step guide, Verify button and the
 * list of credited BEP20 deposits.
 * Data: api.getDepositInfo(); Verify: api.verifyDeposit() (simulated)
 *
 * Copy: to copy for real, add @react-native-clipboard/clipboard and call
 * Clipboard.setString(address) in `copy()` (see docs/SCREENS.md).
 */
export default function DepositScreen() {
  const { data } = useApi(api.getDepositInfo);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showSweep, setShowSweep] = useState(false);

  if (!data) {
    return <Screen><Header title="Deposit" /><Loading /></Screen>;
  }

  const copy = () => setCopied(true);

  const verify = async () => {
    setChecking(true);
    const result = await api.verifyDeposit();
    setChecking(false);
    Alert.alert(result.found ? 'Deposit credited' : 'Not found yet', result.message);
  };

  return (
    <Screen>
      <Header title="Deposit" right={<Text style={type.small}>Balance <Text style={styles.strong}>{money(data.balance)} USDT</Text></Text>} />

      <View style={styles.network}>
        <View style={styles.netDot} />
        <Text style={styles.netText}>USDT · {data.network} on {data.chain} only</Text>
      </View>

      <View style={styles.qrWrap}>
        <View style={styles.qr}>
          <QRCode value={data.address} size={184} backgroundColor="#F4F1EA" color="#0B0C10" />
        </View>
        <Text style={[type.small, styles.mt12]}>Scan in your wallet. Send USDT on {data.network} only.</Text>
      </View>

      <Card style={styles.addressCard}>
        <View style={styles.flex1}>
          <Text style={type.tiny}>Your deposit address</Text>
          <Text style={styles.address} selectable>{data.address}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Copy address" onPress={copy} style={styles.copy}>
          <Icon name={copied ? 'check' : 'copy'} size={16} color={colors.text} />
          <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </Card>

      <View style={styles.steps}>
        {['Send USDT on BEP20', 'Press Verify deposit', 'Matching transfer is credited'].map((s, i) => (
          <Card key={s} style={styles.step} padding={12}>
            <Text style={styles.stepNum}>0{i + 1}</Text>
            <Text style={styles.stepText}>{s}</Text>
          </Card>
        ))}
      </View>
      <Text style={[type.tiny, styles.mt12]}>If you don’t press Verify, the server checks every 15 minutes.</Text>

      <Button title="Verify deposit" loading={checking} onPress={verify} style={styles.mt16} />

      <Pressable onPress={() => setShowSweep(s => !s)} style={styles.sweep}>
        <View style={styles.sweepHead}>
          <Text style={type.small}>About sweeps and gas</Text>
          <Icon name="chevronDown" size={16} color={colors.subtle} strokeWidth={2} />
        </View>
        {showSweep ? (
          <Text style={[type.tiny, styles.mt8]}>
            Tokens on this address are sent to the company wallet. That does not change your balance. USDT and BNB are separate sends. The same send also runs every hour.
          </Text>
        ) : null}
      </Pressable>

      <Text style={[type.h2, styles.mt28]}>BEP20 deposits</Text>
      <Text style={[type.tiny, styles.mt4]}>Credited deposits only. Gas and sweep transfers aren’t listed. A send under 0.1 USDT is not credited.</Text>
      {data.deposits.length === 0 ? (
        <EmptyState icon="arrowDown" text="Nothing here yet." />
      ) : (
        data.deposits.map((d, i) => <TransactionRow key={d.id} item={d} last={i === data.deposits.length - 1} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt28: { marginTop: 28 },
  strong: { fontFamily: fonts.semibold, color: colors.text },
  network: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.goldSoft, marginTop: 10 },
  netDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  netText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  qrWrap: { alignItems: 'center', marginTop: 20 },
  qr: { padding: 18, borderRadius: 24, backgroundColor: '#F4F1EA' },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 },
  address: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: colors.text, marginTop: 4 },
  copy: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.pressed },
  copyText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  steps: { flexDirection: 'row', gap: 8, marginTop: 20 },
  step: { flex: 1, gap: 6 },
  stepNum: { fontFamily: fonts.bold, fontSize: 11, color: colors.gold },
  stepText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.textSoft },
  sweep: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: '#0B0D12' },
  sweepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
