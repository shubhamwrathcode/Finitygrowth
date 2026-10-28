import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { Screen, Header, Button, AuthField, OtpStep } from '../../components';
import { ImageAsset } from '../../components/ImageAssets';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../navigation/routes';
import * as api from '../../services/api';
import { warmApi } from '../../services/http';
import { colors, fonts, type } from '../../theme';
import { validateLogin } from '../../utils/authValidation';

/**
 * LoginScreen – same flow as web AuthPage LoginForm:
 * login API → token (session) OR OTP challenge → verify / resend.
 */
export default function LoginScreen({ navigation, route }) {
  const { setSession } = useAuth();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ userId: false, password: false });
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const mailNote = route.params?.note || '';

  useEffect(() => {
    warmApi();
  }, []);

  // OTP is in-screen state, not a stack route — back should leave OTP, not Login.
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !challenge });
  }, [navigation, challenge]);
  usePreventRemove(Boolean(challenge), ({ data }) => {
    if (data.action.type === 'GO_BACK' || data.action.type === 'POP') {
      setChallenge(null);
      return;
    }
    navigation.dispatch(data.action);
  });

  const errors = useMemo(() => validateLogin({ userId, password }), [userId, password]);

  const show = {
    userId: touched.userId ? errors.userId || serverErrors.userId || '' : '',
    password: touched.password ? errors.password || '' : '',
  };

  const submit = async () => {
    setTouched({ userId: true, password: true });
    if (Object.keys(validateLogin({ userId, password })).length) return;

    setLoading(true);
    setFormError('');
    setServerErrors({});
    try {
      const result = await api.login(userId.trim(), password);
      if (result.data?.token) {
        setSession(result.data.token, result.data.user);
        return;
      }
      setChallenge(result.data);
    } catch (e) {
      setServerErrors(e.errors || {});
      setFormError(e.errors ? '' : e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const verify = async otp => {
    const result = await api.verifyLogin(challenge.challengeId, otp);
    setChallenge(null);
    setSession(result.data.token, result.data.user);
  };

  const resend = async () => {
    const result = await api.resendOtp(challenge.challengeId);
    setChallenge(result.data);
  };

  if (challenge) {
    return (
      <Screen keyboard>
        <Header onBack={() => setChallenge(null)} />
        <Text style={styles.title}>Confirm login</Text>
        <Text style={type.body}>Enter the 6 digit code we emailed you.</Text>
        <OtpStep
          key={challenge.challengeId}
          sentTo={challenge.sentTo}
          expiresInSeconds={challenge.expiresInSeconds || 600}
          onVerify={verify}
          onResend={resend}
          onBack={() => setChallenge(null)}
          backLabel="Back to login"
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      footer={
        <View style={styles.footer}>
          <Button title="Log in" loading={loading} onPress={submit} />
          <Text style={styles.switch}>
            New to Finitygrowth?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.REGISTER)}>
              Create an account
            </Text>
          </Text>
        </View>
      }>
      <Header />
      <Image
        source={ImageAsset.appLogo}
        style={styles.icon}
        accessibilityLabel="Finitygrowth"
      />
      <Text style={styles.title}>Welcome back</Text>
      <Text style={type.body}>
        Log in with your user id, such as STX100002, and your password. A 6 digit code confirms the
        login.
      </Text>

      <View style={styles.form}>
        {mailNote ? (
          <View style={styles.inlineNote}>
            <Text style={styles.inlineNoteText}>{mailNote}</Text>
          </View>
        ) : null}
        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <AuthField
          label="User id"
          placeholder="STX100002"
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          textContentType="username"
          autoComplete="username"
          value={userId}
          onChangeText={setUserId}
          onBlur={() => setTouched(t => ({ ...t, userId: true }))}
          error={show.userId}
        />

        <AuthField
          label="Password"
          placeholder="Your password"
          secure
          textContentType="password"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched(t => ({ ...t, password: true }))}
          error={show.password}
        />

        <View style={styles.authRow}>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 72, height: 72, marginTop: 8, borderRadius: 16 },
  title: { fontFamily: fonts.serif, fontSize: 40, color: colors.text, marginTop: 18, marginBottom: 6 },
  form: { marginTop: 34, gap: 18 },
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
  formError: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.danger,
  },
  authRow: { alignItems: 'flex-end', marginTop: -6 },
  forgot: { fontFamily: fonts.medium, fontSize: 12, color: colors.gold },
  footer: { gap: 14 },
  switch: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.gold },
});
