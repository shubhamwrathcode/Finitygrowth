import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Segmented, EmptyState, Loading, IconCircle } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';
import { shortDate } from '../../utils/date';

/**
 * NotificationsScreen
 * Data: api.getNotifications(); "Mark all read" → api.markAllNotificationsRead()
 * (kept in memory for the session, see services/api.js).
 */
const ICON = {
  credit: 'box',
  withdrawal: 'arrowUp',
  transfer: 'arrowDownLeft',
  support: 'chat',
  team: 'userPlus',
  commission: 'userPlus',
  level: 'layers',
};

export default function NotificationsScreen() {
  const { data, loading, refresh, setData } = useApi(api.getNotifications);
  const [tab, setTab] = useState('All');

  const markAll = async () => setData(await api.markAllNotificationsRead());

  const list = (data || []).filter(n => (tab === 'Unread' ? !n.read : true));
  const unread = (data || []).filter(n => !n.read).length;

  return (
    <Screen onRefresh={refresh} refreshing={loading && !!data}>
      <Header
        right={
          <Pressable accessibilityRole="button" onPress={markAll} disabled={!unread} hitSlop={8}>
            <Text style={[styles.markAll, !unread && { color: colors.subtle }]}>Mark all read</Text>
          </Pressable>
        }
      />
      <Text style={type.h1}>Notifications</Text>
      <Text style={[type.small, styles.mt4]}>{unread ? `${unread} unread` : 'You’re all caught up.'}</Text>

      <Segmented
        variant="pill"
        options={[{ value: 'All', label: 'All' }, { value: 'Unread', label: `Unread ${unread}` }]}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      {!data ? (
        <Loading />
      ) : list.length === 0 ? (
        <EmptyState icon="bell" title="No notifications here" text="Package credits, commissions, deposits and support replies show up here." />
      ) : (
        list.map(n => (
          <View key={n.id} style={styles.item}>
            <IconCircle name={ICON[n.type] || 'bell'} size={40} color={n.read ? colors.muted : colors.gold} bg={n.read ? colors.elevated : colors.goldSoft} />
            <View style={styles.flex1}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !n.read && styles.titleUnread]}>{n.title}</Text>
                <Text style={type.tiny}>{shortDate(n.date)}</Text>
              </View>
              <Text style={type.small}>{n.body}</Text>
            </View>
            {!n.read ? <View style={styles.dot} /> : null}
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt4: { marginTop: 4 },
  markAll: { fontFamily: fonts.medium, fontSize: 13, color: colors.gold },
  tabs: { marginTop: 18, marginBottom: 6 },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line, alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  title: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.textSoft },
  titleUnread: { fontFamily: fonts.semibold, color: colors.text },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold, marginTop: 6 },
});
