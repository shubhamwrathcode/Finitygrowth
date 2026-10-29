import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Easing,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);
import {
  Screen,
  Header,
  Card,
  Badge,
  Loading,
  ErrorView,
} from '../../components';
import { EmptyRing } from '../../components/charts';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { loadTeamLevels } from '../../services/dashboardData';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

const SITE = 'Finitygrowth';
const STEPS = [
  {
    title: 'Share your link',
    text: 'Send your code or invite link to friends through any app.',
  },
  {
    title: 'Friend joins & buys',
    text: 'They register with your code and activate a package.',
  },
  {
    title: 'You earn commission',
    text:
      'On their first package you receive your direct percent of the amount immediately. Later packages by the same friend do not pay it again. Each night, unlocked levels pay a percent of their ROI.',
  },
];

function when(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('active') || s === 'approved' || s === 'completed') return 'success';
  if (s.includes('pending')) return 'warning';
  return 'neutral';
}

/**
 * ReferralScreen – same as web Referral.jsx:
 * code/link/share, stats, how it works, levels bars, recent directs.
 */
export default function ReferralScreen({ navigation }) {
  const query = useApi(api.getReferral);
  const direct = useApi(api.getTeamDirect);
  const summary = useApi(api.getEarningsSummary);
  const wallet = useApi(api.getWallets);
  const [levels, setLevels] = useState(null);
  const [copied, setCopied] = useState('');
  const copyTimer = useRef(null);

  useEffect(() => {
    let live = true;
    loadTeamLevels()
      .then(counts => live && setLevels(counts))
      .catch(() => live && setLevels([0, 0, 0, 0, 0]));
    return () => {
      live = false;
      clearTimeout(copyTimer.current);
    };
  }, []);

  const data = query.data;
  const currency = wallet.data?.currency || 'USDT';
  const earned = summary.data || {};
  const team = direct.data || [];
  const directEarned = Number(earned.directCommission || 0);
  const levelEarned = Number(earned.levelCommission || 0);

  const refreshAll = () =>
    Promise.all([
      query.refresh(),
      direct.refresh(),
      summary.refresh(),
      wallet.refresh(),
      loadTeamLevels()
        .then(counts => setLevels(counts))
        .catch(() => setLevels([0, 0, 0, 0, 0])),
    ]);

  const copy = (key, value) => {
    Clipboard.setString(String(value || ''));
    setCopied(key);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(''), 1800);
  };

  const shareText = data
    ? `Join me on ${SITE} with my referral code ${data.code}: ${data.link}`
    : '';

  const openShare = async href => {
    try {
      await Linking.openURL(href);
    } catch {
      // ignore
    }
  };

  const nativeShare = async () => {
    if (!data) return;
    try {
      await Share.share({
        title: SITE,
        message: `Join me on ${SITE} with code ${data.code}: ${data.link}`,
        url: data.link,
      });
    } catch {
      // dismissed
    }
  };

  if (query.error && !data) {
    return (
      <Screen>
        <Header title="Referral" />
        <ErrorView message={query.error} onRetry={query.refresh} />
      </Screen>
    );
  }

  if (query.loading && !data) {
    return (
      <Screen>
        <Header title="Referral" />
        <Loading />
      </Screen>
    );
  }

  if (!data) return null;

  const maxLevel = Math.max(1, ...(levels || [0]));
  const enc = encodeURIComponent;

  return (
    <Screen onRefresh={refreshAll} refreshing={query.loading}>
      <Header title="Referral" />

      <Card style={styles.hero} padding={16}>
        <View style={styles.artWrap}>
          <Illustration />
        </View>
        <View style={styles.kicker}>
          <Text style={styles.kickerText}>Referral program</Text>
        </View>
        <Text style={styles.heroTitle}>
          Refer a friend and <Text style={styles.goldText}>get rewarded</Text>
        </Text>
        <Text style={styles.lede}>
          Share your code. A friend’s first package pays your direct referral percent of that amount
          at once. A level unlocks only when that many direct referrals have bought a package.
        </Text>

        <CopyField
          label="Your referral code"
          value={data.code}
          big
          copied={copied === 'code'}
          onCopy={() => copy('code', data.code)}
        />
        <CopyField
          label="Invite link"
          value={data.link}
          copied={copied === 'link'}
          onCopy={() => copy('link', data.link)}
        />

        <View style={styles.shareBar}>
          <Text style={styles.shareVia}>Share via</Text>
          <ShareBtn
            label="WhatsApp"
            filled
            d="M12 3a9 9 0 00-7.8 13.5L3 21l4.6-1.2A9 9 0 1012 3zm4.5 12.4c-.2.6-1.1 1.1-1.6 1.1-.4.1-.9.1-2.9-.7-2.4-1-4-3.5-4.1-3.6-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.6-.3h.5c.2 0 .4 0 .6.4l.8 1.9c.1.1.1.3 0 .5l-.4.6-.3.3c-.1.1-.2.3-.1.5.2.3.7 1.1 1.5 1.8 1 .9 1.8 1.2 2.1 1.3.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.4.3.1.1.1.6-.1 1.2z"
            onPress={() => openShare(`https://wa.me/?text=${enc(shareText)}`)}
          />
          <ShareBtn
            label="Telegram"
            d="M21 4L3 11l5 2 2 6 3-4 5 4 3-15zM8 13l9-6-7 8"
            onPress={() =>
              openShare(
                `https://t.me/share/url?url=${enc(data.link)}&text=${enc(
                  `Join me on ${SITE} with code ${data.code}`,
                )}`,
              )
            }
          />
          <ShareBtn
            label="X"
            d="M4 4l16 16M20 4L4 20"
            onPress={() => openShare(`https://twitter.com/intent/tweet?text=${enc(shareText)}`)}
          />
          <ShareBtn
            label="Email"
            d="M3 6h18v12H3zM3 6l9 7 9-7"
            onPress={() =>
              openShare(
                `mailto:?subject=${enc(`Join me on ${SITE}`)}&body=${enc(shareText)}`,
              )
            }
          />
          <ShareBtn label="More share options" d="M12 3v12M7 8l5-5 5 5M5 13v6h14v-6" onPress={nativeShare} />
        </View>
      </Card>

      <View style={styles.stats}>
        <Stat label="Direct referrals" value={String(data.directTeam ?? 0)} />
        <Stat label="Bought a package" value={String(data.activeDirects ?? 0)} />
        <Stat
          label="Levels unlocked"
          value={`${data.unlockedLevels ?? 0}`}
          suffix="/ 5"
        />
        <Stat label="Total team · 5 levels" value={String(data.totalTeam ?? 0)} />
        <Stat
          label="Direct commission earned"
          value={money(directEarned)}
          suffix={currency}
          gold
        />
        <Stat
          label="Level income earned"
          value={money(levelEarned)}
          suffix={currency}
          gold
        />
      </View>

      <Card style={styles.mt16}>
        <Text style={styles.sectionKicker}>How it works</Text>
        <Text style={type.h2}>Three steps to your first reward</Text>
        <View style={styles.steps}>
          {STEPS.map((step, index) => (
            <View key={step.title} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{index + 1}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.mt16}>
        <View style={styles.cardHead}>
          <View style={styles.flex1}>
            <Text style={type.h2}>Your network by level</Text>
            <Text style={type.tiny}>Members at each depth below you</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.LEVELS)}
            hitSlop={8}
            accessibilityRole="button">
            <Text style={styles.linkBtn}>Commission levels</Text>
          </Pressable>
        </View>
        {levels ? (
          <View style={styles.levels}>
            {levels.map((count, index) => (
              <View key={index} style={styles.levelRow}>
                <Text style={styles.levelName}>Level {index + 1}</Text>
                <View style={styles.levelTrack}>
                  <LinearGradient
                    colors={['#F6E2B3', colors.gold, colors.goldDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.levelFill,
                      {
                        width: `${count ? Math.max(4, (count / maxLevel) * 100) : 0}%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.levelCount}>{count}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Loading />
        )}
      </Card>

      <Card style={styles.mt16}>
        <View style={styles.cardHead}>
          <View style={styles.flex1}>
            <Text style={type.h2}>Recent direct referrals</Text>
            <Text style={type.tiny}>People who joined with your code</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate(ROUTES.TABS, { screen: ROUTES.TEAM })}
            hitSlop={8}
            accessibilityRole="button">
            <Text style={styles.linkBtn}>View all</Text>
          </Pressable>
        </View>

        {direct.loading && !direct.data ? (
          <Loading />
        ) : team.length ? (
          team.slice(0, 6).map(person => (
            <View key={person.id} style={styles.person}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(person.name || '?').slice(0, 1)}</Text>
              </View>
              <View style={styles.flex1}>
                <Text style={styles.personName} numberOfLines={1}>
                  {person.name}
                </Text>
                <Text style={styles.personMeta} numberOfLines={1}>
                  {person.referralCode} · joined {when(person.joinedAt)}
                </Text>
              </View>
              <View style={styles.personRight}>
                {person.status ? (
                  <Badge
                    label={String(person.status).replaceAll('_', ' ')}
                    tone={statusTone(person.status)}
                  />
                ) : null}
                {person.packageActive ? (
                  <Badge label="Bought" tone="success" />
                ) : (
                  <Badge label="No purchase" />
                )}
              </View>
            </View>
          ))
        ) : (
          <EmptyRing
            size={100}
            message="No one has joined with your code yet. Share your link to get started."
          />
        )}
      </Card>
    </Screen>
  );
}

function CopyField({ label, value, big, copied, onCopy }) {
  return (
    <View style={styles.copyField}>
      <Text style={styles.copyLabel}>{label}</Text>
      <View style={[styles.copyRow, big && styles.copyRowBig, copied && styles.copyRowOk]}>
        <Text style={[styles.copyValue, big && styles.copyValueBig]} numberOfLines={big ? 1 : 2}>
          {value}
        </Text>
        <Pressable onPress={onCopy} style={[styles.copyBtn, copied && styles.copyBtnOk]} hitSlop={6}>
          <Text style={[styles.copyBtnText, copied && styles.copyBtnTextOk]}>
            {copied ? 'Copied ✓' : 'Copy'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Web share-btn icons — WhatsApp filled, rest stroked (same paths as Referral.jsx) */
function ShareBtn({ label, d, filled = false, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.shareBtn, pressed && styles.shareBtnPressed]}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d={d}
          fill={filled ? colors.text : 'none'}
          stroke={filled ? 'none' : colors.text}
          strokeWidth={filled ? 0 : 1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function Stat({ label, value, suffix, gold }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, gold && { color: colors.gold }]}>
        {value}
        {suffix ? <Text style={styles.statSuffix}> {suffix}</Text> : null}
      </Text>
    </View>
  );
}

/** Ping-pong 0→1→0 (web CSS ease-in-out infinite / alternate). */
function usePulse(duration, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const half = Math.max(1, Math.round(duration / 2));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return v;
}

/** 0→1 then reset (web wave keyframes). */
function useWave(duration, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return v;
}

/**
 * Full web Referral SVG + RN animations matching index.css
 * (blob / wave / mega / hop / float / twinkle / sway).
 */
function Illustration() {
  const blob = usePulse(28000);
  const mega = usePulse(2400);
  const hop1 = usePulse(3200);
  const hop2 = usePulse(3200, 1400);
  const float1 = usePulse(4500);
  const float2 = usePulse(4500, 1500);
  const float3 = usePulse(4500, 3000);
  const sway1 = usePulse(4000);
  const sway2 = usePulse(4000, 1300);
  const sway3 = usePulse(4000, 2600);
  const twinkle1 = usePulse(2800);
  const twinkle2 = usePulse(2800, 1400);
  const wave1 = useWave(2400);
  const wave2 = useWave(2400, 350);
  const wave3 = useWave(2400, 700);

  // Numeric degrees / scales for react-native-svg animated props (not RN style %).
  const blobScale = blob.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const blobRot = blob.interpolate({ inputRange: [0, 1], outputRange: [0, 3] });
  const megaRot = mega.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });
  const hopY1 = hop1.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -8, 0] });
  const hopR1 = hop1.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -2, 0] });
  const hopY2 = hop2.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -8, 0] });
  const hopR2 = hop2.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -2, 0] });
  const floatY = (v) => v.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const swayR = (v) => v.interpolate({ inputRange: [0, 1], outputRange: [0, 1.5] });
  const waveOp = (v) =>
    v.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] });
  const waveScale = (v) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.08] });
  const sparkOp = (v) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] });
  const sparkScale = (v) =>
    v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.1] });

  return (
    <View style={styles.artBox}>
      <Svg width="100%" height="100%" viewBox="0 0 520 420">
        <Defs>
          <SvgGradient id="ref-blob" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#f6e2b3" stopOpacity="0.28" />
            <Stop offset="0.55" stopColor="#e3bf7a" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#7a6cff" stopOpacity="0.12" />
          </SvgGradient>
          <SvgGradient id="ref-gold" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#f6e2b3" />
            <Stop offset="0.5" stopColor="#e3bf7a" />
            <Stop offset="1" stopColor="#b88a45" />
          </SvgGradient>
          <SvgGradient id="ref-dark" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2a2f3d" />
            <Stop offset="1" stopColor="#151923" />
          </SvgGradient>
        </Defs>

        <AnimatedG originX={260} originY={210} scale={blobScale} rotation={blobRot}>
          <Path
            d="M58 120C96 40 210 18 300 46s170 70 182 160-52 162-150 182-224 6-272-70S20 200 58 120z"
            fill="url(#ref-blob)"
          />
        </AnimatedG>

        <Ellipse cx="260" cy="372" rx="190" ry="16" fill="#000" opacity={0.35} />

        <AnimatedPath
          d="M352 120q26 46 0 92"
          fill="none"
          stroke="#e3bf7a"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={waveOp(wave1)}
          originX={352}
          originY={166}
          scale={waveScale(wave1)}
        />
        <AnimatedPath
          d="M376 100q40 66 0 132"
          fill="none"
          stroke="#e3bf7a"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={waveOp(wave2)}
          originX={376}
          originY={166}
          scale={waveScale(wave2)}
        />
        <AnimatedPath
          d="M400 80q54 86 0 172"
          fill="none"
          stroke="#e3bf7a"
          strokeWidth={5}
          strokeLinecap="round"
          opacity={waveOp(wave3)}
          originX={400}
          originY={166}
          scale={waveScale(wave3)}
        />

        <AnimatedG originX={175} originY={192} rotation={megaRot}>
          <Rect
            x="150"
            y="188"
            width="26"
            height="70"
            rx="10"
            fill="url(#ref-dark)"
            transform="rotate(-14 163 223)"
          />
          <Path d="M168 150l150-58v152l-150-40z" fill="url(#ref-gold)" />
          <Ellipse cx="318" cy="168" rx="20" ry="77" fill="#b88a45" />
          <Ellipse cx="318" cy="168" rx="12" ry="62" fill="#17120a" opacity={0.55} />
          <Rect x="134" y="146" width="40" height="64" rx="14" fill="url(#ref-dark)" />
          <Rect x="142" y="156" width="8" height="44" rx="4" fill="#e3bf7a" opacity={0.5} />
        </AnimatedG>

        <AnimatedG originX={86} originY={356} rotation={swayR(sway1)}>
          <Circle cx="86" cy="214" r="15" fill="#f1d9b0" />
          <Rect x="68" y="234" width="36" height="66" rx="15" fill="#7a6cff" />
          <Path d="M76 298v58M96 298v58" stroke="#d9dbe6" strokeWidth={9} strokeLinecap="round" />
          <Path d="M104 250l26-20" stroke="#7a6cff" strokeWidth={10} strokeLinecap="round" />
        </AnimatedG>
        <AnimatedG originX={300} originY={362} rotation={swayR(sway2)}>
          <Circle cx="300" cy="262" r="13" fill="#e8c69a" />
          <Rect x="285" y="280" width="30" height="52" rx="13" fill="#e3bf7a" />
          <Path d="M292 330v32M308 330v32" stroke="#2a2f3d" strokeWidth={8} strokeLinecap="round" />
          <Path d="M285 292l-18-20M315 292l18-20" stroke="#e3bf7a" strokeWidth={8} strokeLinecap="round" />
        </AnimatedG>
        <AnimatedG originX={440} originY={362} rotation={swayR(sway3)}>
          <Circle cx="440" cy="250" r="13" fill="#f1d9b0" />
          <Rect x="425" y="268" width="30" height="58" rx="13" fill="#24a194" />
          <Path d="M432 324v38M448 324v38" stroke="#d9dbe6" strokeWidth={8} strokeLinecap="round" />
          <Path d="M425 282l-16 14" stroke="#24a194" strokeWidth={8} strokeLinecap="round" />
        </AnimatedG>

        <AnimatedG
          originX={174}
          originY={358}
          translateY={hopY1}
          rotation={hopR1}>
          <Rect x="150" y="318" width="48" height="40" rx="5" fill="url(#ref-gold)" />
          <Rect x="146" y="308" width="56" height="14" rx="4" fill="#f6e2b3" />
          <Rect x="170" y="308" width="8" height="50" fill="#7a6cff" />
          <Path
            d="M174 308c-12-14-26-6-16 0M174 308c12-14 26-6 16 0"
            stroke="#7a6cff"
            strokeWidth={4}
            fill="none"
          />
        </AnimatedG>
        <AnimatedG
          originX={225}
          originY={360}
          translateY={hopY2}
          rotation={hopR2}>
          <Rect x="208" y="332" width="34" height="28" rx="4" fill="#7a6cff" />
          <Rect x="205" y="325" width="40" height="10" rx="3" fill="#9a8fff" />
          <Rect x="222" y="325" width="6" height="35" fill="#e3bf7a" />
        </AnimatedG>

        <AnimatedG translateY={floatY(float1)}>
          <Circle cx="246" cy="70" r="16" fill="url(#ref-gold)" />
          <Circle
            cx="246"
            cy="70"
            r="10"
            fill="none"
            stroke="#17120a"
            strokeOpacity={0.35}
            strokeWidth={2}
          />
        </AnimatedG>
        <AnimatedG translateY={floatY(float2)}>
          <Circle cx="452" cy="146" r="11" fill="url(#ref-gold)" />
        </AnimatedG>
        <AnimatedG translateY={floatY(float3)}>
          <Circle cx="96" cy="120" r="9" fill="url(#ref-gold)" />
        </AnimatedG>

        <AnimatedPath
          d="M428 60l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"
          fill="#f6e2b3"
          opacity={sparkOp(twinkle1)}
          originX={428}
          originY={72}
          scale={sparkScale(twinkle1)}
        />
        <AnimatedPath
          d="M196 98l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"
          fill="#f6e2b3"
          opacity={sparkOp(twinkle2)}
          originX={196}
          originY={106}
          scale={sparkScale(twinkle2)}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1, minWidth: 0 },
  mt16: { marginTop: 16 },
  hero: { marginTop: 4, gap: 10, overflow: 'hidden' },
  artWrap: { marginBottom: 4, marginHorizontal: -4 },
  artBox: {
    width: '100%',
    aspectRatio: 520 / 360,
    maxHeight: 240,
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
  heroTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.5,
  },
  goldText: { color: colors.gold },
  lede: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
  },
  copyField: { gap: 6, marginTop: 4 },
  copyLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  copyRowBig: {
    borderStyle: 'dashed',
    borderColor: 'rgba(227,191,122,0.45)',
    backgroundColor: 'rgba(227,191,122,0.06)',
  },
  copyRowOk: { borderColor: '#8ddea8' },
  copyValue: {
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSoft,
  },
  copyValueBig: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 2,
    color: colors.text,
  },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.gold,
  },
  copyBtnOk: { backgroundColor: '#8ddea8' },
  copyBtnText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.goldInk },
  copyBtnTextOk: { color: '#0d1a12' },
  shareBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  shareVia: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.subtle,
    marginRight: 4,
  },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnPressed: {
    borderColor: 'rgba(227,191,122,0.45)',
    backgroundColor: colors.goldSoft,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  stat: {
    width: '48%',
    flexGrow: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  statLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.muted },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    letterSpacing: -0.4,
  },
  statSuffix: { fontFamily: fonts.bold, fontSize: 12, color: colors.gold },
  sectionKicker: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.gold,
    marginBottom: 4,
  },
  steps: { marginTop: 14, gap: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontFamily: fonts.bold, fontSize: 12, color: colors.goldInk },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 2 },
  stepText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.muted },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  linkBtn: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  levels: { marginTop: 8, gap: 12 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelName: { width: 56, fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  levelTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  levelFill: { height: '100%', borderRadius: 999 },
  levelCount: {
    width: 28,
    textAlign: 'right',
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.text,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  personName: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  personMeta: { fontFamily: fonts.regular, fontSize: 11, color: colors.subtle, marginTop: 2 },
  personRight: { alignItems: 'flex-end', gap: 4 },
});
