import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Screen, Icon, Avatar, Badge, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';
import { shortDate } from '../../utils/date';

/**
 * ReferralScreen – gold hero, coupon-style code + invite link, share,
 * stats, 3 steps, network bars by level, recent direct referrals.
 * Data: api.getReferral(). "Share" uses React Native's built-in Share sheet.
 */
export default function ReferralScreen({ navigation }) {
  const { data } = useApi(api.getReferral);
  const [copied, setCopied] = useState('');

  if (!data) {
    return <Screen><Loading /></Screen>;
  }

  const share = () => Share.share({ message: `Join me on Finitygrowth with my code ${data.code}: ${data.link}` });
  const maxLevel = Math.max(...data.byLevel, 1);

  return (
    <Screen padded={false}>
      {/* Gold hero */}
      <View style={styles.hero}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.back}>
          <Icon name="back" size={22} color={colors.goldInk} strokeWidth={2} />
        </Pressable>
        <Text style={styles.eyebrow}>REFERRAL PROGRAM</Text>
        <Text style={styles.heroTitle}>Refer a friend and get rewarded</Text>
        <Text style={styles.heroText}>
          Share your code. A friend’s first package pays your direct referral percent of that amount at once. A level unlocks only when that many direct referrals have bought a package.
        </Text>
      </View>

      <View style={styles.body}>
        {/* Coupon */}
        <View style={styles.coupon}>
          <View style={[styles.notch, styles.notchLeft]} />
          <View style={[styles.notch, styles.notchRight]} />
          <Text style={styles.couponLabel}>YOUR REFERRAL CODE</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.code}>{data.code}</Text>
            <Pressable onPress={() => setCopied('code')} style={styles.goldBtn}>
              <Text style={styles.goldBtnText}>{copied === 'code' ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
          <View style={styles.dash} />
          <Text style={styles.couponLabel}>INVITE LINK</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.link} numberOfLines={1}>{data.link.replace('https://', '')}</Text>
            <Pressable onPress={() => setCopied('link')} style={styles.darkBtn}>
              <Text style={styles.darkBtnText}>{copied === 'link' ? 'Copied' : 'Copy'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Share */}
        <Text style={[type.small, styles.mt22]}>Share via</Text>
        <View style={styles.shareRow}>
          {[
            { icon: 'chat', label: 'Message' },
            { icon: 'mail', label: 'Email' },
            { icon: 'qr', label: 'QR code' },
            { icon: 'share', label: 'More' },
          ].map(s => (
            <Pressable key={s.label} accessibilityRole="button" onPress={share} style={styles.shareItem}>
              <View style={styles.shareCircle}><Icon name={s.icon} size={20} /></View>
              <Text style={type.tiny}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          <Stat value={data.directs} label="Direct referrals" />
          <Stat value={data.buyingDirects} label="Bought a package" />
          <Stat value={`${data.unlockedLevels} / 5`} label="Levels unlocked" />
          <Stat value={data.total} label="Total team" />
          <Stat value={money(data.directEarned)} label="Direct earned" gold />
          <Stat value={money(data.levelEarned)} label="Level earned" gold />
        </View>

        {/* Steps */}
        <Text style={[type.h2, styles.mt28]}>Three steps to your first reward</Text>
        <View style={styles.mt14}>
          {[
            ['Share your link', 'Send your code or invite link to friends through any app.'],
            ['Friend joins & buys', 'They register with your code and activate a package.'],
            ['You earn commission', 'Their first package pays your direct percent at once. Each night, unlocked levels pay a percent of their ROI.'],
          ].map(([t, d], i, arr) => (
            <View key={t} style={styles.timeline}>
              <View style={styles.timelineSide}>
                <View style={[styles.tlDot, i === 0 && styles.tlDotOn]} />
                {i < arr.length - 1 ? <View style={styles.tlLine} /> : null}
              </View>
              <View style={styles.tlBody}>
                <Text style={styles.tlTitle}>{t}</Text>
                <Text style={type.small}>{d}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Network by level */}
        <View style={[styles.rowBetween, styles.mt22]}>
          <Text style={type.h2}>Your network by level</Text>
          <Pressable onPress={() => navigation.navigate(ROUTES.LEVELS)}><Text style={styles.action}>Commission levels</Text></Pressable>
        </View>
        <View style={styles.mt12}>
          {data.byLevel.map((count, i) => (
            <View key={i} style={styles.netRow}>
              <Text style={styles.netLabel}>Level {i + 1}</Text>
              <View style={styles.netTrack}>
                <View style={[styles.netFill, { width: `${(count / maxLevel) * 100}%`, opacity: i < data.unlockedLevels ? 1 : 0.4 }]} />
              </View>
              <Text style={styles.netCount}>{count}</Text>
            </View>
          ))}
        </View>

        {/* Recent directs */}
        <View style={[styles.rowBetween, styles.mt22]}>
          <Text style={type.h2}>Recent direct referrals</Text>
          <Pressable onPress={() => navigation.navigate(ROUTES.TEAM)}><Text style={styles.action}>View all</Text></Pressable>
        </View>
        {data.recentDirects.map(m => (
          <View key={m.id} style={styles.member}>
            <Avatar name={m.name} size={36} gold={!!m.firstPackage} />
            <View style={styles.flex1}>
              <Text style={styles.memberName}>{m.name}</Text>
              <Text style={type.tiny}>Joined {shortDate(m.joinedOn)}</Text>
            </View>
            {m.firstPackage ? (
              <Text style={styles.earned}>+{money(m.firstPackage.amount * 0.05)}</Text>
            ) : (
              <Badge label="No package yet" />
            )}
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Stat({ value, label, gold }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, gold && { color: colors.gold }]}>{value}</Text>
      <Text style={type.tiny}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt12: { marginTop: 12 },
  mt14: { marginTop: 14 },
  mt22: { marginTop: 22 },
  mt28: { marginTop: 28 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  hero: { backgroundColor: colors.gold, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 74 },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, color: '#5A4520', marginTop: 6 },
  heroTitle: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 37, color: colors.goldInk, marginTop: 6 },
  heroText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20, color: '#3D2F18', marginTop: 10 },
  body: { paddingHorizontal: 20, paddingBottom: 30 },
  coupon: { marginTop: -54, backgroundColor: colors.surfaceAlt, borderRadius: 20, padding: 18, gap: 6, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  notch: { position: 'absolute', top: '50%', marginTop: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg },
  notchLeft: { left: -10 },
  notchRight: { right: -10 },
  couponLabel: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1.5, color: colors.muted },
  code: { fontFamily: fonts.mono, fontSize: 26, fontWeight: '700', letterSpacing: 3, color: colors.gold },
  goldBtn: { height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: colors.gold, justifyContent: 'center' },
  goldBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.goldInk },
  dash: { borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: colors.lineStrong, marginVertical: 10 },
  link: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: colors.textSoft },
  darkBtn: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: colors.pressed, justifyContent: 'center' },
  darkBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  shareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  shareItem: { alignItems: 'center', gap: 6, width: 70 },
  shareCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24, borderRadius: 18, backgroundColor: colors.surface, overflow: 'hidden' },
  stat: { width: '33.33%', padding: 14, gap: 2, borderColor: colors.line, borderRightWidth: 1, borderBottomWidth: 1 },
  statValue: { fontFamily: fonts.bold, fontSize: 17, color: colors.text },
  timeline: { flexDirection: 'row', gap: 14 },
  timelineSide: { alignItems: 'center', width: 12 },
  tlDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.gold, marginTop: 4 },
  tlDotOn: { backgroundColor: colors.gold },
  tlLine: { flex: 1, width: 1, backgroundColor: colors.lineStrong, marginVertical: 4 },
  tlBody: { flex: 1, paddingBottom: 16, gap: 3 },
  tlTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  action: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  netLabel: { width: 52, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  netTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  netFill: { height: 8, borderRadius: 4, backgroundColor: colors.gold },
  netCount: { width: 18, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  memberName: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  earned: { fontFamily: fonts.semibold, fontSize: 13, color: colors.success },
});
