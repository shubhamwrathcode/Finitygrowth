import React, { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Header,
  Card,
  Button,
  Field,
  Badge,
  Loading,
  ErrorView,
  OtpStep,
  Notice,
  Icon,
} from '../../components';
import { EmptyRing } from '../../components/charts';
import { useFocusEffect } from '@react-navigation/native';
import useApi from '../../hooks/useApi';
import useInScreenBack from '../../hooks/useInScreenBack';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, radius, type } from '../../theme';
import { money, shortAddress } from '../../utils/format';

const BEP20 = /^0x[a-fA-F0-9]{40}$/;
const LIMIT = 8;

const STEPS = [
  { title: 'Request', text: 'Enter an amount and your BEP20 address, then confirm a code.' },
  { title: 'Locked', text: 'The full amount leaves your balance after the code is accepted.' },
  { title: 'Review', text: 'Admin checks the request. You can cancel while it is pending.' },
  { title: 'Paid', text: 'Approval sends the net amount on BSC. The request itself does not.' },
];

const round = value => Math.round(value * 100) / 100;

function short(address = '') {
  return shortAddress(address, 8, 6);
}

function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function statusTone(status) {
  if (status === 'pending') return 'warning';
  if (status === 'paid' || status === 'approved' || status === 'completed') return 'success';
  if (status === 'rejected' || status === 'failed' || status === 'cancelled') return 'neutral';
  return 'gold';
}

function moneyCur(value, currency) {
  return currency ? `${money(value)} ${currency}` : money(value);
}

/**
 * WithdrawScreen – same flow as web Withdraw.jsx:
 * amount + BEP20 address → review → OTP → request locked.
 * Admin pays net after approval. Pending rows can be cancelled.
 */
export default function WithdrawScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const wallet = useApi(api.getWallets);
  const destinations = useApi(api.getDestinations);

  useFocusEffect(
    useCallback(() => {
      destinations.refresh();
    }, [destinations.refresh]),
  );
  const [page, setPage] = useState(1);
  const list = useApi(() => api.getWithdrawalList({ page, limit: LIMIT }), [page]);

  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [errors, setErrors] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [cancelId, setCancelId] = useState('');
  const [notice, setNotice] = useState('');

  const modalOpen = confirming || Boolean(cancelId);
  useInScreenBack(modalOpen, () => {
    if (busy) return;
    if (cancelId) {
      setCancelId('');
      return;
    }
    setConfirming(false);
    setDone(null);
    setChallenge(null);
  });

  const rules = wallet.data;
  const currency = rules?.currency || 'USDT';
  const balance = Number(rules?.balance || 0);
  const locked = Number(rules?.lockedBalance || 0);
  const feePercent = Number(rules?.withdrawal?.feePercent || 0);
  const min = Number(rules?.withdrawal?.minWithdrawal || 0);
  const max = Number(rules?.withdrawal?.maxWithdrawal || 0);

  const saved = useMemo(() => destinations.data || [], [destinations.data]);
  const bep20 = useMemo(() => saved.filter(item => item.network === 'BEP20'), [saved]);

  const gross = Number(amount);
  const fee = Number.isFinite(gross) ? round((gross * feePercent) / 100) : 0;
  const net = Number.isFinite(gross) ? round(gross - fee) : 0;
  const ceiling = max ? Math.min(max, balance) : balance;
  const typed = address.trim();
  const destination = bep20.find(
    item => item.id === destinationId && item.address.toLowerCase() === typed.toLowerCase(),
  );
  const payoutAddress = destination?.address || typed;

  let amountError = '';
  if (amount) {
    if (!Number.isFinite(gross) || gross <= 0) amountError = 'Enter a valid amount.';
    else if (min && gross < min) amountError = `Minimum is ${money(min)} ${currency}.`;
    else if (max && gross > max) amountError = `Maximum is ${money(max)} ${currency}.`;
    else if (gross > balance) amountError = 'More than your balance.';
    else if (net <= 0) amountError = 'Too small after the fee.';
  }
  let addressError = '';
  if (typed && !BEP20.test(typed)) {
    addressError = 'Enter a BEP20 address: 0x plus 40 hex characters.';
  }
  const ready = Boolean(amount) && !amountError && BEP20.test(typed);

  const rows = list.data?.data || [];
  const listMeta = list.data || {};
  const totalPages = Math.max(1, Math.ceil((listMeta.total || 0) / (listMeta.limit || LIMIT)));
  const pendingTotal = rows
    .filter(row => row.status === 'pending')
    .reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const refreshAll = async () => {
    await Promise.all([wallet.refresh(), destinations.refresh(), list.refresh()]);
  };

  const closeConfirm = () => {
    if (busy) return;
    Keyboard.dismiss();
    setConfirming(false);
    setDone(null);
    setChallenge(null);
  };

  const submit = async () => {
    setBusy(true);
    setErrors({});
    try {
      const body = destination
        ? { amount: gross, destinationId: destination.id }
        : { amount: gross, address: typed };
      const result = await api.createWithdrawal(body);
      setChallenge(result.data);
    } catch (error) {
      const fieldErrors = error.errors && Object.keys(error.errors).length ? error.errors : null;
      setErrors(fieldErrors || { form: error.message });
      if (fieldErrors) setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  const verify = async otp => {
    try {
      const result = await api.verifyWithdrawal(challenge.challengeId, otp);
      setDone({
        net: result.data.netAmount,
        gross: result.data.amount,
        address: result.data.address,
      });
      setChallenge(null);
      setAmount('');
      setAddress('');
      setDestinationId('');
      list.refresh();
      wallet.refresh();
    } catch (error) {
      if (error.message === 'Insufficient balance') {
        setChallenge(null);
        setConfirming(false);
        setErrors({ form: 'Insufficient balance. Start the withdrawal again.' });
        wallet.refresh();
        return;
      }
      throw error;
    }
  };

  const resend = async () => {
    const result = await api.resendWithdrawalOtp(challenge.challengeId);
    setChallenge(result.data);
  };

  const cancel = async () => {
    setBusy(true);
    setNotice('');
    try {
      await api.cancelWithdrawal(cancelId);
      setNotice('Withdrawal cancelled. The amount is back in your balance.');
      setCancelId('');
      list.refresh();
      wallet.refresh();
    } catch (error) {
      setNotice(error.message);
      setCancelId('');
    } finally {
      setBusy(false);
    }
  };

  const setChip = value => {
    if (!value || value > balance) return;
    setAmount(String(value));
    setErrors({});
  };

  if (wallet.error && !wallet.data) {
    return (
      <Screen>
        <Header title="Withdraw" />
        <ErrorView message={wallet.error} onRetry={wallet.refresh} />
      </Screen>
    );
  }

  if (wallet.loading && !wallet.data) {
    return (
      <Screen>
        <Header title="Withdraw" />
        <Loading />
      </Screen>
    );
  }

  const modalTitle = done ? 'Request sent' : challenge ? 'Enter the code' : 'Confirm withdrawal';

  return (
    <Screen keyboard onRefresh={refreshAll} refreshing={wallet.loading || list.loading}>
      <Header
        title="Withdraw"
        right={
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate(ROUTES.ADDRESSES)}
            style={styles.manageBtn}
            hitSlop={6}>
            <Text style={styles.manageText}>Manage addresses</Text>
          </Pressable>
        }
      />
      <Text style={type.small}>
        The amount leaves your balance. The fee is cut from it, and admin sends the net amount on BEP20 after
        approval.
      </Text>

      {notice ? (
        <View style={styles.mt12}>
          <Notice
            text={notice}
            tone={notice.startsWith('Withdrawal cancelled') ? 'gold' : 'warning'}
          />
        </View>
      ) : null}

      <View style={styles.balanceCard}>
        <LinearGradient
          colors={['rgba(227,191,122,0.18)', 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 0.7, y: 0.15 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(240,160,160,0.16)', 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.35, y: 0.9 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.balanceMain}>
          <Text style={styles.balanceLabel}>Available to withdraw</Text>
          <Text style={styles.balanceAmt}>{money(balance)}</Text>
          <Text style={styles.balanceCur}>{currency}</Text>
        </View>
        <View style={styles.lockedBox}>
          <Text style={styles.lockedLabel}>Locked</Text>
          <Text style={styles.lockedAmt}>{money(locked)}</Text>
        </View>
      </View>

      <Field
        style={styles.mt20}
        label="Amount"
        labelRight={
          min || max ? (
            <Text style={type.tiny}>
              {money(min)} – {money(max)} {currency}
            </Text>
          ) : null
        }
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={t => {
          setAmount(t.replace(/[^0-9.]/g, ''));
          setErrors({});
        }}
        error={errors.amount || amountError || undefined}
        inputStyle={styles.amountInput}
        right={<Text style={styles.unit}>{currency}</Text>}
      />
      <View style={styles.quick}>
        {[
          ['Min', min],
          ['25%', round(ceiling * 0.25)],
          ['50%', round(ceiling * 0.5)],
          ['Max', round(ceiling)],
        ].map(([label, value]) => (
          <Pressable
            key={label}
            onPress={() => setChip(value)}
            disabled={!value || value > balance}
            style={[styles.quickBtn, (!value || value > balance) && styles.quickDisabled]}>
            <Text style={styles.quickText}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <Field
        style={styles.mt16}
        label="BEP20 address"
        placeholder="0x…"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        value={address}
        onChangeText={value => {
          const match = bep20.find(item => item.address.toLowerCase() === value.trim().toLowerCase());
          setAddress(value);
          setDestinationId(match ? match.id : '');
          setErrors({});
        }}
        error={errors.address || errors.destinationId || addressError || undefined}
        inputStyle={styles.mono}
        hint="0x and 40 hex characters"
      />

      {destinations.loading && !destinations.data ? (
        <Loading />
      ) : bep20.length > 0 ? (
        <View style={styles.addrList}>
          {bep20.map(item => {
            const active = destination?.id === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  setAddress(item.address);
                  setDestinationId(item.id);
                  setErrors({});
                }}
                style={[styles.addrRow, active && styles.addrRowActive]}>
                <View style={[styles.radio, active && styles.radioOn]} />
                <View style={styles.flex1}>
                  <Text style={styles.addrLabel}>{item.label}</Text>
                  <Text style={styles.addrCode}>{short(item.address)}</Text>
                </View>
                <Text style={styles.addrNet}>BEP20</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {saved.some(item => item.network !== 'BEP20') ? (
        <Text style={[type.tiny, styles.mt8]}>
          Saved TRC20 and ERC20 addresses cannot be used. Type a BEP20 address, or pick a saved BEP20 one.
        </Text>
      ) : null}

      <View style={styles.breakdown}>
        <View style={styles.bdRow}>
          <Text style={styles.bdKey}>Gross amount</Text>
          <Text style={styles.bdVal}>{moneyCur(amount && !amountError ? gross : 0, currency)}</Text>
        </View>
        <View style={styles.bdRow}>
          <Text style={styles.bdKey}>Fee · {feePercent}%</Text>
          <Text style={styles.bdVal}>−{moneyCur(amount && !amountError ? fee : 0, currency)}</Text>
        </View>
        <View style={[styles.bdRow, styles.bdTotal]}>
          <Text style={styles.bdTotalKey}>You receive</Text>
          <Text style={styles.bdTotalVal}>{moneyCur(amount && !amountError ? net : 0, currency)}</Text>
        </View>
      </View>

      {errors.form && !confirming ? <Text style={styles.formError}>{errors.form}</Text> : null}

      <Button
        title="Review withdrawal"
        disabled={!ready}
        onPress={() => {
          setErrors({});
          setConfirming(true);
        }}
        style={styles.mt16}
      />

      <Card style={styles.mt24}>
        <Text style={type.h2}>How it works</Text>
        <View style={styles.steps}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepDot}>
                <Text style={styles.stepNum}>{index + 1}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={type.tiny}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.limits}>
          <View style={styles.limitCell}>
            <Text style={type.tiny}>Fee</Text>
            <Text style={styles.limitVal}>{feePercent}%</Text>
          </View>
          <View style={styles.limitCell}>
            <Text style={type.tiny}>Minimum</Text>
            <Text style={styles.limitVal}>{money(min)}</Text>
          </View>
          <View style={styles.limitCell}>
            <Text style={type.tiny}>Maximum</Text>
            <Text style={styles.limitVal}>{money(max)}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.mt24}>
        <Text style={type.h2}>Requests</Text>
        <Text style={[type.tiny, styles.mt4]}>
          {pendingTotal > 0
            ? `${moneyCur(pendingTotal, currency)} pending on this page`
            : 'Your withdrawal requests'}
        </Text>

        {list.loading && !list.data ? (
          <View style={styles.histLoading}>
            <Loading />
          </View>
        ) : rows.length ? (
          rows.map(row => (
            <View key={row.id} style={styles.reqRow}>
              <View style={styles.reqIco}>
                <Icon name="up" size={16} color={colors.gold} />
              </View>
              <View style={styles.flex1}>
                <View style={styles.reqTop}>
                  <Text style={styles.reqAmt}>{moneyCur(row.netAmount, currency)}</Text>
                  <Badge
                    label={String(row.status || '').replaceAll('_', ' ')}
                    tone={statusTone(row.status)}
                  />
                </View>
                <Text style={type.tiny}>
                  {row.label} · {row.network} · {short(row.address)}
                </Text>
                <Text style={type.tiny}>
                  Gross {money(row.amount)} · fee{' '}
                  {row.feePercent != null ? `${row.feePercent}% · ` : ''}
                  {money(row.fee)} · {when(row.createdAt)}
                </Text>
                {row.transactionHash ? (
                  <Pressable
                    onPress={() => Linking.openURL(`https://bscscan.com/tx/${row.transactionHash}`)}>
                    <Text style={styles.hashLink}>{short(row.transactionHash)}</Text>
                  </Pressable>
                ) : null}
                {row.reason ? (
                  <Text style={styles.reason}>
                    {row.status === 'failed' ? 'Payout failed: ' : 'Reason: '}
                    {row.reason}
                  </Text>
                ) : null}
              </View>
              {row.status === 'pending' ? (
                <Button title="Cancel" variant="ghost" size="sm" onPress={() => setCancelId(row.id)} />
              ) : null}
            </View>
          ))
        ) : (
          <EmptyRing message="No withdrawal requests yet." />
        )}

        {totalPages > 1 ? (
          <View style={styles.pager}>
            <Button
              title="Previous"
              variant="outline"
              size="md"
              disabled={page <= 1 || list.loading}
              onPress={() => setPage(p => Math.max(1, p - 1))}
            />
            <Text style={type.tiny}>
              {page} / {totalPages}
            </Text>
            <Button
              title="Next"
              variant="outline"
              size="md"
              disabled={page >= totalPages || list.loading}
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          </View>
        ) : null}
      </Card>

      <Modal
        visible={confirming}
        animationType="slide"
        transparent
        onRequestClose={closeConfirm}
        statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalDismiss} onPress={closeConfirm} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHead}>
              <Text style={type.h2}>{modalTitle}</Text>
              <Pressable onPress={closeConfirm} hitSlop={8} accessibilityLabel="Close" disabled={busy}>
                <Icon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
              bounces={false}>
              {done ? (
                <>
                  <View style={styles.doneIco}>
                    <Icon name="check" size={28} color={colors.goldInk} strokeWidth={2.2} />
                  </View>
                  <Text style={styles.doneTitle}>{moneyCur(done.net, currency)} on its way to review</Text>
                  <Text style={type.small}>
                    {moneyCur(done.gross, currency)} is locked until the payout is sent, rejected, or you cancel.
                    Admin sends {moneyCur(done.net, currency)} to {done.address}. A withdrawal request email was
                    sent.
                  </Text>
                  <Button
                    title="Done"
                    onPress={() => {
                      setConfirming(false);
                      setDone(null);
                    }}
                    style={styles.mt16}
                  />
                </>
              ) : challenge ? (
                <OtpStep
                  key={challenge.challengeId}
                  sentTo={challenge.sentTo}
                  expiresInSeconds={challenge.expiresInSeconds || 600}
                  onVerify={verify}
                  onResend={resend}
                  onBack={() => setChallenge(null)}
                  backLabel="Back to review"
                />
              ) : (
                <>
                  <View style={styles.reviewHero}>
                    <Text style={type.tiny}>You receive</Text>
                    <Text style={styles.reviewAmt}>{money(net)}</Text>
                    <Text style={styles.reviewCur}>{currency}</Text>
                  </View>
                  <View style={styles.reviewList}>
                    <ReviewRow label="Gross amount" value={moneyCur(gross, currency)} />
                    <ReviewRow label={`Fee (${feePercent}%)`} value={`−${moneyCur(fee, currency)}`} />
                    <ReviewRow
                      label="To"
                      value={destination ? `${destination.label} · BEP20` : 'BEP20'}
                    />
                    <ReviewRow label="Address" value={payoutAddress} mono />
                    <ReviewRow label="Balance after" value={moneyCur(round(balance - gross), currency)} />
                  </View>
                  <Text style={[type.tiny, styles.mt12]}>
                    A code confirms this request. After the code, {moneyCur(gross, currency)} is locked. The{' '}
                    {feePercent}% fee is {moneyCur(fee, currency)}, so admin is asked to pay {moneyCur(net, currency)}.
                  </Text>
                  {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}
                  <View style={styles.modalActions}>
                    <Button
                      title="Edit"
                      variant="outline"
                      size="md"
                      disabled={busy}
                      onPress={() => setConfirming(false)}
                      style={styles.flex1}
                    />
                    <Button
                      title="Send code"
                      size="md"
                      loading={busy}
                      disabled={busy}
                      onPress={submit}
                      style={styles.flex1}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(cancelId)}
        animationType="fade"
        transparent
        onRequestClose={() => !busy && setCancelId('')}
        statusBarTranslucent>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismiss} onPress={() => !busy && setCancelId('')} />
          <View style={[styles.modalSheet, styles.cancelSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Text style={type.h2}>Cancel this request?</Text>
            <Text style={[type.small, styles.mt8]}>
              The locked amount goes back to your balance straight away.
            </Text>
            <View style={styles.modalActions}>
              <Button
                title="Keep it"
                variant="outline"
                size="md"
                disabled={busy}
                onPress={() => setCancelId('')}
                style={styles.flex1}
              />
              <Button
                title="Cancel request"
                size="md"
                loading={busy}
                disabled={busy}
                onPress={cancel}
                style={styles.flex1}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ReviewRow({ label, value, mono }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.bdKey}>{label}</Text>
      <Text style={[styles.bdVal, styles.reviewVal, mono && styles.mono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: 8 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt20: { marginTop: 20 },
  mt24: { marginTop: 24 },
  manageBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  manageText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  balanceCard: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#10131b',
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.22)',
    overflow: 'hidden',
  },
  balanceMain: { flex: 1, minWidth: 0, gap: 2 },
  balanceLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  balanceAmt: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: colors.text,
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  balanceCur: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.gold,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  lockedBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'flex-end',
    gap: 2,
  },
  lockedLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  lockedAmt: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  amountInput: { fontFamily: fonts.display, fontSize: 22 },
  unit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  quick: { flexDirection: 'row', gap: 6, marginTop: 8 },
  quickBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDisabled: { opacity: 0.4 },
  quickText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },
  mono: { fontFamily: fonts.mono, fontSize: 12 },
  addrList: { marginTop: 10, gap: 8 },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  addrRowActive: { borderColor: colors.gold, backgroundColor: colors.goldSoft },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.lineStrong,
  },
  radioOn: { borderColor: colors.gold, backgroundColor: colors.gold },
  addrLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  addrCode: { fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 2 },
  addrNet: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gold },
  breakdown: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  bdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  bdKey: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  bdVal: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'right' },
  bdTotal: {
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  bdTotalKey: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  bdTotalVal: { fontFamily: fonts.display, fontSize: 18, color: colors.gold },
  formError: {
    marginTop: 10,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  steps: { marginTop: 14, gap: 12 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { fontFamily: fonts.bold, fontSize: 12, color: colors.goldInk },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 2 },
  limits: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  limitCell: { flex: 1, gap: 4 },
  limitVal: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  histLoading: { minHeight: 120, justifyContent: 'center' },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  reqIco: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  reqAmt: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, flexShrink: 1 },
  hashLink: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.gold,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  reason: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger, marginTop: 4 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    maxHeight: '92%',
  },
  cancelSheet: { justifyContent: 'flex-end' },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalBody: { paddingBottom: 8, gap: 4 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  doneIco: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  doneTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  reviewHero: { alignItems: 'center', paddingVertical: 12, gap: 2 },
  reviewAmt: { fontFamily: fonts.display, fontSize: 36, color: colors.text, letterSpacing: -0.5 },
  reviewCur: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  reviewList: { gap: 10, marginTop: 4 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  reviewVal: { maxWidth: '62%' },
});
