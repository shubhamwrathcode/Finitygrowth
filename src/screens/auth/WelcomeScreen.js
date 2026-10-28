import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Button, Icon, HeroBackground, Logo } from '../../components';
import { ROUTES } from '../../navigation/routes';
import { colors, fonts, radius, spacing } from '../../theme';

/**
 * WelcomeScreen – clean, focused, perfectly proportioned welcome screen.
 * - Header: Signature Finitygrowth logo
 * - Hero: Inspiring headline & subtitle
 * - Center: Compact 3-pillar highlights card (Daily ROI, USDT Wallet, Team)
 * - Bottom: Action buttons (Create account, Sign in, Explore packages)
 * - Live Aurora & Constellation Network animation in background
 */
export default function WelcomeScreen({ navigation }) {
  return (
    <Screen scroll={false} padded={false}>
      <HeroBackground>
        <View style={styles.container}>
          <View style={styles.brand}>
            <Logo width={160} height={36} />
          </View>

          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Smart Wealth Platform</Text>
            </View>

            <Text style={styles.h1}>
              Grow your wealth with{' '}
              <Text style={styles.serif}>confidence.</Text>
            </Text>
            <Text style={styles.subtitle}>
              Transparent packages, scheduled earnings, and verified on-chain rewards.
            </Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statCol}>
              <View style={styles.iconCircle}>
                <Icon name="calendar" size={14} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>0.63%</Text>
              <Text style={styles.statLabel}>Daily Return</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={styles.iconCircle}>
                <Icon name="wallet" size={14} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>BEP-20</Text>
              <Text style={styles.statLabel}>USDT Wallet</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={styles.iconCircle}>
                <Icon name="team" size={14} color={colors.gold} strokeWidth={2} />
              </View>
              <Text style={styles.statValue}>5 Levels</Text>
              <Text style={styles.statLabel}>Team Bonus</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Create account"
              onPress={() => navigation.navigate(ROUTES.REGISTER)}
            />
            <Button
              title="I already have an account"
              variant="secondary"
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
            />
            <Pressable
              accessibilityRole="link"
              onPress={() => navigation.navigate(ROUTES.EXPLORE)}
              style={styles.link}>
              <Text style={styles.linkText}>Explore packages & rewards</Text>
              <Icon name="arrowRight" size={15} color={colors.gold} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </HeroBackground>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'flex-start',
    paddingTop: spacing.xs,
  },
  hero: {
    gap: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.elevated,
    borderColor: colors.lineStrong,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.gold,
    textTransform: 'uppercase',
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.4,
  },
  serif: {
    fontFamily: fonts.serifItalic,
    fontSize: 32,
    color: colors.gold,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSoft,
    maxWidth: 320,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 20, 28, 0.82)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(227, 185, 110, 0.22)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldLine,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    letterSpacing: -0.2,
  },
  statLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.muted,
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
  },
  linkText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.gold,
  },
});
