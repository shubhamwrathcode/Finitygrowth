import React, { useEffect, useMemo, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Header,
  Card,
  Button,
  Field,
  Badge,
  Segmented,
  Loading,
  ErrorView,
  Icon,
} from '../../components';
import { EmptyRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import useInScreenBack from '../../hooks/useInScreenBack';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^[A-Za-z0-9_-]{4,24}$/;
const NOTE_MAX = 200;
const LIMIT = 8;
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: 'Sent' },
  { value: 'received', label: 'Received' },
];

const round = value => Math.round(value * 100) / 100;

function moneyCur(value, currency) {
  return currency ? `${money(value)} ${currency}` : money(value);
}

function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function statusTone(status) {
  if (status === 'pending') return 'warning';
  if (status === 'completed' || status === 'paid' || status === 'approved') return 'success';
  if (status === 'failed' || status === 'rejected' || status === 'cancelled') return 'neutral';
  return 'gold';
}

function useRecipientCheck(value) {
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    const text = value.trim();
    if (!text) {
      setState({ status: 'idle' });
      return undefined;
    }
    if (EMAIL.test(text)) {
      setState({ status: 'email' });
      return undefined;
    }
    if (!CODE.test(text)) {
      setState({ status: 'invalid' });
      return undefined;
    }
    setState({ status: 'checking' });
    let live = true;
    const timer = setTimeout(() => {
      api
        .lookupReferral(text)
        .then(body => {
          if (live) {
            setState({
              status: 'found',
              name: body.data.name,
              code: body.data.referralCode,
            });
          }
        })
        .catch(() => {
          if (live) setState({ status: 'missing' });
        });
    }, 400);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [value]);

  return state;
}

function RecipientHint({ check }) {
  if (check.status === 'checking') {
    return <Text style={styles.hint}>Checking code…</Text>;
  }
  if (check.status === 'found') {
    return (
      <View style={styles.foundRow}>
        <View style={styles.personDot}>
          <Text style={styles.personLetter}>{(check.name || '?').slice(0, 1)}</Text>
        </View>
        <Text style={styles.hintOk}>
          {check.name} · {check.code}
        </Text>
      </View>
    );
  }
  if (check.status === 'missing') {
    return <Text style={styles.hintBad}>No active member has this referral code.</Text>;
  }
  if (check.status === 'email') {
    return <Text style={styles.hint}>The name is confirmed when you send.</Text>;
  }
  if (check.status === 'invalid') {
    return <Text style={styles.hintBad}>Enter an email or a referral code.</Text>;
  }
  return <Text style={styles.hint}>Email address or referral code.</Text>;
}

/**
 * TransferScreen – same flow as web Transfer.jsx:
 * recipient (email / referral) → amount → note → review → send.
 */
export default function TransferScreen() {
  const insets = useSafeAreaInsets();
  const wallet = useApi(api.getWallets);
  const profile = useApi(api.getProfile);
  const [page, setPage] = useState(1);
  const list = useApi(() => api.getTransferList({ page, limit: LIMIT }), [page]);
  const recent = useApi(() => api.getTransferList({ page: 1, limit: 50 }), []);

  const [form, setForm] = useState({ recipient: '', amount: '', note: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [filter, setFilter] = useState('all');

  useInScreenBack(review, () => {
    if (busy) return;
    setReview(false);
    setDone(null);
  });

  const currency = wallet.data?.currency || 'USDT';
  const balance = Number(wallet.data?.balance || 0);
  const me = profile.data || {};
  const check = useRecipientCheck(form.recipient);
  const amount = Number(form.amount);

  const mine = person =>
    Boolean(
      person &&
        ((me.id && person.id === me.id) ||
          (me.referralCode && person.referralCode === me.referralCode)),
    );

  const stats = useMemo(() => {
    const rows = recent.data?.data || [];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    let sent = 0;
    let received = 0;
    const people = new Map();
    rows.forEach(row => {
      const outgoing = mine(row.sender);
      if (new Date(row.createdAt) >= monthStart) {
        if (outgoing) sent += Number(row.amount);
        else received += Number(row.amount);
      }
      if (outgoing && row.recipient?.referralCode && !people.has(row.recipient.referralCode)) {
        people.set(row.recipient.referralCode, row.recipient);
      }
    });
    return { sent: round(sent), received: round(received), people: [...people.values()].slice(0, 6) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recent.data, me.id, me.referralCode]);

  let amountError = '';
  if (form.amount) {
    if (!Number.isFinite(amount) || amount <= 0) amountError = 'Enter a valid amount.';
    else if (amount > balance) amountError = 'More than your balance.';
  }
  const recipientOk = check.status === 'found' || check.status === 'email';
  const canReview = recipientOk && form.amount && !amountError && form.note.length <= NOTE_MAX;

  const set = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: '' }));
    setFailure('');
  };

  const closeReview = () => {
    if (busy) return;
    Keyboard.dismiss();
    setReview(false);
    setDone(null);
  };

  const send = async () => {
    setBusy(true);
    setFailure('');
    try {
      const result = await api.createTransfer({
        recipient: form.recipient.trim(),
        amount,
        note: form.note.trim(),
      });
      setDone({
        amount,
        name: result.data?.recipient?.name || check.name || form.recipient,
        note: form.note.trim(),
      });
      setForm({ recipient: '', amount: '', note: '' });
      wallet.refresh();
      list.refresh();
      recent.refresh();
    } catch (error) {
      setErrors(error.errors || {});
      setFailure(error.message);
      if (error.errors) setReview(false);
    } finally {
      setBusy(false);
    }
  };

  const rows = (list.data?.data || []).filter(row => {
    if (filter === 'all') return true;
    return filter === 'sent' ? mine(row.sender) : !mine(row.sender);
  });
  const listMeta = list.data || {};
  const totalPages = Math.max(1, Math.ceil((listMeta.total || 0) / (listMeta.limit || LIMIT)));

  const refreshAll = () =>
    Promise.all([wallet.refresh(), profile.refresh(), list.refresh(), recent.refresh()]);

  if (wallet.error && !wallet.data) {
    return (
      <Screen>
        <Header title="Transfer" />
        <ErrorView message={wallet.error} onRetry={wallet.refresh} />
      </Screen>
    );
  }

  if (wallet.loading && !wallet.data) {
    return (
      <Screen>
        <Header title="Transfer" />
        <Loading />
      </Screen>
    );
  }

  const filterLabel = FILTERS.find(f => f.value === filter)?.label || 'All';
  const after = Math.max(0, balance - (amount > 0 && !amountError ? amount : 0));
  const receive = amount > 0 && !amountError ? amount : 0;

  return (
    <Screen keyboard onRefresh={refreshAll} refreshing={wallet.loading || list.loading}>
      <Header title="Transfer" right={<Badge label="Fee 0" tone="success" />} />
      <Text style={type.small}>Send from your balance to another member. The fee is 0.</Text>

      <LinearGradient colors={GOLD_GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
        <View style={styles.walletTop}>
          <Text style={styles.walletTopLabel}>Balance</Text>
          <Svg width={40} height={28} viewBox="0 0 40 28">
            <Rect
              x={1}
              y={1}
              width={38}
              height={26}
              rx={6}
              fill="rgba(23,18,10,0.12)"
              stroke="rgba(23,18,10,0.4)"
              strokeWidth={1.2}
            />
            <Path
              d="M1 10h12M1 18h12M27 10h12M27 18h12M13 1v26M27 1v26"
              stroke="rgba(23,18,10,0.4)"
              strokeWidth={1.2}
            />
          </Svg>
        </View>
        <Text style={styles.walletAmt}>{money(balance)}</Text>
        <View style={styles.walletFoot}>
          <Text style={styles.walletFootText}>{currency} available to send</Text>
          <Text style={styles.walletFootText}>{me.referralCode || ''}</Text>
        </View>
      </LinearGradient>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Send to</Text>
        <View
          style={[
            styles.recipientBox,
            (errors.recipient || check.status === 'missing' || check.status === 'invalid') &&
              styles.recipientBoxError,
          ]}>
          <Icon name="user" size={18} color={colors.muted} />
          <TextInput
            value={form.recipient}
            onChangeText={v => set('recipient', v)}
            placeholder="name@email.com or STX7Q4K"
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            style={styles.recipientInput}
          />
          {check.status === 'found' ? (
            <Icon name="check" size={18} color={colors.success} strokeWidth={2.2} />
          ) : null}
        </View>
        {errors.recipient ? (
          <Text style={styles.hintBad}>{errors.recipient}</Text>
        ) : (
          <RecipientHint check={check} />
        )}
        {stats.people.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.peopleRow}>
            {stats.people.map(person => (
              <Pressable
                key={person.referralCode}
                onPress={() => set('recipient', person.referralCode)}
                style={styles.personChip}>
                <View style={styles.personDot}>
                  <Text style={styles.personLetter}>{(person.name || '?').slice(0, 1)}</Text>
                </View>
                <Text style={styles.personName} numberOfLines={1}>
                  {(person.name || '').split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <Field
        style={styles.mt16}
        label="Amount"
        placeholder="0.00"
        keyboardType="decimal-pad"
        value={form.amount}
        onChangeText={t => set('amount', t.replace(/[^0-9.]/g, ''))}
        error={errors.amount || amountError || undefined}
        inputStyle={styles.amountInput}
        right={<Text style={styles.unit}>{currency}</Text>}
      />
      <View style={styles.chips}>
        {[0.25, 0.5, 0.75, 1].map(part => (
          <Pressable
            key={part}
            disabled={!balance}
            onPress={() => set('amount', String(round(balance * part)))}
            style={[styles.chip, !balance && styles.chipDisabled]}>
            <Text style={styles.chipText}>{part === 1 ? 'Max' : `${part * 100}%`}</Text>
          </Pressable>
        ))}
      </View>

      <Field
        style={styles.mt16}
        label="Note"
        labelRight={<Text style={type.tiny}>optional</Text>}
        placeholder="What is this for?"
        value={form.note}
        onChangeText={v => set('note', v.slice(0, NOTE_MAX + 20))}
        multiline
        numberOfLines={2}
        error={
          errors.note || (form.note.length > NOTE_MAX ? `Max ${NOTE_MAX} characters.` : undefined)
        }
      />
      <Text style={[styles.count, form.note.length > NOTE_MAX && styles.hintBad]}>
        {form.note.length}/{NOTE_MAX}
      </Text>

      <View style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.sumKey}>Fee</Text>
          <Text style={styles.sumVal}>0.00 {currency}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumKey}>They receive</Text>
          <Text style={[styles.sumVal, styles.sumGold]}>{moneyCur(receive, currency)}</Text>
        </View>
        <View style={styles.sumRow}>
          <Text style={styles.sumKey}>Wallet after</Text>
          <Text style={styles.sumVal}>{moneyCur(after, currency)}</Text>
        </View>
      </View>

      {failure && !review ? <Text style={styles.formError}>{failure}</Text> : null}

      <Button
        title="Review transfer"
        disabled={!canReview}
        onPress={() => {
          setFailure('');
          setReview(true);
        }}
        style={styles.mt16}
      />

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statIco}>↗</Text>
          <View style={styles.flex1}>
            <Text style={type.tiny}>Sent this month</Text>
            <Text style={styles.statVal}>
              {recent.loading && !recent.data ? '…' : moneyCur(stats.sent, currency)}
            </Text>
          </View>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statIco}>↙</Text>
          <View style={styles.flex1}>
            <Text style={type.tiny}>Received this month</Text>
            <Text style={styles.statVal}>
              {recent.loading && !recent.data ? '…' : moneyCur(stats.received, currency)}
            </Text>
          </View>
        </View>
      </View>

      <Card style={styles.mt16}>
        <Text style={styles.rulesTitle}>Good to know</Text>
        {[
          'Transfers come from your balance. Locked withdrawal funds cannot be sent.',
          'The receiver must be an active member.',
          'A transfer can’t be undone once sent.',
          'Transfers don’t buy a package or count as a referral.',
        ].map(line => (
          <Text key={line} style={styles.ruleLine}>
            · {line}
          </Text>
        ))}
      </Card>

      <Card style={styles.mt24}>
        <Text style={type.h2}>Transfer history</Text>
        <Text style={[type.tiny, styles.mt4]}>Money you sent and received</Text>
        <Segmented
          variant="pill"
          options={FILTERS}
          value={filter}
          onChange={setFilter}
          style={styles.mt12}
        />

        {list.loading && !list.data ? (
          <View style={styles.histLoading}>
            <Loading />
          </View>
        ) : rows.length ? (
          rows.map(row => {
            const outgoing = mine(row.sender);
            const other = outgoing ? row.recipient : row.sender;
            return (
              <View key={row.id} style={styles.histRow}>
                <View style={[styles.dir, outgoing ? styles.dirOut : styles.dirIn]}>
                  <Text style={styles.dirText}>{outgoing ? '↗' : '↙'}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.histTitle} numberOfLines={1}>
                    {outgoing ? 'To' : 'From'} {other?.name || 'member'}
                  </Text>
                  <Text style={type.tiny} numberOfLines={1}>
                    {other?.referralCode ? `${other.referralCode} · ` : ''}
                    {row.note || when(row.createdAt)}
                  </Text>
                </View>
                <View style={styles.histRight}>
                  <Badge
                    label={String(row.status || '').replaceAll('_', ' ')}
                    tone={statusTone(row.status)}
                  />
                  <Text style={[styles.histAmt, outgoing ? styles.amtOut : styles.amtIn]}>
                    {outgoing ? '−' : '+'}
                    {moneyCur(row.amount, currency)}
                  </Text>
                  <Text style={type.tiny}>{when(row.createdAt)}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <EmptyRing message={`No transfers in this ${filterLabel.toLowerCase()} view yet.`} />
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
        visible={review}
        animationType="slide"
        transparent
        onRequestClose={closeReview}
        statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalDismiss} onPress={closeReview} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHead}>
              <Text style={type.h2}>{done ? 'Transfer sent' : 'Confirm transfer'}</Text>
              <Pressable onPress={closeReview} hitSlop={8} accessibilityLabel="Close" disabled={busy}>
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
                  <Text style={styles.doneTitle}>
                    {moneyCur(done.amount, currency)} sent to {done.name}
                  </Text>
                  <Text style={[type.small, styles.center]}>It’s already in their balance.</Text>
                  <Button
                    title="Done"
                    onPress={() => {
                      setReview(false);
                      setDone(null);
                    }}
                    style={styles.mt16}
                  />
                </>
              ) : (
                <>
                  <View style={styles.flow}>
                    <View style={styles.flowPerson}>
                      <LinearGradient
                        colors={GOLD_GRAD}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.avatarMe}>
                        <Text style={styles.avatarMeText}>{(me.name || 'Y').slice(0, 1)}</Text>
                      </LinearGradient>
                      <Text style={type.tiny}>You</Text>
                    </View>
                    <View style={styles.flowLineWrap}>
                      <View style={styles.flowLine} />
                      <View style={styles.flowAmtPill}>
                        <Text style={styles.flowAmtText}>{money(amount)}</Text>
                      </View>
                    </View>
                    <View style={styles.flowPerson}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {(check.name || form.recipient || '?').slice(0, 1)}
                        </Text>
                      </View>
                      <Text style={type.tiny} numberOfLines={1}>
                        {check.name ? check.name.split(' ')[0] : 'Recipient'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reviewList}>
                    <ReviewRow
                      label="To"
                      value={
                        check.status === 'found'
                          ? `${check.name} (${check.code})`
                          : form.recipient.trim()
                      }
                    />
                    <ReviewRow label="Amount" value={moneyCur(amount, currency)} />
                    <ReviewRow label="Fee" value={`0.00 ${currency}`} />
                    <ReviewRow label="From" value="Balance" />
                    {form.note.trim() ? <ReviewRow label="Note" value={form.note.trim()} /> : null}
                  </View>

                  <Text style={[type.tiny, styles.mt12]}>
                    Check the recipient carefully. A transfer can’t be undone.
                  </Text>
                  {failure ? <Text style={styles.formError}>{failure}</Text> : null}

                  <View style={styles.modalActions}>
                    <Button
                      title="Edit"
                      variant="outline"
                      size="md"
                      disabled={busy}
                      onPress={() => setReview(false)}
                      style={styles.flex1}
                    />
                    <Button
                      title={`Send ${money(amount)} ${currency}`}
                      size="md"
                      loading={busy}
                      disabled={busy}
                      onPress={send}
                      style={styles.flex1}
                    />
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function ReviewRow({ label, value }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.sumKey}>{label}</Text>
      <Text style={[styles.sumVal, styles.reviewVal]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mt24: { marginTop: 24 },
  walletCard: {
    marginTop: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    gap: 10,
  },
  walletTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTopLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.goldInk },
  walletAmt: {
    fontFamily: fonts.display,
    fontSize: 34,
    color: colors.goldInk,
    letterSpacing: -0.6,
    lineHeight: 40,
  },
  walletFoot: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  walletFootText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: 'rgba(23,18,10,0.7)',
    letterSpacing: 0.4,
  },
  fieldBlock: { marginTop: 20, gap: 8 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  recipientBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
  },
  recipientBoxError: { borderColor: colors.danger },
  recipientInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    paddingVertical: 12,
  },
  hint: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  hintOk: { fontFamily: fonts.medium, fontSize: 12, color: colors.success, flexShrink: 1 },
  hintBad: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  peopleRow: { gap: 8, paddingTop: 4 },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    maxWidth: 140,
  },
  personDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personLetter: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  personName: { fontFamily: fonts.medium, fontSize: 12, color: colors.text, flexShrink: 1 },
  amountInput: { fontFamily: fonts.display, fontSize: 22 },
  unit: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  chips: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },
  count: {
    marginTop: 6,
    alignSelf: 'flex-end',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  summary: {
    marginTop: 18,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  sumKey: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  sumVal: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'right' },
  sumGold: { color: colors.gold, fontFamily: fonts.semibold },
  formError: { marginTop: 10, fontFamily: fonts.medium, fontSize: 13, color: colors.danger },
  stats: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  statIco: { fontSize: 18, color: colors.gold },
  statVal: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginTop: 2 },
  rulesTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, marginBottom: 8 },
  ruleLine: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSoft, lineHeight: 18, marginBottom: 4 },
  histLoading: { minHeight: 120, justifyContent: 'center' },
  histRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  dir: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirOut: { backgroundColor: 'rgba(242,139,130,0.12)' },
  dirIn: { backgroundColor: colors.successSoft },
  dirText: { fontSize: 16 },
  histTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 2 },
  histRight: { alignItems: 'flex-end', gap: 4, maxWidth: '42%' },
  histAmt: { fontFamily: fonts.semibold, fontSize: 13 },
  amtOut: { color: colors.danger },
  amtIn: { color: colors.success },
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
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalBody: { paddingBottom: 8 },
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
  flow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 14,
  },
  flowPerson: { alignItems: 'center', gap: 6, width: 64 },
  flowLineWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  flowLine: { height: 2, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 },
  flowAmtPill: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.goldSoft,
  },
  flowAmtText: { fontFamily: fonts.bold, fontSize: 12, color: colors.gold },
  avatarMe: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMeText: { fontFamily: fonts.bold, fontSize: 18, color: colors.goldInk, textTransform: 'uppercase' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldLine,
  },
  avatarText: { fontFamily: fonts.bold, fontSize: 18, color: colors.gold, textTransform: 'uppercase' },
  reviewList: { gap: 10 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  reviewVal: { maxWidth: '62%' },
});
