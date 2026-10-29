import React, { useState } from 'react';
import { Clipboard, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  Screen,
  Header,
  Button,
  Badge,
  Loading,
  ErrorView,
  Icon,
  Notice,
} from '../../components';
import { EmptyRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

const LIMIT = 10;

function shortId(value) {
  if (!value) return '—';
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function verifyNote(message, data) {
  if (message === 'New Transactions Fetched') {
    const count = Number(data?.totalDeposits || 0);
    return `${count} new credit${count === 1 ? '' : 's'} added. A deposit email was sent.`;
  }
  if (message === 'No New Transactions Fetched') return 'No matching new transfer.';
  return message;
}

function statusTone(status) {
  if (status === 'pending') return 'warning';
  if (status === 'completed' || status === 'approved' || status === 'credited') return 'success';
  if (status === 'failed' || status === 'rejected') return 'neutral';
  return 'gold';
}

/**
 * DepositScreen – same as web Wallet.jsx Deposit (BEP20 path).
 * Compact mobile layout: QR + address + verify + list.
 */
export default function DepositScreen() {
  const wallet = useApi(api.getWallets);
  const address = useApi(api.getDepositAddress);
  const [page, setPage] = useState(1);
  const chain = useApi(
    () => api.getBep20Deposits({ page, limit: LIMIT, transactionType: 'DEPOSIT' }),
    [page],
  );

  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState({ text: '', kind: 'ok' });
  const [showSweep, setShowSweep] = useState(false);

  const bep = address.data;
  const currency = wallet.data?.currency || 'USDT';
  const balance = Number(wallet.data?.balance || 0);
  const rows = (chain.data?.data || []).filter(
    row => String(row.transactionType || '').toUpperCase() === 'DEPOSIT',
  );
  const totalPages = Math.max(1, Math.ceil((chain.data?.total || 0) / (chain.data?.limit || LIMIT)));

  const refreshAll = () =>
    Promise.all([wallet.refresh(), address.refresh(), chain.refresh()]);

  const copy = () => {
    if (!bep?.address) return;
    Clipboard.setString(bep.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const verify = async () => {
    setChecking(true);
    setCheck({ text: '', kind: 'ok' });
    try {
      const result = await api.verifyDeposit();
      const text = result.message || '';
      const credited = text === 'New Transactions Fetched';
      setCheck({
        text: verifyNote(text, result.data),
        kind: credited || text === 'No New Transactions Fetched' ? 'ok' : 'error',
      });
      if (credited) {
        wallet.refresh();
        chain.refresh();
      }
    } catch (error) {
      setCheck({ text: error.message, kind: 'error' });
      if (error.message === 'No BEP20 address for this user') address.refresh();
    } finally {
      setChecking(false);
    }
  };

  if (address.error && !address.data) {
    return (
      <Screen>
        <Header title="Deposit" />
        <ErrorView message={address.error} onRetry={address.refresh} />
      </Screen>
    );
  }

  if (address.loading && !address.data) {
    return (
      <Screen>
        <Header title="Deposit" />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refreshAll} refreshing={wallet.loading || address.loading || chain.loading}>
      <Header
        title="Deposit"
        right={
          <Text style={styles.balChip}>
            {wallet.data ? `${money(balance)} ${currency}` : '…'}
          </Text>
        }
      />
      <Text style={styles.lead}>
        Send USDT on BEP20, then Verify. Auto-check every 15 min.
      </Text>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>BEP20 on BSC</Text>
          <View style={styles.network}>
            <View style={styles.netDot} />
            <Text style={styles.netText}>{bep?.chain || 'BEP20'}</Text>
          </View>
        </View>

        {bep?.address ? (
          <>
            <View style={styles.qrRow}>
              <View style={styles.qr}>
                <QRCode value={bep.address} size={108} backgroundColor="#ffffff" color="#111111" />
              </View>
              <View style={styles.qrSide}>
                <Text style={styles.qrHint}>Scan in your wallet</Text>
                <Text style={styles.qrWarn}>USDT · BEP20 only</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copy address"
                  onPress={copy}
                  style={styles.copy}>
                  <Icon name={copied ? 'check' : 'copy'} size={14} color={colors.text} />
                  <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy address'}</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.address} selectable numberOfLines={2}>
              {bep.address}
            </Text>
          </>
        ) : (
          <Text style={styles.lead}>No deposit address yet.</Text>
        )}

        <Button
          title={checking ? 'Checking BSC…' : 'Verify deposit'}
          size="md"
          loading={checking}
          disabled={checking || address.loading || !bep?.address}
          onPress={verify}
          style={styles.verifyBtn}
        />

        {check.text ? (
          <View style={styles.checkWrap}>
            <Notice text={check.text} tone={check.kind === 'ok' ? 'gold' : 'warning'} />
          </View>
        ) : null}

        <Pressable onPress={() => setShowSweep(s => !s)} style={styles.sweep}>
          <Text style={styles.sweepTitle}>About sweeps and gas</Text>
          <Icon name="chevronDown" size={14} color={colors.subtle} strokeWidth={2} />
        </Pressable>
        {showSweep ? (
          <Text style={styles.sweepBody}>
            Tokens on this address are sent to the company wallet. That does not change your balance.
            USDT and BNB are separate sends. The same send also runs every hour.
          </Text>
        ) : null}
      </View>

      <View style={styles.listHead}>
        <Text style={styles.panelTitle}>BEP20 deposits</Text>
        <Text style={styles.listSub}>Credited only · min 0.1 USDT</Text>
      </View>

      {chain.loading && !chain.data ? (
        <View style={styles.histLoading}>
          <Loading />
        </View>
      ) : rows.length ? (
        rows.map(row => (
          <View
            key={row.id || row.transactionHash || `${row.createdAt}-${row.amount}`}
            style={styles.row}>
            <View style={styles.rowIco}>
              <Icon name="arrowDown" size={14} color={colors.success} />
            </View>
            <View style={styles.flex1}>
              <View style={styles.rowTop}>
                <Text style={styles.rowAmt}>{money(row.amount)}</Text>
                <Badge label="Credited" tone="success" />
              </View>
              <Text style={styles.rowMeta} numberOfLines={1}>
                {row.shortName || 'USDT'} · {when(row.createdAt)}
                {row.status ? ` · ${String(row.status).replaceAll('_', ' ')}` : ''}
              </Text>
              {row.transactionHash ? (
                <Pressable
                  onPress={() => Linking.openURL(`https://bscscan.com/tx/${row.transactionHash}`)}>
                  <Text style={styles.hash}>{shortId(row.transactionHash)}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      ) : (
        <EmptyRing size={88} message="Nothing here yet." />
      )}

      {totalPages > 1 ? (
        <View style={styles.pager}>
          <Button
            title="Previous"
            variant="outline"
            size="sm"
            disabled={page <= 1 || chain.loading}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          />
          <Text style={type.tiny}>
            {page} / {totalPages}
          </Text>
          <Button
            title="Next"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || chain.loading}
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  balChip: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.gold,
  },
  lead: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
    marginBottom: 4,
  },
  panel: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  network: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: colors.goldSoft,
  },
  netDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  netText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gold },
  qrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 14,
  },
  qr: {
    padding: 8,
    borderRadius: 14,
    backgroundColor: '#ffffff',
  },
  qrSide: { flex: 1, gap: 6 },
  qrHint: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSoft },
  qrWarn: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  copy: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.pressed,
    marginTop: 4,
  },
  copyText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  address: {
    marginTop: 12,
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
  },
  verifyBtn: { marginTop: 14 },
  checkWrap: { marginTop: 10 },
  sweep: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  sweepTitle: { fontFamily: fonts.medium, fontSize: 12, color: colors.subtle },
  sweepBody: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginBottom: 2,
  },
  listHead: { marginTop: 22, marginBottom: 4, gap: 2 },
  listSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  histLoading: { minHeight: 80, justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIco: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  rowAmt: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, flexShrink: 1 },
  rowMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  hash: {
    marginTop: 3,
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.gold,
    textDecorationLine: 'underline',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
});
