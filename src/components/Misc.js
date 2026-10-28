/**
 * Small presentational pieces shared by many screens.
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import Button from './Button';
import { colors, fonts, radius, type } from '../theme';

/** Badge – small coloured label. tone: neutral | gold | success | warning */
export function Badge({ label, tone = 'neutral', style }) {
  const t = badgeTones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{label}</Text>
    </View>
  );
}
const badgeTones = {
  neutral: { bg: colors.elevated, fg: colors.textSoft },
  gold: { bg: colors.goldSoft, fg: colors.gold },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
};

/** Avatar – initials in a circle. */
export function Avatar({ name = '', size = 40, gold = true }) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
        gold ? { backgroundColor: colors.gold } : { backgroundColor: colors.elevated },
      ]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36, color: gold ? colors.goldInk : colors.textSoft }]}>{initials}</Text>
    </View>
  );
}

/** IconCircle – icon inside a soft circle/square. */
export function IconCircle({ name, size = 40, color = colors.gold, bg = colors.goldSoft, square = false }) {
  return (
    <View style={{ width: size, height: size, borderRadius: square ? 12 : size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

/** Row – label on the left, value on the right (used in summaries/quotes). */
export function Row({ label, value, valueStyle, last = false, strong = false }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong, valueStyle]}>{value}</Text>
    </View>
  );
}

/** ListItem – tappable row with icon, title, subtitle and chevron/right content. */
export function ListItem({ icon, title, subtitle, right, onPress, last = false }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.item, !last && styles.rowLine, pressed && { opacity: 0.7 }]}>
      {icon ? <Icon name={icon} size={20} color={colors.textSoft} /> : null}
      <View style={styles.itemText}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle ? <Text style={type.tiny}>{subtitle}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Icon name="chevronRight" size={16} color={colors.subtle} strokeWidth={2} /> : null}
    </Pressable>
  );
}

/** EmptyState – icon + title + text + optional button. */
export function EmptyState({ icon = 'file', title, text, actionLabel, onAction }) {
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={44} color="#3A3F4D" strokeWidth={1.3} />
      {title ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      {text ? <Text style={[type.small, styles.center]}>{text}</Text> : null}
      {actionLabel ? <Button title={actionLabel} size="md" onPress={onAction} style={styles.emptyBtn} /> : null}
    </View>
  );
}

/** Loading / error placeholders used while useApi() is fetching. */
export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.gold} />
    </View>
  );
}

export function ErrorView({ message, onRetry }) {
  return (
    <View style={styles.loading}>
      <Text style={[type.small, styles.center]}>{message}</Text>
      {onRetry ? <Button title="Try again" size="sm" variant="secondary" onPress={onRetry} style={styles.emptyBtn} /> : null}
    </View>
  );
}

/** Notice – info/warning strip. */
export function Notice({ text, tone = 'warning' }) {
  const c = tone === 'warning' ? colors.warning : colors.gold;
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'warning' ? colors.warningSoft : colors.goldSoft }]}>
      <Icon name="info" size={18} color={c} />
      <Text style={[styles.noticeText, { color: tone === 'warning' ? '#F2C08F' : colors.gold }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.bold },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 16 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  rowValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.text, flexShrink: 1, textAlign: 'right' },
  rowStrong: { fontFamily: fonts.bold, color: colors.gold },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 },
  itemText: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: fonts.regular, fontSize: 14, color: colors.text },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 8 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginTop: 4 },
  emptyBtn: { marginTop: 10 },
  center: { textAlign: 'center' },
  loading: { paddingVertical: 60, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, alignItems: 'flex-start' },
  noticeText: { flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
});
