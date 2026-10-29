import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  Screen,
  Header,
  Button,
  Segmented,
  Badge,
  EmptyState,
  Loading,
  ErrorView,
  Icon,
  AuthField,
} from '../../components';
import useApi from '../../hooks/useApi';
import useInScreenBack from '../../hooks/useInScreenBack';
import * as api from '../../services/api';
import { imageUrl } from '../../services/http';
import { colors, fonts, spacing, type } from '../../theme';

const PICKER_OPTS = {
  mediaType: 'photo',
  quality: 0.85,
  maxWidth: 1600,
  maxHeight: 1600,
  includeBase64: false,
  selectionLimit: 1,
};

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

function ago(value) {
  const diff = Date.now() - new Date(value).getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function when(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'open') return 'gold';
  if (s === 'closed') return 'neutral';
  return 'neutral';
}

function statusLabel(status) {
  const s = String(status || '');
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

async function pickImage() {
  const result = await launchImageLibrary(PICKER_OPTS);
  if (!result || result.didCancel) return null;
  if (result.errorCode) {
    throw new Error(
      result.errorCode === 'permission'
        ? 'Please allow photo library access in Settings.'
        : result.errorMessage || 'Could not open gallery.',
    );
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  const mime = asset.type || 'image/jpeg';
  return {
    uri: asset.uri,
    type: mime,
    name: asset.fileName || `attachment_${Date.now()}.${(mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`,
  };
}

/**
 * SupportScreen – mirrors web Account.jsx Support:
 * list + status filter, create ticket (subject/message/attachment),
 * thread view with reply composer.
 */
export default function SupportScreen() {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const list = useApi(() => api.getSupportTickets({ page, limit: 10, status }), [page, status]);
  const [selected, setSelected] = useState('');
  const ticket = useApi(
    () => (selected ? api.getSupportTicket(selected) : Promise.resolve(null)),
    [selected],
  );

  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [reply, setReply] = useState('');
  const [replyFile, setReplyFile] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyboardH, setKeyboardH] = useState(0);
  const threadRef = useRef(null);

  const leaveThread = () => {
    setSelected('');
    setReply('');
    setReplyFile(null);
    setNotice('');
  };

  // Chat + create sheet are in-screen steps, not stack routes.
  // Phone back must close those first (same pattern as Login OTP).
  useInScreenBack(Boolean(selected) || creating, () => {
    if (creating) {
      if (!busy) {
        Keyboard.dismiss();
        setCreating(false);
        setNotice('');
      }
      return;
    }
    if (selected) leaveThread();
  });

  useEffect(() => {
    if (!creating) {
      setKeyboardH(0);
      return undefined;
    }
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = e => setKeyboardH(e?.endCoordinates?.height || 0);
    const onHide = () => setKeyboardH(0);
    const showSub = Keyboard.addListener(showEvt, onShow);
    const hideSub = Keyboard.addListener(hideEvt, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [creating]);

  const tickets = list.data?.data || [];
  const current =
    selected && ticket.data && String(ticket.data.id) === String(selected) ? ticket.data : null;

  useEffect(() => {
    if (!current?.messages?.length) return;
    const t = setTimeout(() => threadRef.current?.scrollToEnd?.({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [current]);

  const onFilter = value => {
    setStatus(value);
    setPage(1);
  };

  const attachNew = async () => {
    try {
      const file = await pickImage();
      if (file) setNewFile(file);
    } catch (e) {
      Alert.alert('Attach', e.message);
    }
  };

  const attachReply = async () => {
    try {
      const file = await pickImage();
      if (file) setReplyFile(file);
    } catch (e) {
      Alert.alert('Attach', e.message);
    }
  };

  const create = async () => {
    if (!subject.trim() || !message.trim() || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const result = await api.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        attachment: newFile,
      });
      setSubject('');
      setMessage('');
      setNewFile(null);
      setCreating(false);
      setSelected(result.id);
      list.refresh();
    } catch (error) {
      setNotice(error.message || 'Could not open ticket.');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if ((!reply.trim() && !replyFile) || busy || !selected) return;
    setBusy(true);
    setNotice('');
    try {
      await api.replyToTicket(selected, { message: reply.trim(), attachment: replyFile });
      setReply('');
      setReplyFile(null);
      ticket.refresh();
      list.refresh();
    } catch (error) {
      setNotice(error.message || 'Could not send reply.');
    } finally {
      setBusy(false);
    }
  };

  const total = list.data?.total || 0;
  const limit = list.data?.limit || 10;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  // ---- Thread view ----
  if (selected) {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
        <Screen
          scroll={false}
          keyboard
          footer={
            current && String(current.status).toLowerCase() !== 'closed' ? (
              <View style={styles.composer}>
                {replyFile ? (
                  <View style={styles.fileChip}>
                    <Image source={{ uri: replyFile.uri }} style={styles.fileThumb} />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {replyFile.name}
                    </Text>
                    <Pressable onPress={() => setReplyFile(null)} hitSlop={8} accessibilityLabel="Remove image">
                      <Icon name="close" size={16} color={colors.muted} />
                    </Pressable>
                  </View>
                ) : null}
                {notice ? <Text style={styles.errorText}>{notice}</Text> : null}
                <View style={styles.composerRow}>
                  <Pressable
                    onPress={attachReply}
                    style={styles.iconBtn}
                    accessibilityLabel="Attach image"
                    disabled={busy}>
                    <Icon name="image" size={20} color={colors.gold} />
                  </Pressable>
                  <TextInput
                    value={reply}
                    onChangeText={setReply}
                    placeholder="Write a reply…"
                    placeholderTextColor={colors.placeholder}
                    style={styles.replyInput}
                    multiline
                  />
                  <Pressable
                    onPress={send}
                    style={[styles.sendBtn, (busy || (!reply.trim() && !replyFile)) && styles.sendDisabled]}
                    disabled={busy || (!reply.trim() && !replyFile)}
                    accessibilityLabel="Send reply">
                    <Icon name="send" size={18} color={colors.goldInk} />
                  </Pressable>
                </View>
              </View>
            ) : current && String(current.status).toLowerCase() === 'closed' ? (
              <View style={styles.closedBar}>
                <Icon name="lock" size={16} color={colors.muted} />
                <Text style={styles.closedText}>This ticket is closed. Open a new ticket if you need more help.</Text>
              </View>
            ) : null
          }>
          <Header
            title={current?.subject || 'Ticket'}
            onBack={leaveThread}
            right={current ? <Badge label={statusLabel(current.status)} tone={statusTone(current.status)} /> : null}
          />
          {current ? (
            <Text style={[type.tiny, styles.opened]}>Opened {when(current.createdAt)}</Text>
          ) : null}

          {ticket.loading && !current ? (
            <Loading />
          ) : ticket.error && !current ? (
            <ErrorView message={ticket.error} onRetry={ticket.refresh} />
          ) : current ? (
            <ScrollView
              ref={threadRef}
              style={styles.thread}
              contentContainerStyle={styles.threadContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => threadRef.current?.scrollToEnd?.({ animated: false })}>
              {(current.messages || []).map((item, index) => {
                const mine = item.senderType === 'user';
                const attach = item.attachment ? imageUrl(item.attachment) : '';
                return (
                  <View
                    key={`${item.createdAt}-${index}`}
                    style={[styles.msgRow, mine ? styles.msgMine : styles.msgThem]}>
                    {!mine ? (
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>S</Text>
                      </View>
                    ) : null}
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
                      {!mine ? <Text style={styles.from}>Support team</Text> : null}
                      {item.message ? <Text style={styles.msgText}>{item.message}</Text> : null}
                      {attach ? (
                        <Pressable onPress={() => Linking.openURL(attach)}>
                          <Image source={{ uri: attach }} style={styles.attachImg} />
                        </Pressable>
                      ) : null}
                      <Text style={styles.msgTime}>{when(item.createdAt)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
    );
  }

  // ---- List view ----
  return (
    <Screen
      onRefresh={list.refresh}
      refreshing={list.loading}
      keyboard
      footer={
        <Button title="New ticket" icon="plus" onPress={() => setCreating(true)} />
      }>
      <Header title="Support" />
      <Text style={type.small}>Open a ticket and our team replies here. Attach a screenshot if it helps.</Text>

      <Segmented
        variant="underline"
        options={FILTERS}
        value={status}
        onChange={onFilter}
        style={styles.mt16}
      />

      {notice && !creating ? <Text style={[styles.errorText, styles.mt12]}>{notice}</Text> : null}

      {list.loading && !list.data ? (
        <Loading />
      ) : list.error && !list.data ? (
        <ErrorView message={list.error} onRetry={list.refresh} />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon="chat"
          title="No tickets here yet."
          text="Pick a conversation, or open a new ticket."
          actionLabel="Open a ticket"
          onAction={() => setCreating(true)}
        />
      ) : (
        tickets.map(item => {
          const last = item.messages?.[item.messages.length - 1];
          const preview = last?.message || (last?.attachment ? 'Attachment' : '—');
          const count = item.messages?.length || 0;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelected(item.id)}
              style={({ pressed }) => [styles.ticket, pressed && { opacity: 0.75 }]}>
              <View style={styles.ticketTop}>
                <Text style={styles.subject} numberOfLines={1}>
                  {item.subject}
                </Text>
                <Badge label={statusLabel(item.status)} tone={statusTone(item.status)} />
              </View>
              <Text style={type.small} numberOfLines={2}>
                {preview}
              </Text>
              <View style={styles.ticketMeta}>
                <Text style={type.tiny}>
                  {count} message{count === 1 ? '' : 's'}
                </Text>
                <Text style={type.tiny}>{ago(item.updatedAt || item.createdAt)}</Text>
              </View>
            </Pressable>
          );
        })
      )}

      {pageCount > 1 ? (
        <View style={styles.pager}>
          <Button
            title="Previous"
            variant="outline"
            size="md"
            disabled={page <= 1 || list.loading}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          />
          <Text style={type.tiny}>
            {page} / {pageCount}
          </Text>
          <Button
            title="Next"
            variant="outline"
            size="md"
            disabled={page >= pageCount || list.loading}
            onPress={() => setPage(p => Math.min(pageCount, p + 1))}
          />
        </View>
      ) : null}

      <Modal
        visible={creating}
        animationType="slide"
        transparent
        onRequestClose={() => !busy && setCreating(false)}
        statusBarTranslucent>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}>
          <Pressable
            style={styles.modalDismiss}
            onPress={() => {
              if (busy) return;
              Keyboard.dismiss();
              setCreating(false);
            }}
          />
          <View
            style={[
              styles.modalSheet,
              {
                paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === 'android' ? keyboardH : 0),
              },
            ]}>
            <View style={styles.modalHead}>
              <Text style={type.h2}>Open a ticket</Text>
              <Pressable
                onPress={() => {
                  if (busy) return;
                  Keyboard.dismiss();
                  setCreating(false);
                }}
                hitSlop={8}
                accessibilityLabel="Close">
                <Icon name="close" size={20} color={colors.muted} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalForm}
              bounces={false}>
              <AuthField
                label="Subject"
                placeholder="e.g. Deposit not credited"
                value={subject}
                onChangeText={setSubject}
                editable={!busy}
                autoCapitalize="sentences"
                returnKeyType="next"
              />

              <AuthField
                label="Message"
                placeholder="Tell us what happened, with any reference numbers."
                value={message}
                onChangeText={setMessage}
                editable={!busy}
                multiline
                numberOfLines={5}
                autoCapitalize="sentences"
              />

              {newFile ? (
                <View style={styles.fileChip}>
                  <Image source={{ uri: newFile.uri }} style={styles.fileThumb} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {newFile.name}
                  </Text>
                  <Pressable onPress={() => setNewFile(null)} hitSlop={8} accessibilityLabel="Remove image">
                    <Icon name="close" size={16} color={colors.muted} />
                  </Pressable>
                </View>
              ) : (
                <Pressable onPress={attachNew} style={styles.fileDrop} disabled={busy}>
                  <Icon name="image" size={20} color={colors.gold} />
                  <View style={styles.fileDropText}>
                    <Text style={styles.fileDropTitle}>Attach a screenshot</Text>
                    <Text style={type.tiny}>JPG, PNG or WebP · optional</Text>
                  </View>
                </Pressable>
              )}

              {notice ? <Text style={styles.errorText}>{notice}</Text> : null}

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="outline"
                  size="md"
                  disabled={busy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setCreating(false);
                  }}
                  style={styles.flex1}
                />
                <Button
                  title="Open ticket"
                  size="md"
                  loading={busy}
                  disabled={busy || !subject.trim() || !message.trim()}
                  onPress={create}
                  style={styles.flex1}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  flex1: { flex: 1 },
  mt16: { marginTop: 16 },
  mt12: { marginTop: 12 },
  opened: { marginBottom: 8 },

  ticket: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 6,
  },
  ticketTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subject: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  ticketMeta: { flexDirection: 'row', justifyContent: 'space-between' },

  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },

  thread: { flex: 1 },
  threadContent: { paddingVertical: 8, gap: 12, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '92%' },
  msgMine: { alignSelf: 'flex-end' },
  msgThem: { alignSelf: 'flex-start' },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, gap: 4, maxWidth: '100%' },
  bubbleMine: { backgroundColor: colors.goldSoft, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  from: { fontFamily: fonts.medium, fontSize: 11, color: colors.gold },
  msgText: { fontFamily: fonts.regular, fontSize: 14, color: colors.text, lineHeight: 20 },
  msgTime: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, marginTop: 2 },
  attachImg: { width: 180, height: 140, borderRadius: 10, marginTop: 4 },

  composer: { gap: 8 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  closedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  closedText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.muted },

  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  fileThumb: { width: 40, height: 40, borderRadius: 8 },
  fileName: { flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.textSoft },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalDismiss: { flex: 1 },
  modalSheet: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '92%',
  },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalForm: { gap: 18, paddingBottom: 8 },
  fileDrop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderStyle: 'dashed',
  },
  fileDropText: { flex: 1, gap: 2 },
  fileDropTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  errorText: { fontFamily: fonts.regular, fontSize: 13, color: colors.danger },
});
