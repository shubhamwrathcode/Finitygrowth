import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Button, AuthField } from '../../components';
import { extractResetToken } from '../../navigation/linking';
import { ROUTES } from '../../navigation/routes';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { validateReset } from '../../utils/authValidation';

/**
 * ResetPasswordScreen – mirrors web AuthPage ResetForm.
 * Token can arrive via:
 *  - deep link (email button / finitygrowth://reset-password?token=…)
 *  - Forgot screen "I have a reset code"
 *  - paste of raw code OR full web reset URL
 */
export default function ResetPasswordScreen({ navigation, route }) {
  const paramToken = extractResetToken(route.params?.token) || route.params?.token || '';
  const [token, setToken] = useState(paramToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouched] = useState({
    token: Boolean(paramToken),
    password: false,
    confirmPassword: false,
  });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  // Deep link / navigate with params while screen is already mounted
  useEffect(() => {
    const next = extractResetToken(route.params?.token) || route.params?.token || '';
    if (next && next !== token) {
      setToken(next);
      setTouched(t => ({ ...t, token: true }));
    }
  }, [route.params?.token]);

  const resolvedToken = extractResetToken(token) || token.trim();

  const errors = useMemo(
    () =>
      validateReset({
        token: resolvedToken,
        password,
        confirmPassword,
      }),
    [resolvedToken, password, confirmPassword],
  );

  const show = {
    token: touched.token ? errors.token || '' : '',
    password: touched.password ? errors.password || '' : '',
    confirmPassword: touched.confirmPassword ? errors.confirmPassword || '' : '',
  };

  const onTokenChange = value => {
    // If user pastes the whole email link, keep only the token in the field.
    const extracted = extractResetToken(value);
    setToken(extracted && value.includes('reset-password') ? extracted : value);
  };

  const submit = async () => {
    setTouched({ token: true, password: true, confirmPassword: true });
    setFormError('');

    const cleanToken = extractResetToken(token) || token.trim();
    if (Object.keys(validateReset({ token: cleanToken, password, confirmPassword })).length) return;

    setBusy(true);
    try {
      await api.resetPassword({
        token: cleanToken,
        password,
        confirmPassword,
      });
      navigation.navigate(ROUTES.LOGIN, {
        note: 'Your password was updated. A confirmation email was sent.',
      });
    } catch (error) {
      setFormError(error.message || 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      footer={
        <View style={styles.footer}>
          <Button title="Set password" loading={busy} onPress={submit} />
          <Text style={styles.switch}>
            <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.LOGIN)}>
              Back to log in
            </Text>
          </Text>
        </View>
      }>
      <Header />
      <Text style={styles.title}>Choose a new password</Text>
      <Text style={type.body}>
        Paste the code from the reset email, or paste the whole reset link. It expires in 15 minutes.
      </Text>

      <View style={styles.form}>
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <AuthField
          label="Reset token"
          placeholder="Reset token"
          autoCapitalize="none"
          autoCorrect={false}
          value={token}
          onChangeText={onTokenChange}
          onBlur={() => setTouched(t => ({ ...t, token: true }))}
          error={show.token}
        />
        <AuthField
          label="New password"
          placeholder="New password"
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched(t => ({ ...t, password: true }))}
          error={show.password}
        />
        <AuthField
          label="Confirm password"
          placeholder="Confirm password"
          secure
          textContentType="newPassword"
          autoComplete="password-new"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
          error={show.confirmPassword}
        />
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
  footer: { gap: 14 },
  switch: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.gold },
});
