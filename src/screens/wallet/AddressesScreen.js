import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Screen,
  Header,
  Button,
  AuthField,
  AuthSelect,
  Loading,
  ErrorView,
  EmptyState,
  Icon,
} from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';

const NETWORKS = [
  { label: 'TRC20', value: 'TRC20' },
  { label: 'ERC20', value: 'ERC20' },
  { label: 'BEP20', value: 'BEP20' },
];

/**
 * AddressesScreen – same as web Wallet.jsx Addresses.
 * Inputs match Login (AuthField / AuthSelect underline).
 */
export default function AddressesScreen() {
  const query = useApi(api.getDestinations);
  const [form, setForm] = useState({ label: '', network: 'TRC20', address: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const rows = query.data || [];
  const ok = message === 'Address saved.';

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const submit = async () => {
    if (busy || rows.length >= 10) return;
    setMessage('');
    setErrors({});
    setBusy(true);
    try {
      await api.createDestination({
        label: form.label.trim(),
        network: form.network,
        address: form.address.trim(),
      });
      setForm({ label: '', network: 'TRC20', address: '' });
      setMessage('Address saved.');
      query.refresh();
    } catch (error) {
      setMessage(error.message || 'Request failed');
      setErrors(error.errors || {});
    } finally {
      setBusy(false);
    }
  };

  const remove = id => {
    Alert.alert('Delete address?', 'This saved address will be removed.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setMessage('');
          try {
            await api.deleteDestination(id);
            query.refresh();
          } catch (error) {
            setMessage(error.message || 'Request failed');
          }
        },
      },
    ]);
  };

  if (query.error && !query.data) {
    return (
      <Screen>
        <Header title="Saved addresses" />
        <ErrorView message={query.error} onRetry={query.refresh} />
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      onRefresh={query.refresh}
      refreshing={query.loading}
      footer={
        <View style={styles.footer}>
          <Button
            title="Save address"
            loading={busy}
            disabled={busy || rows.length >= 10 || !form.label.trim() || !form.address.trim()}
            onPress={submit}
          />
        </View>
      }>
      <Header title="Saved addresses" />
      <Text style={type.body}>
        Save up to 10 payout addresses. Withdrawals on this app only accept BEP20.
      </Text>
      <Text style={[type.tiny, styles.count]}>{rows.length} of 10 saved.</Text>

      <View style={styles.form}>
        {message ? (
          <View style={[styles.alert, ok ? styles.alertOk : styles.alertBad]}>
            <Text style={[styles.alertText, ok ? styles.okText : styles.badText]}>{message}</Text>
          </View>
        ) : null}

        <AuthField
          label="Label"
          placeholder="e.g. Main wallet"
          value={form.label}
          onChangeText={v => setField('label', v)}
          error={errors.label}
          autoCapitalize="sentences"
        />

        <AuthSelect
          label="Network"
          placeholder="Select network"
          value={form.network}
          options={NETWORKS}
          searchable={false}
          onChange={v => setField('network', v)}
          error={errors.network}
        />

        <AuthField
          label="Address"
          placeholder="0x… or T…"
          value={form.address}
          onChangeText={v => setField('address', v)}
          error={errors.address}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
      </View>

      <Text style={[type.h2, styles.listTitle]}>Your addresses</Text>
      {query.loading && !query.data ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState icon="wallet" text="No saved addresses yet." />
      ) : (
        rows.map(row => (
          <View key={row.id} style={styles.row}>
            <View style={styles.rowIco}>
              <Icon name="wallet" size={16} color={colors.gold} />
            </View>
            <View style={styles.flex1}>
              <View style={styles.rowTop}>
                <Text style={styles.rowLabel} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={styles.rowNet}>{row.network}</Text>
              </View>
              <Text style={styles.rowAddr} selectable>
                {row.address}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete address"
              onPress={() => remove(row.id)}
              hitSlop={8}
              style={styles.deleteBtn}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  count: { marginTop: 6 },
  form: { marginTop: 28, gap: 18 },
  footer: { gap: 14 },
  alert: { borderRadius: 12, padding: 12 },
  alertOk: { backgroundColor: 'rgba(141, 222, 168, 0.12)' },
  alertBad: { backgroundColor: 'rgba(240, 160, 160, 0.12)' },
  alertText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  okText: { color: '#8ddea8' },
  badText: { color: '#f4a097' },
  listTitle: { marginTop: 28, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowIco: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, flexShrink: 1 },
  rowNet: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gold },
  rowAddr: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSoft,
    lineHeight: 18,
  },
  deleteBtn: { paddingVertical: 6, paddingHorizontal: 2 },
  deleteText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
});
