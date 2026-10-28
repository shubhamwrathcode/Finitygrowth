import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Button, AuthField } from '../../components';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';

/**
 * ChangePasswordScreen – mirrors web More.jsx Password:
 * POST /api/v1/me/password/change with current / new / confirm.
 * Inputs use AuthField (same underline look as Login).
 */
export default function ChangePasswordScreen() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = message.startsWith('Password changed.');

  const setField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const submit = async () => {
    if (busy) return;
    setMessage('');
    setErrors({});
    setBusy(true);
    try {
      await api.changePassword(form);
      setMessage('Password changed. A confirmation email was sent.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage(err.message || 'Could not change password.');
      setErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      footer={
        <View style={styles.footer}>
          <Button
            title="Update password"
            loading={busy}
            onPress={submit}
            disabled={
              busy || !form.currentPassword || !form.newPassword || !form.confirmPassword
            }
          />
        </View>
      }>
      <Header title="Change password" />
      <Text style={type.body}>
        Enter your current password, then choose a new one. A confirmation email is sent after a
        successful change.
      </Text>

      <View style={styles.form}>
        {message ? (
          <View style={[styles.alert, ok ? styles.alertOk : styles.alertBad]}>
            <Text style={[styles.alertText, ok ? styles.okText : styles.badText]}>{message}</Text>
          </View>
        ) : null}

        <AuthField
          label="Current password"
          placeholder="Current password"
          secure
          textContentType="password"
          autoComplete="password"
          value={form.currentPassword}
          onChangeText={v => setField('currentPassword', v)}
          error={errors.currentPassword}
        />
        <AuthField
          label="New password"
          placeholder="New password"
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          value={form.newPassword}
          onChangeText={v => setField('newPassword', v)}
          error={errors.newPassword}
        />
        <AuthField
          label="Confirm password"
          placeholder="Confirm password"
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          value={form.confirmPassword}
          onChangeText={v => setField('confirmPassword', v)}
          error={errors.confirmPassword}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 28, gap: 18 },
  footer: { gap: 14 },
  alert: { borderRadius: 12, padding: 12 },
  alertOk: { backgroundColor: 'rgba(141, 222, 168, 0.12)' },
  alertBad: { backgroundColor: 'rgba(240, 160, 160, 0.12)' },
  alertText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  okText: { color: '#8ddea8' },
  badText: { color: '#f4a097' },
});
