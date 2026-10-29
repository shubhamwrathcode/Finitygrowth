import React, { useEffect, useRef } from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import { colors, fonts } from '../theme';
import { ROUTES } from './routes';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GOLD_GRAD = ['#F6E2B3', colors.gold, colors.goldDeep];
const BAR_H = 68;
const CENTER = 46;

const ICONS = {
  [ROUTES.HOME]: 'home',
  [ROUTES.WALLET]: 'wallet',
  [ROUTES.TEAM]: 'team',
  [ROUTES.PROFILE]: 'user',
};

/**
 * FloatingTabBar – dock capsule.
 * Side tabs expand when active. Center + is a clean flush gold circle.
 */
function TabChip({ focused, label, icon, onPress }) {
  const bounce = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!focused) return;
    bounce.setValue(0.88);
    Animated.spring(bounce, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 220,
    }).start();
  }, [focused, bounce]);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      onPress={onPress}
      style={styles.chipHit}
      hitSlop={6}>
      <Animated.View style={{ transform: [{ scale: bounce }] }}>
        {focused ? (
          <View style={styles.chipOn}>
            <Icon name={icon} size={18} color={colors.gold} strokeWidth={2.3} />
            <Text style={styles.chipLabel} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ) : (
          <View style={styles.chipOff}>
            <Icon name={icon} size={22} color={colors.subtle} strokeWidth={1.85} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function CenterBuy({ onPress }) {
  const press = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Buy package"
      onPress={onPress}
      onPressIn={() => {
        Animated.spring(press, {
          toValue: 0.92,
          useNativeDriver: true,
          friction: 6,
          tension: 240,
        }).start();
      }}
      onPressOut={() => {
        Animated.spring(press, {
          toValue: 1,
          useNativeDriver: true,
          friction: 5,
          tension: 180,
        }).start();
      }}
      style={styles.centerHit}>
      <Animated.View style={{ transform: [{ scale: press }] }}>
        <LinearGradient
          colors={GOLD_GRAD}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerBtn}>
          <Icon name="plus" size={22} color={colors.goldInk} strokeWidth={2.5} />
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
  }, [state.index]);

  const left = [];
  const right = [];
  state.routes.forEach((route, index) => {
    if (route.name === ROUTES.BUY_TAB) return;
    const entry = { route, index, focused: state.index === index };
    if (left.length < 2) left.push(entry);
    else right.push(entry);
  });

  const renderSide = entry => {
    const { route, focused } = entry;
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel ?? route.name;
    return (
      <TabChip
        key={route.key}
        focused={focused}
        label={label}
        icon={ICONS[route.name]}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
      />
    );
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.bar}>
        <LinearGradient
          colors={['#171B24', '#0F1219']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.row}>
          <View style={styles.side}>{left.map(renderSide)}</View>
          <CenterBuy onPress={() => navigation.navigate(ROUTES.BUY_PACKAGE)} />
          <View style={styles.side}>{right.map(renderSide)}</View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    maxWidth: 420,
    height: BAR_H,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(227,185,110,0.16)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 18,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  chipHit: {
    minWidth: 44,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOff: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingLeft: 10,
    paddingRight: 12,
    borderRadius: 19,
    backgroundColor: 'rgba(227,185,110,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(227,185,110,0.25)',
  },
  chipLabel: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.gold,
  },
  centerHit: {
    width: 56,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    width: CENTER,
    height: CENTER,
    borderRadius: CENTER / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
