import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import {
  Screen,
  Header,
  Card,
  Badge,
  Segmented,
  Loading,
  ErrorView,
} from '../../components';
import { EmptyRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { loadTeamLevels } from '../../services/dashboardData';
import { getUser } from '../../services/session';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';

const LEVELS = [1, 2, 3, 4, 5];
const TABS = [
  { value: 'direct', label: 'Direct' },
  { value: 'level', label: 'Levels' },
  { value: 'tree', label: 'Tree' },
];
const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];

const NODE_W = 160;
const NODE_H = 62;
const GAP_X = 18;
const GAP_Y = 56;

function when(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusTone(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'active' || v === 'approved') return 'success';
  if (v === 'pending' || v === 'submitted') return 'warning';
  if (v === 'blocked' || v === 'rejected') return 'neutral';
  return 'neutral';
}

function useLevelCounts() {
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
  return counts;
}

function MemberList({ rows, emptyText = 'No members in this view.' }) {
  if (!rows?.length) {
    return (
      <View style={styles.empty}>
        <EmptyRing size={72} />
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }
  return rows.map(row => (
    <View key={row.id} style={styles.member}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(row.name || '?').slice(0, 1)}</Text>
      </View>
      <View style={styles.flex1}>
        <Text style={styles.memberName} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={styles.memberMeta} numberOfLines={1}>
          {row.referralCode || '—'} · {row.email || row.phone || '—'}
        </Text>
        <Text style={styles.memberMeta}>Joined {when(row.joinedAt)}</Text>
      </View>
      <View style={styles.memberRight}>
        <View style={[styles.pkgPill, row.packageActive && styles.pkgOn]}>
          <Text style={[styles.pkgText, row.packageActive && styles.pkgTextOn]}>
            {row.packageActive ? 'Active' : 'None'}
          </Text>
        </View>
        {row.status ? (
          <Badge
            label={String(row.status).replaceAll('_', ' ')}
            tone={statusTone(row.status)}
          />
        ) : null}
        {row.kycStatus ? (
          <Badge
            label={`KYC ${String(row.kycStatus).replaceAll('_', ' ')}`}
            tone={statusTone(row.kycStatus)}
          />
        ) : null}
      </View>
    </View>
  ));
}

function QueryBlock({ loading, error, onRetry, children }) {
  if (loading) return <Loading />;
  if (error) return <ErrorView message={error} onRetry={onRetry} />;
  return children;
}

function layoutTree(root, collapsed) {
  let slot = 0;
  const nodes = [];
  const links = [];
  let maxDepth = 0;

  function walk(node, depth, parent) {
    const kids = collapsed.has(node.id) ? [] : node.children || [];
    const placed = {
      node,
      depth,
      x: 0,
      y: depth * (NODE_H + GAP_Y),
      hidden: (node.children || []).length - kids.length,
    };
    maxDepth = Math.max(maxDepth, depth);
    nodes.push(placed);
    if (!kids.length) {
      placed.x = slot * (NODE_W + GAP_X);
      slot += 1;
    } else {
      const children = kids.map(child => walk(child, depth + 1, placed));
      placed.x = (children[0].x + children[children.length - 1].x) / 2;
    }
    if (parent) links.push({ from: parent, to: placed });
    return placed;
  }

  walk(root, 0, null);
  const width = Math.max(1, slot) * (NODE_W + GAP_X) - GAP_X;
  const height = (maxDepth + 1) * (NODE_H + GAP_Y) - GAP_Y;
  return { nodes, links, width: Math.max(width, NODE_W), height: Math.max(height, NODE_H) };
}

function countAll(nodes) {
  return (nodes || []).reduce((sum, node) => sum + 1 + countAll(node.children), 0);
}

function TreeGraph({ data, depth }) {
  const user = getUser() || {};
  const { width: screenW } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [scale, setScale] = useState(1);

  const root = useMemo(
    () => ({
      id: '__me',
      name: user.name || 'You',
      referralCode: user.referralCode || '',
      isRoot: true,
      children: data || [],
    }),
    [data, user.name, user.referralCode],
  );
  const layout = useMemo(() => layoutTree(root, collapsed), [root, collapsed]);

  const fit = () => {
    const next = Math.min(1, (screenW - 72) / layout.width);
    setScale(Math.max(0.35, Number(next.toFixed(2))));
  };

  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.width, screenW]);

  const toggle = id => {
    setCollapsed(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const zoom = delta =>
    setScale(value => Math.min(1.5, Math.max(0.35, Number((value + delta).toFixed(2)))));
  const total = countAll(data);

  return (
    <Card style={styles.treeCard} padding={0}>
      <View style={styles.treeToolbar}>
        <Text style={[type.tiny, styles.flex1]}>
          {total} member{total === 1 ? '' : 's'} shown · {depth} level
          {depth === 1 ? '' : 's'} deep · tap a member to fold their branch
        </Text>
        <View style={styles.zoom}>
          <Pressable onPress={() => zoom(-0.1)} style={styles.zoomBtn} hitSlop={6}>
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
          <Text style={styles.zoomPct}>{Math.round(scale * 100)}%</Text>
          <Pressable onPress={() => zoom(0.1)} style={styles.zoomBtn} hitSlop={6}>
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
          <Pressable onPress={fit} style={styles.fitBtn} hitSlop={6}>
            <Text style={styles.fitText}>Fit</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <ScrollView
          style={styles.treeViewport}
          contentContainerStyle={{
            width: layout.width * scale + 32,
            height: layout.height * scale + 32,
            padding: 16,
          }}
          showsVerticalScrollIndicator={false}>
          <View
            style={{
              width: layout.width * scale,
              height: layout.height * scale,
              overflow: 'hidden',
            }}>
            <View
              style={{
                width: layout.width,
                height: layout.height,
                transformOrigin: 'top left',
                transform: [{ scale }],
              }}>
              <Svg
                width={layout.width}
                height={layout.height}
                style={StyleSheet.absoluteFill}>
                {layout.links.map(({ from, to }) => {
                  const x1 = from.x + NODE_W / 2;
                  const y1 = from.y + NODE_H;
                  const x2 = to.x + NODE_W / 2;
                  const y2 = to.y;
                  const mid = (y1 + y2) / 2;
                  return (
                    <Path
                      key={to.node.id}
                      d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                      fill="none"
                      stroke={
                        to.node.packageActive
                          ? 'rgba(227,191,122,0.55)'
                          : 'rgba(255,255,255,0.12)'
                      }
                      strokeWidth={1.5}
                    />
                  );
                })}
              </Svg>

              {layout.nodes.map(({ node, x, y, depth: level, hidden }) => {
                const kids = (node.children || []).length;
                return (
                  <Pressable
                    key={node.id}
                    onPress={() => kids && !node.isRoot && toggle(node.id)}
                    style={[
                      styles.treeNode,
                      {
                        left: x,
                        top: y,
                        width: NODE_W,
                        height: NODE_H,
                      },
                      node.isRoot && styles.treeRoot,
                      node.packageActive && styles.treeInvesting,
                    ]}>
                    <View style={[styles.tnAvatar, node.isRoot && styles.tnAvatarRoot]}>
                      <Text style={[styles.tnAvatarText, node.isRoot && styles.tnAvatarTextRoot]}>
                        {(node.name || '?').slice(0, 1)}
                      </Text>
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.tnName} numberOfLines={1}>
                        {node.isRoot ? 'You' : node.name}
                      </Text>
                      <Text style={styles.tnMeta} numberOfLines={1}>
                        {node.isRoot
                          ? node.name
                          : `L${level} · ${node.referralCode || '—'}`}
                      </Text>
                    </View>
                    {!node.isRoot ? <View style={styles.tnDot} /> : null}
                    {hidden > 0 ? <Text style={styles.tnMore}>+{hidden}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </ScrollView>

      <View style={styles.legend}>
        <Text style={styles.legendItem}>
          <Text style={styles.legendDotActive}>● </Text>Active
        </Text>
        <Text style={styles.legendItem}>
          <Text style={styles.legendDotPending}>● </Text>Pending
        </Text>
        <Text style={styles.legendItem}>
          <Text style={styles.legendDotBlocked}>● </Text>Blocked
        </Text>
        <Text style={styles.legendItem}>○ Has an active package</Text>
      </View>
    </Card>
  );
}

/**
 * TeamScreen – same as web Team (#/team): Direct / Levels / Tree.
 */
export default function TeamScreen({ navigation }) {
  const [tab, setTab] = useState('direct');
  const [level, setLevel] = useState(1);
  const [depth, setDepth] = useState(3);
  const counts = useLevelCounts();

  const direct = useApi(api.getTeamDirect);
  const levelMembers = useApi(
    () => api.getTeamLevelMembers(level),
    [level, tab === 'level'],
  );
  const tree = useApi(
    () => api.getTeamTree(depth),
    [depth, tab === 'tree'],
  );

  const total = counts ? counts.reduce((a, b) => a + b, 0) : null;
  const max = counts ? Math.max(1, ...counts) : 1;

  const refreshAll = async () => {
    await Promise.all([
      direct.refresh(),
      tab === 'level' ? levelMembers.refresh() : Promise.resolve(),
      tab === 'tree' ? tree.refresh() : Promise.resolve(),
    ]);
  };

  return (
    <Screen
      withTabBar
      onRefresh={refreshAll}
      refreshing={direct.loading || levelMembers.loading || tree.loading}>
      <Header back={false} title="Team" large />
      <Text style={type.small}>Everyone who joined through you, up to 5 levels deep.</Text>

      <View style={styles.sumRow}>
        <View style={styles.sumBox}>
          <Text style={styles.sumLabel}>Direct</Text>
          <Text style={styles.sumValue}>
            {direct.data ? direct.data.length : '…'}
          </Text>
        </View>
        <View style={styles.sumBox}>
          <Text style={styles.sumLabel}>Total · 5 levels</Text>
          <Text style={styles.sumValue}>{total ?? '…'}</Text>
        </View>
        <Pressable
          style={styles.qa}
          onPress={() => navigation.navigate(ROUTES.LEVELS)}
          hitSlop={6}>
          <Text style={styles.qaText}>Commission levels →</Text>
        </Pressable>
      </View>

      <Segmented
        options={TABS}
        value={tab}
        onChange={setTab}
        style={styles.tabs}
      />

      {tab === 'direct' && (
        <Card style={styles.panel} padding={14}>
          <QueryBlock
            loading={direct.loading && !direct.data}
            error={direct.error}
            onRetry={direct.refresh}>
            <MemberList
              rows={direct.data}
              emptyText="No direct members yet. Share your referral link to grow your team."
            />
          </QueryBlock>
        </Card>
      )}

      {tab === 'level' && (
        <View style={styles.panel}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lvlRow}>
            {LEVELS.map((item, index) => {
              const on = level === item;
              const count = counts ? counts[index] : null;
              return (
                <Pressable
                  key={item}
                  onPress={() => setLevel(item)}
                  style={[styles.lvlCard, on && styles.lvlCardOn]}>
                  <Text style={[styles.lvlTag, on && styles.lvlTagOn]}>Level {item}</Text>
                  <Text style={styles.lvlCount}>{count ?? '…'}</Text>
                  <Text style={styles.lvlSmall}>
                    member{count === 1 ? '' : 's'}
                  </Text>
                  <View style={styles.lvlMeter}>
                    {on ? (
                      <LinearGradient
                        colors={GOLD_GRAD}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.lvlFill,
                          {
                            width: counts
                              ? `${(counts[index] / max) * 100}%`
                              : '0%',
                          },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.lvlFillMuted,
                          {
                            width: counts
                              ? `${(counts[index] / max) * 100}%`
                              : '0%',
                          },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <Card style={styles.mt12} padding={14}>
            <Text style={type.h2}>Level {level} members</Text>
            <Text style={[type.tiny, styles.mb8]}>
              {level === 1
                ? 'People you referred directly'
                : `${level - 1} step${level === 2 ? '' : 's'} below your direct referrals`}
            </Text>
            <QueryBlock
              loading={levelMembers.loading && !levelMembers.data}
              error={levelMembers.error}
              onRetry={levelMembers.refresh}>
              <MemberList
                rows={levelMembers.data}
                emptyText={`No one at Level ${level} yet.`}
              />
            </QueryBlock>
          </Card>
        </View>
      )}

      {tab === 'tree' && (
        <View style={styles.panel}>
          <View style={styles.depthRow}>
            <Text style={styles.depthLabel}>Depth</Text>
            {LEVELS.map(item => (
              <Pressable
                key={item}
                onPress={() => setDepth(item)}
                style={[styles.depthBtn, depth === item && styles.depthBtnOn]}>
                <Text style={[styles.depthText, depth === item && styles.depthTextOn]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <QueryBlock
            loading={tree.loading && !tree.data}
            error={tree.error}
            onRetry={tree.refresh}>
            <TreeGraph data={tree.data || []} depth={depth} />
          </QueryBlock>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  sumRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  sumBox: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  sumLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.subtle },
  sumValue: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 2 },
  qa: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(227,191,122,0.3)',
    backgroundColor: colors.goldSoft,
  },
  qaText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  tabs: { marginTop: 16, alignSelf: 'stretch' },
  panel: { marginTop: 14 },
  mt12: { marginTop: 12 },
  mb8: { marginBottom: 8, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  emptyText: {
    ...type.small,
    textAlign: 'center',
    paddingHorizontal: 16,
    maxWidth: 280,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold },
  memberName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  memberMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, marginTop: 2 },
  memberRight: { alignItems: 'flex-end', gap: 4, maxWidth: 110 },
  pkgPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  pkgOn: { backgroundColor: colors.goldSoft },
  pkgText: { fontFamily: fonts.bold, fontSize: 11, color: colors.subtle },
  pkgTextOn: { color: colors.gold },
  lvlRow: { gap: 10, paddingRight: 8 },
  lvlCard: {
    width: 112,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#12151c',
  },
  lvlCardOn: {
    borderColor: colors.gold,
    backgroundColor: '#171a23',
  },
  lvlTag: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted, letterSpacing: 0.4 },
  lvlTagOn: { color: colors.gold },
  lvlCount: { fontFamily: fonts.display, fontSize: 26, color: colors.text, marginTop: 2 },
  lvlSmall: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle },
  lvlMeter: {
    marginTop: 10,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  lvlFill: { height: '100%', borderRadius: 999 },
  lvlFillMuted: { height: '100%', borderRadius: 999, backgroundColor: colors.lineStrong },
  depthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    padding: 3,
    borderRadius: 12,
    backgroundColor: colors.surface,
    marginBottom: 12,
  },
  depthLabel: {
    paddingHorizontal: 10,
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.subtle,
  },
  depthBtn: {
    minWidth: 36,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depthBtnOn: { backgroundColor: colors.pressed },
  depthText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  depthTextOn: { fontFamily: fonts.semibold, color: colors.text },
  treeCard: { overflow: 'hidden', backgroundColor: '#0e1118' },
  treeToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  zoom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  zoomBtn: {
    minWidth: 32,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  zoomPct: {
    minWidth: 40,
    textAlign: 'center',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.muted,
  },
  fitBtn: { paddingHorizontal: 10, height: 30, justifyContent: 'center' },
  fitText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  treeViewport: {
    maxHeight: 420,
    backgroundColor: 'transparent',
  },
  treeNode: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#141823',
  },
  treeRoot: {
    borderColor: 'rgba(227,191,122,0.45)',
    backgroundColor: '#1a1620',
  },
  treeInvesting: {
    borderColor: 'rgba(227,191,122,0.35)',
  },
  tnAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tnAvatarRoot: { backgroundColor: colors.gold },
  tnAvatarText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  tnAvatarTextRoot: { color: colors.goldInk },
  tnName: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text },
  tnMeta: { fontFamily: fonts.regular, fontSize: 10, color: colors.subtle, marginTop: 1 },
  tnDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  tnMore: {
    position: 'absolute',
    right: 6,
    top: 4,
    fontFamily: fonts.bold,
    fontSize: 10,
    color: colors.gold,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  legendItem: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  legendDotActive: { color: colors.success },
  legendDotPending: { color: colors.warning },
  legendDotBlocked: { color: colors.danger },
});
