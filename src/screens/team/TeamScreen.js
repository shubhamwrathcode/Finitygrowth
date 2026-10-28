import React, { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Screen, Header, Card, Button, Segmented, Badge, Avatar, EmptyState, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';
import { shortDate } from '../../utils/date';

/**
 * TeamScreen (Team tab) – orbit map (rings = levels, dots = members),
 * counts, and the member list filtered by Direct / Levels / Tree.
 * Data: api.getTeam()
 */
export default function TeamScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { data, loading, refresh } = useApi(api.getTeam);
  const [tab, setTab] = useState('Direct');

  if (!data) {
    return <Screen withTabBar><Header back={false} title="Team" large /><Loading /></Screen>;
  }

  const size = Math.min(width - 40, 330);
  const c = size / 2;
  const ringGap = (c - 28) / 5;
  // Place each member as a dot on its level ring, spread evenly.
  const dots = [];
  [1, 2, 3, 4, 5].forEach(level => {
    const members = data.members.filter(m => m.level === level);
    members.forEach((m, i) => {
      const angle = (i / members.length) * 2 * Math.PI + level * 0.7;
      const r = 22 + ringGap * level;
      dots.push({ key: m.id, x: c + r * Math.cos(angle), y: c + r * Math.sin(angle), active: m.status === 'Active' });
    });
  });

  return (
    <Screen withTabBar onRefresh={refresh} refreshing={loading}>
      <Header back={false} title="Team" large />
      <Text style={type.small}>Everyone who joined through you, up to 5 levels deep.</Text>

      <View style={styles.orbit}>
        <Svg width={size} height={size}>
          {[5, 4, 3, 2, 1].map(l => (
            <Circle key={l} cx={c} cy={c} r={22 + ringGap * l} stroke={l <= data.unlockedLevels ? 'rgba(227,185,110,0.28)' : colors.line} strokeWidth={1} fill="none" />
          ))}
          {[1, 2, 3, 4, 5].map(l => (
            <SvgText key={l} x={c} y={c - 22 - ringGap * l + 4} fill={colors.subtle} fontSize={9} textAnchor="middle">L{l}</SvgText>
          ))}
          {dots.map(d => (
            <Circle key={d.key} cx={d.x} cy={d.y} r={6} fill={d.active ? colors.gold : colors.bg} stroke={colors.gold} strokeWidth={1.5} />
          ))}
          <Circle cx={c} cy={c} r={22} fill={colors.gold} />
          <SvgText x={c} y={c + 4} fill={colors.goldInk} fontSize={11} fontWeight="700" textAnchor="middle">YOU</SvgText>
        </Svg>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, styles.dotOn]} /><Text style={type.tiny}>Has a package</Text></View>
          <View style={styles.legendItem}><View style={styles.dot} /><Text style={type.tiny}>Signed up only</Text></View>
        </View>
      </View>

      <Card style={styles.counts}>
        <View style={styles.flex1}>
          <Text style={type.tiny}>Direct</Text>
          <Text style={styles.count}>{data.directs}</Text>
        </View>
        <View style={styles.flex1}>
          <Text style={type.tiny}>Total · 5 levels</Text>
          <Text style={styles.count}>{data.total}</Text>
        </View>
        <Button title="Levels →" size="sm" variant="secondary" onPress={() => navigation.navigate(ROUTES.LEVELS)} />
      </Card>

      <Segmented options={['Direct', 'Levels', 'Tree']} value={tab} onChange={setTab} style={styles.mt20} />

      {tab === 'Direct' && <MemberList members={data.members.filter(m => m.level === 1)} navigation={navigation} />}

      {tab === 'Levels' &&
        [1, 2, 3, 4, 5].map(l => {
          const list = data.members.filter(m => m.level === l);
          return (
            <View key={l} style={styles.levelBlock}>
              <View style={styles.levelHead}>
                <Text style={type.h2}>Level {l}</Text>
                <Badge label={l <= data.unlockedLevels ? 'Unlocked' : 'Locked'} tone={l <= data.unlockedLevels ? 'gold' : 'neutral'} />
              </View>
              {list.length ? <MemberList members={list} compact /> : <Text style={type.tiny}>No members at this level yet.</Text>}
            </View>
          );
        })}

      {tab === 'Tree' && <Tree members={data.members} />}
    </Screen>
  );
}

function MemberList({ members, navigation, compact }) {
  if (!members.length) {
    return (
      <EmptyState
        icon="team"
        title="No direct members yet"
        text="Share your referral link to grow your team."
        actionLabel="Share invite link"
        onAction={() => navigation?.navigate(ROUTES.REFERRAL)}
      />
    );
  }
  return members.map(m => (
    <View key={m.id} style={[styles.member, compact && styles.memberCompact]}>
      <Avatar name={m.name} size={38} gold={m.status === 'Active'} />
      <View style={styles.flex1}>
        <Text style={styles.name}>{m.name}</Text>
        <Text style={type.tiny}>{m.id} · joined {shortDate(m.joinedOn)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.invested}>{m.invested ? `${money(m.invested, 0)} USDT` : '—'}</Text>
        <Text style={[type.tiny, { color: m.status === 'Active' ? colors.success : colors.subtle }]}>{m.status}</Text>
      </View>
    </View>
  ));
}

/** Indented tree: each member under their sponsor. */
function Tree({ members }) {
  const render = (sponsorId, depth) =>
    members
      .filter(m => m.sponsor === sponsorId)
      .map(m => (
        <View key={m.id}>
          <View style={[styles.treeRow, { paddingLeft: depth * 18 }]}>
            {depth > 0 ? <View style={styles.treeLine} /> : null}
            <View style={[styles.treeDot, m.firstPackage && styles.dotOn]} />
            <Text style={styles.treeName}>{m.name}</Text>
            <Text style={type.tiny}>L{m.level}</Text>
          </View>
          {render(m.id, depth + 1)}
        </View>
      ));
  return (
    <View style={styles.tree}>
      <View style={styles.treeRow}>
        <View style={[styles.treeDot, styles.dotOn]} />
        <Text style={[styles.treeName, { color: colors.gold }]}>You</Text>
      </View>
      {render('STX100000', 1)}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  mt20: { marginTop: 20 },
  orbit: { alignItems: 'center', marginTop: 14 },
  legend: { flexDirection: 'row', gap: 16, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.gold },
  dotOn: { backgroundColor: colors.gold },
  counts: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  count: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 2 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  memberCompact: { paddingVertical: 8 },
  name: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  right: { alignItems: 'flex-end', gap: 2 },
  invested: { fontFamily: fonts.semibold, fontSize: 13, color: colors.text },
  levelBlock: { marginTop: 18 },
  levelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  tree: { marginTop: 16, gap: 2 },
  treeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36 },
  treeLine: { width: 10, height: 1, backgroundColor: colors.lineStrong, marginLeft: -14 },
  treeDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: colors.gold },
  treeName: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
});
