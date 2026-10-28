import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { Screen, Header, Button, AuthField, AuthSelect, OtpStep, Icon } from '../../components';
import { useAuth } from '../../context/AuthContext';
import getCountries from '../../data/countries';
import { ROUTES } from '../../navigation/routes';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { validateSignup } from '../../utils/authValidation';

/**
 * RegisterScreen – same flow as web AuthPage SignupForm:
 * sponsor lookup → signup API → OTP (if needed) → session / success.
 */
export default function RegisterScreen({ navigation, route }) {
  const { setSession } = useAuth();
  const countryOptions = useMemo(
    () => getCountries().map(c => ({ label: c.name, value: c.name })),
    [],
  );
  const referralFromLink = route.params?.ref || '';

  const [values, setValues] = useState({
    name: '',
    email: '',
    mobile: '',
    country: '',
    password: '',
    confirm: '',
    referral: referralFromLink,
    terms: false,
    risk: false,
  });
  const [touched, setTouched] = useState({});
  const [state, setState] = useState('idle'); // idle | checking | done
  const [formError, setFormError] = useState('');
  const [serverErrors, setServerErrors] = useState({});
  const [sponsor, setSponsor] = useState('');
  const [confirmed, setConfirmed] = useState('');
  const [sponsorError, setSponsorError] = useState('');
  const [loginId, setLoginId] = useState('');
  const [ownCode, setOwnCode] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);

  // OTP is in-screen state, not a stack route — back should leave OTP, not Register.
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

  const errors = useMemo(() => validateSignup(values), [values]);
  const sponsorReady =
    Boolean(sponsor) && confirmed && values.referral.trim().toUpperCase() === confirmed.toUpperCase();
  const sponsorMessage =
    (touched.referral && errors.referral) || serverErrors.referralCode || sponsorError;

  const setField = (name, value) => setValues(prev => ({ ...prev, [name]: value }));
  const touch = name => setTouched(prev => ({ ...prev, [name]: true }));
  const show = name => (touched[name] ? errors[name] || serverErrors[name] || '' : '');

  useEffect(() => {
    const code = values.referral.trim();
    if (!code) {
      setSponsor('');
      setConfirmed('');
      setSponsorError('');
      return undefined;
    }
    if (confirmed && code.toUpperCase() === confirmed.toUpperCase()) return undefined;
    setSponsor('');
    setSponsorError('');
    let live = true;
    const timer = setTimeout(() => {
      api
        .lookupSponsor(code)
        .then(result => {
          if (!live) return;
          const official = result.data?.referralCode || code;
          setSponsor(result.data?.name || '');
          setConfirmed(official);
          setSponsorError('');
          setField('referral', official);
        })
        .catch(() => {
          if (!live) return;
          setSponsor('');
          setConfirmed('');
          setSponsorError('Sponsor code is invalid');
        });
    }, 350);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [values.referral, confirmed]);

  useEffect(() => {
    if (state !== 'done' || !pendingSession) return undefined;
    const timer = setTimeout(() => {
      setSession(pendingSession.token, pendingSession.user);
    }, 2800);
    return () => clearTimeout(timer);
  }, [state, pendingSession, setSession]);

  const finishSignup = (token, user) => {
    setPendingSession({ token, user });
    setLoginId(user?.userId || '');
    setOwnCode(user?.referralCode || '');
    setChallenge(null);
    setState('done');
  };

  const submit = async () => {
    const allTouched = Object.fromEntries(Object.keys(values).map(k => [k, true]));
    setTouched(allTouched);
    if (Object.keys(validateSignup(values)).length || !sponsorReady) return;

    setState('checking');
    setFormError('');
    setServerErrors({});
    const phone = values.mobile.trim();
    const digits = phone.replace(/\D/g, '');
    const body = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: `${phone.startsWith('+') ? '+' : ''}${digits}`,
      password: values.password,
      referralCode: confirmed,
    };
    if (values.country) body.country = values.country;

    try {
      const result = await api.signup(body);
      if (result.data?.token) {
        finishSignup(result.data.token, result.data.user);
        return;
      }
      setChallenge(result.data);
      setState('idle');
    } catch (error) {
      setState('idle');
      setServerErrors(error.errors || {});
      setFormError(error.errors ? '' : error.message || '');
    }
  };

  const verify = async otp => {
    const result = await api.verifySignup(challenge.challengeId, otp);
    finishSignup(result.data.token, result.data.user);
  };

  const resend = async () => {
    const result = await api.resendOtp(challenge.challengeId);
    setChallenge(result.data);
  };

  if (state === 'done') {
    return (
      <Screen
        keyboard
        footer={
          <Button
            title="Open dashboard"
            onPress={() => {
              if (pendingSession) setSession(pendingSession.token, pendingSession.user);
            }}
          />
        }>
        <Header back={false} />
        <Text style={styles.title}>Account created</Text>
        <Text style={type.body}>
          Your login id is <Text style={styles.strong}>{loginId}</Text>
        </Text>
        {ownCode ? (
          <Text style={[type.body, styles.mt8]}>
            Your sponsor code is <Text style={styles.strong}>{ownCode}</Text>
          </Text>
        ) : null}
        <Text style={[type.body, styles.mt8]}>
          A welcome email with this login id and sponsor code was sent. Use the login id on the login
          screen. Email is not used to sign in.
        </Text>
      </Screen>
    );
  }

  if (challenge) {
    return (
      <Screen keyboard>
        <Header onBack={() => setChallenge(null)} />
        <Text style={styles.title}>Confirm signup</Text>
        <Text style={type.body}>Enter the 6 digit code we emailed you.</Text>
        <OtpStep
          key={challenge.challengeId}
          sentTo={challenge.sentTo}
          expiresInSeconds={challenge.expiresInSeconds || 600}
          onVerify={verify}
          onResend={resend}
          onBack={() => setChallenge(null)}
          backLabel="Back to signup"
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      footer={
        <View style={styles.footer}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <Button
            title="Create account"
            loading={state === 'checking'}
            disabled={!sponsorReady}
            onPress={submit}
          />
          <Text style={styles.switch}>
            Already a member?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate(ROUTES.LOGIN)}>
              Log in
            </Text>
          </Text>
        </View>
      }>
      <Header />
      <Text style={styles.title}>Create your account</Text>
      <Text style={type.body}>
        Enter a sponsor code first. We send a 6 digit code before the account is created. Then log in
        with the user id, not your email.
      </Text>

      <View style={styles.form}>
        <AuthField
          label="Sponsor code"
          placeholder="Sponsor code"
          autoCapitalize="characters"
          autoCorrect={false}
          value={values.referral}
          onChangeText={v => setField('referral', v)}
          onBlur={() => touch('referral')}
          error={sponsorMessage || ''}
          hint={!sponsorMessage && sponsor ? `Sponsor: ${sponsor}` : undefined}
        />
        <AuthField
          label="Sponsor name"
          value={sponsor}
          editable={false}
          placeholder="Sponsor name"
        />

        <AuthField
          label="Full name"
          placeholder="Your full name"
          value={values.name}
          onChangeText={v => setField('name', v)}
          onBlur={() => touch('name')}
          error={show('name') || (touched.name ? serverErrors.name : '') || ''}
        />
        <AuthField
          label="Email"
          placeholder="you@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          value={values.email}
          onChangeText={v => setField('email', v)}
          onBlur={() => touch('email')}
          error={show('email') || (touched.email ? serverErrors.email : '') || ''}
        />
        <AuthField
          label="Mobile"
          placeholder="+1 555 000 0000"
          keyboardType="phone-pad"
          value={values.mobile}
          onChangeText={v => setField('mobile', v)}
          onBlur={() => touch('mobile')}
          error={show('mobile') || (touched.mobile ? serverErrors.phone : '') || ''}
        />

        <AuthSelect
          label="Country"
          placeholder="Select a country"
          value={values.country}
          options={countryOptions}
          onChange={v => {
            setField('country', v);
            touch('country');
          }}
          onBlur={() => touch('country')}
          error={show('country') || (touched.country ? serverErrors.country : '') || ''}
        />

        <AuthField
          label="Password"
          placeholder="Create a password"
          secure
          value={values.password}
          onChangeText={v => setField('password', v)}
          onBlur={() => touch('password')}
          error={show('password') || (touched.password ? serverErrors.password : '') || ''}
        />
        <AuthField
          label="Confirm password"
          placeholder="Confirm password"
          secure
          value={values.confirm}
          onChangeText={v => setField('confirm', v)}
          onBlur={() => touch('confirm')}
          error={show('confirm')}
        />

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.terms }}
          onPress={() => {
            setField('terms', !values.terms);
            touch('terms');
          }}
          style={styles.check}>
          <View style={[styles.box, values.terms && styles.boxOn]}>
            {values.terms ? <Icon name="check" size={13} color={colors.goldInk} strokeWidth={3} /> : null}
          </View>
          <Text style={styles.checkText}>I accept the Terms (version 1.0, effective 21 October 2026).</Text>
        </Pressable>
        {touched.terms && errors.terms ? <Text style={styles.formError}>{errors.terms}</Text> : null}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: values.risk }}
          onPress={() => {
            setField('risk', !values.risk);
            touch('risk');
          }}
          style={styles.check}>
          <View style={[styles.box, values.risk && styles.boxOn]}>
            {values.risk ? <Icon name="check" size={13} color={colors.goldInk} strokeWidth={3} /> : null}
          </View>
          <Text style={styles.checkText}>
            I have read the Risk Disclosure and understand packages do not guarantee a return.
          </Text>
        </Pressable>
        {touched.risk && errors.risk ? <Text style={styles.formError}>{errors.risk}</Text> : null}
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
  strong: { fontFamily: fonts.semibold, color: colors.text },
  mt8: { marginTop: 8 },
  form: { marginTop: 22, gap: 14 },
  check: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 4 },
  box: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  checkText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted },
  formError: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  footer: { gap: 14 },
  switch: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  link: { fontFamily: fonts.semibold, color: colors.gold },
});
