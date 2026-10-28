import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import AuthField from './AuthField';
import { colors, fonts, type } from '../theme';

function clock(seconds) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function readOtpError(error) {
  const field = error.errors?.otp;
  const message = error.message || 'Request failed';
  if (field) return { field, fatal: false };
  if (message === 'OTP is incorrect') return { field: message, fatal: false };
  if (message === 'OTP is invalid or expired') {
    return { fatal: true, message: 'This code has expired. Start again.' };
  }
  if (message.startsWith('Too many OTP attempts')) {
    return { message, fatal: false, unlockResend: true, blocked: true };
  }
  return { message, fatal: false };
}

/**
 * OtpStep – mirrors web OtpStep.jsx for login/signup challenges.
 * Action buttons stay under the keyboard while typing; 6-digit codes auto-submit.
 */
export default function OtpStep({
  sentTo,
  expiresInSeconds = 600,
  onVerify,
  onResend,
  onBack,
  backLabel = 'Start again',
}) {
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(expiresInSeconds);
  const [wait, setWait] = useState(30);
  const [fieldError, setFieldError] = useState('');
  const [notice, setNotice] = useState('');
  const [fatal, setFatal] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const autoTried = useRef('');

  useEffect(() => {
    const id = setInterval(() => {
      setLeft(value => (value > 0 ? value - 1 : 0));
      setWait(value => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardOpen(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardOpen(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const expired = left === 0 || fatal;

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      setFieldError('Enter the 6 digit OTP');
      return;
    }
    setBusy(true);
    setFieldError('');
    setNotice('');
    try {
      await onVerify(code);
    } catch (error) {
      const problem = readOtpError(error);
      if (problem.unlockResend) setWait(0);
      if (problem.blocked) setBlocked(true);
      if (problem.fatal) setFatal(true);
      if (problem.field) setFieldError(problem.field);
      else setNotice(problem.message);
    } finally {
      setBusy(false);
    }
  };

  // Number pads have no dismiss key — submit as soon as 6 digits are in.
  useEffect(() => {
    if (!/^\d{6}$/.test(code) || busy || expired || blocked) return undefined;
    if (autoTried.current === code) return undefined;
    const timer = setTimeout(() => {
      autoTried.current = code;
      verify();
    }, 200);
    return () => clearTimeout(timer);
    // Intentionally only when `code` completes to 6 digits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    setBusy(true);
    setFieldError('');
    setNotice('');
    try {
      await onResend();
      setWait(30);
      setLeft(expiresInSeconds);
      autoTried.current = '';
      setCode('');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={type.body}>Code sent to {sentTo || 'your email'}</Text>
      <Text style={styles.fine}>
        {expired ? 'This code has expired.' : `Code expires in ${clock(left)}.`}
      </Text>

      <AuthField
        label="6 digit code"
        placeholder="123456"
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        value={code}
        onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
        error={fieldError}
      />

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {!keyboardOpen ? (
        <>
          {expired ? (
            <Button title={backLabel} onPress={onBack} />
          ) : blocked ? (
            <Button title={backLabel} onPress={onBack} />
          ) : (
            <Button title="Confirm code" loading={busy} onPress={verify} />
          )}

          <Button
            title={wait > 0 ? `Resend in ${wait}s` : 'Resend code'}
            variant="ghost"
            onPress={resend}
            disabled={busy || wait > 0 || expired}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 28, gap: 14 },
  fine: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
    marginTop: -6,
  },
  notice: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
  },
});
