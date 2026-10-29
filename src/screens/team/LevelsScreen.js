import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  Screen,
  Header,
  Card,
  Loading,
  ErrorView,
} from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { loadTeamLevels } from '../../services/dashboardData';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';

const LEVELS = [1, 2, 3, 4, 5];
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];

function LockIcon({ open, color }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      {open ? (
        <Path
          d="M7 11V8a5 5 0 019.6-2M5 11h14v10H5z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <Path
          d="M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v2"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

/**
 * LevelsScreen – same as web CommissionLevels (#/team/levels).
 * Data: GET /api/v1/me/commission-levels + per-level member counts.
 */
export default function LevelsScreen({ navigation }) {
  const query = useApi(api.getCommissionLevels);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let live = true;
    loadTeamLevels()
      .then(values => live && setCounts(values))
      .catch(() => live && setCounts([0, 0, 0, 0, 0]));
    return () => {
      live = false;
    };
  }, []);

  const goTeam = () => navigation.navigate(ROUTES.TABS, { screen: ROUTES.TEAM });

  if (query.loading && !query.data) {
    return (
      <Screen>
        <Header title="Commission levels" />
        <Loading />
      </Screen>
    );
  }
  if (query.error && !query.data) {
    return (
      <Screen>
        <Header title="Commission levels" />
        <ErrorView message={query.error} onRetry={query.refresh} />
      </Screen>
    );
  }
  if (!query.data) return null;

  const data = query.data;
  const unlocked = Number(data.unlockedLevels) || 0;
  const next = (data.levels || []).find(row => !row.unlocked);
  const need = next
    ? Math.max(0, Number(next.requiredDirects) - Number(data.activeDirects))
    : 0;

  return (
    <Screen onRefresh={query.refresh} refreshing={query.loading}>
      <Header title="Commission levels" />

      <Card style={styles.hero} padding={20}>
        <View style={styles.kicker}>
          <Text style={styles.kickerText}>Commission levels</Text>
        </View>
        <Text style={styles.title}>
          Unlock up to <Text style={styles.goldText}>5 levels</Text> of team income
        </Text>
        <Text style={styles.lede}>
          Your direct referral percent is paid once, on a friend’s first package, as a percent of
          that amount. These levels are separate. Each night you receive the unlocked level’s
          percent of that member’s ROI. A direct referral is Level 1. Someone they refer is Level
          2, up to Level 5. A blocked upline is skipped, and that level is not passed on.
        </Text>

        <View style={styles.gauge}>
          <View style={styles.gaugeTop}>
            <Text style={styles.gaugeLabel}>Unlocked levels</Text>
            <Text style={styles.gaugeValue}>
              {unlocked}
              <Text style={styles.gaugeSmall}>/5</Text>
            </Text>
          </View>
          <View style={styles.segments}>
            {LEVELS.map(level =>
              level <= unlocked ? (
                <LinearGradient
                  key={level}
                  colors={GOLD_GRAD}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.segOn}
                />
              ) : (
                <View key={level} style={styles.seg} />
              ),
            )}
          </View>
          <View style={styles.gaugeFoot}>
            <View>
              <Text style={styles.footDim}>Package-buying directs</Text>
              <Text style={styles.footStrong}>{data.activeDirects}</Text>
            </View>
            <Text style={styles.footGold}>
              {next
                ? `${need} more package-buying direct${need === 1 ? '' : 's'} unlocks Level ${next.level}.`
                : 'Every level is unlocked.'}
            </Text>
          </View>
          <Text style={styles.note}>
            Signups with no purchase do not count. One level for each package-buying direct, up to
            5.
          </Text>
        </View>
      </Card>

      <View style={styles.cards}>
        {(data.levels || []).map((row, index) => {
          const required = Number(row.requiredDirects);
          const have = Math.min(required, Number(data.activeDirects));
          const left = Math.max(0, required - Number(data.activeDirects));
          const isNext = next && next.level === row.level;
          const open = !!row.unlocked;
          const stateColor = open ? '#8ddea8' : isNext ? '#b4abff' : colors.muted;
          const stateBg = open
            ? 'rgba(141,222,168,0.1)'
            : isNext
              ? 'rgba(122,108,255,0.14)'
              : 'rgba(255,255,255,0.05)';

          return (
            <Card
              key={row.level}
              style={[
                styles.card,
                open && styles.cardOpen,
                isNext && styles.cardNext,
              ]}
              padding={18}>
              <View style={styles.cardTop}>
                {open ? (
                  <LinearGradient
                    colors={GOLD_GRAD}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.levelBadge}>
                    <Text style={styles.levelSmallInk}>LEVEL</Text>
                    <Text style={styles.levelNumInk}>{row.level}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.levelBadge, isNext && styles.levelBadgeNext]}>
                    <Text style={[styles.levelSmall, isNext && styles.levelNextColor]}>LEVEL</Text>
                    <Text style={[styles.levelNum, isNext && styles.levelNextColor, !open && !isNext && styles.dim]}>
                      {row.level}
                    </Text>
                  </View>
                )}
                <View style={[styles.state, { backgroundColor: stateBg }]}>
                  <LockIcon open={open} color={stateColor} />
                  <Text style={[styles.stateText, { color: stateColor }]}>
                    {open ? 'Unlocked' : isNext ? 'Up next' : 'Locked'}
                  </Text>
                </View>
              </View>

              <View style={[styles.pctRow, !open && !isNext && styles.dim]}>
                <Text style={[styles.pct, open && styles.pctGold]}>{row.percent}</Text>
                <Text style={styles.pctSign}>%</Text>
              </View>
              <Text style={styles.sub}>of each member’s nightly ROI</Text>

              <View style={styles.progress}>
                <View style={styles.dots}>
                  {Array.from({ length: required }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        i < have && (isNext ? styles.dotNext : styles.dotOn),
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.progressText}>
                  {open
                    ? `${required} package-buying direct${required === 1 ? '' : 's'} reached`
                    : `${left} more package-buying direct${left === 1 ? '' : 's'}`}
                </Text>
              </View>

              <Pressable style={styles.members} onPress={goTeam}>
                <Text style={styles.membersLabel}>Members at this level</Text>
                <Text style={styles.membersCount}>
                  {counts ? counts[index] : '…'}
                </Text>
              </Pressable>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.22)',
    backgroundColor: '#0f1219',
  },
  kicker: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.3)',
  },
  kickerText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.gold },
  title: {
    marginTop: 12,
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.4,
  },
  goldText: { color: colors.gold },
  lede: { ...type.small, marginTop: 10, lineHeight: 20 },
  gauge: {
    marginTop: 18,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(0,0,0,0.25)',
    gap: 12,
  },
  gaugeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  gaugeLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  gaugeValue: { fontFamily: fonts.display, fontSize: 36, color: colors.text, lineHeight: 40 },
  gaugeSmall: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.subtle },
  segments: { flexDirection: 'row', gap: 6 },
  seg: {
    flex: 1,
    height: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  segOn: { flex: 1, height: 12, borderRadius: 4 },
  gaugeFoot: { gap: 8 },
  footDim: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  footStrong: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 2 },
  footGold: { fontFamily: fonts.semibold, fontSize: 13, color: colors.gold, lineHeight: 18 },
  note: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, lineHeight: 16 },
  cards: { marginTop: 16, gap: 12 },
  card: { gap: 8, borderWidth: 1, borderColor: colors.line },
  cardOpen: { borderColor: 'rgba(227,191,122,0.35)' },
  cardNext: { borderColor: 'rgba(122,108,255,0.45)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b1f2a',
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  levelBadgeNext: { borderColor: 'rgba(122,108,255,0.6)' },
  levelSmall: {
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.muted,
    opacity: 0.7,
  },
  levelSmallInk: {
    fontFamily: fonts.bold,
    fontSize: 8,
    letterSpacing: 1,
    color: colors.goldInk,
    opacity: 0.75,
  },
  levelNum: { fontFamily: fonts.display, fontSize: 20, color: colors.text, lineHeight: 22 },
  levelNumInk: { fontFamily: fonts.display, fontSize: 20, color: colors.goldInk, lineHeight: 22 },
  levelNextColor: { color: '#b4abff' },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stateText: { fontFamily: fonts.bold, fontSize: 11 },
  pctRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  pct: { fontFamily: fonts.display, fontSize: 42, color: colors.text, letterSpacing: -1, lineHeight: 46 },
  pctGold: { color: colors.gold },
  pctSign: {
    marginTop: 8,
    marginLeft: 2,
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.muted,
  },
  sub: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: -2 },
  progress: { gap: 6, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dotOn: { backgroundColor: colors.gold },
  dotNext: { backgroundColor: '#8b7cff' },
  progressText: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  members: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  membersLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  membersCount: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  dim: { opacity: 0.55 },
});
