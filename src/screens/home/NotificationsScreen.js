import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  Screen,
  Header,
  Segmented,
  Loading,
  ErrorView,
  Icon,
  Button,
} from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { colors, fonts, type } from '../../theme';

const DAY = 24 * 60 * 60 * 1000;
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];

/** Same tones as web `.nt-item.tone-*` */
const TONES = {
  teal: { color: '#5fd4c6', bg: 'rgba(95,212,198,0.14)', bar: '#5fd4c6' },
  rose: { color: '#f0a0a0', bg: 'rgba(240,160,160,0.14)', bar: '#f0a0a0' },
  green: { color: '#8ddea8', bg: 'rgba(141,222,168,0.14)', bar: '#8ddea8' },
  violet: { color: '#a59bff', bg: 'rgba(165,155,255,0.14)', bar: '#a59bff' },
  gold: { color: colors.gold, bg: colors.goldSoft, bar: colors.gold },
};

/** Same as web Account.jsx noteKind() */
function noteKind(item) {
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
  if (text.includes('ticket') || text.includes('support')) return { icon: 'chat', tone: 'teal' };
  if (text.includes('withdraw')) return { icon: 'up', tone: 'rose' };
  if (text.includes('deposit')) return { icon: 'down', tone: 'green' };
  if (text.includes('transfer')) return { icon: 'send', tone: 'violet' };
  if (text.includes('commission') || text.includes('earning') || text.includes('roi')) {
    return { icon: 'coins', tone: 'gold' };
  }
  if (text.includes('package') || text.includes('purchase')) return { icon: 'box', tone: 'gold' };
  if (text.includes('reward')) return { icon: 'star', tone: 'violet' };
  if (text.includes('kyc') || text.includes('verif')) return { icon: 'shield', tone: 'teal' };
  return { icon: 'bell', tone: 'gold' };
}

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

function dayLabel(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (d.toDateString() === new Date().toDateString()) return 'Today';
  if (d.toDateString() === new Date(Date.now() - DAY).toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

/**
 * NotificationsScreen – same as web Account.jsx Notifications:
 * GET /api/v1/me/notifications?page&limit
 * POST /api/v1/me/notifications/:id/read
 * POST /api/v1/me/notifications/read-all
 */
export default function NotificationsScreen() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const query = useApi(() => api.getNotifications({ page, limit: 12 }), [page]);
  const [readIds, setReadIds] = useState(() => new Set());
  const [allRead, setAllRead] = useState(false);

  useEffect(() => {
    setReadIds(new Set());
    setAllRead(false);
  }, [query.data]);

  const items = (query.data?.data || []).map(item => ({
    ...item,
    isRead: item.isRead || allRead || readIds.has(item.id),
  }));
  const unread = allRead ? 0 : Math.max(0, (query.data?.unread || 0) - [...readIds].length);
  const shown = filter === 'unread' ? items.filter(item => !item.isRead) : items;
  const groups = shown.reduce((acc, item) => {
    const label = dayLabel(item.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) last.items.push(item);
    else acc.push({ label, items: [item] });
    return acc;
  }, []);

  const read = async id => {
    setReadIds(current => new Set(current).add(id));
    try {
      await api.markNotificationRead(id);
    } catch {
      query.refresh();
    }
  };

  const readAll = async () => {
    setAllRead(true);
    try {
      await api.markAllNotificationsRead();
    } catch {
      query.refresh();
    }
  };

  const total = query.data?.total || 0;
  const limit = query.data?.limit || 12;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <Screen onRefresh={query.refresh} refreshing={query.loading && !!query.data}>
      <Header title="Notifications" />

      <View style={styles.hero}>
        <View style={styles.heroIcoWrap}>
          <LinearGradient
            colors={GOLD_GRAD}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroIco}>
            <Icon name="bell" size={24} color={colors.goldInk} strokeWidth={2} />
          </LinearGradient>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Notifications</Text>
          <Text style={styles.heroSub}>
            {unread
              ? `You have ${unread} unread update${unread === 1 ? '' : 's'}.`
              : 'You’re all caught up.'}
          </Text>
        </View>

        <View style={styles.heroActions}>
          <Segmented
            variant="pill"
            options={[
              { value: 'all', label: 'All' },
              {
                value: 'unread',
                label: unread > 0 ? `Unread ${unread}` : 'Unread',
              },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <Pressable
            accessibilityRole="button"
            onPress={readAll}
            disabled={!unread}
            style={[styles.qa, !unread && styles.qaDisabled]}
            hitSlop={6}>
            <Text style={[styles.qaText, !unread && styles.qaTextDisabled]}>Mark all read</Text>
          </Pressable>
        </View>
      </View>

      {query.loading && !query.data ? (
        <Loading />
      ) : query.error && !query.data ? (
        <ErrorView message={query.error} onRetry={query.refresh} />
      ) : groups.length ? (
        <View style={styles.groups}>
          {groups.map(group => (
            <View key={group.label} style={styles.group}>
              <Text style={styles.day}>{group.label}</Text>
              {group.items.map(item => {
                const kind = noteKind(item);
                const tone = TONES[kind.tone] || TONES.gold;
                const unreadItem = !item.isRead;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.item,
                      unreadItem && {
                        borderColor: `${tone.bar}59`,
                        backgroundColor: '#151822',
                      },
                      !unreadItem && styles.itemRead,
                    ]}>
                    {unreadItem ? (
                      <View style={[styles.toneBar, { backgroundColor: tone.bar }]} />
                    ) : null}
                    <View style={[styles.ico, { backgroundColor: tone.bg }]}>
                      <Icon name={kind.icon} size={20} color={tone.color} strokeWidth={2} />
                    </View>
                    <View style={styles.flex1}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[styles.title, unreadItem && styles.titleUnread]}
                          numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={styles.time} numberOfLines={1}>
                          {ago(item.createdAt)}
                        </Text>
                      </View>
                      {item.message ? (
                        <Text style={styles.message} numberOfLines={4}>
                          {item.message}
                        </Text>
                      ) : null}
                    </View>
                    {unreadItem ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Mark “${item.title}” as read`}
                        onPress={() => read(item.id)}
                        style={styles.markRead}
                        hitSlop={6}>
                        <View style={[styles.dot, { backgroundColor: tone.bar }]} />
                        <Text style={styles.markReadText}>Mark read</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIco}>
            <Icon name="bell" size={28} color={colors.gold} strokeWidth={1.8} />
          </View>
          <Text style={styles.emptyTitle}>
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </Text>
          <Text style={styles.emptySub}>
            Package credits, commissions, deposits and support replies show up here.
          </Text>
        </View>
      )}

      {pageCount > 1 ? (
        <View style={styles.pager}>
          <Button
            title="Previous"
            variant="ghost"
            size="md"
            disabled={page <= 1 || query.loading}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          />
          <Text style={styles.pagerText}>
            {page} / {pageCount}
          </Text>
          <Button
            title="Next"
            variant="ghost"
            size="md"
            disabled={page >= pageCount || query.loading}
            onPress={() => setPage(p => Math.min(pageCount, p + 1))}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  hero: {
    marginTop: 4,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#10131b',
    gap: 14,
  },
  heroIcoWrap: { alignSelf: 'flex-start', position: 'relative' },
  heroIco: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    paddingHorizontal: 6,
    backgroundColor: '#f0a0a0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#0c0e14',
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 10, color: '#2a0d0d' },
  heroText: { gap: 2 },
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.3,
  },
  heroSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 18 },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  qa: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.3)',
    backgroundColor: colors.goldSoft,
  },
  qaDisabled: { opacity: 0.45 },
  qaText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  qaTextDisabled: { color: colors.subtle },
  groups: { marginTop: 16, gap: 16 },
  group: { gap: 8 },
  day: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.subtle,
    marginBottom: 2,
  },
  item: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#10131b',
    overflow: 'hidden',
  },
  itemRead: { opacity: 0.82 },
  toneBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  ico: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSoft,
    lineHeight: 20,
  },
  titleUnread: { fontFamily: fonts.semibold, color: colors.text },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, marginTop: 2 },
  message: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  markRead: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  markReadText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  dot: { width: 7, height: 7, borderRadius: 4 },
  empty: {
    marginTop: 18,
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.lineStrong,
    gap: 8,
  },
  emptyIco: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, marginTop: 4 },
  emptySub: { ...type.small, textAlign: 'center', maxWidth: 280 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    gap: 12,
  },
  pagerText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
});
