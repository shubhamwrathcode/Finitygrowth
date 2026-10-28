import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Button, AuthField } from '../../components';
import { ROUTES } from '../../navigation/routes';
import * as api from '../../services/api';
import { warmApi } from '../../services/http';
import { colors, fonts, type } from '../../theme';
import { validateForgot } from '../../utils/authValidation';

/**
 * ForgotPasswordScreen – mirrors web AuthPage ForgotForm.
 * After send: user opens email → copies code/link → "Enter reset code" opens ResetPassword.
 */
export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [message, setMessage] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [sent, setSent] = useState(false);

  const errors = useMemo(() => validateForgot({ email }), [email]);
  const showEmailError = touched ? errors.email || '' : '';

  useEffect(() => {
    warmApi();
  }, []);

  const submit = async () => {
    setTouched(true);
    setMessage('');
    setToken('');
    setFormError('');
    setSent(false);

    if (Object.keys(validateForgot({ email })).length) return;
    if (busy) return;

    setBusy(true);
    try {
      const result = await api.forgotPassword(email.trim());
      setMessage(
        result.message ||
          'If this email is registered, use the reset token to set a new password',
      );
      if (result.data?.resetToken) setToken(result.data.resetToken);
      setSent(true);
    } catch (e) {
      setFormError(e.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const goToReset = (prefill = '') => {
    navigation.navigate(ROUTES.RESET_PASSWORD, prefill ? { token: prefill } : undefined);
  };

  return (
    <Screen
      keyboard
      footer={
        <View style={styles.footer}>
          {busy ? <Text style={styles.sending}>Sending reset email…</Text> : null}
          <Button title="Send reset" loading={busy} onPress={submit} />
          {sent ? (
            <Button
              title="I have a reset code"
              variant="secondary"
              onPress={() => goToReset(token)}
            />
          ) : null}
          {/* <Text style={styles.switch}>
            <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.LOGIN)}>
              Back to log in
            </Text>
          </Text> */}
        </View>
      }>
      <Header />
      <Text style={styles.title}>Reset your password</Text>
      <Text style={type.body}>
        Enter the email on the account. If it is registered, we email a reset code and a link. The
        reply is the same even if that email is not registered.
      </Text>

      <View style={styles.form}>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <AuthField
          label="Email"
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="emailAddress"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched(true)}
          error={showEmailError}
          editable={!busy}
        />

        {message ? (
          <View style={styles.inlineNote}>
            <Text style={styles.inlineNoteText}>{message}</Text>
            <Text style={[styles.inlineNoteText, styles.mt8]}>
              Open the email on this phone, copy the reset code (or the whole link), then tap{' '}
              <Text style={styles.link}>I have a reset code</Text> below.
            </Text>
          </View>
        ) : null}

        {token ? (
          <View style={styles.inlineNote}>
            <Text style={styles.inlineNoteText}>
              Development reset token ready.{' '}
              <Text style={styles.link} onPress={() => goToReset(token)}>
                Continue
              </Text>
            </Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 8,
  },
  form: { marginTop: 28, gap: 16 },
  formError: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.danger,
  },
  sending: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.muted,
  },
  inlineNote: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  inlineNoteText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  mt8: { marginTop: 8 },
  footer: { gap: 14 },
  switch: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.gold },
});
