import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, Header, Button, Segmented, Badge, EmptyState, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { shortDate } from '../../utils/date';

/**
 * SupportScreen – ticket list (All / Open / Closed) and a composer to open a
 * new ticket at the bottom.
 * Data: api.getSupportTickets(); new ticket: api.createTicket() (kept in memory)
 */
export default function SupportScreen() {
  const { data, setData } = useApi(api.getSupportTickets);
  const [tab, setTab] = useState('All');
  const [subject, setSubject] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      const ticket = await api.createTicket(subject);
      setData(d => ({ ...d, tickets: [ticket, ...d.tickets] }));
      setSubject('');
      setTab('All');
    } catch (e) {
      Alert.alert('Could not open ticket', e.message);
    } finally {
      setSending(false);
    }
  };

  const tickets = (data?.tickets || []).filter(t => tab === 'All' || t.status === tab);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        footer={
          <View style={styles.composer}>
            <Text style={type.h2}>Open a ticket</Text>
            <TextInput
              value={subject}
              onChangeText={setSubject}
              placeholder="What do you need help with?"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
            <View style={styles.row}>
              <Button title="Attach screenshot" icon="image" variant="outline" size="md" style={styles.flex1} onPress={() => Alert.alert('Attach', 'Add an image picker library to enable this (see docs/SCREENS.md).')} />
              <Button title="Send" size="md" style={styles.send} loading={sending} disabled={!subject.trim()} onPress={send} />
            </View>
            {data ? <Text style={type.tiny}>{data.contact.email} · {data.contact.hours} (sample hours)</Text> : null}
          </View>
        }>
        <Header title="Support" />
        <Text style={type.small}>Open a ticket and our team replies here. Attach a screenshot if it helps.</Text>
        <Segmented variant="underline" options={['All', 'Open', 'Closed']} value={tab} onChange={setTab} style={styles.mt16} />

        {!data ? (
          <Loading />
        ) : tickets.length === 0 ? (
          <EmptyState icon="chat" title={`No ${tab === 'All' ? '' : tab.toLowerCase() + ' '}tickets here yet`} text="Replies from the team appear in each ticket." />
        ) : (
          tickets.map(t => (
            <View key={t.id} style={styles.ticket}>
              <View style={styles.ticketHead}>
                <Text style={type.tiny}>#{t.id} · {shortDate(t.createdOn)}</Text>
                <Badge label={t.status} tone={t.status === 'Open' ? 'gold' : 'neutral'} />
              </View>
              <Text style={styles.subject}>{t.subject}</Text>
              <View style={styles.reply}>
                <Text style={type.small} numberOfLines={2}>{t.lastReply}</Text>
              </View>
              <Text style={type.tiny}>{t.messages} message{t.messages > 1 ? 's' : ''}</Text>
            </View>
          ))
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  flex1: { flex: 1 },
  mt16: { marginTop: 16 },
  row: { flexDirection: 'row', gap: 8 },
  send: { width: 100 },
  composer: { backgroundColor: colors.surfaceAlt, borderRadius: 24, padding: 16, gap: 10 },
  input: { height: 48, borderRadius: 14, backgroundColor: colors.bg, color: colors.text, fontFamily: fonts.regular, fontSize: 14, paddingHorizontal: 14 },
  ticket: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 8 },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subject: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  reply: { backgroundColor: colors.surface, borderRadius: 14, borderTopLeftRadius: 4, padding: 12 },
});
