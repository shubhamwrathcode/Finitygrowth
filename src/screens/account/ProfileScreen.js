import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  Screen,
  Card,
  Button,
  Badge,
  Icon,
  Loading,
  ErrorView,
} from '../../components';
import useApi from '../../hooks/useApi';
import useInScreenBack from '../../hooks/useInScreenBack';
import * as api from '../../services/api';
import { imageUrl } from '../../services/http';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, spacing } from '../../theme';
import { money } from '../../utils/format';

const PICKER_OPTS = {
  mediaType: 'photo',
  quality: 0.85,
  maxWidth: 1200,
  maxHeight: 1200,
  includeBase64: false,
  selectionLimit: 1,
};

/**
 * ProfileScreen – matches web Account.jsx Profile:
 * hero (avatar + chips), tiles, personal details form, security, account meta.
 * Data: GET/PATCH /api/v1/me/profile (+ profileImage multipart)
 */
export default function ProfileScreen({ navigation }) {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: user, refresh, loading, error } = useApi(api.getProfile);
  const [form, setForm] = useState(null);
  const [photo, setPhoto] = useState(null); // { uri, type, name }
  const [photoMenu, setPhotoMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [copied, setCopied] = useState('');
  const pendingPickerRef = useRef(null);

  useInScreenBack(photoMenu, () => setPhotoMenu(false));

  const values = form || user || {};
  const fieldsChanged = useMemo(() => {
    if (!user || !form) return false;
    return ['name', 'phone', 'country'].some(key => (form[key] || '') !== (user[key] || ''));
  }, [form, user]);
  const changed = fieldsChanged || Boolean(photo);

  if (loading && !user) {
    return (
      <Screen withTabBar>
        <Loading />
      </Screen>
    );
  }

  if (error && !user) {
    return (
      <Screen withTabBar>
        <ErrorView message={error} onRetry={refresh} />
      </Screen>
    );
  }

  if (!user) return null;

  const avatarUri = photo?.uri || (user.profileImage ? imageUrl(user.profileImage) : '');
  const saved = message === 'Profile saved.';
  const kyc = String(user.kycStatus || 'none');

  const setField = (key, value) => {
    setForm({ ...values, [key]: value });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  };

  const discard = () => {
    setForm(null);
    setPhoto(null);
    setErrors({});
    setMessage('');
  };

  const applyPickedAsset = asset => {
    if (!asset?.uri) return;
    const uri = asset.uri;
    const type = asset.type || 'image/jpeg';
    const name =
      asset.fileName ||
      `profile_${Date.now()}.${(type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
    setPhoto({ uri, type, name });
    setMessage('');
    if (errors.profileImage) setErrors({ ...errors, profileImage: undefined });
  };

  const runPendingPicker = async () => {
    const pending = pendingPickerRef.current;
    pendingPickerRef.current = null;
    if (!pending) return;
    const { fn, label } = pending;
    try {
      const result = await fn();
      if (!result || result.didCancel) return;
      if (result.errorCode) {
        const msg =
          result.errorCode === 'permission'
            ? `Please allow ${label.toLowerCase()} access in Settings.`
            : result.errorMessage || `Could not open ${label.toLowerCase()}.`;
        Alert.alert(label, msg);
        return;
      }
      applyPickedAsset(result.assets?.[0]);
    } catch (err) {
      Alert.alert(
        label,
        err?.message?.includes('Native module') || err?.message?.includes('null')
          ? 'Rebuild the app once (npm run android) so camera/gallery can open.'
          : err?.message || `Could not open ${label.toLowerCase()}.`,
      );
    }
  };

  const queuePicker = (fn, label) => {
    // Close the sheet first — launching camera/gallery while the Modal is
    // still animating out crashes on many Android devices.
    // (InteractionManager was removed in RN 0.88 — use setTimeout only.)
    pendingPickerRef.current = { fn, label };
    setPhotoMenu(false);
    setTimeout(runPendingPicker, Platform.OS === 'android' ? 400 : 250);
  };

  const pickFromGallery = () => {
    queuePicker(() => launchImageLibrary(PICKER_OPTS), 'Gallery');
  };

  const pickFromCamera = () => {
    // Do NOT request CAMERA runtime permission — we don't declare it in the
    // manifest. image-picker uses the system camera intent without that grant.
    queuePicker(
      () =>
        launchCamera({
          ...PICKER_OPTS,
          saveToPhotos: false,
          cameraType: 'back',
        }),
      'Camera',
    );
  };

  const save = async () => {
    if (!changed || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const body = {};
      if (form && (form.name || '') !== (user.name || '')) body.name = form.name;
      if (form && (form.phone || '') !== (user.phone || '')) body.phone = form.phone;
      if (form && (form.country || '') !== (user.country || '')) body.country = form.country;
      if (photo) body.photo = photo;
      await api.updateProfile(body);
      setMessage('Profile saved.');
      setErrors({});
      setForm(null);
      setPhoto(null);
      refresh();
    } catch (err) {
      setMessage(err.message || 'Could not save profile.');
      setErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  const copy = async (label, value) => {
    if (!value) return;
    try {
      Clipboard.setString(String(value));
      setCopied(label);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      setCopied('');
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You will need your Login ID and password to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : '—';

  return (
    <Screen withTabBar onRefresh={refresh} refreshing={loading} keyboard>
      {/* Hero — photo + name */}
      <View style={styles.idRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change profile photo"
          onPress={() => setPhotoMenu(true)}
          style={styles.avatarBtn}>
          <LinearGradient colors={['#F6E2B3', colors.gold, colors.goldDeep]} style={styles.avatarGrad}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarLetter}>{(user.name || 'M').slice(0, 1).toUpperCase()}</Text>
            )}
          </LinearGradient>
          <View style={styles.cameraBadge}>
            <Icon name="camera" size={14} color="#fff" strokeWidth={2} />
          </View>
        </Pressable>

        <View style={styles.nameBlock}>
          <Text style={styles.name}>{user.name || '—'}</Text>
          <Text style={styles.email}>{user.email || '—'}</Text>
          <View style={styles.chips}>
            <Badge label={prettyStatus(user.status)} tone={statusTone(user.status)} />
            <View style={[styles.kycChip, kycToneStyle(kyc)]}>
              <Icon name="shield" size={12} color={kycColor(kyc)} strokeWidth={2} />
              <Text style={[styles.kycText, { color: kycColor(kyc) }]}>KYC {prettyStatus(kyc)}</Text>
            </View>
            <Text style={styles.since}>Member since {memberSince}</Text>
          </View>
        </View>
      </View>

      {user.status === 'blocked' ? (
        <View style={styles.blocked}>
          <Text style={styles.blockedText}>
            {user.restrictionReason || 'This account is blocked.'}
          </Text>
        </View>
      ) : null}

      {/* Tiles */}
      <View style={styles.tiles}>
        <Tile
          label="Login ID"
          value={user.userId || '—'}
          mono
          onCopy={user.userId ? () => copy('id', user.userId) : null}
          copied={copied === 'id'}
        />
        <Tile
          label="Referral code"
          value={user.referralCode || '—'}
          mono
          gold
          onCopy={user.referralCode ? () => copy('code', user.referralCode) : null}
          copied={copied === 'code'}
        />
        <Tile label="Balance" value={money(user.balance)} />
        <Tile label="Locked" value={money(user.lockedBalance)} />
      </View>

      {/* Personal details */}
      <Card style={styles.block} padding={16}>
        <Text style={styles.cardTitle}>Personal details</Text>
        <Text style={styles.cardSub}>Your name and contact details on this account.</Text>

        <View style={styles.fields}>
          <PfField
            label="Full name"
            value={values.name || ''}
            onChangeText={v => setField('name', v)}
            error={errors.name}
          />
          <PfField label="Email" value={user.email || ''} editable={false} locked />
          <PfField
            label="Phone"
            value={values.phone || ''}
            onChangeText={v => setField('phone', v)}
            keyboardType="phone-pad"
            error={errors.phone}
          />
          <PfField
            label="Country"
            value={values.country || ''}
            onChangeText={v => setField('country', v)}
            error={errors.country}
          />
          <PfField label="Login ID" value={user.userId || ''} editable={false} locked />

          {photo ? (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>New photo</Text>
              <View style={styles.fileChip}>
                <Image source={{ uri: photo.uri }} style={styles.fileThumb} />
                <Text style={styles.fileName} numberOfLines={1}>
                  {photo.name}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => setPhoto(null)}
                  hitSlop={8}
                  style={styles.fileRemove}>
                  <Text style={styles.fileRemoveText}>×</Text>
                </Pressable>
              </View>
              {errors.profileImage ? (
                <Text style={styles.fieldError}>{errors.profileImage}</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        {message ? (
          <Text style={[styles.msg, saved ? styles.msgOk : styles.msgBad]}>{message}</Text>
        ) : null}

        <View style={styles.actions}>
          {changed ? (
            <Button title="Discard" variant="ghost" size="md" onPress={discard} style={styles.actionBtn} />
          ) : null}
          <Button
            title="Save changes"
            size="md"
            loading={busy}
            disabled={!changed || busy}
            onPress={save}
            style={styles.actionBtn}
          />
        </View>
      </Card>

      {/* Security */}
      <Card style={styles.block} padding={16}>
        <Text style={styles.cardTitle}>Security</Text>
        <Text style={styles.cardSub}>Keep your account and payouts protected.</Text>
        <PfLink
          icon="lock"
          title="Change password"
          subtitle="Use a long password you don’t reuse."
          onPress={() => navigation.navigate(ROUTES.CHANGE_PASSWORD)}
        />
        <PfLink
          icon="shield"
          title="Identity verification"
          subtitle={`Status: ${prettyStatus(user.kycStatus)}`}
          teal
          onPress={() => navigation.navigate(ROUTES.KYC)}
        />
      </Card>

      {/* Account meta */}
      <Card style={styles.block} padding={16}>
        <Text style={styles.cardTitle}>Account</Text>
        <DlRow label="Member since" value={formatWhen(user.createdAt)} />
        <DlRow label="Country" value={user.country || '—'} />
        <DlRow label="Phone" value={user.phone || '—'} last />
      </Card>

      {/* App shortcuts (mobile-only extras kept under More) */}
      <Card style={styles.block} padding={0}>
        <View style={styles.moreInner}>
          <MoreRow title="My packages" onPress={() => navigation.navigate(ROUTES.MY_PACKAGES)} />
          <MoreRow title="Earnings" onPress={() => navigation.navigate(ROUTES.EARNINGS)} />
          <MoreRow title="Notifications" onPress={() => navigation.navigate(ROUTES.NOTIFICATIONS)} />
          <MoreRow title="Support tickets" onPress={() => navigation.navigate(ROUTES.SUPPORT)} last />
        </View>
      </Card>

      <Button title="Log out" variant="danger" onPress={confirmLogout} style={styles.logout} />

      <Modal
        visible={photoMenu}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setPhotoMenu(false)}
        onDismiss={runPendingPicker}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setPhotoMenu(false)}>
            {Platform.OS === 'ios' ? (
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="dark"
                blurAmount={12}
                reducedTransparencyFallbackColor="rgba(7,8,12,0.85)"
              />
            ) : null}
            <View style={[styles.backdropDim, Platform.OS === 'android' && styles.backdropDimAndroid]} />
          </Pressable>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Profile photo</Text>
            <Text style={styles.sheetSub}>Take a new picture or choose from your gallery.</Text>

            <Pressable
              accessibilityRole="button"
              onPress={pickFromCamera}
              style={({ pressed }) => [styles.sheetBtn, pressed && styles.sheetBtnPressed]}>
              <View style={styles.sheetBtnIco}>
                <Icon name="camera" size={20} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.sheetBtnText}>Camera</Text>
              <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={pickFromGallery}
              style={({ pressed }) => [styles.sheetBtn, pressed && styles.sheetBtnPressed]}>
              <View style={styles.sheetBtnIco}>
                <Icon name="image" size={20} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.sheetBtnText}>Gallery</Text>
              <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
            </Pressable>

            {photo ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPhoto(null);
                  setPhotoMenu(false);
                }}
                style={({ pressed }) => [styles.sheetBtn, styles.sheetBtnDanger, pressed && styles.sheetBtnPressed]}>
                <Text style={styles.sheetBtnDangerText}>Remove new photo</Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              onPress={() => setPhotoMenu(false)}
              style={styles.sheetCancel}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function Tile({ label, value, mono, gold, onCopy, copied }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text
        style={[styles.tileValue, mono && styles.mono, gold && styles.gold]}
        numberOfLines={1}>
        {value}
      </Text>
      {onCopy ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Copy ${label}`}
          onPress={onCopy}
          hitSlop={8}
          style={styles.tileCopy}>
          {copied ? (
            <Text style={styles.copiedMark}>✓</Text>
          ) : (
            <Icon name="copy" size={13} color={colors.muted} strokeWidth={2} />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function PfField({ label, value, onChangeText, editable = true, locked, error, keyboardType }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {locked ? <Icon name="lock" size={11} color={colors.subtle} strokeWidth={2} /> : null}
      </View>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.gold}
        style={[
          styles.input,
          !editable && styles.inputReadonly,
          error && styles.inputError,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function PfLink({ icon, title, subtitle, onPress, teal }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <View style={[styles.linkIco, teal && styles.linkIcoTeal]}>
        <Icon name={icon} size={18} color={teal ? '#5fd4c6' : colors.gold} strokeWidth={2} />
      </View>
      <View style={styles.linkText}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub}>{subtitle}</Text>
      </View>
      <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
    </Pressable>
  );
}

function DlRow({ label, value, last }) {
  return (
    <View style={[styles.dlRow, !last && styles.dlLine]}>
      <Text style={styles.dlLabel}>{label}</Text>
      <Text style={styles.dlValue}>{value}</Text>
    </View>
  );
}

function MoreRow({ title, onPress, last }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.moreRow, !last && styles.moreLine]}>
      <Text style={styles.moreTitle}>{title}</Text>
      <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
    </Pressable>
  );
}

function prettyStatus(value) {
  return String(value || '—').replace(/_/g, ' ');
}

function statusTone(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'active' || v === 'approved') return 'success';
  if (v === 'blocked' || v === 'rejected') return 'warning';
  return 'gold';
}

function kycColor(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'approved' || v === 'verified') return '#8ddea8';
  if (v === 'rejected') return '#f0a0a0';
  if (v === 'submitted' || v === 'pending') return colors.gold;
  return colors.muted;
}

function kycToneStyle(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'approved' || v === 'verified') return { backgroundColor: 'rgba(141, 222, 168, 0.1)' };
  if (v === 'rejected') return { backgroundColor: 'rgba(240, 160, 160, 0.1)' };
  if (v === 'submitted' || v === 'pending') return { backgroundColor: colors.goldSoft };
  return { backgroundColor: 'rgba(255,255,255,0.06)' };
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

const styles = StyleSheet.create({
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
    paddingTop: 8,
  },
  avatarBtn: { position: 'relative' },
  avatarGrad: {
    width: 88,
    height: 88,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.goldInk,
    textTransform: 'uppercase',
  },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBlock: { flex: 1, paddingBottom: 2, minWidth: 0 },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  email: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 },
  kycChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kycText: { fontFamily: fonts.semibold, fontSize: 11, textTransform: 'capitalize' },
  since: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },

  blocked: {
    backgroundColor: 'rgba(240,160,160,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  blockedText: { fontFamily: fonts.regular, fontSize: 13, color: '#f4a097' },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tile: {
    width: '47%',
    flexGrow: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    gap: 2,
  },
  tileLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  tileValue: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.text, paddingRight: 28 },
  mono: { fontFamily: fonts.mono, fontSize: 14 },
  gold: { color: colors.gold },
  tileCopy: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedMark: { color: colors.gold, fontWeight: '800', fontSize: 13 },

  block: { marginBottom: 14 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  cardSub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 14 },

  fields: { gap: 12 },
  field: { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(0,0,0,0.25)',
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  inputReadonly: {
    color: colors.subtle,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
  },
  inputError: { borderColor: '#f08a7e' },
  fieldError: { fontFamily: fonts.regular, fontSize: 12, color: '#f4a097' },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  fileThumb: { width: 32, height: 32, borderRadius: 8 },
  fileName: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSoft },
  fileRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileRemoveText: { fontSize: 20, color: colors.muted, lineHeight: 22 },

  msg: { marginTop: 12, fontFamily: fonts.regular, fontSize: 13 },
  msgOk: { color: '#8ddea8' },
  msgBad: { color: '#f4a097' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  actionBtn: { minWidth: 120 },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  linkIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkIcoTeal: { backgroundColor: 'rgba(36, 161, 148, 0.14)' },
  linkText: { flex: 1, gap: 2 },
  linkTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  linkSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },

  dlRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10 },
  dlLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  dlLabel: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted },
  dlValue: { fontFamily: fonts.regular, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'right' },

  moreInner: { paddingHorizontal: 16 },
  moreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  moreLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  moreTitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },

  logout: { marginTop: 8, marginBottom: spacing.lg },

  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 8, 12, 0.35)',
  },
  backdropDimAndroid: {
    backgroundColor: 'rgba(7, 8, 12, 0.72)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
  },
  sheetSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
  },
  sheetBtnPressed: { opacity: 0.85 },
  sheetBtnIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: {
    flex: 1,
    fontFamily: fonts.semibold,
    fontSize: 15,
    color: colors.text,
  },
  sheetBtnDanger: {
    justifyContent: 'center',
    borderColor: 'rgba(240,160,160,0.35)',
    backgroundColor: 'rgba(240,160,160,0.08)',
  },
  sheetBtnDangerText: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: '#f4a097',
    textAlign: 'center',
  },
  sheetCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  sheetCancelText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.muted,
  },
});
