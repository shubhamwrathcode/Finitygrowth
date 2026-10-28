import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Screen, Card, Button, Icon, Loading } from '../../components';
import useApi from '../../hooks/useApi';
import * as api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, type } from '../../theme';
import { money } from '../../utils/format';

/**
 * RewardScreen – the 400,000 USDT+ international trip reward.
 * Data: api.getProgram().travelReward, and (when signed in) the member's
 * total package investment from api.getPackages() for the progress bar.
 */
export default function RewardScreen({ navigation }) {
  const { isSignedIn } = useAuth();
  const { data } = useApi(async () => {
    const program = await api.getProgram();
    const pkg = isSignedIn ? await api.getPackages() : null;
    return { reward: program.travelReward, invested: pkg?.summary.invested ?? 0 };
  }, [isSignedIn]);

  if (!data) {
    return <Screen><Loading /></Screen>;
  }
  const { reward, invested } = data;
  const progress = Math.min(invested / reward.threshold, 1);

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button
            title="Buy a package"
            style={styles.flex14}
            onPress={() => navigation.navigate(isSignedIn ? ROUTES.BUY_PACKAGE : ROUTES.REGISTER)}
          />
          <Button title="Reward details" variant="secondary" style={styles.flex1} onPress={() => {}} />
        </View>
      }>
      <View style={styles.top}>
        <Text style={styles.eyebrow}>EXCLUSIVE REWARD</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => navigation.goBack()} style={styles.close}>
          <Icon name="close" size={18} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.center}>
        <Svg width={220} height={150}>
          <Path d="M10 130 C 60 20, 160 20, 210 130" stroke="rgba(227,185,110,0.45)" strokeWidth={1.5} strokeDasharray="4 6" fill="none" />
          <Circle cx={10} cy={130} r={6} fill={colors.elevated} stroke="#C9B48A" strokeWidth={1.5} />
          <Circle cx={210} cy={130} r={6} fill={colors.gold} />
          <SvgText x={10} y={148} fill={colors.muted} fontSize={10}>Your city</SvgText>
          <SvgText x={210} y={148} fill={colors.gold} fontSize={10} textAnchor="end">International</SvgText>
        </Svg>
        <View style={styles.plane}><Icon name="plane" size={26} color={colors.gold} /></View>
        <Text style={styles.title}>{reward.title}</Text>
        <Text style={[type.body, styles.centerText]}>
          Invest <Text style={styles.strong}>{money(reward.threshold, 0)} USDT or more</Text> in packages and earn it.
        </Text>
      </View>

      <Card style={styles.mt24}>
        <View style={styles.rowBetween}>
          <Text style={type.small}>Your total package investment</Text>
          <Text style={type.tiny}>{(progress * 100).toFixed(1)}%</Text>
        </View>
        <Text style={styles.big}>
          {money(invested)} <Text style={type.small}>/ {money(reward.threshold, 0)} USDT</Text>
        </Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(progress * 100, 1)}%` }]} /></View>
        <View style={styles.meta}>
          <Meta label="Benefit" value={reward.benefit} />
          <Meta label="Tier" value={reward.tier} gold />
          <Meta label="Claim from" value={reward.claimFrom} />
        </View>
      </Card>

      <View style={styles.steps}>
        {reward.steps.map((s, i) => (
          <View key={s.title} style={styles.step}>
            <View style={[styles.dot, i === 0 && styles.dotOn]}>
              <Text style={[styles.dotText, i === 0 && styles.dotTextOn]}>{i + 1}</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={type.small}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={[type.tiny, styles.mt24]}>{reward.terms}</Text>
    </Screen>
  );
}

function Meta({ label, value, gold }) {
  return (
    <View style={styles.flex1}>
      <Text style={type.tiny}>{label}</Text>
      <Text style={[styles.metaValue, gold && { color: colors.gold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex14: { flex: 1.4 },
  mt24: { marginTop: 24 },
  footer: { flexDirection: 'row', gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: colors.gold },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', marginTop: 12 },
  plane: { position: 'absolute', top: 26 },
  title: { fontFamily: fonts.serif, fontSize: 38, color: colors.text, marginTop: 12 },
  centerText: { textAlign: 'center', marginTop: 8, maxWidth: 300 },
  strong: { fontFamily: fonts.semibold, color: colors.text },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  big: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 12 },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.gold },
  meta: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metaValue: { fontFamily: fonts.semibold, fontSize: 12, color: colors.text, marginTop: 2 },
  steps: { marginTop: 24, gap: 16 },
  step: { flexDirection: 'row', gap: 14 },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#3A3F4D', alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotText: { fontFamily: fonts.bold, fontSize: 12, color: colors.textSoft },
  dotTextOn: { color: colors.goldInk },
  stepTitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text, marginBottom: 2 },
});
