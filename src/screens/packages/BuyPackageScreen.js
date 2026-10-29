import React, { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  Header,
  Card,
  Button,
  Loading,
  ErrorView,
  Icon,
} from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { imageUrl } from '../../services/http';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];

const round = value => Math.round(value * 100) / 100;
const isRange = item => item.minAmount > 0 && item.maxAmount > 0;
const short = value =>
  Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });

function moneyCur(value, currency) {
  return currency ? `${money(value)} ${currency}` : money(value);
}

/** Same formula as web BuyPackages.jsx / purchaseController.createPurchase */
function quote(item, amount) {
  const multiplier = Number(item.multiplier) || 0;
  const days = Number(item.durationDays) || 0;
  if (!amount || !multiplier || !days) return null;
  const daily = round((amount * multiplier) / days);
  return {
    daily,
    total: round(amount * multiplier),
    dailyPercent: (multiplier / days) * 100,
  };
}

function PackageCard({ item, currency, highlight, onPick, width }) {
  const q = quote(item, isRange(item) ? item.minAmount : 0);
  const multiplier = Number(item.multiplier) || 0;
  const img = item.image ? imageUrl(item.image) : '';

  return (
    <Card
      style={[styles.pkgCard, { width }, highlight && styles.pkgPicked]}
      padding={0}>
      <View style={styles.pkgArt}>
        {img ? (
          <Image source={{ uri: img }} style={styles.pkgImg} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={GOLD_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.monoBig}>
            <Text style={styles.monoBigText}>{(item.name || 'P').slice(0, 1)}</Text>
          </LinearGradient>
        )}
        {multiplier > 0 ? (
          <View style={styles.pkgTag}>
            <Text style={styles.pkgTagText}>{multiplier}× return</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.pkgBody}>
        <Text style={styles.pkgCode}>{item.code}</Text>
        <Text style={styles.pkgName}>{item.name}</Text>
        <Text style={styles.pkgRange}>
          {isRange(item) ? (
            <>
              {short(item.minAmount)} – {short(item.maxAmount)}{' '}
              <Text style={styles.pkgCur}>{currency}</Text>
            </>
          ) : (
            'Fixed price'
          )}
        </Text>

        <View style={styles.facts}>
          <View style={styles.fact}>
            <Text style={styles.factDt}>Duration</Text>
            <Text style={styles.factDd}>{item.durationDays} days</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factDt}>Daily</Text>
            <Text style={styles.factDd}>
              {q ? `${q.dailyPercent.toFixed(2)}%` : '—'}
            </Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.factDt}>Total payout</Text>
            <Text style={styles.factDd}>
              {multiplier ? `${(multiplier * 100).toFixed(0)}%` : '—'}
            </Text>
          </View>
        </View>

        {q ? (
          <Text style={styles.pkgExample}>
            {moneyCur(item.minAmount, currency)} pays about{' '}
            <Text style={styles.pkgExampleStrong}>{moneyCur(q.daily, currency)}</Text> a
            day
          </Text>
        ) : null}

        <Button title="Invest in this plan" size="md" onPress={() => onPick(item)} />
      </View>
    </Card>
  );
}

const THUMB = 22;

/** Web-like range input: drag or tap to set amount (step 1). */
function AmountSlider({ min, max, value, onChange }) {
  const hitRef = useRef(null);
  const [width, setWidth] = useState(0);
  const minRef = useRef(min);
  const maxRef = useRef(max);
  const onChangeRef = useRef(onChange);
  minRef.current = min;
  maxRef.current = max;
  onChangeRef.current = onChange;

  const clamped = Math.min(
    Math.max(Number.isFinite(value) && value ? value : min, min),
    max,
  );
  const pct = (clamped - min) / Math.max(1, max - min);
  const thumbLeft = width > 0 ? pct * width : 0;

  const setFromPageX = pageX => {
    hitRef.current?.measureInWindow((x, _y, w) => {
      if (!w) return;
      if (width !== w) setWidth(w);
      const ratio = Math.min(1, Math.max(0, (pageX - x) / w));
      const next = Math.round(minRef.current + ratio * (maxRef.current - minRef.current));
      onChangeRef.current(String(next));
    });
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 2,
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: e => setFromPageX(e.nativeEvent.pageX),
      onPanResponderMove: e => setFromPageX(e.nativeEvent.pageX),
    }),
  ).current;

  return (
    <View style={styles.sliderWrap} accessibilityRole="adjustable" accessibilityLabel="Amount slider">
      <View
        ref={hitRef}
        style={styles.sliderHit}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        {...pan.panHandlers}>
        <View style={styles.sliderTrack}>
          <LinearGradient
            colors={GOLD_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.sliderFill, { width: `${Math.min(100, Math.max(0, pct * 100))}%` }]}
          />
        </View>
        <View
          pointerEvents="none"
          style={[styles.sliderThumb, { transform: [{ translateX: thumbLeft - THUMB / 2 }] }]}
        />
      </View>
    </View>
  );
}

function AmountStep({ item, currency, balance, amount, setAmount, error, onNext, onDeposit }) {
  const range = isRange(item);
  const value = Number(amount);
  const q = quote(item, value);
  const reachable = range ? Math.min(item.maxAmount, balance) : 0;

  let problem = '';
  if (range) {
    if (!amount) problem = 'Enter an amount.';
    else if (!Number.isFinite(value) || value <= 0) problem = 'Enter a valid amount.';
    else if (value < item.minAmount || value > item.maxAmount) {
      problem = `Amount must be between ${money(item.minAmount)} and ${money(item.maxAmount)} ${currency}.`;
    }
  }
  if (!problem && range && value > balance) {
    problem = 'Your balance doesn’t cover this amount.';
  }

  const chips = range
    ? [
        { label: 'Min', value: item.minAmount },
        {
          label: '25%',
          value: round(item.minAmount + (item.maxAmount - item.minAmount) * 0.25),
        },
        {
          label: '50%',
          value: round(item.minAmount + (item.maxAmount - item.minAmount) * 0.5),
        },
        {
          label: 'Max',
          value: reachable >= item.minAmount ? round(reachable) : item.maxAmount,
        },
      ]
    : [];

  return (
    <View style={styles.stepBody}>
      <View style={styles.modalPkg}>
        <LinearGradient colors={GOLD_GRAD} style={styles.monoSm}>
          <Text style={styles.monoSmText}>{(item.name || 'P').slice(0, 1)}</Text>
        </LinearGradient>
        <View style={styles.flex1}>
          <Text style={styles.modalPkgName}>{item.name}</Text>
          <Text style={styles.modalPkgMeta}>
            {item.durationDays} days · {item.multiplier}× total payout
          </Text>
        </View>
      </View>

      {range ? (
        <>
          <Text style={styles.amountLabel}>
            Investment amount
            <Text style={styles.amountRange}>
              {' '}
              · Range {short(item.minAmount)} – {short(item.maxAmount)} {currency}
            </Text>
          </Text>
          <View style={[styles.amountInput, amount && problem ? styles.amountError : null]}>
            <TextInput
              value={amount}
              onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder={String(item.minAmount)}
              placeholderTextColor={colors.lineStrong}
              style={styles.amountField}
              selectionColor={colors.gold}
            />
            <Text style={styles.amountUnit}>{currency}</Text>
          </View>

          <AmountSlider
            min={item.minAmount}
            max={item.maxAmount}
            value={value}
            onChange={setAmount}
          />

          <View style={styles.chips}>
            {chips.map(chip => (
              <Pressable
                key={chip.label}
                onPress={() => setAmount(String(chip.value))}
                style={styles.chip}>
                <Text style={styles.chipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.fixedNote}>
          This plan has a fixed price set by the admin. It is charged from your balance on
          confirmation.
        </Text>
      )}

      {(amount && problem) || error ? (
        <Text style={styles.helpError}>
          {(amount && problem) || error}
          {((amount && problem) || error || '').toLowerCase().includes('balance') ? (
            <Text style={styles.helpLink} onPress={onDeposit}>
              {' '}
              Add a deposit
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text style={styles.balanceVal}>{moneyCur(balance, currency)}</Text>
      </View>

      {range ? (
        <View style={styles.calcGrid}>
          <View style={styles.calcCell}>
            <Text style={styles.calcLabel}>Daily earning</Text>
            <Text style={styles.calcVal}>
              {q && !problem ? moneyCur(q.daily, currency) : '—'}
            </Text>
          </View>
          <View style={styles.calcCell}>
            <Text style={styles.calcLabel}>Total payout · {item.durationDays}d</Text>
            <Text style={styles.calcVal}>
              {q && !problem ? moneyCur(q.total, currency) : '—'}
            </Text>
          </View>
        </View>
      ) : null}

      <Button
        title="Continue to review"
        disabled={Boolean(range && problem)}
        onPress={onNext}
        style={styles.mt8}
      />
    </View>
  );
}

function ReviewStep({
  item,
  currency,
  balance,
  amount,
  busy,
  error,
  onBack,
  onConfirm,
  onDeposit,
}) {
  const range = isRange(item);
  const value = range ? Number(amount) : null;
  const q = range ? quote(item, value) : null;

  const rows = [
    ['Package', `${item.name} (${item.code})`],
    ['Amount', range ? moneyCur(value, currency) : 'Fixed price, set by the server'],
    ['Paid from', 'Balance'],
    ['Balance after', range ? moneyCur(round(balance - value), currency) : '—'],
    ['Each night', q ? moneyCur(q.daily, currency) : 'Set by the package'],
    [
      'Duration',
      `${item.durationDays} nights · first credit at the next 12:00 AM IST`,
    ],
    [
      'Total scheduled payout',
      q ? moneyCur(q.total, currency) : 'Set by the package',
    ],
  ];

  return (
    <View style={styles.stepBody}>
      <View style={styles.reviewHero}>
        <Text style={styles.reviewHeroLabel}>You are investing</Text>
        <Text style={styles.reviewHeroVal}>{range ? money(value) : item.name}</Text>
        {range ? <Text style={styles.reviewHeroCur}>{currency}</Text> : null}
      </View>

      <View style={styles.reviewList}>
        {rows.map(([label, text]) => (
          <View key={label} style={styles.reviewRow}>
            <Text style={styles.reviewDt}>{label}</Text>
            <Text style={styles.reviewDd}>{text}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.reviewNote}>
        The amount is taken from your balance. Total return is the amount times{' '}
        {item.multiplier || 'the'}×, split across {item.durationDays} nights. The first credit
        is the next 12:00 AM IST. If this is your first package, your sponsor receives their
        direct referral percent of this amount immediately. A later package does not pay that
        again. Nightly level commission is separate.
      </Text>

      {error ? (
        <Text style={styles.helpError}>
          {error}
          {error.toLowerCase().includes('balance') ? (
            <Text style={styles.helpLink} onPress={onDeposit}>
              {' '}
              Add a deposit
            </Text>
          ) : null}
        </Text>
      ) : null}

      <View style={styles.modalActions}>
        <Button
          title="Back"
          variant="outline"
          size="md"
          disabled={busy}
          onPress={onBack}
          style={styles.flex1}
        />
        <Button
          title="Confirm & buy"
          size="md"
          loading={busy}
          disabled={busy}
          onPress={onConfirm}
          style={styles.flex1}
        />
      </View>
    </View>
  );
}

function DoneStep({ purchase, currency, onClose, onView }) {
  return (
    <View style={[styles.stepBody, styles.doneBody]}>
      <View style={styles.doneIco}>
        <Icon name="check" size={28} color={colors.goldInk} strokeWidth={2.2} />
      </View>
      <Text style={styles.doneTitle}>{purchase.packageName || 'Package'} is active</Text>
      <Text style={[type.small, styles.center]}>
        {moneyCur(purchase.amount, currency)} was taken from your balance. The first credit is
        the next 12:00 AM IST. Days paid stay at 0 until then.
      </Text>
      <View style={styles.modalActions}>
        <Button title="Buy another" variant="outline" size="md" onPress={onClose} style={styles.flex1} />
        <Button title="View package" size="md" onPress={onView} style={styles.flex1} />
      </View>
    </View>
  );
}

/**
 * BuyPackageScreen – same as web BuyPackages.jsx:
 * package cards → amount modal → review → confirm POST /api/v1/me/purchases
 */
export default function BuyPackageScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const selected = route?.params?.package || route?.params?.selected || '';
  const cardW = Math.min(width - 48, 340);

  const query = useApi(api.getPackageOptions);
  const wallet = useApi(api.getWallets);
  const packages = useMemo(() => query.data || [], [query.data]);
  const currency = wallet.data?.currency || 'USDT';
  const balance = Number(wallet.data?.balance || 0);

  const [pick, setPick] = useState(null);
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [purchase, setPurchase] = useState(null);
  const listRef = useRef(null);

  const initialIndex = useMemo(() => {
    const index = packages.findIndex(item => String(item.id) === String(selected));
    return index >= 0 ? index : 0;
  }, [packages, selected]);

  const open = item => {
    setPick(item);
    setStep('amount');
    setAmount(isRange(item) ? String(item.minAmount) : '');
    setError('');
    setPurchase(null);
  };

  const close = () => {
    if (busy) return;
    if (purchase) wallet.refresh();
    Keyboard.dismiss();
    setPick(null);
  };

  const goDeposit = () => {
    close();
    navigation.navigate(ROUTES.DEPOSIT);
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const body = { packageId: pick.id };
      if (isRange(pick)) body.amount = Number(amount);
      const data = await api.createPurchase(body);
      setPurchase({
        packageName: pick.name,
        amount: body.amount ?? data?.amount,
        ...data,
      });
      setStep('done');
      wallet.refresh();
    } catch (failure) {
      setError(failure.errors?.amount || failure.message || 'Purchase failed');
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    amount: 'Enter amount',
    review: 'Review your purchase',
    done: 'Purchase complete',
  };
  const stepIndex = ['amount', 'review', 'done'].indexOf(step);

  const refreshAll = async () => {
    await Promise.all([query.refresh(), wallet.refresh()]);
  };

  return (
    <Screen onRefresh={refreshAll} refreshing={query.loading && !!query.data}>
      <Header
        title="Buy a package"
        right={
          <Pressable
            onPress={() => navigation.navigate(ROUTES.DEPOSIT)}
            style={styles.balancePill}
            hitSlop={6}>
            <Text style={styles.balancePillText}>
              {wallet.loading && !wallet.data ? '…' : money(balance)} {currency}
            </Text>
            <Text style={styles.addFunds}>+ Add</Text>
          </Pressable>
        }
      />
      <Text style={type.small}>
        Choose a plan, enter an amount, review, then confirm. Paid from your balance.
      </Text>

      {query.loading && !query.data ? (
        <Loading />
      ) : query.error && !query.data ? (
        <ErrorView message={query.error} onRetry={query.refresh} />
      ) : !packages.length ? (
        <Text style={styles.empty}>No packages are open for purchase right now.</Text>
      ) : (
        <>
          <Text style={styles.dashLabel}>
            {packages.length} plan{packages.length === 1 ? '' : 's'} available
          </Text>
          {packages.length > 1 ? (
            <FlatList
              ref={listRef}
              horizontal
              data={packages}
              keyExtractor={item => String(item.id)}
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardW + 14}
              decelerationRate="fast"
              contentContainerStyle={styles.carousel}
              initialScrollIndex={Math.min(initialIndex, packages.length - 1)}
              getItemLayout={(_, index) => ({
                length: cardW + 14,
                offset: (cardW + 14) * index,
                index,
              })}
              onScrollToIndexFailed={() => {}}
              renderItem={({ item }) => (
                <PackageCard
                  item={item}
                  currency={currency}
                  highlight={String(item.id) === String(selected)}
                  onPick={open}
                  width={cardW}
                />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 14 }} />}
            />
          ) : (
            <View style={styles.single}>
              <PackageCard
                item={packages[0]}
                currency={currency}
                highlight={String(packages[0].id) === String(selected)}
                onPick={open}
                width={cardW}
              />
            </View>
          )}
        </>
      )}

      <Modal
        visible={Boolean(pick)}
        animationType="slide"
        transparent
        onRequestClose={close}
        statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalDismiss} onPress={close} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHead}>
              <Text style={type.h2}>{titles[step]}</Text>
              <Pressable onPress={close} hitSlop={8} accessibilityLabel="Close" disabled={busy}>
                <Icon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <View style={styles.stepsBar}>
              {['amount', 'review', 'done'].map((name, index) => (
                <View
                  key={name}
                  style={[styles.stepDot, stepIndex >= index && styles.stepDotOn]}
                />
              ))}
            </View>

            <ScrollView
              style={styles.modalScrollView}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              contentContainerStyle={styles.modalScroll}
              nestedScrollEnabled
              bounces
              scrollEventThrottle={16}>
              {step === 'amount' && pick ? (
                <AmountStep
                  item={pick}
                  currency={currency}
                  balance={balance}
                  amount={amount}
                  setAmount={value => {
                    setAmount(value);
                    setError('');
                  }}
                  error={error}
                  onNext={() => setStep('review')}
                  onDeposit={goDeposit}
                />
              ) : null}
              {step === 'review' && pick ? (
                <ReviewStep
                  item={pick}
                  currency={currency}
                  balance={balance}
                  amount={amount}
                  busy={busy}
                  error={error}
                  onBack={() => setStep('amount')}
                  onConfirm={confirm}
                  onDeposit={goDeposit}
                />
              ) : null}
              {step === 'done' && purchase ? (
                <DoneStep
                  purchase={purchase}
                  currency={currency}
                  onClose={close}
                  onView={() => {
                    close();
                    navigation.navigate(ROUTES.MY_PACKAGES);
                  }}
                />
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  mt8: { marginTop: 8 },
  balancePill: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.elevated,
    borderRadius: 17,
    height: 34,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  balancePillText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  addFunds: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  dashLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.subtle,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  empty: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.muted,
  },
  carousel: { paddingVertical: 4, paddingRight: 8 },
  single: { alignItems: 'center', marginTop: 4 },
  pkgCard: {
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    backgroundColor: '#10131b',
  },
  pkgPicked: { borderColor: 'rgba(227,191,122,0.45)' },
  pkgArt: {
    height: 140,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pkgImg: { width: '100%', height: '100%' },
  monoBig: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoBigText: { fontFamily: fonts.display, fontSize: 32, color: colors.goldInk },
  pkgTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(7,8,12,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.35)',
  },
  pkgTagText: { fontFamily: fonts.bold, fontSize: 11, color: colors.gold },
  pkgBody: { padding: 16, gap: 10 },
  pkgCode: { fontFamily: fonts.semibold, fontSize: 11, color: colors.subtle, letterSpacing: 0.4 },
  pkgName: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  pkgRange: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textSoft },
  pkgCur: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  facts: { flexDirection: 'row', gap: 8, marginTop: 4 },
  fact: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  factDt: { fontFamily: fonts.regular, fontSize: 10, color: colors.subtle },
  factDd: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text, marginTop: 2 },
  pkgExample: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, lineHeight: 18 },
  pkgExampleStrong: { fontFamily: fonts.semibold, color: colors.gold },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  modalDismiss: { flex: 1 },
  modalSheet: {
    maxHeight: '90%',
    backgroundColor: '#0e1118',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    paddingTop: 14,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepsBar: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  stepDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepDotOn: { backgroundColor: colors.gold },
  modalScrollView: { flexGrow: 0, flexShrink: 1 },
  modalScroll: { paddingBottom: 24, flexGrow: 1 },
  stepBody: { gap: 14, paddingBottom: 8 },
  modalPkg: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monoSm: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monoSmText: { fontFamily: fonts.display, fontSize: 18, color: colors.goldInk },
  modalPkgName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  modalPkgMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.subtle, marginTop: 2 },
  amountLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSoft },
  amountRange: { fontFamily: fonts.regular, fontSize: 12, color: colors.subtle },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  amountError: { borderColor: colors.danger },
  amountField: {
    flex: 1,
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
    paddingVertical: 12,
  },
  amountUnit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.muted },
  sliderWrap: {
    paddingHorizontal: THUMB / 2,
    paddingVertical: 10,
    marginHorizontal: 0,
  },
  sliderHit: {
    height: 28,
    justifyContent: 'center',
  },
  sliderTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  sliderFill: { height: '100%', borderRadius: 999 },
  sliderThumb: {
    position: 'absolute',
    top: (28 - THUMB) / 2,
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: '#17120a',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSoft },
  fixedNote: { ...type.small, lineHeight: 20 },
  helpError: { fontFamily: fonts.regular, fontSize: 12, color: colors.danger, lineHeight: 18 },
  helpLink: { color: colors.gold, fontFamily: fonts.semibold },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  balanceLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  balanceVal: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  calcGrid: { flexDirection: 'row', gap: 10 },
  calcCell: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#12151c',
    gap: 4,
  },
  calcLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  calcVal: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  reviewHero: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(227,191,122,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.2)',
  },
  reviewHeroLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  reviewHeroVal: { fontFamily: fonts.display, fontSize: 32, color: colors.text, marginTop: 4 },
  reviewHeroCur: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold },
  reviewList: { gap: 0 },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  reviewDt: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, flex: 1 },
  reviewDd: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    flex: 1.4,
    textAlign: 'right',
  },
  reviewNote: { fontFamily: fonts.regular, fontSize: 12, color: colors.subtle, lineHeight: 18 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  doneBody: { alignItems: 'center', paddingTop: 8 },
  doneIco: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gold,
    marginBottom: 4,
  },
  doneTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    textAlign: 'center',
  },
});
