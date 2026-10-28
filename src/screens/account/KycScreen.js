import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import {
  Screen,
  Header,
  Button,
  Badge,
  AuthSelect,
  Icon,
  Loading,
  ErrorView,
  Notice,
} from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { imageUrl } from '../../services/http';
import { colors, fonts, spacing, type } from '../../theme';

const DOC_TYPES = [
  { label: 'Passport', value: 'passport' },
  { label: 'National ID', value: 'national_id' },
  { label: 'Driving license', value: 'driving_license' },
];

const PICKER_OPTS = {
  mediaType: 'photo',
  quality: 0.85,
  maxWidth: 1600,
  maxHeight: 1600,
  includeBase64: false,
  selectionLimit: 1,
};

/**
 * KycScreen – mirrors web More.jsx Kyc:
 * GET/POST /api/v1/me/verification, document type + image, locked when submitted/approved.
 */
export default function KycScreen() {
  const insets = useSafeAreaInsets();
  const { data, loading, error, refresh } = useApi(api.getVerification);
  const [documentType, setDocumentType] = useState('passport');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pendingPickerRef = useRef(null);

  if (loading && !data) {
    return (
      <Screen>
        <Header title="Identity verification" />
        <Loading />
      </Screen>
    );
  }

  if (error && !data) {
    return (
      <Screen>
        <Header title="Identity verification" />
        <ErrorView message={error} onRetry={refresh} />
      </Screen>
    );
  }

  const status = String(data?.kycStatus || 'none');
  const locked = status === 'submitted' || status === 'approved';
  const ok = message === 'Document submitted.';
  const previewUri = file?.uri || (data?.kycDocument ? imageUrl(data.kycDocument) : '');

  const applyPickedAsset = asset => {
    if (!asset?.uri) return;
    const uri = asset.uri;
    const type = asset.type || 'image/jpeg';
    const name =
      asset.fileName ||
      `kyc_${Date.now()}.${(type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
    setFile({ uri, type, name });
    setMessage('');
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
        Alert.alert(
          label,
          result.errorCode === 'permission'
            ? `Please allow ${label.toLowerCase()} access in Settings.`
            : result.errorMessage || `Could not open ${label.toLowerCase()}.`,
        );
        return;
      }
      applyPickedAsset(result.assets?.[0]);
    } catch (err) {
      Alert.alert(label, err?.message || `Could not open ${label.toLowerCase()}.`);
    }
  };

  const queuePicker = (fn, label) => {
    pendingPickerRef.current = { fn, label };
    setPickerOpen(false);
    // Delay until the sheet finishes closing (InteractionManager removed in RN 0.88).
    setTimeout(runPendingPicker, Platform.OS === 'android' ? 400 : 250);
  };

  const submit = async () => {
    if (busy || locked || !file?.uri) return;
    setBusy(true);
    setMessage('');
    try {
      await api.submitVerification({ documentType, file });
      setMessage('Document submitted.');
      setFile(null);
      refresh();
    } catch (err) {
      setMessage(err.message || 'Could not submit document.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      keyboard
      onRefresh={refresh}
      refreshing={loading}
      footer={
        locked ? null : (
          <View style={styles.footer}>
            <Button
              title="Submit"
              loading={busy}
              onPress={submit}
              disabled={busy || !file?.uri}
            />
          </View>
        )
      }>
      <Header title="Identity verification" />
      <Text style={type.body}>
        Upload a clear photo of your passport, national ID, or driving licence for review.
      </Text>

      <View style={styles.block}>
        <Text style={styles.label}>Status</Text>
        <Badge
          label={status.replace(/_/g, ' ')}
          tone={
            status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'gold'
          }
          style={styles.badge}
        />
      </View>

      {data?.kycNote ? <Notice text={data.kycNote} tone="warning" /> : null}

      {previewUri ? (
        <View style={styles.docWrap}>
          <Text style={styles.label}>{file ? 'Selected document' : 'Submitted document'}</Text>
          <Image source={{ uri: previewUri }} style={styles.docImage} resizeMode="cover" />
        </View>
      ) : null}

      {message ? (
        <View style={[styles.alert, ok ? styles.alertOk : styles.alertBad]}>
          <Text style={[styles.alertText, ok ? styles.okText : styles.badText]}>{message}</Text>
        </View>
      ) : null}

      {locked ? (
        <Text style={[type.small, styles.lockedNote]}>
          Your documents are {status === 'approved' ? 'approved' : 'under review'}. You can’t submit
          a new document while this status is active.
        </Text>
      ) : (
        <View style={styles.form}>
          <AuthSelect
            label="Document type"
            value={documentType}
            options={DOC_TYPES}
            onChange={setDocumentType}
            searchable={false}
          />

          <View>
            <Text style={styles.label}>Document image</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [styles.pickBox, pressed && styles.pickBoxPressed]}>
              <View style={styles.pickIco}>
                <Icon name="image" size={20} color={colors.gold} strokeWidth={2} />
              </View>
              <View style={styles.pickText}>
                <Text style={styles.pickTitle}>{file ? 'Change image' : 'Choose image'}</Text>
                <Text style={styles.pickSub} numberOfLines={1}>
                  {file?.name || 'Camera or gallery · JPEG, PNG, WebP'}
                </Text>
              </View>
              <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
            </Pressable>
            {file ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setFile(null)}
                hitSlop={8}
                style={styles.clearBtn}>
                <Text style={styles.clearText}>Remove selected image</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      <Modal
        visible={pickerOpen}
        animationType="fade"
        transparent
        statusBarTranslucent
        onRequestClose={() => setPickerOpen(false)}
        onDismiss={runPendingPicker}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Document image</Text>
            <Text style={styles.sheetSub}>Take a photo or choose from your gallery.</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() =>
                queuePicker(
                  () =>
                    launchCamera({
                      ...PICKER_OPTS,
                      saveToPhotos: false,
                      cameraType: 'back',
                    }),
                  'Camera',
                )
              }
              style={({ pressed }) => [styles.sheetBtn, pressed && styles.sheetBtnPressed]}>
              <View style={styles.sheetBtnIco}>
                <Icon name="camera" size={20} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.sheetBtnText}>Camera</Text>
              <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => queuePicker(() => launchImageLibrary(PICKER_OPTS), 'Gallery')}
              style={({ pressed }) => [styles.sheetBtn, pressed && styles.sheetBtnPressed]}>
              <View style={styles.sheetBtnIco}>
                <Icon name="image" size={20} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.sheetBtnText}>Gallery</Text>
              <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setPickerOpen(false)}
              style={styles.sheetCancel}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 24 },
  label: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginBottom: 6 },
  badge: { alignSelf: 'flex-start' },
  docWrap: { marginTop: 18 },
  docImage: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  alert: { borderRadius: 12, padding: 12, marginTop: 16 },
  alertOk: { backgroundColor: 'rgba(141, 222, 168, 0.12)' },
  alertBad: { backgroundColor: 'rgba(240, 160, 160, 0.12)' },
  alertText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  okText: { color: '#8ddea8' },
  badText: { color: '#f4a097' },
  lockedNote: { marginTop: 16 },
  form: { marginTop: 22, gap: 18 },
  pickBox: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.lineStrong,
    paddingVertical: 10,
  },
  pickBoxPressed: { opacity: 0.85 },
  pickIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickText: { flex: 1, minWidth: 0 },
  pickTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  pickSub: { marginTop: 2, fontFamily: fonts.regular, fontSize: 12, color: colors.subtle },
  clearBtn: { marginTop: 10, alignSelf: 'flex-start' },
  clearText: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  footer: { gap: 14 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: spacing.screen,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: colors.lineStrong,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.lineStrong,
    marginBottom: 14,
  },
  sheetTitle: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text },
  sheetSub: {
    marginTop: 4,
    marginBottom: 14,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
  },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  sheetBtnPressed: { opacity: 0.8 },
  sheetBtnIco: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBtnText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.text },
  sheetCancel: { alignItems: 'center', paddingVertical: 16 },
  sheetCancelText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.muted },
});
